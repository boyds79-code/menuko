import Image from "next/image";
import type { MenuTemplateId } from "@/lib/menu-templates";

export type AdContent = {
  headline: string;
  subcopy: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  advertiserName: string;
  templateId: MenuTemplateId;
};

// Renders one ad banner. Used both on the customer confirmation screen and
// as a live preview in the owner's ad editor (/admin/ads) — one component,
// so what the owner previews is exactly what customers see.
export function AdBanner({ ad }: { ad: AdContent }) {
  const body = <AdBannerBody ad={ad} />;

  if (!ad.linkUrl) return body;

  return (
    <a href={ad.linkUrl} target="_blank" rel="noreferrer" className="block">
      {body}
    </a>
  );
}

function AdBannerBody({ ad }: { ad: AdContent }) {
  switch (ad.templateId) {
    case "warm":
      return (
        <div className="flex items-center gap-3 rounded-2xl bg-[#fff3e6] p-4">
          {ad.imageUrl && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
              <Image src={ad.imageUrl} alt="" fill className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-brand">
              {ad.advertiserName} 의 추천
            </p>
            <p className="truncate font-serif text-base font-bold text-brand">{ad.headline}</p>
            {ad.subcopy && <p className="truncate text-sm text-brand/80">{ad.subcopy}</p>}
          </div>
        </div>
      );
    case "minimal":
      return (
        <div className="flex items-center gap-3 border border-black p-4">
          {ad.imageUrl && (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden grayscale">
              <Image src={ad.imageUrl} alt="" fill className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-black/50">
              {ad.advertiserName}
            </p>
            <p className="truncate text-base font-semibold uppercase tracking-wide text-black">
              {ad.headline}
            </p>
            {ad.subcopy && <p className="truncate text-sm text-black/60">{ad.subcopy}</p>}
          </div>
        </div>
      );
    case "classic":
    default:
      return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          {ad.imageUrl && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
              <Image src={ad.imageUrl} alt="" fill className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">{ad.advertiserName}에서 보내는 소식</p>
            <p className="truncate font-semibold text-brand">{ad.headline}</p>
            {ad.subcopy && <p className="truncate text-sm text-muted">{ad.subcopy}</p>}
          </div>
        </div>
      );
  }
}
