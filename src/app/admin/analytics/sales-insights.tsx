"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPeso } from "@/lib/money";

type Period = 7 | 30;

type ItemRow = { item_name: string; total_quantity: number; total_revenue: number };
type DayRow = { sale_date: string; revenue: number; order_count: number };
type HourRow = { hour_of_day: number; revenue: number; order_count: number };
type ComboRow = { item_a_name: string; item_b_name: string; order_count: number };

function formatShortDate(isoDate: string): string {
  // isoDate is a plain YYYY-MM-DD from Postgres (Manila calendar day) —
  // force UTC on both ends so the local browser timezone can't shift it
  // to the neighboring day.
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

// A single-series magnitude bar chart (revenue by day or by hour). One
// accent hue, height encodes the value, and only the tallest bar gets a
// direct label — every bar labeled would just be noise at this width.
function BarChart({
  bars,
  formatLabel,
  labelEvery = 1,
}: {
  bars: { label: string; value: number; sub: string }[];
  formatLabel: (label: string) => string;
  labelEvery?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const peakIndex = bars.reduce(
    (best, b, i) => (b.value > bars[best].value ? i : best),
    0,
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-28 items-end gap-1">
        {bars.map((bar, i) => {
          const heightPct = Math.max(2, (bar.value / max) * 100);
          const isPeak = i === peakIndex && bar.value > 0;
          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
            >
              {hovered === i && (
                <div className="absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background shadow">
                  {formatLabel(bar.label)}: {formatPeso(bar.value)} ({bar.sub})
                </div>
              )}
              <div
                className={`w-full rounded-t ${isPeak ? "bg-brand" : "bg-brand/40"} transition-colors group-hover:bg-brand`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {bars.map((bar, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-muted">
            {i % labelEvery === 0 ? formatLabel(bar.label) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SalesInsights() {
  const [period, setPeriod] = useState<Period>(7);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [days, setDays] = useState<DayRow[]>([]);
  const [hours, setHours] = useState<HourRow[]>([]);
  const [combos, setCombos] = useState<ComboRow[]>([]);
  const supabase = createClient();

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
  }, [period, supabase]);

  const bestDay = days.reduce<DayRow | null>(
    (best, d) => (!best || d.revenue > best.revenue ? d : best),
    null,
  );
  const bestHour = hours.reduce<HourRow | null>(
    (best, h) => (!best || h.revenue > best.revenue ? h : best),
    null,
  );
  const maxItemQty = Math.max(1, ...items.map((i) => i.total_quantity));

  // All 24 hours, even ones with no sales, so the chart always reads as a
  // full day's shape rather than a truncated one.
  const hourBars = Array.from({ length: 24 }, (_, h) => {
    const row = hours.find((r) => r.hour_of_day === h);
    return { label: String(h), value: row?.revenue ?? 0, sub: `${row?.order_count ?? 0} orders` };
  });
  const dayBars = days.map((d) => ({
    label: d.sale_date,
    value: d.revenue,
    sub: `${d.order_count} orders`,
  }));

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Sales insights</h2>
        <div className="flex rounded-full border border-border p-0.5 text-xs">
          {([7, 30] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                setLoading(true);
                setPeriod(p);
              }}
              className={`rounded-full px-3 py-1 ${
                period === p ? "bg-brand text-brand-foreground" : "text-muted"
              }`}
            >
              {p === 7 ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-medium text-muted">Revenue by day</h3>
              {bestDay && (
                <span className="text-xs text-muted">
                  Best: <span className="font-medium text-foreground">{formatShortDate(bestDay.sale_date)}</span>{" "}
                  ({formatPeso(bestDay.revenue)})
                </span>
              )}
            </div>
            {dayBars.length > 0 ? (
              <BarChart bars={dayBars} formatLabel={formatShortDate} labelEvery={Math.max(1, Math.ceil(dayBars.length / 8))} />
            ) : (
              <p className="text-sm text-muted">No paid orders in this period yet.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-medium text-muted">Revenue by hour of day</h3>
              {bestHour && bestHour.revenue > 0 && (
                <span className="text-xs text-muted">
                  Peak: <span className="font-medium text-foreground">{formatHourLabel(bestHour.hour_of_day)}</span>{" "}
                  ({formatPeso(bestHour.revenue)})
                </span>
              )}
            </div>
            {hours.length > 0 ? (
              <BarChart bars={hourBars} formatLabel={(h) => formatHourLabel(Number(h))} labelEvery={4} />
            ) : (
              <p className="text-sm text-muted">No paid orders in this period yet.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted">Best-selling items</h3>
            {items.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {items.map((item, i) => (
                  <li key={item.item_name} className="relative overflow-hidden rounded-lg bg-background px-3 py-2 text-sm">
                    <div
                      className="absolute inset-y-0 left-0 bg-brand/10"
                      style={{ width: `${(item.total_quantity / maxItemQty) * 100}%` }}
                    />
                    <div className="relative flex items-center justify-between">
                      <span>
                        <span className="mr-2 text-xs text-muted">#{i + 1}</span>
                        {item.item_name}
                      </span>
                      <span className="text-xs text-muted">
                        {item.total_quantity} sold · {formatPeso(item.total_revenue)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No paid orders in this period yet.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted">Combos ordered together</h3>
            {combos.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {combos.map((combo, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm"
                  >
                    <span>
                      {combo.item_a_name} + {combo.item_b_name}
                    </span>
                    <span className="text-xs text-muted">ordered together {combo.order_count}×</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Not enough order history yet in this period.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
