import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffHeader } from "@/components/staff-header";
import { toOrderView, type RawOrderRow } from "@/lib/orders";
import { KitchenBoard } from "./kitchen-board";

const ORDER_SELECT =
  "id, status, channel, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

export default async function KitchenPage() {
  const ctx = await requireStaff("kitchen");
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("restaurant_id", ctx.restaurantId)
    .in("status", ["open", "sent_to_kitchen", "preparing", "served"])
    .order("created_at", { ascending: true });

  const initialOrders = ((data ?? []) as unknown as RawOrderRow[]).map(
    toOrderView,
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <StaffHeader restaurantName={ctx.restaurantName} roleLabel="Kitchen" />
      <KitchenBoard restaurantId={ctx.restaurantId} initialOrders={initialOrders} />
    </div>
  );
}
