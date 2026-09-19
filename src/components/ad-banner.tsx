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
    case "heritage":
      return (
        <div className="flex items-center gap-3 rounded-lg border border-brand/40 bg-card p-4">
          {ad.imageUrl && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
              <Image src={ad.imageUrl} alt="" fill className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-brand">
              Recommended by {ad.advertiserName}
            </p>
            <p className="truncate text-base font-bold text-foreground">{ad.headline}</p>
            {ad.subcopy && <p className="truncate text-sm text-muted">{ad.subcopy}</p>}
          </div>
        </div>
      );
    case "nordic":
      return (
        <div className="flex items-center gap-3 border border-border p-4">
          {ad.imageUrl && (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden">
              <Image src={ad.imageUrl} alt="" fill className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
              {ad.advertiserName}
            </p>
            <p className="truncate text-base font-semibold uppercase tracking-wide text-foreground">
              {ad.headline}
            </p>
            {ad.subcopy && <p className="truncate text-sm text-muted">{ad.subcopy}</p>}
          </div>
        </div>
      );
    case "terracotta":
    default:
      return (
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
          {ad.imageUrl && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
              <Image src={ad.imageUrl} alt="" fill className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">A message from {ad.advertiserName}</p>
            <p className="truncate font-semibold text-brand">{ad.headline}</p>
            {ad.subcopy && <p className="truncate text-sm text-muted">{ad.subcopy}</p>}
          </div>
        </div>
      );
  }
}
