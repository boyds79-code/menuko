import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pickCrossPromoAd, adTemplateId, type AdCandidate } from "@/lib/pick-ad";
import { isMenuColorId, isMenuLayoutId } from "@/lib/menu-templates";
import type { AdContent } from "@/components/ad-banner";
import { OrderClient } from "./order-client";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ qrToken: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { qrToken } = await params;
  const search = await searchParams;
  const supabase = await createClient();

  const { data: table } = await supabase
    .from("tables")
    .select("id, label, restaurant_id")
    .eq("qr_token", qrToken)
    .single();

  if (!table) notFound();

  // Fire-and-forget: lets the cashier board show "waiting on table X" and
  // eventually the 10-minute no-order alert. A no-op if the table was
  // already occupied (won't reset another customer's stall timer), and
  // never blocks rendering the menu if it fails for any reason.
  void supabase.rpc("mark_table_scanned", { p_qr_token: qrToken });

  const [{ data: restaurant }, { data: categories }, { data: items }, { data: adRows }] =
    await Promise.all([
      supabase
        .from("restaurants")
        .select(
          "id, name, about, payment_qr_url, payment_link, business_type, menu_layout, menu_color, plan, translations, enabled_languages",
        )
        .eq("id", table.restaurant_id)
        .single(),
      supabase
        .from("menu_categories")
        .select("id, name, sort_order, parent_id, translations")
        .eq("restaurant_id", table.restaurant_id)
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select(
          "id, category_id, name, price, photo_url, is_available, sort_order, description, ingredients, allergy_info, cook_time_minutes, is_featured, translations",
        )
        .eq("restaurant_id", table.restaurant_id)
        .eq("is_available", true)
        .order("sort_order"),
      // Cross-promotion ad candidates (spec 8's "크로스 프로모션 광고" moved up
      // per owner request) — everyone else's active ads, targeting logic in
      // src/lib/pick-ad.ts. Empty when no other restaurant has an ad yet.
      supabase
        .from("ads")
        .select("id, restaurant_id, template_id, headline, subcopy, image_url, link_url, restaurants ( name, business_type )")
        .eq("is_active", true)
        .neq("restaurant_id", table.restaurant_id)
        .limit(50),
    ]);

  if (!restaurant) notFound();

  const candidates: AdCandidate[] = (adRows ?? []).flatMap((row) => {
    const advertiser = Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants;
    if (!advertiser) return [];
    return [
      {
        id: row.id,
        restaurant_id: row.restaurant_id,
        template_id: row.template_id,
        headline: row.headline,
        subcopy: row.subcopy,
        image_url: row.image_url,
        link_url: row.link_url,
        advertiser_name: advertiser.name,
        advertiser_business_type: advertiser.business_type,
      },
    ];
  });

  const chosenAd = pickCrossPromoAd(candidates, restaurant.business_type);
  const ad: AdContent | null = chosenAd
    ? {
        headline: chosenAd.headline,
        subcopy: chosenAd.subcopy,
        imageUrl: chosenAd.image_url,
        linkUrl: chosenAd.link_url,
        advertiserName: chosenAd.advertiser_name,
        templateId: adTemplateId(chosenAd),
      }
    : null;

  let menuLayout = isMenuLayoutId(restaurant.menu_layout) ? restaurant.menu_layout : "classic";
  let menuColor = isMenuColorId(restaurant.menu_color) ? restaurant.menu_color : "terracotta";

  // Settings > Menu Setting's "full-screen preview" link — lets the owner
  // see a design they haven't applied yet rendered on the real customer
  // page (the only way a preview can ever be trustworthy), without writing
  // anything to the DB. Gated to that restaurant's own owner so a
  // random customer can't use it to see a different-looking menu than
  // what's actually live.
  const previewLayoutParam = search.previewLayout;
  const previewColorParam = search.previewColor;
  if (typeof previewLayoutParam === "string" || typeof previewColorParam === "string") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: account } = await supabase
        .from("accounts")
        .select("role, restaurant_id")
        .eq("id", user.id)
        .single();
      if (account?.role === "owner" && account.restaurant_id === table.restaurant_id) {
        if (typeof previewLayoutParam === "string" && isMenuLayoutId(previewLayoutParam)) menuLayout = previewLayoutParam;
        if (typeof previewColorParam === "string" && isMenuColorId(previewColorParam)) menuColor = previewColorParam;
      }
    }
  }

  return (
    <OrderClient
      qrToken={qrToken}
      table={{ id: table.id, label: table.label }}
      restaurant={restaurant}
      menuLayout={menuLayout}
      menuColor={menuColor}
      categories={categories ?? []}
      items={items ?? []}
      ad={ad}
    />
  );
}
