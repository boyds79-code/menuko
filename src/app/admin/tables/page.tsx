import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TablesManager } from "./tables-manager";

export default async function AdminTablesPage() {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const { data: tables } = await supabase
    .from("tables")
    .select("id, label, qr_token")
    .eq("restaurant_id", ctx.restaurantId)
    .order("label");

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">테이블 / QR 코드</h1>
      <p className="text-sm text-muted">
        테이블마다 QR을 인쇄해 비치하세요. 손님이 스캔하면 해당 테이블의 주문 화면으로 바로 연결됩니다.
      </p>
      <TablesManager initialTables={tables ?? []} />
    </main>
  );
}
