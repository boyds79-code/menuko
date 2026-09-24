import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type SalesReportData = {
  restaurant: { name: string; grabfoodCommissionPct: number | null; foodpandaCommissionPct: number | null };
  period: { year: number; month: number; label: string; generatedLabel: string; daysInPeriod: number };
  summary: {
    revenue: number;
    prevRevenue: number;
    avgCheck: number;
    prevAvgCheck: number;
    orders: number;
    prevOrders: number;
    tableTurnover: number;
    prevTableTurnover: number;
    tableCount: number;
  };
  dailyThisMonth: { day: number; revenue: number; orders: number }[];
  dailyPrevMonth: { day: number; revenue: number; orders: number }[];
  weeklyBuckets: { label: string; revenue: number; orders: number }[];
  heatmap: { dayOfWeek: number; hourOfDay: number; count: number }[];
  bestSellers: { name: string; quantity: number; revenue: number }[];
  slowestMovers: { name: string; quantity: number; revenue: number }[];
  categoryRevenue: { name: string; revenue: number; share: number }[];
  combos: { a: string; b: string; count: number }[];
  menuEngineering: { name: string; quantity: number; marginPct: number }[];
  itemsWithCost: number;
  totalItems: number;
  channels: { label: string; gross: number; net: number | null; commissionEstimated: boolean }[];
};

const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const DEFAULT_COMMISSION_PCT = 26;

function pct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : Infinity;
  return ((current - previous) / previous) * 100;
}

function weekdayGroups(daily: { day: number; revenue: number; orders: number }[], daysInMonth: number) {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const buckets: { label: string; revenue: number; orders: number }[] = [];
  let start = 1;
  let weekNum = 1;
  while (start <= daysInMonth) {
    const end = Math.min(start + 6, daysInMonth);
    let revenue = 0;
    let orders = 0;
    for (let d = start; d <= end; d++) {
      const row = byDay.get(d);
      if (row) {
        revenue += row.revenue;
        orders += row.orders;
      }
    }
    const label = end - start === 6 ? `Week ${weekNum} (${start}–${end})` : `Days ${start}–${end}`;
    buckets.push({ label, revenue, orders });
    start = end + 1;
    weekNum++;
  }
  return buckets;
}

