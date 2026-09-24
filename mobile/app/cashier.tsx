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
import { toOrderView, orderTotal, type OrderView, type RawOrderRow } from "@/lib/orders";
import { OfflineBanner } from "@/components/OfflineBanner";
import { NewOrderForm } from "@/components/NewOrderForm";
import { ChangeRequestsPanel } from "@/components/ChangeRequestsPanel";
import { ServerCallsPanel } from "@/components/ServerCallsPanel";
import { getCurrentCoords } from "@/lib/location";

const PRESENCE_PING_MS = 5 * 60 * 1000;

// Plain-text channel labels for Floor — unlike Kitchen (which keeps
// CHANNEL_BADGE's icons), this screen shows no icons anywhere.
const CHANNEL_LABEL: Record<string, string | null> = {
  dine_in: null,
  manual_delivery_entry: "Delivery",
  manual_pickup_entry: "Takeout",
};

const ORDER_SELECT =
  "id, status, channel, note, payment_proof_url, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

// Same Asia/Manila day-boundary logic as AnalyticsSection.tsx / the web
// app's src/lib/manila-time.ts.
function startOfTodayManila(): Date {
  const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
  const now = new Date();
  const shifted = new Date(now.getTime() + MANILA_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0) - MANILA_OFFSET_MS);
}

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

