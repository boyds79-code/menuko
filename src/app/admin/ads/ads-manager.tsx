"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdBanner } from "@/components/ad-banner";
import { MENU_TEMPLATES, type MenuTemplateId } from "@/lib/menu-templates";
import { uploadPhoto } from "@/lib/upload-photo";
import { createAd, updateAd, deleteAd } from "../ads-actions";

type Ad = {
  id: string;
  template_id: string;
  headline: string;
  subcopy: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  created_at: string;
};

function toMenuTemplateId(value: string): MenuTemplateId {
  return value === "heritage" || value === "nordic" ? value : "terracotta";
}

export function AdsManager({
  restaurantId,
  restaurantName,
  initialAds,
}: {
  restaurantId: string;
  restaurantName: string;
  initialAds: Ad[];
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <AdComposer restaurantId={restaurantId} restaurantName={restaurantName} onMutate={() => router.refresh()} />

      {initialAds.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Your ads</h2>
          {initialAds.map((ad) => (
            <div key={ad.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
              <div data-menu-theme={toMenuTemplateId(ad.template_id)} className="flex-1">
                <AdBanner
                  ad={{
                    headline: ad.headline,
                    subcopy: ad.subcopy,
                    imageUrl: ad.image_url,
                    linkUrl: ad.link_url,
                    advertiserName: restaurantName,
                    templateId: toMenuTemplateId(ad.template_id),
                  }}
                />
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <label className="flex items-center gap-1.5 text-muted">
                  <input
                    type="checkbox"
                    checked={ad.is_active}
                    onChange={(e) => updateAd(ad.id, { isActive: e.target.checked }).then(() => router.refresh())}
                  />
                  Active
                </label>
                <button
                  onClick={() => {
                    if (confirm("Delete this ad?")) {
                      deleteAd(ad.id).then(() => router.refresh());
                    }
                  }}
                  className="text-muted underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdComposer({
  restaurantId,
  restaurantName,
  onMutate,
}: {
  restaurantId: string;
  restaurantName: string;
  onMutate: () => void;
}) {
  const [templateId, setTemplateId] = useState<MenuTemplateId>("terracotta");
  const [headline, setHeadline] = useState("");
  const [subcopy, setSubcopy] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleImageChange(file: File) {
    setUploading(true);
    try {
      const url = await uploadPhoto("ad-images", restaurantId, file);
      setImageUrl(url);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!headline.trim()) return;
    setSubmitting(true);
    try {
      await createAd({ templateId, headline, subcopy, imageUrl, linkUrl });
      setHeadline("");
      setSubcopy("");
      setLinkUrl("");
      setImageUrl(null);
      onMutate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Create a new ad</h2>

      <div className="flex flex-wrap gap-2">
        {MENU_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => setTemplateId(tpl.id)}
            title={tpl.description}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              templateId === tpl.id
                ? "border-brand bg-brand/10 text-brand"
                : "border-border text-muted hover:border-brand hover:text-brand"
            }`}
          >
            {tpl.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Headline (e.g. How about a coffee after your meal?)
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              required
              className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Subtext (optional)
            <input
              value={subcopy}
              onChange={(e) => setSubcopy(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Link (optional — location, page URL, etc.)
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Photo (optional)
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageChange(file);
              }}
              className="text-xs"
            />
            {uploading && <span className="text-xs text-muted">Uploading...</span>}
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Preview</span>
          <div data-menu-theme={templateId}>
            <AdBanner
              ad={{
                headline: headline || "Enter a headline",
                subcopy: subcopy || null,
                imageUrl,
                linkUrl: null,
                advertiserName: restaurantName,
                templateId,
              }}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !headline.trim()}
        className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Creating..." : "Create ad"}
      </button>
    </form>
  );
}
