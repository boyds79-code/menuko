import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pickCrossPromoAd, adTemplateId, type AdCandidate } from "@/lib/pick-ad";
import { isMenuTemplateId } from "@/lib/menu-templates";
import type { AdContent } from "@/components/ad-banner";
import { OrderClient } from "./order-client";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const { qrToken } = await params;
  const supabase = await createClient();

  const { data: table } = await supabase
    .from("tables")
    .select("id, label, restaurant_id")
    .eq("qr_token", qrToken)
    .single();

  if (!table) notFound();

  const [{ data: restaurant }, { data: categories }, { data: items }, { data: adRows }] =
    await Promise.all([
      supabase
        .from("restaurants")
        .select("id, name, payment_qr_url, payment_link, business_type, menu_template")
        .eq("id", table.restaurant_id)
        .single(),
      supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", table.restaurant_id)
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select("id, category_id, name, price, photo_url, is_available, sort_order")
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

  const menuTemplate = isMenuTemplateId(restaurant.menu_template) ? restaurant.menu_template : "classic";

  return (
    <OrderClient
      qrToken={qrToken}
      table={{ id: table.id, label: table.label }}
      restaurant={restaurant}
      menuTemplate={menuTemplate}
      categories={categories ?? []}
      items={items ?? []}
      ad={ad}
    />
  );
}
