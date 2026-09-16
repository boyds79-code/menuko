import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { readCache, writeCache } from "@/lib/offline-cache";
import { createMutationQueue } from "@/lib/offline-queue";
import { registerForPushNotifications } from "@/lib/push";
import { formatPeso } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import { toOrderView, orderTotal, CHANNEL_BADGE, type OrderView, type RawOrderRow } from "@/lib/orders";
import { OfflineBanner } from "@/components/OfflineBanner";
import { NewOrderForm } from "@/components/NewOrderForm";
import { ChangeRequestsPanel } from "@/components/ChangeRequestsPanel";

const ORDER_SELECT =
  "id, status, channel, note, payment_proof_url, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

type SettlePayload = { orderIds: string[] };

type TableGroup = {
  tableId: string;
  tableLabel: string;
  orders: OrderView[];
  total: number;
};

type MenuCategory = { id: string; name: string; sort_order: number };
type MenuItemRow = { id: string; category_id: string | null; name: string; price: number };

type TableRow = {
  id: string;
  label: string;
  capacity: number;
  occupied_since: string | null;
  occupied_source: string | null;
  first_order_at: string | null;
};

const STALL_MINUTES = 10;

export default function Cashier() {
  const { session, account, signOut } = useSession();
  const restaurantId = account?.restaurantId;
  const cacheKey = restaurantId ? `menuko:cashier:${restaurantId}` : null;

  const [orders, setOrders] = useState<OrderView[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [tableBusyId, setTableBusyId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const queueRef = useRef(
    createMutationQueue<SettlePayload>("menuko:queue:cashier", async ({ orderIds }) => {
      const { error } = await supabase.from("orders").update({ status: "paid" }).in("id", orderIds);
      if (error) throw error;
    }),
  );

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("restaurant_id", restaurantId)
      .not("status", "in", "(paid,cancelled)")
      .order("created_at", { ascending: true });

    if (!error && data) {
      const next = (data as unknown as RawOrderRow[]).map(toOrderView);
      setOrders(next);
      if (cacheKey) writeCache(cacheKey, next);
    }
  }, [restaurantId, cacheKey]);

  useEffect(() => {
    if (!cacheKey) return;
    readCache<OrderView[]>(cacheKey).then((cached) => {
      if (cached) setOrders(cached);
    });
  }, [cacheKey]);

  useEffect(() => {
    // fetchOrders only calls setOrders after an `await` (React's documented
    // fetch-in-effect pattern) — no synchronous setState happens here, this
    // rule's static check just can't see across the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [fetchOrders]);

  const fetchTables = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("tables")
      .select("id, label, capacity, occupied_since, occupied_source, first_order_at")
      .eq("restaurant_id", restaurantId)
      .eq("is_virtual", false)
      .order("label");
    setTables(data ?? []);
  }, [restaurantId]);

  useEffect(() => {
    // Same documented fetch-in-effect pattern as fetchOrders above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`table-status-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables", filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchTables(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchTables]);

  useEffect(() => {
    if (!restaurantId) return;
    supabase
      .from("menu_categories")
      .select("id, name, sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order")
      .then(({ data }) => setCategories(data ?? []));
    supabase
      .from("menu_items")
      .select("id, category_id, name, price")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .order("sort_order")
      .then(({ data }) => setMenuItems(data ?? []));
  }, [restaurantId]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    supabase
      .from("restaurants")
      .select("payment_qr_url, payment_link")
      .eq("id", restaurantId)
      .single()
      .then(({ data }) => {
        setPaymentQrUrl(data?.payment_qr_url ?? null);
        setPaymentLink(data?.payment_link ?? null);
      });
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`cashier-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchOrders(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items", filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchOrders(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchOrders]);

  useEffect(() => {
    if (session?.user.id) registerForPushNotifications(session.user.id);
  }, [session?.user.id]);

  useEffect(() => {
    const queue = queueRef.current;
    return NetInfo.addEventListener((state) => {
      if (state.isConnected) queue.flush();
    });
  }, []);

  // orderIds is any subset of a table's unpaid orders — the whole group
  // ("Settle all") or a single one ("Settle this order"). Only frees the
  // table once nothing else is left unpaid there, so settling one delivery
  // order (or one dine-in order mid-meal) doesn't reset a still-active table.
  async function settle(group: TableGroup, orderIds: string[]) {
    setOrders((prev) => prev.filter((o) => !orderIds.includes(o.id)));
    if (orderIds.length === group.orders.length) setExpanded(null);
    await queueRef.current.enqueue({ orderIds });
    if (orderIds.length === group.orders.length) {
      await supabase.rpc("free_table", { p_table_id: group.tableId });
    }
  }

  async function seatTable(tableId: string) {
    setTableBusyId(tableId);
    await supabase.rpc("mark_table_occupied", { p_table_id: tableId });
    setTableBusyId(null);
  }

  async function freeTable(tableId: string) {
    setTableBusyId(tableId);
    await supabase.rpc("free_table", { p_table_id: tableId });
    setTableBusyId(null);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }

  const groups: TableGroup[] = Object.values(
    orders.reduce<Record<string, TableGroup>>((acc, order) => {
      const key = order.table_id;
      acc[key] ??= { tableId: key, tableLabel: order.table_label, orders: [], total: 0 };
      acc[key].orders.push(order);
      acc[key].total += orderTotal(order);
      return acc;
    }, {}),
  ).sort((a, b) => a.tableLabel.localeCompare(b.tableLabel));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <OfflineBanner />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Menuko</Text>
          <Text style={styles.headerSubtitle}>{account?.restaurantName} · Cashier</Text>
        </View>
        <TouchableOpacity onPress={() => signOut()}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tablesSection}>
        <Text style={styles.tablesTitle}>Tables</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableChipRow}>
          {tables.map((table) => {
            const isFree = !table.occupied_since;
            const isOrdering = !!table.first_order_at;
            const waitingMinutes = table.occupied_since
              ? Math.floor((nowTick - new Date(table.occupied_since).getTime()) / 60_000)
              : 0;
            const isStalled = !isFree && !isOrdering && waitingMinutes >= STALL_MINUTES;
            const busy = tableBusyId === table.id;

            return (
              <View
                key={table.id}
                style={[
                  styles.tableChip,
                  isFree && styles.tableChipFree,
                  isStalled && styles.tableChipStalled,
                  !isFree && !isStalled && !isOrdering && styles.tableChipWaiting,
                ]}
              >
                <Text style={styles.tableChipLabel}>{table.label}</Text>
                <Text style={styles.tableChipSeats}>· {table.capacity} seats</Text>
                {isFree ? (
                  <>
                    <Text style={styles.tableChipStatus}>Free</Text>
                    <TouchableOpacity
                      onPress={() => seatTable(table.id)}
                      disabled={busy}
                      style={styles.tableChipAction}
                    >
                      <Text style={styles.tableChipActionText}>Seat</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.tableChipStatus}>
                      {table.occupied_source === "qr_scan" ? "📷 " : "✋ "}
                      {isOrdering ? "Ordering" : isStalled ? "⚠ No order" : `Waiting ${waitingMinutes}m`}
                    </Text>
                    <TouchableOpacity
                      onPress={() => freeTable(table.id)}
                      disabled={busy}
                      style={styles.tableChipActionOutline}
                    >
                      <Text style={styles.tableChipActionOutlineText}>Free</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            );
          })}
          {tables.length === 0 && <Text style={styles.empty}>No tables yet.</Text>}
        </ScrollView>
      </View>

      <ChangeRequestsPanel restaurantId={restaurantId ?? ""} menuItems={menuItems} />

      <NewOrderForm categories={categories} items={menuItems} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {groups.length === 0 && <Text style={styles.empty}>No unpaid tables.</Text>}
        {groups.map((group) => {
          const isExpanded = expanded === group.tableId;
          return (
            <View key={group.tableId} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTable}>{group.tableLabel}</Text>
                <Text style={styles.cardTotal}>{formatPeso(group.total)}</Text>
              </View>
              <TouchableOpacity onPress={() => setExpanded(isExpanded ? null : group.tableId)}>
                <Text style={styles.link}>{isExpanded ? "Hide details" : "Show details"}</Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={{ gap: 10 }}>
                  {group.orders.map((order) => (
                    <View key={order.id}>
                      <View style={styles.orderStatusRow}>
                        <Text style={styles.orderStatus}>
                          {ORDER_STATUS_LABEL[order.status] ?? order.status}
                          {CHANNEL_BADGE[order.channel] ? ` · ${CHANNEL_BADGE[order.channel]}` : ""}
                          {order.note ? ` · ${order.note}` : ""}
                        </Text>
                        {group.orders.length > 1 && (
                          <TouchableOpacity onPress={() => settle(group, [order.id])}>
                            <Text style={styles.link}>Settle this</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {order.items.map((item) => (
                        <View key={item.id} style={styles.itemRow}>
                          <Text style={styles.item}>
                            {item.menu_item_name} × {item.quantity}
                          </Text>
                          <Text style={styles.item}>
                            {formatPeso(item.quantity * item.unit_price_snapshot)}
                          </Text>
                        </View>
                      ))}
                      {order.payment_proof_url && (
                        <TouchableOpacity
                          style={styles.proofRow}
                          onPress={() => Linking.openURL(order.payment_proof_url!)}
                        >
                          <Image source={{ uri: order.payment_proof_url }} style={styles.proofThumb} />
                          <Text style={styles.link}>View payment screenshot</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {(paymentQrUrl || paymentLink) && (
                    <View style={styles.paymentBox}>
                      {paymentQrUrl && (
                        <Image source={{ uri: paymentQrUrl }} style={styles.qrImage} />
                      )}
                      {paymentLink && (
                        <TouchableOpacity onPress={() => Linking.openURL(paymentLink)}>
                          <Text style={styles.link}>Open payment link</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.settleButton}
                    onPress={() => settle(group, group.orders.map((o) => o.id))}
                  >
                    <Text style={styles.settleButtonText}>
                      {group.orders.length > 1 ? "Settle all" : "Settle payment"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fffaf3" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#ece2d3",
  },
  headerTitle: { fontWeight: "700", color: "#ea7c1f" },
  headerSubtitle: { fontSize: 12, color: "#8a7c68" },
  signOut: { fontSize: 13, color: "#8a7c68" },
  tablesSection: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#ece2d3",
    paddingVertical: 10,
  },
  tablesTitle: { fontSize: 12, fontWeight: "600", color: "#8a7c68", paddingHorizontal: 16, marginBottom: 6 },
  tableChipRow: { paddingHorizontal: 16, gap: 8 },
  tableChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ece2d3",
    backgroundColor: "#fffaf3",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableChipFree: { backgroundColor: "#fffaf3", borderColor: "#ece2d3" },
  tableChipWaiting: { backgroundColor: "#fef3e2", borderColor: "#f3ca8e" },
  tableChipStalled: { backgroundColor: "#fee2e2", borderColor: "#fca5a5" },
  tableChipLabel: { fontSize: 12, fontWeight: "700" },
  tableChipSeats: { fontSize: 11, color: "#8a7c68" },
  tableChipStatus: { fontSize: 11, color: "#5b5142" },
  tableChipAction: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tableChipActionText: { fontSize: 10, fontWeight: "700", color: "#ffffff" },
  tableChipActionOutline: { borderWidth: 1, borderColor: "#8a7c68", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tableChipActionOutlineText: { fontSize: 10, fontWeight: "700", color: "#5b5142" },
  content: { padding: 16, gap: 10 },
  empty: { fontSize: 13, color: "#8a7c68" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ece2d3",
    padding: 14,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  cardTable: { fontWeight: "700" },
  cardTotal: { fontWeight: "700", color: "#ea7c1f" },
  link: { fontSize: 12, color: "#8a7c68", textDecorationLine: "underline" },
  orderStatusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  orderStatus: { fontSize: 11, color: "#8a7c68", flex: 1 },
  itemRow: { flexDirection: "row", justifyContent: "space-between" },
  item: { fontSize: 14 },
  paymentBox: { alignItems: "center", gap: 6, backgroundColor: "#fffaf3", borderRadius: 10, padding: 10 },
  qrImage: { width: 140, height: 140, borderRadius: 6 },
  proofRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  proofThumb: { width: 24, height: 24, borderRadius: 4 },
  settleButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  settleButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
});
