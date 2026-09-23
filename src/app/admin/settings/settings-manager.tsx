"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { uploadPhoto } from "@/lib/upload-photo";
import { updateRestaurant } from "../settings-actions";
import type { BusinessType } from "@/lib/database.types";
import { MENU_TEMPLATES, type MenuTemplateId } from "@/lib/menu-templates";

// Kept in sync with each [data-menu-theme] block in globals.css — just the
// 4 swatches shown while browsing a design that isn't applied yet.
const TEMPLATE_PALETTES: Record<MenuTemplateId, { brand: string; background: string; card: string; foreground: string }> = {
  terracotta: { brand: "#e0623a", background: "#fff8f5", card: "#fff1ea", foreground: "#2b1b17" },
  heritage: { brand: "#c5a880", background: "#faf6ef", card: "#fdfbf7", foreground: "#2c251e" },
  nordic: { brand: "#191c1d", background: "#faf9f7", card: "#ffffff", foreground: "#191c1d" },
  botanical: { brand: "#1e3a2b", background: "#f7f9f6", card: "#eff3ee", foreground: "#212623" },
};

// Generic placeholder menu for the "preview a design" sample — deliberately
// unrelated to the owner's real dishes, since this is about showing the
// design's look, not this restaurant's actual menu.
const SAMPLE_ITEMS: { name: string; price: number; photo: string }[] = [
  { name: "Grilled Chicken Plate", price: 220, photo: "/marketing/book-japanese.webp" },
  { name: "Beef Pasta", price: 260, photo: "/marketing/book-italian.webp" },
  { name: "Garden Salad", price: 150, photo: "/marketing/book-korean.webp" },
];

type Restaurant = {
  name: string;
  address: string | null;
  about: string | null;
  business_type: BusinessType;
  menu_template: MenuTemplateId;
  payment_qr_url: string | null;
  payment_link: string | null;
  logo_url: string | null;
} | null;

