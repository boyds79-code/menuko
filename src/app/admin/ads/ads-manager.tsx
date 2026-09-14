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
  return value === "warm" || value === "minimal" ? value : "classic";
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
          <h2 className="text-sm font-semibold">만든 광고</h2>
          {initialAds.map((ad) => (
            <div key={ad.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
              <div className="flex-1">
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
                  게재중
                </label>
                <button
                  onClick={() => {
                    if (confirm("이 광고를 삭제할까요?")) {
                      deleteAd(ad.id).then(() => router.refresh());
                    }
                  }}
                  className="text-muted underline"
                >
                  삭제
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
  const [templateId, setTemplateId] = useState<MenuTemplateId>("classic");
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
      <h2 className="text-sm font-semibold">새 광고 만들기</h2>

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
            헤드라인 (예: 식사 후 커피 한 잔 어때요?)
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              required
              className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            부제 (선택)
            <input
              value={subcopy}
              onChange={(e) => setSubcopy(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            링크 (선택, 위치/페이지 URL 등)
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            사진 (선택)
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageChange(file);
              }}
              className="text-xs"
            />
            {uploading && <span className="text-xs text-muted">업로드중...</span>}
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">미리보기</span>
          <AdBanner
            ad={{
              headline: headline || "헤드라인을 입력해 주세요",
              subcopy: subcopy || null,
              imageUrl,
              linkUrl: null,
              advertiserName: restaurantName,
              templateId,
            }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !headline.trim()}
        className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "만드는 중..." : "광고 만들기"}
      </button>
    </form>
  );
}
