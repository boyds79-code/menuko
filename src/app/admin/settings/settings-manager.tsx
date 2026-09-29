"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { uploadPhoto } from "@/lib/upload-photo";
import { updateRestaurant } from "../settings-actions";
import { MenuManager } from "../menu-manager";
import { TablesManager } from "../tables/tables-manager";
import { AccountsManager } from "../accounts/accounts-manager";
import type { BusinessType } from "@/lib/database.types";
import { MENU_LAYOUTS, MENU_COLORS, type MenuLayoutId, type MenuColorId } from "@/lib/menu-templates";
import { MENU_LANGUAGES, type MenuLanguage } from "@/lib/menu-i18n";
import { PREVIEW_DESIGN_MESSAGE } from "../../preview/menu/preview-menu-client";

// Kept in sync with each [data-menu-theme] block in globals.css — just the
// 4 swatches shown while browsing a color that isn't applied yet.
const COLOR_PALETTES: Record<MenuColorId, { brand: string; background: string; card: string; foreground: string }> = {
  terracotta: { brand: "#e0623a", background: "#fff8f5", card: "#fff1ea", foreground: "#2b1b17" },
  heritage: { brand: "#c5a880", background: "#faf6ef", card: "#fdfbf7", foreground: "#2c251e" },
  nordic: { brand: "#191c1d", background: "#faf9f7", card: "#ffffff", foreground: "#191c1d" },
  botanical: { brand: "#1e3a2b", background: "#f7f9f6", card: "#eff3ee", foreground: "#212623" },
};

type MenuCategory = { id: string; name: string; sort_order: number; parent_id: string | null };
type MenuItem = {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  photo_url: string | null;
  is_available: boolean;
  sort_order: number;
  description: string | null;
  ingredients: string | null;
  allergy_info: string | null;
  cook_time_minutes: number | null;
  is_featured: boolean;
};
type Table = { id: string; label: string; qr_token: string; capacity: number };
type Account = { id: string; email: string; role: string; created_at: string };

type Restaurant = {
  name: string;
  address: string | null;
  about: string | null;
  business_type: BusinessType;
  menu_layout: MenuLayoutId;
  menu_color: MenuColorId;
  payment_qr_url: string | null;
  payment_link: string | null;
  logo_url: string | null;
  grabfood_commission_pct: number | null;
  foodpanda_commission_pct: number | null;
  enabled_languages: string[] | null;
  plan: string;
} | null;

