import type { BusinessType } from "@/lib/database.types";
import type { MenuTemplateId } from "@/lib/menu-templates";

export type AdCandidate = {
  id: string;
  restaurant_id: string;
  template_id: string;
  headline: string;
  subcopy: string | null;
  image_url: string | null;
  link_url: string | null;
  advertiser_name: string;
  advertiser_business_type: BusinessType;
};

// Cross-promotion targeting (spec section 8's "크로스 프로모션 광고", moved up
// on owner request as a slot to prepare in advance). Default rule: prefer an
// ad from the *opposite* business type (restaurant customer sees a cafe ad
// and vice versa). This is intentionally the only place that encodes the
// rule, since the owner expects it to change later (e.g. add geography).
export function pickCrossPromoAd(
  candidates: AdCandidate[],
  ownBusinessType: BusinessType,
): AdCandidate | null {
  if (candidates.length === 0) return null;

  const oppositeType = candidates.filter(
    (ad) => ad.advertiser_business_type !== ownBusinessType,
  );
  const pool = oppositeType.length > 0 ? oppositeType : candidates;

  return pool[Math.floor(Math.random() * pool.length)];
}

export function adTemplateId(ad: AdCandidate): MenuTemplateId {
  return ad.template_id === "warm" || ad.template_id === "minimal" ? ad.template_id : "classic";
}
