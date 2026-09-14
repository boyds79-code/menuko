import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMenuTemplateId } from "@/lib/menu-templates";
import { PrintView } from "./print-view";

export default async function PrintMenuPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, address, menu_template")
    .eq("id", restaurantId)
    .single();

  if (!restaurant) notFound();

  const [{ data: categories }, { data: items }, { data: auth }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("id, category_id, name, price, is_available, sort_order")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .order("sort_order"),
    supabase.auth.getUser(),
  ]);

  // Template switching is only offered to this restaurant's own owner — a
  // public print link (printed on paper, shared around) shouldn't be able
  // to redirect a random visitor into a login flow when they tap a button.
  let canEditTemplate = false;
  if (auth.user) {
    const { data: account } = await supabase
      .from("accounts")
      .select("role, restaurant_id")
      .eq("id", auth.user.id)
      .single();
    canEditTemplate = account?.role === "owner" && account.restaurant_id === restaurantId;
  }

  const menuTemplate = isMenuTemplateId(restaurant.menu_template) ? restaurant.menu_template : "classic";

  return (
    <PrintView
      restaurant={restaurant}
      menuTemplate={menuTemplate}
      canEditTemplate={canEditTemplate}
      categories={categories ?? []}
      items={items ?? []}
    />
  );
}
