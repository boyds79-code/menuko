import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isMenuTemplateId } from "@/lib/menu-templates";
import { SettingsManager } from "./settings-manager";

export default async function AdminSettingsPage() {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, address, about, business_type, menu_template, payment_qr_url, payment_link, logo_url")
    .eq("id", ctx.restaurantId)
    .single();

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Restaurant settings</h1>
      <SettingsManager
        restaurantId={ctx.restaurantId}
        initial={
          restaurant
            ? {
                ...restaurant,
                menu_template: isMenuTemplateId(restaurant.menu_template) ? restaurant.menu_template : "terracotta",
              }
            : null
        }
      />
    </main>
  );
}
