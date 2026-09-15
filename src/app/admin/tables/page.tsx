import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TablesManager } from "./tables-manager";

export default async function AdminTablesPage() {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const { data: tables } = await supabase
    .from("tables")
    .select("id, label, qr_token, capacity")
    .eq("restaurant_id", ctx.restaurantId)
    // Virtual tables (Delivery/Takeout, see 0011_manual_orders.sql) aren't
    // real seats — nothing to print a QR for.
    .eq("is_virtual", false)
    .order("label");

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Tables / QR codes</h1>
      <p className="text-sm text-muted">
        Print a QR code for each table. When a customer scans it, they go straight to that
        table&apos;s order screen.
      </p>
      <TablesManager initialTables={tables ?? []} />
    </main>
  );
}