// `embedded` lets this exact screen be reused as-is inside the owner app's
// Tables tab (app/admin/tables.tsx) — same component, same live data and
// settle action, just without its own top bar (the tab's AdminHeader covers
// that) so an owner can't accidentally sign themselves out of their own
// session via the cashier-account "Sign out" control.
export default function Cashier({ embedded = false }: { embedded?: boolean } = {}) {
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
  const [refreshing, setRefreshing] = useState(false);
  const [todayOrders, setTodayOrders] = useState<OrderView[]>([]);

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

  const fetchTodayStats = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("restaurant_id", restaurantId)
      .gte("created_at", startOfTodayManila().toISOString())
      .order("created_at", { ascending: true });
    setTodayOrders(((data ?? []) as unknown as RawOrderRow[]).map(toOrderView));
  }, [restaurantId]);

  useEffect(() => {
    // Same documented fetch-in-effect pattern as fetchOrders below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTodayStats();
  }, [fetchTodayStats]);

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
        () => {
          fetchOrders();
          fetchTodayStats();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items", filter: `restaurant_id=eq.${restaurantId}` },
        () => {
          fetchOrders();
          fetchTodayStats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchOrders, fetchTodayStats]);

  useEffect(() => {
    if (session?.user.id) registerForPushNotifications(session.user.id);
  }, [session?.user.id]);

  useEffect(() => {
    const queue = queueRef.current;
    return NetInfo.addEventListener((state) => {
      if (state.isConnected) queue.flush();
    });
  }, []);

  // Owner-only presence ping — a cashier account is presumed present by
  // definition of being logged into the physical cashier station, so this
  // only matters when an owner is covering that role themselves (see
  // 0019_owner_geofence.sql). Runs only while this screen is mounted (no
  // background location, no "Always" permission) — every few minutes, not
  // continuously, just enough to know "recently at the restaurant or not"
  // for deciding whether to push-notify the owner about new requests.
  useEffect(() => {
    if (account?.role !== "owner") return;
    let cancelled = false;

    async function ping() {
      const coords = await getCurrentCoords();
      if (!coords || cancelled) return;
      await supabase.rpc("update_owner_presence", { p_lat: coords.latitude, p_lng: coords.longitude });
    }

    ping();
    const id = setInterval(ping, PRESENCE_PING_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [account?.role]);

  // orderIds is any subset of a table's unpaid orders — the whole group
  // ("Settle all") or a single one ("Settle this order"). Only frees the
  // table once nothing else is left unpaid there, so settling one delivery
  // order (or one dine-in order mid-meal) doesn't reset a still-active table.
  async function settle(group: TableGroup, orderIds: string[]) {
    setOrders((prev) => prev.filter((o) => !orderIds.includes(o.id)));
    await queueRef.current.enqueue({ orderIds });
    if (orderIds.length === group.orders.length) {
      await supabase.rpc("free_table", { p_table_id: group.tableId });
    }
    fetchTodayStats();
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
    await Promise.all([fetchOrders(), fetchTodayStats(), fetchTables()]);
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
  );
  const groupsByTable = new Map(groups.map((g) => [g.tableId, g]));

  const revenueToday = todayOrders.filter((o) => o.status === "paid").reduce((s, o) => s + orderTotal(o), 0);
  const tablesServedToday = new Set(todayOrders.map((o) => o.table_id)).size;

  return (
    <SafeAreaView style={styles.safe} edges={embedded ? [] : ["top"]}>
      <OfflineBanner />
      {!embedded && (
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Menuko</Text>
            <Text style={styles.headerSubtitle}>{account?.restaurantName} · Cashier</Text>
          </View>
          <TouchableOpacity onPress={() => signOut()}>
            <Text style={styles.signOut}>Sign out</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.todayStatsRow}>
        <View style={styles.todayStat}>
          <Text style={styles.todayStatValue}>{tablesServedToday}</Text>
          <Text style={styles.todayStatLabel}>Tables today</Text>
        </View>
        <View style={styles.todayStat}>
          <Text style={styles.todayStatValue}>{formatPeso(revenueToday)}</Text>
          <Text style={styles.todayStatLabel}>Revenue today</Text>
        </View>
      </View>

      <ServerCallsPanel restaurantId={restaurantId ?? ""} />
      <ChangeRequestsPanel restaurantId={restaurantId ?? ""} menuItems={menuItems} role={account?.role} />

      <NewOrderForm categories={categories} items={menuItems} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.tablesTitle}>Tables</Text>
        {tables.length === 0 && <Text style={styles.empty}>No tables yet.</Text>}
        {tables.map((table) => {
          const isFree = !table.occupied_since;
          const isOrdering = !!table.first_order_at;
          const waitingMinutes = table.occupied_since
            ? Math.floor((nowTick - new Date(table.occupied_since).getTime()) / 60_000)
            : 0;
          const isStalled = !isFree && !isOrdering && waitingMinutes >= STALL_MINUTES;
          const busy = tableBusyId === table.id;
          const group = groupsByTable.get(table.id);

          // Free tables show nothing but their label/seat count and a Seat
          // button — no order info, since there's nothing to show.
          if (isFree) {
            return (
              <View key={table.id} style={[styles.card, styles.cardFree]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTable}>
                    {table.label} <Text style={styles.cardSeats}>· {table.capacity} seats</Text>
                  </Text>
                  <Text style={styles.freeLabel}>Free</Text>
                </View>
                <TouchableOpacity
                  onPress={() => seatTable(table.id)}
                  disabled={busy}
                  style={styles.seatButton}
                >
                  <Text style={styles.seatButtonText}>Seat</Text>
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <View key={table.id} style={[styles.card, isStalled && styles.cardStalled]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTable}>
                  {table.label} <Text style={styles.cardSeats}>· {table.capacity} seats</Text>
                </Text>
                {group && <Text style={styles.cardTotal}>{formatPeso(group.total)}</Text>}
              </View>
              <View style={styles.occupiedRow}>
                <Text style={styles.occupiedStatus}>
                  {isOrdering ? "Occupied — ordering" : isStalled ? "Seated, no order yet" : `Seated ${waitingMinutes}m ago`}
                </Text>
                <TouchableOpacity onPress={() => freeTable(table.id)} disabled={busy}>
                  <Text style={styles.link}>Free table</Text>
                </TouchableOpacity>
              </View>

              {group ? (
                <View style={{ gap: 10 }}>
                  {group.orders.map((order) => (
                    <View key={order.id}>
                      <View style={styles.orderStatusRow}>
                        <Text style={styles.orderStatus}>
                          {ORDER_STATUS_LABEL[order.status] ?? order.status}
                          {CHANNEL_LABEL[order.channel] ? ` · ${CHANNEL_LABEL[order.channel]}` : ""}
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
              ) : (
                <Text style={styles.hint}>Seated — no order placed yet.</Text>
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
  todayStatsRow: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#ece2d3",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  todayStat: { flex: 1, backgroundColor: "#fffaf3", borderRadius: 10, padding: 10, gap: 2 },
  todayStatValue: { fontSize: 16, fontWeight: "700", color: "#ea7c1f" },
  todayStatLabel: { fontSize: 10, color: "#8a7c68" },
  tablesTitle: { fontSize: 12, fontWeight: "600", color: "#8a7c68", marginBottom: 2 },
  content: { padding: 16, gap: 10 },
  empty: { fontSize: 13, color: "#8a7c68" },
  hint: { fontSize: 12, color: "#8a7c68" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ece2d3",
    padding: 14,
    gap: 8,
  },
  cardFree: { opacity: 0.85 },
  cardStalled: { borderColor: "#fca5a5", backgroundColor: "#fff8f8" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTable: { fontWeight: "700" },
  cardSeats: { fontWeight: "400", color: "#8a7c68" },
  cardTotal: { fontWeight: "700", color: "#ea7c1f" },
  freeLabel: { fontSize: 12, color: "#8a7c68", fontWeight: "600" },
  seatButton: {
    backgroundColor: "#ea7c1f",
    borderRadius: 999,
    paddingVertical: 6,
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
  },
  seatButtonText: { fontSize: 12, fontWeight: "700", color: "#ffffff" },
  occupiedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  occupiedStatus: { fontSize: 12, color: "#5b5142", fontWeight: "600" },
  link: { fontSize: 12, color: "#8a7c68", textDecorationLine: "underline" },
  orderStatusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  orderStatus: { fontSize: 11, color: "#8a7c68", flex: 1 },
  itemRow: { flexDirection: "row", justifyContent: "space-between" },
  item: { fontSize: 14 },
  paymentBox: { alignItems: "center", gap: 6, backgroundColor: "#ffffff", borderRadius: 10, padding: 10 },
  qrImage: { width: 140, height: 140, borderRadius: 6 },
  proofRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  proofThumb: { width: 24, height: 24, borderRadius: 4 },
  settleButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  settleButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
});
