import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isMenuColorId, isMenuLayoutId } from "@/lib/menu-templates";
import { SettingsManager } from "./settings-manager";

export default async function AdminSettingsPage() {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const [{ data: restaurant }, { data: categories }, { data: items }, { data: tables }, { data: accounts }] =
    await Promise.all([
      supabase
        .from("restaurants")
        .select(
          "name, address, about, business_type, menu_layout, menu_color, payment_qr_url, payment_link, logo_url, grabfood_commission_pct, foodpanda_commission_pct, enabled_languages, plan",
        )
        .eq("id", ctx.restaurantId)
        .single(),
      supabase
        .from("menu_categories")
        .select("id, name, sort_order, parent_id")
        .eq("restaurant_id", ctx.restaurantId)
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select(
          "id, category_id, name, price, photo_url, is_available, sort_order, description, ingredients, allergy_info, cook_time_minutes, is_featured",
        )
        .eq("restaurant_id", ctx.restaurantId)
        .order("sort_order"),
      supabase
        .from("tables")
        .select("id, label, qr_token, capacity")
        .eq("restaurant_id", ctx.restaurantId)
        .eq("is_virtual", false)
        .order("label"),
      supabase
        .from("accounts")
        .select("id, email, role, created_at")
        .eq("restaurant_id", ctx.restaurantId)
        .order("role"),
    ]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Restaurant settings</h1>
      <SettingsManager
        restaurantId={ctx.restaurantId}
        initial={
          restaurant
            ? {
                ...restaurant,
                menu_layout: isMenuLayoutId(restaurant.menu_layout) ? restaurant.menu_layout : "classic",
                menu_color: isMenuColorId(restaurant.menu_color) ? restaurant.menu_color : "terracotta",
              }
            : null
        }
        categories={categories ?? []}
        items={items ?? []}
        tables={tables ?? []}
        accounts={accounts ?? []}
      />
    </main>
  );
}
