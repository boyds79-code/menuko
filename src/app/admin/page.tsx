import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MenuManager } from "./menu-manager";

export default async function AdminMenuPage() {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, sort_order")
      .eq("restaurant_id", ctx.restaurantId)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id, category_id, name, price, photo_url, is_available, sort_order, description, ingredients, allergy_info, cook_time_minutes, is_featured",
      )
      .eq("restaurant_id", ctx.restaurantId)
      .order("sort_order"),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Menu</h1>
      <p className="-mt-2 text-xs text-muted">
        Enter your menu, prices, and photos — customers see it on the web order page the
        moment they scan a table&apos;s QR code. Pick a design under Settings.
      </p>
      <MenuManager
        restaurantId={ctx.restaurantId}
        initialCategories={categories ?? []}
        initialItems={items ?? []}
      />
    </main>
  );
}
