import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffHeader } from "@/components/staff-header";
import { toOrderView, type RawOrderRow } from "@/lib/orders";
import { CashierBoard } from "./cashier-board";
import { TableStatusBoard } from "./table-status-board";
import { NewOrderForm } from "./new-order-form";
import { ChangeRequestsPanel } from "./change-requests-panel";

const ORDER_SELECT =
  "id, status, channel, note, payment_proof_url, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

export default async function CashierPage() {
  const ctx = await requireStaff("cashier");
  const supabase = await createClient();

  const [{ data: orderRows }, { data: restaurant }, { data: tables }, { data: categories }, { data: items }] =
    await Promise.all([
      supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("restaurant_id", ctx.restaurantId)
        .not("status", "in", "(paid,cancelled)")
        .order("created_at", { ascending: true }),
      supabase
        .from("restaurants")
        .select("payment_qr_url, payment_link")
        .eq("id", ctx.restaurantId)
        .single(),
      supabase
        .from("tables")
        .select("id, label, capacity, occupied_since, occupied_source, first_order_at")
        .eq("restaurant_id", ctx.restaurantId)
        .eq("is_virtual", false)
        .order("label"),
      supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", ctx.restaurantId)
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select("id, category_id, name, price")
        .eq("restaurant_id", ctx.restaurantId)
        .eq("is_available", true)
        .order("sort_order"),
    ]);

  const initialOrders = ((orderRows ?? []) as unknown as RawOrderRow[]).map(
    toOrderView,
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <StaffHeader restaurantName={ctx.restaurantName} roleLabel="Cashier" />
      <TableStatusBoard restaurantId={ctx.restaurantId} initialTables={tables ?? []} />
      <ChangeRequestsPanel restaurantId={ctx.restaurantId} menuItems={items ?? []} />
      <div className="p-4 pb-0">
        <NewOrderForm categories={categories ?? []} items={items ?? []} />
      </div>
      <CashierBoard
        restaurantId={ctx.restaurantId}
        initialOrders={initialOrders}
        paymentQrUrl={restaurant?.payment_qr_url ?? null}
        paymentLink={restaurant?.payment_link ?? null}
      />
    </div>
  );
}
