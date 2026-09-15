import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffHeader } from "@/components/staff-header";
import { toOrderView, type RawOrderRow } from "@/lib/orders";
import { CashierBoard } from "./cashier-board";
import { TableStatusBoard } from "./table-status-board";

const ORDER_SELECT =
  "id, status, channel, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

export default async function CashierPage() {
  const ctx = await requireStaff("cashier");
  const supabase = await createClient();

  const [{ data: orderRows }, { data: restaurant }, { data: tables }] = await Promise.all([
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("restaurant_id", ctx.restaurantId)
      .neq("status", "paid")
      .order("created_at", { ascending: true }),
    supabase
      .from("restaurants")
      .select("payment_qr_url, payment_link")
      .eq("id", ctx.restaurantId)
      .single(),
    supabase
      .from("tables")
      .select("id, label, occupied_since, occupied_source, first_order_at")
      .eq("restaurant_id", ctx.restaurantId)
      .order("label"),
  ]);

  const initialOrders = ((orderRows ?? []) as unknown as RawOrderRow[]).map(
    toOrderView,
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <StaffHeader restaurantName={ctx.restaurantName} roleLabel="Cashier" />
      <TableStatusBoard restaurantId={ctx.restaurantId} initialTables={tables ?? []} />
      <CashierBoard
        restaurantId={ctx.restaurantId}
        initialOrders={initialOrders}
        paymentQrUrl={restaurant?.payment_qr_url ?? null}
        paymentLink={restaurant?.payment_link ?? null}
      />
    </div>
  );
}
