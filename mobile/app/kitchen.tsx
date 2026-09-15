import { useCallback, useEffect, useRef, useState } from "react";
import {
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
import { toOrderView, orderTotal, CHANNEL_BADGE, type OrderView, type RawOrderRow } from "@/lib/orders";
import { OfflineBanner } from "@/components/OfflineBanner";

const ORDER_SELECT =
  "id, status, channel, note, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

type MarkServedPayload = { orderId: string };

export default function Kitchen() {
  const { session, account, signOut } = useSession();
  const restaurantId = account?.restaurantId;
  const cacheKey = restaurantId ? `menuko:kitchen:${restaurantId}` : null;

  const [orders, setOrders] = useState<OrderView[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const queueRef = useRef(
    createMutationQueue<MarkServedPayload>("menuko:queue:kitchen", async ({ orderId }) => {
      const { error } = await supabase.from("orders").update({ status: "served" }).eq("id", orderId);
      if (error) throw error;
    }),
  );

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("restaurant_id", restaurantId)
      .in("status", ["open", "sent_to_kitchen", "preparing", "served"])
      .order("created_at", { ascending: true });

    if (!error && data) {
      const next = (data as unknown as RawOrderRow[]).map(toOrderView);
      setOrders(next);
      if (cacheKey) writeCache(cacheKey, next);
    }
  }, [restaurantId, cacheKey]);

  // Load cache immediately, then fetch fresh + subscribe realtime.
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

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`kitchen-${restaurantId}`)
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

  async function markServed(orderId: string) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "served" } : o)));
    await queueRef.current.enqueue({ orderId });
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }

  const active = orders.filter((o) => o.status !== "served");
  const done = orders.filter((o) => o.status === "served");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <OfflineBanner />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Menuko</Text>
          <Text style={styles.headerSubtitle}>{account?.restaurantName} · Kitchen</Text>
        </View>
        <TouchableOpacity onPress={() => signOut()}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Active orders ({active.length})</Text>
        {active.length === 0 && <Text style={styles.empty}>No orders yet.</Text>}
        {active.map((order) => (
          <OrderCard key={order.id} order={order} onMarkServed={() => markServed(order.id)} />
        ))}

        {done.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Done</Text>
            {done.map((order) => (
              <OrderCard key={order.id} order={order} done />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function OrderCard({
  order,
  onMarkServed,
  done,
}: {
  order: OrderView;
  onMarkServed?: () => void;
  done?: boolean;
}) {
  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTable}>
          {order.table_label}
          {CHANNEL_BADGE[order.channel] ? ` ${CHANNEL_BADGE[order.channel]}` : ""}
        </Text>
        <Text style={styles.cardTime}>
          {new Date(order.created_at).toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
      {order.note && <Text style={styles.cardNote}>{order.note}</Text>}
      {order.items.map((item) => (
        <Text key={item.id} style={styles.item}>
          {item.menu_item_name} × {item.quantity}
        </Text>
      ))}
      <View style={styles.cardFooter}>
        <Text style={styles.total}>{formatPeso(orderTotal(order))}</Text>
        {!done && onMarkServed && (
          <TouchableOpacity style={styles.doneButton} onPress={onMarkServed}>
            <Text style={styles.doneButtonText}>Mark done</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
  content: { padding: 16, gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#8a7c68", marginBottom: 4 },
  empty: { fontSize: 13, color: "#8a7c68" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ece2d3",
    padding: 14,
    gap: 4,
  },
  cardDone: { opacity: 0.6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  cardTable: { fontWeight: "700" },
  cardTime: { fontSize: 11, color: "#8a7c68" },
  cardNote: { fontSize: 11, fontStyle: "italic", color: "#8a7c68" },
  item: { fontSize: 14 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  total: { fontSize: 13, color: "#8a7c68" },
  doneButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  doneButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
});
