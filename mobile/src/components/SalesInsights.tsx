import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { formatPeso } from "@/lib/money";

type Period = 7 | 30;

type ItemRow = { item_name: string; total_quantity: number; total_revenue: number };
type DayRow = { sale_date: string; revenue: number; order_count: number };
type HourRow = { hour_of_day: number; revenue: number; order_count: number };
type ComboRow = { item_a_name: string; item_b_name: string; order_count: number };

function formatShortDate(isoDate: string): string {
  // isoDate is a plain YYYY-MM-DD from Postgres (Manila calendar day) —
  // force UTC so the device's local timezone can't shift it to the
  // neighboring day.
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

function formatHourLabel(hour: number): string {
  const period = hour < 12 ? "am" : "pm";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}${period}`;
}

// A single-series magnitude bar chart (revenue by day or by hour) — same
// visual language as the web admin's version, just plain Views instead of
// SVG (no chart lib on mobile). Only the tallest bar gets a direct label.
function BarChart({
  bars,
  formatLabel,
  labelEvery = 1,
}: {
  bars: { label: string; value: number }[];
  formatLabel: (label: string) => string;
  labelEvery?: number;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const peakIndex = bars.reduce((best, b, i) => (b.value > bars[best].value ? i : best), 0);

  return (
    <View>
      <View style={styles.chartRow}>
        {bars.map((bar, i) => {
          const heightPct = Math.max(2, (bar.value / max) * 100);
          const isPeak = i === peakIndex && bar.value > 0;
          return (
            <View key={i} style={styles.barTrack}>
              <View
                style={[styles.bar, isPeak ? styles.barPeak : styles.barNormal, { height: `${heightPct}%` }]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.chartRow}>
        {bars.map((bar, i) => (
          <View key={i} style={styles.barTrack}>
            <Text style={styles.barLabel}>{i % labelEvery === 0 ? formatLabel(bar.label) : ""}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SalesInsights() {
  const [period, setPeriod] = useState<Period>(7);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [days, setDays] = useState<DayRow[]>([]);
  const [hours, setHours] = useState<HourRow[]>([]);
  const [combos, setCombos] = useState<ComboRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.rpc("sales_by_item", { p_days: period, p_limit: 8 }),
      supabase.rpc("sales_by_day", { p_days: period }),
      supabase.rpc("sales_by_hour", { p_days: period }),
      supabase.rpc("top_combos", { p_limit: 5, p_days: period }),
    ]).then(([itemsRes, daysRes, hoursRes, combosRes]) => {
      if (cancelled) return;
      setItems((itemsRes.data ?? []) as ItemRow[]);
      setDays((daysRes.data ?? []) as DayRow[]);
      setHours((hoursRes.data ?? []) as HourRow[]);
      setCombos((combosRes.data ?? []) as ComboRow[]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const bestDay = days.reduce<DayRow | null>((best, d) => (!best || d.revenue > best.revenue ? d : best), null);
  const bestHour = hours.reduce<HourRow | null>((best, h) => (!best || h.revenue > best.revenue ? h : best), null);
  const maxItemQty = Math.max(1, ...items.map((i) => i.total_quantity));

  const hourBars = Array.from({ length: 24 }, (_, h) => ({
    label: String(h),
    value: hours.find((r) => r.hour_of_day === h)?.revenue ?? 0,
  }));
  const dayBars = days.map((d) => ({ label: d.sale_date, value: d.revenue }));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Sales insights</Text>
        <View style={styles.periodToggle}>
          {([7, 30] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => {
                setLoading(true);
                setPeriod(p);
              }}
              style={[styles.periodChip, period === p && styles.periodChipActive]}
            >
              <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>
                {p === 7 ? "7 days" : "30 days"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <Text style={styles.hint}>Loading...</Text>
      ) : (
        <>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Revenue by day</Text>
              {bestDay && (
                <Text style={styles.sectionMeta}>
                  Best: {formatShortDate(bestDay.sale_date)} ({formatPeso(bestDay.revenue)})
                </Text>
              )}
            </View>
            {dayBars.length > 0 ? (
              <BarChart
                bars={dayBars}
                formatLabel={formatShortDate}
                labelEvery={Math.max(1, Math.ceil(dayBars.length / 6))}
              />
            ) : (
              <Text style={styles.hint}>No paid orders in this period yet.</Text>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Revenue by hour</Text>
              {bestHour && bestHour.revenue > 0 && (
                <Text style={styles.sectionMeta}>
                  Peak: {formatHourLabel(bestHour.hour_of_day)} ({formatPeso(bestHour.revenue)})
                </Text>
              )}
            </View>
            {hours.length > 0 ? (
              <BarChart bars={hourBars} formatLabel={(h) => formatHourLabel(Number(h))} labelEvery={4} />
            ) : (
              <Text style={styles.hint}>No paid orders in this period yet.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Best-selling items</Text>
            {items.length > 0 ? (
              items.map((item, i) => (
                <View key={item.item_name} style={styles.itemRow}>
                  <View style={[styles.itemBarFill, { width: `${(item.total_quantity / maxItemQty) * 100}%` }]} />
                  <View style={styles.itemRowContent}>
                    <Text style={styles.itemText} numberOfLines={1}>
                      #{i + 1} {item.item_name}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {item.total_quantity} sold · {formatPeso(item.total_revenue)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.hint}>No paid orders in this period yet.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Combos ordered together</Text>
            {combos.length > 0 ? (
              combos.map((combo, i) => (
                <View key={i} style={styles.comboRow}>
                  <Text style={styles.comboText}>
                    {combo.item_a_name} + {combo.item_b_name}
                  </Text>
                  <Text style={styles.comboCount}>{combo.order_count}×</Text>
                </View>
              ))
            ) : (
              <Text style={styles.hint}>Not enough order history yet in this period.</Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#ece2d3", padding: 14, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  hint: { fontSize: 11, color: "#8a7c68", lineHeight: 15 },
  periodToggle: { flexDirection: "row", borderWidth: 1, borderColor: "#ece2d3", borderRadius: 999, padding: 2 },
  periodChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  periodChipActive: { backgroundColor: "#ea7c1f" },
  periodChipText: { fontSize: 11, color: "#8a7c68" },
  periodChipTextActive: { color: "#ffffff", fontWeight: "700" },
  section: { gap: 6 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#8a7c68", textTransform: "uppercase" },
  sectionMeta: { fontSize: 11, color: "#8a7c68" },
  chartRow: { flexDirection: "row", height: 90, alignItems: "flex-end", gap: 2 },
  barTrack: { flex: 1, height: "100%", justifyContent: "flex-end", alignItems: "center" },
  bar: { width: "100%", borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barNormal: { backgroundColor: "#f3cd9e" },
  barPeak: { backgroundColor: "#ea7c1f" },
  barLabel: { fontSize: 8, color: "#8a7c68", marginTop: 2, textAlign: "center" },
  itemRow: {
    position: "relative",
    backgroundColor: "#fffaf3",
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  itemBarFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#fce3c4" },
  itemRowContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  itemText: { fontSize: 12, flex: 1 },
  itemMeta: { fontSize: 10, color: "#8a7c68" },
  comboRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fffaf3",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  comboText: { fontSize: 12, flex: 1 },
  comboCount: { fontSize: 10, color: "#8a7c68" },
});
