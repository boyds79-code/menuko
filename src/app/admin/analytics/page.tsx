import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { startOfTodayManila } from "@/lib/manila-time";
import { toOrderView, type RawOrderRow } from "@/lib/orders";
import { TodaySalesPanel } from "./today-sales-panel";
import { SalesInsights } from "./sales-insights";

const ORDER_SELECT =
  "id, status, channel, note, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

export default async function AdminAnalyticsPage() {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const [{ data }, { data: combos }, { data: restaurant }] = await Promise.all([
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("restaurant_id", ctx.restaurantId)
      .gte("created_at", startOfTodayManila().toISOString())
      .order("created_at", { ascending: true }),
    supabase.rpc("top_combos", { p_limit: 5 }),
    supabase.from("restaurants").select("plan").eq("id", ctx.restaurantId).single(),
  ]);

  const initialOrders = ((data ?? []) as unknown as RawOrderRow[]).map(toOrderView);
  const isPremium = restaurant?.plan === "premium";

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Analytics</h1>

      <TodaySalesPanel restaurantId={ctx.restaurantId} initialOrders={initialOrders} />

      <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Combo suggestions</h2>
        <p className="text-xs text-muted">
          Items customers keep ordering together — might be worth bundling into a combo.
        </p>
        {combos && combos.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {combos.map((combo, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm"
              >
                <span>
                  {combo.item_a_name} + {combo.item_b_name}
                </span>
                <span className="text-xs text-muted">
                  ordered together {combo.order_count}×
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            Not enough order history yet — check back once a few weeks of orders come in.
          </p>
        )}
      </section>

      {isPremium ? (
        <SalesInsights />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            Premium
          </span>
          <h2 className="text-base font-semibold">Deeper analytics</h2>
          <p className="max-w-sm text-sm text-muted">
            Best-selling items, order combos, and your best-selling day/hour over the last week or
            month — available on the premium plan (₱500/month, coming soon).
          </p>
        </div>
      )}
    </main>
  );
}