export function SettingsManager({
  restaurantId,
  initial,
  categories,
  items,
  tables,
  accounts,
}: {
  restaurantId: string;
  initial: Restaurant;
  categories: MenuCategory[];
  items: MenuItem[];
  tables: Table[];
  accounts: Account[];
}) {
  const router = useRouter();
  const isPremium = initial?.plan === "premium";
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [about, setAbout] = useState(initial?.about ?? "");
  const [businessType, setBusinessType] = useState<BusinessType>(initial?.business_type ?? "restaurant");
  const [menuLayout, setMenuLayout] = useState<MenuLayoutId>(initial?.menu_layout ?? "classic");
  const [candidateLayout, setCandidateLayout] = useState<MenuLayoutId>(initial?.menu_layout ?? "classic");
  const [menuColor, setMenuColor] = useState<MenuColorId>(initial?.menu_color ?? "terracotta");
  const [candidateColor, setCandidateColor] = useState<MenuColorId>(initial?.menu_color ?? "terracotta");
  const [savingDesign, setSavingDesign] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [paymentLink, setPaymentLink] = useState(initial?.payment_link ?? "");
  const [qrUrl, setQrUrl] = useState(initial?.payment_qr_url ?? null);
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [grabfoodPct, setGrabfoodPct] = useState(initial?.grabfood_commission_pct?.toString() ?? "");
  const [foodpandaPct, setFoodpandaPct] = useState(initial?.foodpanda_commission_pct?.toString() ?? "");
  const [enabledLanguages, setEnabledLanguages] = useState<MenuLanguage[]>(
    (initial?.enabled_languages as MenuLanguage[] | null) ?? MENU_LANGUAGES.map((l) => l.code),
  );
  const [setupConfirmed, setSetupConfirmed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const requiredFilledCount = [name, address, about, businessType].filter((v) => v && v.trim()).length;
  const requiredComplete = requiredFilledCount === 4;
  const designApplied = candidateLayout === menuLayout && candidateColor === menuColor;

  function toggleLanguage(code: MenuLanguage) {
    if (code === "en") return; // English is always on — the guaranteed fallback.
    setEnabledLanguages((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
      updateRestaurant({ enabledLanguages: next });
      return next;
    });
  }

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

  async function applyDesign(layout: MenuLayoutId, color: MenuColorId) {
    setSavingDesign(true);
    try {
      await updateRestaurant({ menuLayout: layout, menuColor: color });
      setMenuLayout(layout);
      setMenuColor(color);
      setCandidateLayout(layout);
      setCandidateColor(color);
      router.refresh();
    } finally {
      setSavingDesign(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <AccordionSection title="Basic Information" badge={`${requiredFilledCount}/4`}>
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
          Restaurant/Cafe name <span className="text-red-600">*</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => updateRestaurant({ name })}
            required
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Address <span className="text-red-600">*</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={() => updateRestaurant({ address })}
            required
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
          <span className="text-xs text-muted">
            Required — used to confirm you&apos;re on-site before approving a customer&apos;s cancel/change
            request, so notifications aren&apos;t sent when you&apos;re away.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          About your restaurant <span className="text-red-600">*</span>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            onBlur={() => updateRestaurant({ about })}
            rows={3}
            maxLength={280}
            required
            placeholder="A short line customers see on your menu page — e.g. what makes your food special, or your story."
            className="resize-none rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
          <span className="text-xs text-muted">
            Shown under your restaurant name on the customer menu page.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Business type <span className="text-red-600">*</span>
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
      </AccordionSection>

      <AccordionSection title="Menu Setting">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Menu design</h3>
          <p className="text-xs text-muted">
            Applies to your customer-facing web menu. Pick a layout and a color that matches your space.
          </p>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted uppercase">Layout</span>
            <div className="flex flex-wrap gap-2">
              {MENU_LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setCandidateLayout(l.id)}
                  title={l.description}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    candidateLayout === l.id
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border text-muted hover:border-brand hover:text-brand"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted uppercase">Color</span>
            <div className="flex flex-wrap gap-2">
              {MENU_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCandidateColor(c.id)}
                  title={c.description}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    candidateColor === c.id
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border text-muted hover:border-brand hover:text-brand"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <PaletteCard colorId={candidateColor} />

          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted">{designApplied ? "This is your live design." : "Not applied yet."}</p>
            {!designApplied && (
              <button
                type="button"
                onClick={() => applyDesign(candidateLayout, candidateColor)}
                disabled={savingDesign}
                className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {savingDesign ? "Applying…" : "Apply this design"}
              </button>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90"
            >
              Open full-screen preview · compare all layouts →
            </button>
            {/* The real customer order page (owner-only /preview/menu route),
                not a hand-drawn thumbnail — a scaled-down sketch made all
                four layouts look the same. Scrollable, full phone size. */}
            <MenuPreviewFrame
              layoutId={candidateLayout}
              colorId={candidateColor}
              className="h-[760px] w-[390px] max-w-full rounded-[28px] border-4 border-foreground/80 bg-background shadow-lg"
              title="Customer menu preview"
            />
            <p className="text-xs text-muted">Preview uses a sample menu (Menuko Restaurant) so every layout is compared on the same dishes.</p>
          </div>

        </div>

        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-semibold">Category &amp; item setting</h3>
          <MenuManager restaurantId={restaurantId} initialCategories={categories} initialItems={items} />
        </div>
      </AccordionSection>

      <AccordionSection title="Table Setting">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">
            Each table gets its own QR code automatically. Print them plain or on a ready-made design to place on each table.
          </p>
          <a
            href={`/print/${restaurantId}/qr`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full bg-brand px-4 py-2 text-xs font-medium text-brand-foreground transition hover:opacity-90"
          >
            Print QR codes — choose a design
          </a>
        </div>
        <TablesManager restaurantId={restaurantId} initialTables={tables} />
      </AccordionSection>

      <AccordionSection title="Payment Info">
        <div className="flex flex-col gap-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">⚠️ Not connected to any payment system</p>
          <p>
            The QR image and link you add here are only <strong>shown</strong> to customers (order
            screen) and your cashier — nothing more. Menuko does not receive, process, or verify
            payments, and orders are <strong>not</strong> marked paid automatically.
          </p>
          <p>
            Your cashier must check each payment in your own GCash/Maya/bank app before confirming
            it in Menuko.
          </p>
        </div>
        <p className="text-xs text-muted">
          Upload a payment QR image you already have (GCash/Maya, etc.) and it&apos;s shown as-is
          on the customer order screen and cashier screen.
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
      </AccordionSection>

      <AccordionSection title="Premium Settings" badge={isPremium ? "Active" : "Premium only"}>
        {isPremium ? (
          <p className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-xs">
            ✓ Your Premium plan is active — these settings feed your monthly Sales Report and the
            customer menu&apos;s language switcher.
          </p>
        ) : (
          <div className="flex flex-col gap-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">⚠️ Not used on the Free plan</p>
            <p>
              You&apos;re on the Free (basic) plan, so <strong>nothing in this section has any effect</strong>:
              there&apos;s no monthly Sales Report, and customers only see the menu in English. You can
              fill these in now — they&apos;re saved and start working only after you upgrade to Premium.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Delivery commission rates</h3>
          <p className="text-xs text-muted">
            Your actual commission rate per platform, so the Sales Report can show real net
            revenue instead of an industry-average estimate. Optional.
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-sm">
              GrabFood commission (%)
              <input
                value={grabfoodPct}
                onChange={(e) => setGrabfoodPct(e.target.value)}
                onBlur={() => {
                  const parsed = grabfoodPct.trim() ? Number(grabfoodPct) : null;
                  updateRestaurant({ grabfoodCommissionPct: parsed !== null && Number.isNaN(parsed) ? null : parsed });
                }}
                placeholder="e.g. 26"
                inputMode="decimal"
                className="w-28 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              foodpanda commission (%)
              <input
                value={foodpandaPct}
                onChange={(e) => setFoodpandaPct(e.target.value)}
                onBlur={() => {
                  const parsed = foodpandaPct.trim() ? Number(foodpandaPct) : null;
                  updateRestaurant({
                    foodpandaCommissionPct: parsed !== null && Number.isNaN(parsed) ? null : parsed,
                  });
                }}
                placeholder="e.g. 26"
                inputMode="decimal"
                className="w-28 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Customer menu languages</h3>
          <p className="text-xs text-muted">
            English is always available. Tap the languages your customers actually use — fewer
            options keeps the language menu quick to scan.
          </p>
          <div className="flex flex-wrap gap-2">
            {MENU_LANGUAGES.map((l) => {
              const on = l.code === "en" || enabledLanguages.includes(l.code);
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => toggleLanguage(l.code)}
                  disabled={l.code === "en"}
                  title={l.native}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    on
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border text-muted hover:border-brand hover:text-brand"
                  } ${l.code === "en" ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection title="Invite Kitchen / Cashier Accounts" badge="Optional">
        <p className="text-xs text-muted">
          The free plan supports 1 owner + 1 kitchen + 1 cashier account. Additional accounts
          require the premium plan.
        </p>
        <AccountsManager initialAccounts={accounts} />

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setSetupConfirmed(true)}
            disabled={!requiredComplete}
            className="self-start rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
          {!requiredComplete && (
            <span className="text-xs text-muted">
              Finish the required fields in Basic Information ({requiredFilledCount}/4) to enable this.
            </span>
          )}
          {requiredComplete && setupConfirmed && (
            <span className="text-xs font-semibold text-brand">✓ Setup complete!</span>
          )}
        </div>
      </AccordionSection>

      {previewOpen && (
        <FullScreenMenuPreview
          layoutId={candidateLayout}
          colorId={candidateColor}
          applied={designApplied}
          saving={savingDesign}
          onLayoutChange={setCandidateLayout}
          onColorChange={setCandidateColor}
          onApply={() => applyDesign(candidateLayout, candidateColor)}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

// Collapsed by default so the page doesn't dump everything on screen at
// once — tap a header to reveal that section.
function AccordionSection({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <details name="settings-accordion" className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold">
          {title}
          {badge && <span className="ml-2 text-xs font-normal text-muted">({badge})</span>}
        </span>
        <span className="text-muted transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-border p-4">{children}</div>
    </details>
  );
}

// The color feel of a color identity being browsed (not yet applied) —
// plain labeled swatches, no hex codes, rather than a fake menu (there's
// nothing real to preview until the owner commits to it).
function PaletteCard({ colorId }: { colorId: MenuColorId }) {
  const p = COLOR_PALETTES[colorId];
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

// The real customer page for the demo menu, loaded once. Later layout/color
// changes are posted into the already-loaded page (see
// preview/menu/preview-menu-client.tsx) instead of changing the iframe's
// src, so switching designs re-renders instantly with no server round-trip,
// auth check, or photo reload.
function MenuPreviewFrame({ layoutId, colorId, className, title }: { layoutId: MenuLayoutId; colorId: MenuColorId; className: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [src] = useState(() => `/preview/menu?layout=${layoutId}&color=${colorId}`);
  const sendDesign = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: PREVIEW_DESIGN_MESSAGE, layout: layoutId, color: colorId }, window.location.origin);
  }, [layoutId, colorId]);
  // Also re-sent from onLoad, in case a chip was tapped while the page was
  // still loading (before it started listening).
  useEffect(() => {
    sendDesign();
  }, [sendDesign]);
  return <iframe ref={frameRef} src={src} onLoad={sendDesign} className={className} title={title} />;
}

// Takes over the whole viewport so each layout renders at real phone size.
// "Compare" puts all four layouts side by side in the chosen color — the
// only way the structural differences (tabs vs list vs grid vs dark) are
// actually obvious; clicking a column picks that layout.
function FullScreenMenuPreview({
  layoutId,
  colorId,
  applied,
  saving,
  onLayoutChange,
  onColorChange,
  onApply,
  onClose,
}: {
  layoutId: MenuLayoutId;
  colorId: MenuColorId;
  applied: boolean;
  saving: boolean;
  onLayoutChange: (id: MenuLayoutId) => void;
  onColorChange: (id: MenuColorId) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const [compare, setCompare] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-lg text-muted transition hover:text-foreground"
        >
          ×
        </button>
        <p className="text-sm font-semibold">Menu preview</p>

        <div className="flex rounded-full border border-border p-0.5 text-sm">
          {([true, false] as const).map((isCompare) => (
            <button
              key={String(isCompare)}
              type="button"
              onClick={() => setCompare(isCompare)}
              className={`rounded-full px-3 py-1 transition ${compare === isCompare ? "bg-brand text-brand-foreground" : "text-muted hover:text-foreground"}`}
            >
              {isCompare ? "Compare all 4" : "Single"}
            </button>
          ))}
        </div>

        {!compare && (
          <div className="flex flex-wrap gap-1.5">
            {MENU_LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onLayoutChange(l.id)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  layoutId === l.id ? "border-brand bg-brand/10 text-brand" : "border-border text-muted hover:border-brand hover:text-brand"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {MENU_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onColorChange(c.id)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                colorId === c.id ? "border-brand bg-brand/10 text-brand" : "border-border text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {applied ? (
            <span className="text-xs text-muted">This is your live design.</span>
          ) : (
            <button
              type="button"
              onClick={onApply}
              disabled={saving}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Applying…" : `Apply ${MENU_LAYOUTS.find((l) => l.id === layoutId)?.label} · ${MENU_COLORS.find((c) => c.id === colorId)?.label}`}
            </button>
          )}
        </div>
      </div>

      {compare ? (
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-4">
          {MENU_LAYOUTS.map((l) => (
            <div key={l.id} className="flex min-h-0 w-[375px] shrink-0 flex-col gap-2">
              <button
                type="button"
                onClick={() => onLayoutChange(l.id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  layoutId === l.id ? "border-brand bg-brand text-brand-foreground" : "border-border text-muted hover:border-brand hover:text-brand"
                }`}
              >
                {layoutId === l.id ? `✓ ${l.label}` : `Choose ${l.label}`}
              </button>
              <MenuPreviewFrame
                layoutId={l.id}
                colorId={colorId}
                className={`min-h-0 w-full flex-1 rounded-2xl border-2 bg-background ${layoutId === l.id ? "border-brand" : "border-border"}`}
                title={`${l.label} preview`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 justify-center p-4">
          <MenuPreviewFrame
            layoutId={layoutId}
            colorId={colorId}
            className="h-full w-[430px] max-w-full rounded-[28px] border-4 border-foreground/80 bg-background shadow-xl"
            title="Menu preview"
          />
        </div>
      )}
    </div>
  );
}
