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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Menu</h1>
        <a
          href={`/print/${ctx.restaurantId}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-brand hover:text-brand"
        >
          Open printable menu
        </a>
      </div>
      <p className="-mt-2 text-xs text-muted">
        Enter your menu, prices, and photos and both the customer-facing web menu and the
        printable menu are generated from the same data automatically. Pick a design under
        &ldquo;Open printable menu&rdquo; — it applies to the web menu too.
      </p>
      <MenuManager
        restaurantId={ctx.restaurantId}
        initialCategories={categories ?? []}
        initialItems={items ?? []}
      />
    </main>
  );
}
