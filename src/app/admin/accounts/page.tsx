import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AccountsManager } from "./accounts-manager";

export default async function AdminAccountsPage() {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, email, role, created_at")
    .eq("restaurant_id", ctx.restaurantId)
    .order("role");

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">계정 관리</h1>
      <p className="text-sm text-muted">
        무료 플랜은 오너 1 + 주방 1 + 캐셔 1 계정을 지원합니다. 추가 계정은 프리미엄 플랜이 필요합니다.
      </p>
      <AccountsManager initialAccounts={accounts ?? []} />
    </main>
  );
}