export async function fetchSalesReportData(
  supabase: SupabaseClient<Database>,
  restaurantId: string,
  year: number,
  month: number,
): Promise<SalesReportData> {
  const monthDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const daysInPeriod = new Date(year, month, 0).getDate();

  const [
    restaurantRes,
    summaryRes,
    dailyRes,
    heatmapRes,
    itemSalesRes,
    categoryRes,
    combosRes,
    engineeringRes,
    channelRes,
    itemCountsRes,
  ] = await Promise.all([
    supabase
      .from("restaurants")
      .select("name, grabfood_commission_pct, foodpanda_commission_pct")
      .eq("id", restaurantId)
      .single(),
    supabase.rpc("report_monthly_summary", { p_month: monthDate }),
    supabase.rpc("report_daily_revenue", { p_month: monthDate }),
    supabase.rpc("report_day_hour_heatmap", { p_month: monthDate }),
    supabase.rpc("report_item_sales", { p_month: monthDate }),
    supabase.rpc("report_category_revenue", { p_month: monthDate }),
    supabase.rpc("report_combos", { p_month: monthDate, p_limit: 5 }),
    supabase.rpc("report_menu_engineering", { p_month: monthDate }),
    supabase.rpc("report_channel_revenue", { p_month: monthDate }),
    supabase.from("menu_items").select("ingredient_cost").eq("restaurant_id", restaurantId),
  ]);

  const restaurant = restaurantRes.data;
  const summaryRows = (summaryRes.data ?? []) as {
    period: string;
    total_revenue: number;
    total_orders: number;
    days_in_period: number;
    table_count: number;
  }[];
  const thisRow = summaryRows.find((r) => r.period === "this");
  const prevRow = summaryRows.find((r) => r.period === "previous");
  const tableCount = thisRow?.table_count ?? 1;

  const revenue = thisRow?.total_revenue ?? 0;
  const orders = thisRow?.total_orders ?? 0;
  const prevRevenue = prevRow?.total_revenue ?? 0;
  const prevOrders = prevRow?.total_orders ?? 0;
  const prevDays = prevRow?.days_in_period ?? 30;

  const avgCheck = orders > 0 ? revenue / orders : 0;
  const prevAvgCheck = prevOrders > 0 ? prevRevenue / prevOrders : 0;
  const tableTurnover = tableCount > 0 ? orders / daysInPeriod / tableCount : 0;
  const prevTableTurnover = tableCount > 0 ? prevOrders / prevDays / tableCount : 0;

  const dailyRows = (dailyRes.data ?? []) as { day_of_month: number; revenue: number; order_count: number }[];
  const dailyThisMonth = dailyRows.map((r) => ({ day: r.day_of_month, revenue: r.revenue, orders: Number(r.order_count) }));

  // Same RPC, called for the previous month, so the trend chart can overlay both.
  const prevMonthDate = new Date(year, month - 2, 1);
  const prevRes = await supabase.rpc("report_daily_revenue", {
    p_month: `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}-01`,
  });
  const dailyPrevMonth = ((prevRes.data ?? []) as { day_of_month: number; revenue: number; order_count: number }[]).map(
    (r) => ({ day: r.day_of_month, revenue: r.revenue, orders: Number(r.order_count) }),
  );

  const heatmapRows = (heatmapRes.data ?? []) as { day_of_week: number; hour_of_day: number; order_count: number }[];
  const heatmap = heatmapRows.map((r) => ({ dayOfWeek: r.day_of_week, hourOfDay: r.hour_of_day, count: Number(r.order_count) }));

  const itemSales = (itemSalesRes.data ?? []) as { item_name: string; total_quantity: number; total_revenue: number }[];
  const sortedItems = itemSales.map((r) => ({ name: r.item_name, quantity: Number(r.total_quantity), revenue: r.total_revenue }));
  const bestSellers = sortedItems.slice(0, 5);
  const slowestMovers = sortedItems.slice(-5).reverse();

  const categoryRows = (categoryRes.data ?? []) as { category_name: string; revenue: number }[];
  const categoryTotal = categoryRows.reduce((s, r) => s + r.revenue, 0);
  const categoryRevenue = categoryRows.map((r) => ({
    name: r.category_name,
    revenue: r.revenue,
    share: categoryTotal > 0 ? (r.revenue / categoryTotal) * 100 : 0,
  }));

  const comboRows = (combosRes.data ?? []) as { item_a_name: string; item_b_name: string; order_count: number }[];
  const combos = comboRows.map((r) => ({ a: r.item_a_name, b: r.item_b_name, count: Number(r.order_count) }));

  const engineeringRows = (engineeringRes.data ?? []) as { item_name: string; quantity: number; margin_pct: number }[];
  const menuEngineering = engineeringRows.map((r) => ({ name: r.item_name, quantity: Number(r.quantity), marginPct: r.margin_pct }));

  const allCosts = (itemCountsRes.data ?? []) as { ingredient_cost: number | null }[];
  const totalItems = allCosts.length;
  const itemsWithCost = allCosts.filter((r) => r.ingredient_cost !== null).length;

  const channelRows = (channelRes.data ?? []) as { channel: string; delivery_platform: string | null; revenue: number }[];
  const dineIn = channelRows.filter((r) => r.channel === "dine_in").reduce((s, r) => s + r.revenue, 0);
  const takeout = channelRows.filter((r) => r.channel === "manual_pickup_entry").reduce((s, r) => s + r.revenue, 0);
  const grabfoodGross = channelRows
    .filter((r) => r.channel === "manual_delivery_entry" && r.delivery_platform === "grabfood")
    .reduce((s, r) => s + r.revenue, 0);
  const foodpandaGross = channelRows
    .filter((r) => r.channel === "manual_delivery_entry" && r.delivery_platform === "foodpanda")
    .reduce((s, r) => s + r.revenue, 0);
  const otherDeliveryGross = channelRows
    .filter((r) => r.channel === "manual_delivery_entry" && !r.delivery_platform)
    .reduce((s, r) => s + r.revenue, 0);

  const grabfoodPct = restaurant?.grabfood_commission_pct ?? null;
  const foodpandaPct = restaurant?.foodpanda_commission_pct ?? null;

  const channels: SalesReportData["channels"] = [];
  if (dineIn > 0) channels.push({ label: "Dine-in (direct)", gross: dineIn, net: dineIn, commissionEstimated: false });
  if (grabfoodGross > 0) {
    const rate = grabfoodPct ?? DEFAULT_COMMISSION_PCT;
    channels.push({ label: "GrabFood", gross: grabfoodGross, net: grabfoodGross * (1 - rate / 100), commissionEstimated: grabfoodPct === null });
  }
  if (foodpandaGross > 0) {
    const rate = foodpandaPct ?? DEFAULT_COMMISSION_PCT;
    channels.push({ label: "foodpanda", gross: foodpandaGross, net: foodpandaGross * (1 - rate / 100), commissionEstimated: foodpandaPct === null });
  }
  if (otherDeliveryGross > 0) {
    channels.push({ label: "Delivery (other)", gross: otherDeliveryGross, net: null, commissionEstimated: true });
  }
  if (takeout > 0) channels.push({ label: "Takeout", gross: takeout, net: takeout, commissionEstimated: false });

  const periodLabel = `${new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long" })} 1–${daysInPeriod}, ${year}`;
  const generatedLabel = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });

  return {
    restaurant: {
      name: restaurant?.name ?? "Your restaurant",
      grabfoodCommissionPct: grabfoodPct,
      foodpandaCommissionPct: foodpandaPct,
    },
    period: { year, month, label: periodLabel, generatedLabel, daysInPeriod },
    summary: { revenue, prevRevenue, avgCheck, prevAvgCheck, orders, prevOrders, tableTurnover, prevTableTurnover, tableCount },
    dailyThisMonth,
    dailyPrevMonth,
    weeklyBuckets: weekdayGroups(dailyThisMonth, daysInPeriod),
    heatmap,
    bestSellers,
    slowestMovers,
    categoryRevenue,
    combos,
    menuEngineering,
    itemsWithCost,
    totalItems,
    channels,
  };
}

export { pct, HOURS };
