import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsManager } from "./settings-manager";

export default async function AdminSettingsPage() {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, address, business_type, payment_qr_url, payment_link")
    .eq("id", ctx.restaurantId)
    .single();

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">매장 설정</h1>
      <SettingsManager restaurantId={ctx.restaurantId} initial={restaurant} />
    </main>
  );
}
