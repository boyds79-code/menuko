import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { formatPeso } from "@/lib/money";
import { toOrderView, orderTotal, type OrderView, type RawOrderRow } from "@/lib/orders";
import { SalesInsights } from "@/components/SalesInsights";

const ORDER_SELECT =
  "id, status, channel, note, payment_proof_url, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

// Same Asia/Manila day-boundary logic as the web app's src/lib/manila-time.ts.
function startOfTodayManila(): Date {
  const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
  const now = new Date();
  const shifted = new Date(now.getTime() + MANILA_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0) - MANILA_OFFSET_MS);
}

type Combo = { item_a_name: string; item_b_name: string; order_count: number };

export function AnalyticsSection() {
  const { account } = useSession();
  const restaurantId = account?.restaurantId;

  const [orders, setOrders] = useState<OrderView[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [isPremium, setIsPremium] = useState(false);

  const fetchToday = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("restaurant_id", restaurantId)
      .gte("created_at", startOfTodayManila().toISOString())
      .order("created_at", { ascending: true });
    setOrders(((data ?? []) as unknown as RawOrderRow[]).map(toOrderView));
  }, [restaurantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchToday();
  }, [fetchToday]);

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`admin-today-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchToday(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items", filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchToday(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchToday]);

  useEffect(() => {
    supabase
      .rpc("top_combos", { p_limit: 5 })
      .then(({ data }) => setCombos((data ?? []) as Combo[]));
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    supabase
      .from("restaurants")
      .select("plan")
      .eq("id", restaurantId)
      .single()
      .then(({ data }) => setIsPremium(data?.plan === "premium"));
  }, [restaurantId]);

  const revenueToday = orders.filter((o) => o.status === "paid").reduce((s, o) => s + orderTotal(o), 0);
  const orderCountToday = orders.length;
  const unpaidTableCount = new Set(orders.filter((o) => o.status !== "paid").map((o) => o.table_id)).size;

  return (
    <View style={styles.content}>
      <View style={styles.card}>
        <View style={styles.todayHeader}>
          <Text style={styles.cardTitle}>Today</Text>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <Stat label="Revenue collected" value={formatPeso(revenueToday)} />
          <Stat label="Orders today" value={String(orderCountToday)} />
          <Stat label="Unpaid tables" value={String(unpaidTableCount)} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Combo suggestions</Text>
        <Text style={styles.hint}>
          Items customers keep ordering together — might be worth bundling into a combo.
        </Text>
        {combos.length > 0 ? (
          combos.map((combo, i) => (
            <View key={i} style={styles.comboRow}>
              <Text style={styles.comboText}>
                {combo.item_a_name} + {combo.item_b_name}
              </Text>
              <Text style={styles.comboCount}>ordered together {combo.order_count}×</Text>
            </View>
          ))
        ) : (
          <Text style={styles.hint}>
            Not enough order history yet — check back once a few weeks of orders come in.
          </Text>
        )}
      </View>

      {isPremium ? (
        <SalesInsights />
      ) : (
        <View style={[styles.card, styles.premiumCard]}>
          <Text style={styles.premiumBadge}>Premium</Text>
          <Text style={styles.cardTitle}>Deeper analytics</Text>
          <Text style={styles.hint}>
            Best-selling items, order combos, and your best-selling day/hour over the last week
            or month — available on the premium plan (₱500/month, coming soon).
          </Text>
        </View>
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ece2d3",
    padding: 14,
    gap: 10,
    shadowColor: "#3d2f1f",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  hint: { fontSize: 11, color: "#8a7c68", lineHeight: 15 },
  todayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ea7c1f" },
  liveText: { fontSize: 11, color: "#8a7c68" },
  statRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, backgroundColor: "#ffffff", borderRadius: 10, padding: 10, gap: 2 },
  statValue: { fontSize: 15, fontWeight: "700", color: "#ea7c1f" },
  statLabel: { fontSize: 10, color: "#8a7c68" },
  comboRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  comboText: { fontSize: 12, flex: 1 },
  comboCount: { fontSize: 10, color: "#8a7c68" },
  premiumCard: { alignItems: "center", textAlign: "center" },
  premiumBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ea7c1f",
    backgroundColor: "#fff0e0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
});
