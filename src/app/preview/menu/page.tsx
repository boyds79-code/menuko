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
//
// Always renders the fixed "Menuko Restaurant" Filipino demo menu (photos in
// public/menu-preview) rather than the owner's own menu, so every layout is
// compared on the same full, photo-rich menu with a real category hierarchy.
export default async function MenuPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const ctx = await requireStaff("owner");
  const search = await searchParams;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select(
      "id, name, about, payment_qr_url, payment_link, business_type, menu_layout, menu_color, plan, translations, enabled_languages",
    )
    .eq("id", ctx.restaurantId)
    .single();

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

  return (
    <OrderClient
      preview
      qrToken="preview"
      table={{ id: "preview", label: "Table 1" }}
      restaurant={{ ...restaurant, name: "Menuko Restaurant", about: "Home-style Filipino favorites, cooked fresh every day.", translations: null }}
      menuLayout={menuLayout}
      menuColor={menuColor}
      categories={DEMO_CATEGORIES}
      items={DEMO_ITEMS}
      ad={null}
    />
  );
}

const DEMO_CATEGORIES = [
  { id: "d-food", name: "Food", sort_order: 0, parent_id: null, translations: null },
  { id: "d-starters", name: "Starters", sort_order: 1, parent_id: "d-food", translations: null },
  { id: "d-mains", name: "Mains", sort_order: 2, parent_id: "d-food", translations: null },
  { id: "d-soups", name: "Soups", sort_order: 3, parent_id: "d-food", translations: null },
  { id: "d-noodles", name: "Noodles & Rice", sort_order: 4, parent_id: "d-food", translations: null },
  { id: "d-sweets", name: "Desserts & Drinks", sort_order: 5, parent_id: null, translations: null },
  { id: "d-desserts", name: "Desserts", sort_order: 6, parent_id: "d-sweets", translations: null },
  { id: "d-drinks", name: "Drinks", sort_order: 7, parent_id: "d-sweets", translations: null },
];

function demoItem(
  categoryId: string,
  photo: string,
  name: string,
  price: number,
  description: string,
  isFeatured = false,
) {
  return {
    id: `d-${photo}`,
    category_id: categoryId,
    name,
    price,
    photo_url: `/menu-preview/${photo}.webp`,
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

const DEMO_ITEMS = [
  demoItem("d-starters", "lumpia", "Lumpia Shanghai", 180, "Crispy pork spring rolls with sweet chili dip."),
  demoItem("d-starters", "ensaladang-talong", "Ensaladang Talong", 150, "Grilled eggplant salad with tomato, onion and salted egg."),
  demoItem("d-starters", "inasal-skewers", "Chicken Inasal Skewers", 220, "Bacolod-style grilled chicken basted in annatto oil."),
  demoItem("d-mains", "adobo", "Chicken Adobo", 240, "Braised in vinegar, soy, garlic and bay leaf.", true),
  demoItem("d-mains", "lechon", "Lechon Kawali", 320, "Crispy deep-fried pork belly with liver sauce.", true),
  demoItem("d-mains", "liempo", "Grilled Liempo", 290, "Charcoal-grilled pork belly with spiced vinegar."),
  demoItem("d-mains", "tilapia", "Fried Tilapia", 260, "Whole crispy tilapia with tomato-onion salsa."),
  demoItem("d-soups", "sinigang", "Sinigang na Baboy", 340, "Sour tamarind pork soup with vegetables."),
  demoItem("d-soups", "bulalo", "Bulalo", 420, "Slow-simmered beef shank and bone marrow soup."),
  demoItem("d-noodles", "pancit-canton", "Pancit Canton", 220, "Stir-fried egg noodles with pork, shrimp and vegetables."),
  demoItem("d-noodles", "sotanghon", "Sotanghon Guisado", 200, "Sautéed glass noodles with chicken and vegetables."),
  demoItem("d-noodles", "garlic-rice", "Garlic Rice", 60, "Sinangag — fried rice with toasted garlic."),
  demoItem("d-desserts", "halo-halo", "Halo-Halo", 160, "Shaved ice, leche flan, ube and sweet beans.", true),
  demoItem("d-desserts", "buko-pandan", "Buko Pandan", 120, "Young coconut and pandan jelly in sweet cream."),
  demoItem("d-drinks", "calamansi-juice", "Calamansi Juice", 90, "Freshly squeezed Philippine lime, lightly sweetened."),
];
