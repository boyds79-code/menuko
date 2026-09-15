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
      <h1 className="text-lg font-semibold">Accounts</h1>
      <p className="text-sm text-muted">
        The free plan supports 1 owner + 1 kitchen + 1 cashier account. Additional accounts
        require the premium plan.
      </p>
      <AccountsManager initialAccounts={accounts ?? []} />
    </main>
  );
}
