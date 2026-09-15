import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { startOfTodayManila } from "@/lib/manila-time";
import { toOrderView, type RawOrderRow } from "@/lib/orders";
import { TodaySalesPanel } from "./today-sales-panel";

const ORDER_SELECT =
  "id, status, channel, note, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

export default async function AdminAnalyticsPage() {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("restaurant_id", ctx.restaurantId)
    .gte("created_at", startOfTodayManila().toISOString())
    .order("created_at", { ascending: true });

  const initialOrders = ((data ?? []) as unknown as RawOrderRow[]).map(toOrderView);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Analytics</h1>

      <TodaySalesPanel restaurantId={ctx.restaurantId} initialOrders={initialOrders} />

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
        <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
          Premium
        </span>
        <h2 className="text-base font-semibold">Deeper analytics — coming soon</h2>
        <p className="max-w-sm text-sm text-muted">
          Sales by day/time, bestseller rankings, average order counts per item, and more will be
          available on the premium plan. The first 2 months of premium are free to try.
        </p>
      </div>
    </main>
  );
}