export function SettingsManager({
  restaurantId,
  initial,
}: {
  restaurantId: string;
  initial: Restaurant;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [about, setAbout] = useState(initial?.about ?? "");
  const [businessType, setBusinessType] = useState<BusinessType>(initial?.business_type ?? "restaurant");
  const [menuTemplate, setMenuTemplate] = useState<MenuTemplateId>(initial?.menu_template ?? "terracotta");
  const [candidateTemplate, setCandidateTemplate] = useState<MenuTemplateId>(initial?.menu_template ?? "terracotta");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [paymentLink, setPaymentLink] = useState(initial?.payment_link ?? "");
  const [qrUrl, setQrUrl] = useState(initial?.payment_qr_url ?? null);
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  async function handleQrUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadPhoto("payment-qr", restaurantId, file);
      setQrUrl(url);
      await updateRestaurant({ paymentQrUrl: url });
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    try {
      const url = await uploadPhoto("restaurant-logo", restaurantId, file);
      setLogoUrl(url);
      await updateRestaurant({ logoUrl: url });
      router.refresh();
    } finally {
      setUploadingLogo(false);
    }
  }

  async function applyTemplate(id: MenuTemplateId) {
    setSavingTemplate(true);
    try {
      await updateRestaurant({ menuTemplate: id });
      setMenuTemplate(id);
      setCandidateTemplate(id);
      setSampleOpen(false);
      router.refresh();
    } finally {
      setSavingTemplate(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Menu design</h2>
        <p className="text-xs text-muted">
          Applies to your customer-facing web menu. Pick the one that matches your space.
        </p>
        <div className="flex flex-wrap gap-2">
          {MENU_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setCandidateTemplate(t.id)}
              title={t.description}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                candidateTemplate === t.id
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {candidateTemplate === menuTemplate ? (
          <p className="text-xs text-muted">This is your live design.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <PaletteCard templateId={candidateTemplate} />
            <p className="text-xs text-muted">Not applied yet.</p>
            <button
              type="button"
              onClick={() => setSampleOpen(true)}
              className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90"
            >
              Preview this design
            </button>
          </div>
        )}
      </div>

      {sampleOpen && (
        <SamplePreviewOverlay
          templateId={candidateTemplate}
          saving={savingTemplate}
          onClose={() => setSampleOpen(false)}
          onApply={() => applyTemplate(candidateTemplate)}
        />
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Restaurant info</h2>
        <label className="flex flex-col gap-1 text-sm">
          Logo (optional)
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => logoFileRef.current?.click()}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-background"
            >
              {logoUrl ? (
                <Image src={logoUrl} alt="Restaurant logo" fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                  Add logo
                </span>
              )}
              {uploadingLogo && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] text-white">
                  Uploading
                </span>
              )}
            </button>
            <input
              ref={logoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
                e.target.value = "";
              }}
            />
            <span className="text-xs text-muted">Shown if you add it — not required to get started.</span>
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Restaurant name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => updateRestaurant({ name })}
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Address
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={() => updateRestaurant({ address })}
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          About your restaurant
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            onBlur={() => updateRestaurant({ about })}
            rows={3}
            maxLength={280}
            placeholder="A short line customers see on your menu page — e.g. what makes your food special, or your story."
            className="resize-none rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
          <span className="text-xs text-muted">
            Shown under your restaurant name on the customer menu page. Optional.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Business type
          <select
            value={businessType}
            onChange={(e) => {
              const next = e.target.value as BusinessType;
              setBusinessType(next);
              updateRestaurant({ businessType: next });
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          >
            <option value="restaurant">Restaurant</option>
            <option value="cafe">Cafe</option>
          </select>
          <span className="text-xs text-muted">
            Used to target cross-promotion ads (restaurants see cafe ads and cafes see
            restaurant ads by default).
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Payment info</h2>
        <p className="text-xs text-muted">
          Upload a payment QR image you already have (GCash/Maya, etc.) and it&apos;s shown as-is
          on the customer order screen and cashier screen. Menuko never processes payments
          directly.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-background"
          >
            {qrUrl ? (
              <Image src={qrUrl} alt="Payment QR" fill className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs text-muted">
                Upload QR
              </span>
            )}
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                Uploading
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleQrUpload(file);
              e.target.value = "";
            }}
          />
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Payment link (optional — from PayMongo or another external provider)
            <input
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              onBlur={() => updateRestaurant({ paymentLink })}
              placeholder="https://..."
              className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// The color feel of a template being browsed (not yet applied) — plain
// labeled swatches, no hex codes, rather than a fake menu (there's nothing
// real to preview until the owner commits to it).
function PaletteCard({ templateId }: { templateId: MenuTemplateId }) {
  const p = TEMPLATE_PALETTES[templateId];
  const swatches: { label: string; color: string }[] = [
    { label: "Brand", color: p.brand },
    { label: "Background", color: p.background },
    { label: "Card", color: p.card },
    { label: "Text", color: p.foreground },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {swatches.map((s) => (
        <div key={s.label} className="flex flex-col items-center gap-1.5">
          <div
            className="h-10 w-full rounded-lg border border-border"
            style={{ backgroundColor: s.color }}
          />
          <span className="text-[11px] font-semibold text-foreground">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// A full-screen sample of the candidate design — generic placeholder dishes
// styled with the real [data-menu-theme] CSS scope (same tokens the actual
// customer order page uses), so it looks exactly like the real thing without
// touching the owner's actual menu data. "Apply" is the only thing that
// commits it.
function SamplePreviewOverlay({
  templateId,
  saving,
  onClose,
  onApply,
}: {
  templateId: MenuTemplateId;
  saving: boolean;
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <div
      data-menu-theme={templateId}
      className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-header-dark px-4 py-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-header-dark-foreground/70 uppercase">
            Sample preview — not your real menu
          </p>
          <h2 className="text-lg font-bold text-header-dark-foreground">Sample Restaurant</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-background/80 px-3 py-1.5 text-sm font-medium text-foreground"
        >
          Close
        </button>
      </div>

      <div className="flex-1 px-4 pt-5">
        <span className="mb-3 inline-block text-xs font-bold tracking-wide text-brand uppercase">
          Mains
        </span>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SAMPLE_ITEMS.map((item) => (
            <div key={item.name} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative h-24 bg-background">
                <Image src={item.photo} alt={item.name} fill className="object-cover" sizes="200px" />
              </div>
              <div className="p-2.5">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-sm font-semibold text-brand">₱{item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background p-4">
        <button
          type="button"
          onClick={onApply}
          disabled={saving}
          className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Applying…" : "Apply this design"}
        </button>
      </div>
    </div>
  );
}
