import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isMenuColorId, isMenuLayoutId } from "@/lib/menu-templates";
import { PreviewMenuClient } from "./preview-menu-client";

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
    <PreviewMenuClient
      qrToken="preview"
      table={{ id: "preview", label: "Table 1" }}
      restaurant={{ ...restaurant, name: "Menuko Restaurant", about: "Home-style Filipino favorites, cooked fresh every day.", translations: null }}
      initialLayout={menuLayout}
      initialColor={menuColor}
      categories={DEMO_CATEGORIES}
      items={DEMO_ITEMS}
      ad={null}
    />
  );
}

// Mirrors the Filipino demo menu the owner set up (Starters → Noodles & Rice →
// Soups → Grilled & Roasted → Desserts & Drinks). The first four sit under a
// "Food" major so the tiered layouts (Jamezz Dark, Grid Popup) show their
// major/sub tabs; Classic and Minimal List only list categories that hold
// items directly, so they render the five flat sections.
const DEMO_CATEGORIES = [
  { id: "d-food", name: "Food", sort_order: 0, parent_id: null, translations: null },
  { id: "d-starters", name: "Starters", sort_order: 1, parent_id: "d-food", translations: null },
  { id: "d-noodles", name: "Noodles & Rice", sort_order: 2, parent_id: "d-food", translations: null },
  { id: "d-soups", name: "Soups", sort_order: 3, parent_id: "d-food", translations: null },
  { id: "d-grilled", name: "Grilled & Roasted", sort_order: 4, parent_id: "d-food", translations: null },
  { id: "d-sweets", name: "Desserts & Drinks", sort_order: 5, parent_id: null, translations: null },
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
  demoItem("d-starters", "lumpia", "Lumpiang Shanghai", 150, "Crispy pork spring rolls with sweet chili dip.", true),
  demoItem("d-starters", "inasal-skewers", "Chicken Inasal Skewers", 180, "Bacolod-style grilled chicken basted in annatto oil."),
  demoItem("d-starters", "ensaladang-talong", "Ensaladang Talong", 120, "Grilled eggplant salad with tomato, onion and salted egg."),
  demoItem("d-noodles", "pancit-canton", "Pancit Canton", 180, "Stir-fried egg noodles with pork, shrimp and vegetables."),
  demoItem("d-noodles", "sotanghon", "Sotanghon Guisado", 170, "Sautéed glass noodles with chicken and vegetables."),
  demoItem("d-noodles", "garlic-rice", "Garlic Fried Rice", 60, "Sinangag — fried rice with toasted garlic."),
  demoItem("d-soups", "sinigang", "Sinigang na Baboy", 220, "Sour tamarind pork soup with vegetables.", true),
  demoItem("d-soups", "bulalo", "Bulalo", 280, "Slow-simmered beef shank and bone marrow soup."),
  demoItem("d-grilled", "lechon", "Cebu Lechon", 320, "Crispy-skinned roast pork, Cebu style.", true),
  demoItem("d-grilled", "adobo", "Chicken Adobo", 200, "Braised in vinegar, soy, garlic and bay leaf.", true),
  demoItem("d-grilled", "liempo", "Grilled Liempo", 250, "Charcoal-grilled pork belly with spiced vinegar."),
  demoItem("d-grilled", "tilapia", "Inihaw na Tilapia", 240, "Whole grilled tilapia with tomato-onion salsa."),
  demoItem("d-sweets", "halo-halo", "Halo-Halo", 160, "Shaved ice, leche flan, ube and sweet beans.", true),
  demoItem("d-sweets", "buko-pandan", "Buko Pandan", 120, "Young coconut and pandan jelly in sweet cream."),
  demoItem("d-sweets", "calamansi-juice", "Calamansi Juice", 90, "Freshly squeezed Philippine lime, lightly sweetened."),
];
