import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isMenuColorId, isMenuLayoutId } from "@/lib/menu-templates";
import { OrderClient } from "@/app/order/[qrToken]/order-client";

// Owner-only preview of the real customer order page, rendered with a
// candidate layout/color straight from Settings > Menu design. Unlike the
// old /order/[qrToken]?previewLayout=… link it needs no table (a brand-new
// restaurant can preview before creating one), never marks a table as
// scanned, and OrderClient's `preview` flag keeps it from placing orders or
// subscribing to live table data.
export default async function MenuPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const ctx = await requireStaff("owner");
  const search = await searchParams;
  const supabase = await createClient();

  const [{ data: restaurant }, { data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("restaurants")
      .select(
        "id, name, about, payment_qr_url, payment_link, business_type, menu_layout, menu_color, plan, translations, enabled_languages",
      )
      .eq("id", ctx.restaurantId)
      .single(),
    supabase
      .from("menu_categories")
      .select("id, name, sort_order, parent_id, translations")
      .eq("restaurant_id", ctx.restaurantId)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id, category_id, name, price, photo_url, is_available, sort_order, description, ingredients, allergy_info, cook_time_minutes, is_featured, translations",
      )
      .eq("restaurant_id", ctx.restaurantId)
      .eq("is_available", true)
      .order("sort_order"),
  ]);

  if (!restaurant) return null;

  const layoutParam = search.layout;
  const colorParam = search.color;
  const menuLayout =
    typeof layoutParam === "string" && isMenuLayoutId(layoutParam)
      ? layoutParam
      : isMenuLayoutId(restaurant.menu_layout)
        ? restaurant.menu_layout
        : "classic";
  const menuColor =
    typeof colorParam === "string" && isMenuColorId(colorParam)
      ? colorParam
      : isMenuColorId(restaurant.menu_color)
        ? restaurant.menu_color
        : "terracotta";

  // An empty menu would make every layout look identical (just a header),
  // so until the owner adds real items show a small sample menu that
  // exercises the category hierarchy, photos and the featured row.
  const hasItems = (items ?? []).length > 0;
  const previewCategories = hasItems ? (categories ?? []) : SAMPLE_CATEGORIES;
  const previewItems = hasItems ? (items ?? []) : SAMPLE_ITEMS;

  return (
    <OrderClient
      preview
      qrToken="preview"
      table={{ id: "preview", label: "Table 1" }}
      restaurant={restaurant}
      menuLayout={menuLayout}
      menuColor={menuColor}
      categories={previewCategories}
      items={previewItems}
      ad={null}
    />
  );
}

const SAMPLE_CATEGORIES = [
  { id: "s-food", name: "Food", sort_order: 0, parent_id: null, translations: null },
  { id: "s-starters", name: "Starters", sort_order: 1, parent_id: "s-food", translations: null },
  { id: "s-mains", name: "Mains", sort_order: 2, parent_id: "s-food", translations: null },
  { id: "s-drinks", name: "Drinks", sort_order: 3, parent_id: null, translations: null },
  { id: "s-coffee", name: "Coffee", sort_order: 4, parent_id: "s-drinks", translations: null },
];

function sampleItem(
  id: string,
  categoryId: string,
  name: string,
  price: number,
  photo: string,
  description: string,
  isFeatured = false,
) {
  return {
    id,
    category_id: categoryId,
    name,
    price,
    photo_url: `/marketing/${photo}`,
    is_available: true,
    sort_order: 0,
    description,
    ingredients: null,
    allergy_info: null,
    cook_time_minutes: 15,
    is_featured: isFeatured,
    translations: null,
  };
}

const SAMPLE_ITEMS = [
  sampleItem("s-1", "s-starters", "Kimchi Pancake", 180, "book-korean.webp", "Crispy pan-fried pancake with aged kimchi.", true),
  sampleItem("s-2", "s-starters", "Salmon Sashimi", 320, "book-japanese.webp", "Fresh-cut salmon with wasabi and soy."),
  sampleItem("s-3", "s-mains", "Beef Pasta", 260, "book-italian.webp", "Slow-cooked beef ragù over fresh pasta.", true),
  sampleItem("s-4", "s-mains", "Sweet & Sour Pork", 280, "book-chinese.webp", "Crispy pork in a tangy pineapple glaze."),
  sampleItem("s-5", "s-mains", "Chicken Adobo", 220, "book-filipino.webp", "Braised in vinegar, soy and garlic.", true),
  sampleItem("s-6", "s-coffee", "Café Latte", 140, "book-cafe.webp", "Double shot espresso with steamed milk."),
];
