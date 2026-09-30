import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { formatPeso } from "@/lib/money";
import { toOrderView, orderTotal, type OrderView, type RawOrderRow } from "@/lib/orders";
import { SegmentedControl } from "@/components/SegmentedControl";
import { colors, fonts } from "@/theme";

// Revenue — opened from Floor's "Revenue today" card. Today is free on every
// plan (read straight from orders, like the Floor card). 7/30-day history
// comes from sales_by_day, which is Premium-gated server-side
// (0024_premium_gate_sales_rpcs.sql) — a free restaurant gets no rows, so
// the locked card here is presentation only, not the enforcement. Orders
// are never pruned, so upgrading shows history from before the upgrade.

type Range = "today" | "7" | "30";
const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
];

const ORDER_SELECT =
  "id, status, channel, note, payment_proof_url, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

// Same Asia/Manila day-boundary logic as cashier.tsx / AnalyticsSection.
function startOfTodayManila(): Date {
  const shifted = new Date(Date.now() + MANILA_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - MANILA_OFFSET_MS,
  );
}

// The last `days` Manila calendar dates as YYYY-MM-DD, oldest first — the
// RPC only returns days that had paid orders, so gaps are filled with 0.
function lastManilaDates(days: number): string[] {
  const todayMidnightUtc = startOfTodayManila().getTime() + MANILA_OFFSET_MS;
  return Array.from({ length: days }, (_, i) =>
    new Date(todayMidnightUtc - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dayParts(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return { weekday: WEEKDAYS[d.getUTCDay()], day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()] };
}

type DayRow = { date: string; revenue: number; orders: number };

export default function AdminRevenue() {
  const navigation = useNavigation();
  const { account } = useSession();
  const restaurantId = account?.restaurantId;

  const [range, setRange] = useState<Range>("today");
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [todayOrders, setTodayOrders] = useState<OrderView[]>([]);
  const [history, setHistory] = useState<Record<string, DayRow[]>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    supabase
      .from("restaurants")
      .select("plan")
      .eq("id", restaurantId)
      .single()
      .then(({ data }) => setIsPremium(data?.plan === "premium"));
  }, [restaurantId]);

  const fetchToday = useCallback(async () => {
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
    // Fetch-in-effect: setState only happens after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchToday();
  }, [fetchToday]);

  const fetchHistory = useCallback(async (days: number) => {
    setLoading(true);
    const { data } = await supabase.rpc("sales_by_day", { p_days: days });
    const byDate = new Map(
      ((data ?? []) as { sale_date: string; revenue: number; order_count: number }[]).map((r) => [
        r.sale_date,
        r,
      ]),
    );
    const rows = lastManilaDates(days).map((date) => ({
      date,
      revenue: Number(byDate.get(date)?.revenue ?? 0),
      orders: Number(byDate.get(date)?.order_count ?? 0),
    }));
    setHistory((prev) => ({ ...prev, [String(days)]: rows }));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (range === "today" || !isPremium || history[range]) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory(Number(range));
  }, [range, isPremium, history, fetchHistory]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchToday(), range !== "today" && isPremium ? fetchHistory(Number(range)) : null]);
    setRefreshing(false);
  }

  const paidToday = todayOrders.filter((o) => o.status === "paid");
  const collectedToday = paidToday.reduce((s, o) => s + orderTotal(o), 0);
  const unpaidToday = todayOrders
    .filter((o) => o.status !== "paid" && o.status !== "cancelled")
    .reduce((s, o) => s + orderTotal(o), 0);

  const rows = range === "today" ? [] : (history[range] ?? []);
  const periodTotal = rows.reduce((s, r) => s + r.revenue, 0);
  const periodOrders = rows.reduce((s, r) => s + r.orders, 0);
  const maxRevenue = Math.max(1, ...rows.map((r) => r.revenue));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.navigate("index" as never)}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to Floor"
          hitSlop={6}
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">
          Revenue
        </Text>
        {isPremium !== null && (
          <Text style={[styles.planChip, isPremium ? styles.planChipPremium : styles.planChipFree]}>
            {isPremium ? "PREMIUM" : "FREE"}
          </Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <SegmentedControl options={RANGES} value={range} onChange={setRange} />

        {range === "today" && (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>Collected today · resets at midnight</Text>
              <Text style={styles.heroValue}>{formatPeso(collectedToday)}</Text>
              <View style={styles.heroStats}>
                <HeroStat label="Orders" value={String(todayOrders.length)} />
                <HeroStat label="Paid" value={String(paidToday.length)} />
                <HeroStat label="Unpaid" value={formatPeso(unpaidToday)} />
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Today&apos;s orders</Text>
              {todayOrders.length === 0 && <Text style={styles.muted}>No orders yet today.</Text>}
              {todayOrders.map((o) => (
                <View key={o.id} style={styles.orderRow}>
                  <Text style={styles.orderLabel} numberOfLines={1}>
                    {o.table_label} · {o.items.reduce((n, i) => n + i.quantity, 0)} items
                  </Text>
                  <Text style={[styles.orderStatus, o.status === "paid" && styles.orderStatusPaid]}>
                    {o.status === "paid" ? "Paid" : o.status === "cancelled" ? "Cancelled" : "Open"}
                  </Text>
                  <Text style={styles.orderTotal}>{formatPeso(orderTotal(o))}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {range !== "today" && isPremium === null && <ActivityIndicator color={colors.accent} />}

        {range !== "today" && isPremium === false && <LockedHistory />}

        {range !== "today" && isPremium && (
          <>
            <View style={styles.card}>
              <Text style={styles.muted}>{range === "7" ? "Last 7 days" : "Last 30 days"} · paid orders</Text>
              <Text style={styles.periodTotal}>{formatPeso(periodTotal)}</Text>
              <Text style={styles.muted}>
                {periodOrders} orders · avg {formatPeso(rows.length ? periodTotal / rows.length : 0)} a day
              </Text>
              {loading && rows.length === 0 ? (
                <ActivityIndicator color={colors.accent} style={{ height: 130 }} />
              ) : (
                <View style={[styles.chart, { gap: range === "7" ? 8 : 3 }]}>
                  {rows.map((r, i) => {
                    const { weekday } = dayParts(r.date);
                    const isToday = i === rows.length - 1;
                    // 30 thin bars can't fit a label each — the range ends are
                    // labelled once under the chart instead.
                    const label = range === "7" ? (isToday ? "Today" : weekday) : "";
                    return (
                      <View key={r.date} style={styles.barCol}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: Math.max(4, Math.round((r.revenue / maxRevenue) * 100)),
                              backgroundColor: isToday ? colors.saffron : colors.accent,
                              opacity: r.revenue === 0 ? 0.25 : 1,
                            },
                          ]}
                        />
                        <Text style={styles.barLabel} numberOfLines={1}>
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
              {range === "30" && rows.length > 0 && (
                <View style={styles.axisRow}>
                  <Text style={styles.barLabel}>
                    {dayParts(rows[0].date).month} {dayParts(rows[0].date).day}
                  </Text>
                  <Text style={styles.barLabel}>Today</Text>
                </View>
              )}
            </View>

            <View style={styles.listCard}>
              {[...rows].reverse().map((r, i) => {
                const { weekday, day, month } = dayParts(r.date);
                return (
                  <View key={r.date} style={styles.dayRow}>
                    <Text style={styles.dayLabel}>{i === 0 ? "Today" : `${weekday}, ${month} ${day}`}</Text>
                    <Text style={styles.dayOrders}>
                      {r.orders} {r.orders === 1 ? "order" : "orders"}
                    </Text>
                    <Text style={styles.dayTotal}>{formatPeso(r.revenue)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.heroStatLabel}>{label}</Text>
      <Text style={styles.heroStatValue}>{value}</Text>
    </View>
  );
}

const GHOST_BARS = [50, 44, 70, 96, 82, 60, 30];

function LockedHistory() {
  return (
    <View style={styles.lockedWrap}>
      <View style={[styles.card, styles.ghost]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.ghostLine, { width: 90 }]} />
        <View style={[styles.ghostLine, { width: 170, height: 28, marginTop: 8 }]} />
        <View style={[styles.chart, { gap: 8 }]}>
          {GHOST_BARS.map((h, i) => (
            <View key={i} style={[styles.bar, { flex: 1, height: h, backgroundColor: colors.accentSoft }]} />
          ))}
        </View>
      </View>
      <View style={styles.lockCard}>
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed-outline" size={22} color={colors.accentText} />
        </View>
        <Text style={styles.lockTitle}>Every day&apos;s sales, kept for you</Text>
        <Text style={styles.lockBody}>
          Menuko already saves all your orders. Premium lets you look back at past days, weeks and months,
          and compare them.
        </Text>
        <View style={styles.lockPill}>
          <Text style={styles.lockPillText}>Included with the Premium plan</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8 },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 26, fontFamily: fonts.display, color: colors.ink, letterSpacing: -0.5 },
  planChip: {
    fontSize: 11,
    fontWeight: "700",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 10,
  },
  planChipPremium: { backgroundColor: colors.saffron, color: colors.ink },
  planChipFree: { backgroundColor: colors.line, color: colors.muted },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, gap: 14 },
  hero: { backgroundColor: colors.accent, borderRadius: 26, padding: 20, gap: 4 },
  heroLabel: { fontSize: 13, fontWeight: "500", color: colors.heroMuted },
  heroValue: { fontSize: 40, fontFamily: fonts.display, color: colors.onAccent, letterSpacing: -0.8 },
  heroStats: { flexDirection: "row", gap: 8, marginTop: 10 },
  heroStatLabel: { fontSize: 11, color: colors.heroMuted },
  heroStatValue: { fontSize: 17, fontWeight: "700", color: colors.onAccent, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, marginBottom: 4 },
  muted: { fontSize: 13, color: colors.muted },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 36 },
  orderLabel: { flex: 1, fontSize: 14, color: colors.ink },
  orderStatus: { fontSize: 12, fontWeight: "600", color: colors.muted },
  orderStatusPaid: { color: colors.accent },
  orderTotal: { width: 92, textAlign: "right", fontSize: 14, fontWeight: "700", color: colors.ink },
  periodTotal: { fontSize: 36, fontFamily: fonts.display, color: colors.ink, letterSpacing: -0.6 },
  chart: { height: 130, flexDirection: "row", alignItems: "flex-end", marginTop: 12 },
  barCol: { flex: 1, alignItems: "center", gap: 6 },
  bar: { width: "100%", borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  axisRow: { flexDirection: "row", justifyContent: "space-between", marginTop: -2 },
  barLabel: { fontSize: 10, fontWeight: "600", color: colors.muted },
  listCard: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dayLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.ink },
  dayOrders: { fontSize: 12, color: colors.muted },
  dayTotal: { width: 96, textAlign: "right", fontSize: 14, fontWeight: "700", color: colors.ink },
  lockedWrap: { minHeight: 420 },
  ghost: { opacity: 0.45 },
  ghostLine: { height: 14, borderRadius: 7, backgroundColor: colors.line },
  lockCard: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 40,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    gap: 10,
    shadowColor: colors.ink,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  lockIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  lockTitle: { fontSize: 21, fontFamily: fonts.display, color: colors.ink },
  lockBody: { fontSize: 13, lineHeight: 20, color: colors.muted },
  lockPill: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  lockPillText: { fontSize: 14, fontWeight: "700", color: colors.accentText },
});
