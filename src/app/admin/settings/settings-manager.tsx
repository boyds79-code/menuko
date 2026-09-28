"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { uploadPhoto } from "@/lib/upload-photo";
import { updateRestaurant } from "../settings-actions";
import { MenuManager } from "../menu-manager";
import { TablesManager } from "../tables/tables-manager";
import { AccountsManager } from "../accounts/accounts-manager";
import type { BusinessType } from "@/lib/database.types";
import { MENU_TEMPLATES, DIGITAL_TEMPLATE_STYLES, type MenuTemplateId } from "@/lib/menu-templates";
import { MENU_LANGUAGES, type MenuLanguage } from "@/lib/menu-i18n";

// Kept in sync with each [data-menu-theme] block in globals.css — just the
// 4 swatches shown while browsing a design that isn't applied yet.
const TEMPLATE_PALETTES: Record<MenuTemplateId, { brand: string; background: string; card: string; foreground: string }> = {
  terracotta: { brand: "#e0623a", background: "#fff8f5", card: "#fff1ea", foreground: "#2b1b17" },
  heritage: { brand: "#c5a880", background: "#faf6ef", card: "#fdfbf7", foreground: "#2c251e" },
  nordic: { brand: "#191c1d", background: "#faf9f7", card: "#ffffff", foreground: "#191c1d" },
  botanical: { brand: "#1e3a2b", background: "#f7f9f6", card: "#eff3ee", foreground: "#212623" },
};

type MenuCategory = { id: string; name: string; sort_order: number };
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

// Shown only until the owner has added real menu items — lets a brand-new
// restaurant still judge a design's color/style during onboarding, before
// there's anything real to preview.
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
  grabfood_commission_pct: number | null;
  foodpanda_commission_pct: number | null;
  enabled_languages: string[] | null;
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
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [about, setAbout] = useState(initial?.about ?? "");
  const [businessType, setBusinessType] = useState<BusinessType>(initial?.business_type ?? "restaurant");
  const [menuTemplate, setMenuTemplate] = useState<MenuTemplateId>(initial?.menu_template ?? "terracotta");
  const [candidateTemplate, setCandidateTemplate] = useState<MenuTemplateId>(initial?.menu_template ?? "terracotta");
  const [savingTemplate, setSavingTemplate] = useState(false);
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

  async function applyTemplate(id: MenuTemplateId) {
    setSavingTemplate(true);
    try {
      await updateRestaurant({ menuTemplate: id });
      setMenuTemplate(id);
      setCandidateTemplate(id);
      router.refresh();
    } finally {
      setSavingTemplate(false);
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

          <PaletteCard templateId={candidateTemplate} />

          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted">
              {candidateTemplate === menuTemplate ? "This is your live design." : "Not applied yet."}
            </p>
            {candidateTemplate !== menuTemplate && (
              <button
                type="button"
                onClick={() => applyTemplate(candidateTemplate)}
                disabled={savingTemplate}
                className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {savingTemplate ? "Applying…" : "Apply this design"}
              </button>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <MiniMenuPreview templateId={candidateTemplate} restaurantName={name} categories={categories} items={items} />
            <p className="text-xs text-muted">
              Roughly what customers see on their phone — full menu, scrollable.
            </p>
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
            Each table gets its own QR code automatically — open a table below to view or print it.
          </p>
          <a
            href={`/print/${restaurantId}/qr`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full border border-border px-4 py-2 text-xs text-muted transition hover:border-brand hover:text-brand"
          >
            Print all QR codes
          </a>
        </div>
        <TablesManager initialTables={tables} />
      </AccordionSection>

      <AccordionSection title="Payment Info">
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
      </AccordionSection>

      <AccordionSection title="Premium Settings">
        <p className="text-xs text-muted">
          Feeds your monthly Sales Report and the customer menu&apos;s language switcher — both
          premium features.
        </p>
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

type PreviewItem = { id: string; name: string; price: number; photo_url: string | null };

// A small, always-visible preview at roughly a phone's aspect ratio (the
// same ~9:19.5 shape as the customer order page) — not the live
// [qrToken]/order-client.tsx page itself (that stays untouched; this is a
// deliberately separate, hand-scaled approximation), but built from the
// same DIGITAL_TEMPLATE_STYLES tokens and the same card "variant" shapes
// (see RowCard in order-client.tsx) each template actually uses, so the
// color *and* layout feel — rounded photo-forward cards vs. Nordic's flat
// bordered ones, pill vs. underlined category labels — actually match,
// not just a same-colored generic grid.
function MiniMenuPreview({
  templateId,
  restaurantName,
  categories,
  items,
}: {
  templateId: MenuTemplateId;
  restaurantName: string;
  categories: MenuCategory[];
  items: MenuItem[];
}) {
  const style = DIGITAL_TEMPLATE_STYLES[templateId];
  const hasItems = items.length > 0;

  const displayCategories: { id: string; name: string; items: PreviewItem[] }[] = hasItems
    ? categories
        .map((c) => ({
          id: c.id,
          name: c.name,
          items: items.filter((i) => i.category_id === c.id).map((i) => ({ id: i.id, name: i.name, price: i.price, photo_url: i.photo_url })),
        }))
        .filter((c) => c.items.length > 0)
    : [
        {
          id: "sample-starters",
          name: "Starters",
          items: SAMPLE_ITEMS.map((s, i) => ({ id: `sample-${i}`, name: s.name, price: s.price, photo_url: s.photo })),
        },
      ];

  return (
    <div className="w-[300px] max-w-full shrink-0 overflow-hidden rounded-[26px] border border-border shadow-sm">
      <div data-menu-theme={templateId} className="flex max-h-[640px] w-full flex-col bg-background">
        <MiniHeader templateId={templateId} restaurantName={restaurantName} />
        <div className="flex-1 overflow-y-auto p-2.5">
          {displayCategories.map((category) => (
            <div key={category.id} className="mb-3.5">
              <MiniCategoryLabel templateId={templateId} style={style} name={category.name} />
              <div className="grid grid-cols-3 gap-2">
                {category.items.map((item) => (
                  <MiniCard key={item.id} variant={style.variant} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Structural echo of each template's real header (rounded-b-3xl curve for
// terracotta/botanical, plain dark block for heritage, bordered flat panel
// for nordic — see DIGITAL_TEMPLATE_STYLES) at a scale that fits a 190px
// frame instead of a full page.
function MiniHeader({ templateId, restaurantName }: { templateId: MenuTemplateId; restaurantName: string }) {
  const roundedBottom = templateId === "terracotta" || templateId === "botanical";
  return (
    <div
      className={`shrink-0 bg-header-dark px-2.5 py-2.5 ${roundedBottom ? "rounded-b-xl" : ""} ${
        templateId === "nordic" ? "border-b border-border" : ""
      }`}
    >
      <p className="truncate text-[13px] font-bold text-header-dark-foreground">{restaurantName || "Your Restaurant"}</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wide text-header-dark-foreground/60">Table 1</p>
    </div>
  );
}

function MiniCategoryLabel({
  templateId,
  style,
  name,
}: {
  templateId: MenuTemplateId;
  style: (typeof DIGITAL_TEMPLATE_STYLES)[MenuTemplateId];
  name: string;
}) {
  if (templateId === "terracotta") {
    return (
      <span className="mb-1.5 inline-block rounded-full bg-brand/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-brand">
        {name}
      </span>
    );
  }
  return (
    <span
      className={`mb-1.5 block text-[9px] font-semibold uppercase tracking-wide ${
        style.variant === "nordic" ? "border-b border-border pb-0.5 text-foreground" : "border-b border-brand/30 pb-0.5 text-brand"
      }`}
    >
      {name}
    </span>
  );
}

// Mirrors RowCard's three real shapes (order-client.tsx) at a smaller
// scale: default = rounded card, price badge overlapping the photo;
// nordic = flat bordered card, price + "+" chip below a divider; botanical
// = rounded card, plain price line under the name, no badge.
function MiniCard({ variant, item }: { variant: "default" | "nordic" | "botanical"; item: PreviewItem }) {
  if (variant === "nordic") {
    return (
      <div className="flex flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="relative h-16 w-full bg-background">
          {item.photo_url && <Image src={item.photo_url} alt={item.name} fill className="object-cover" sizes="100px" />}
        </div>
        <div className="flex flex-1 flex-col justify-between p-1.5">
          <p className="truncate text-[8.5px] font-bold text-foreground">{item.name}</p>
          <div className="mt-1 flex items-center justify-between border-t border-border pt-1">
            <span className="text-[7.5px] font-semibold text-foreground">₱{item.price}</span>
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-border text-[8px] font-bold text-foreground">+</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "botanical") {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="relative h-16 w-full bg-background">
          {item.photo_url && <Image src={item.photo_url} alt={item.name} fill className="object-cover" sizes="100px" />}
        </div>
        <div className="flex flex-col gap-0.5 p-1.5">
          <p className="truncate text-[8.5px] font-semibold text-foreground">{item.name}</p>
          <p className="text-[7.5px] font-semibold text-brand">₱{item.price}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-visible rounded-lg border border-border bg-card">
      <div className="relative h-16 w-full overflow-hidden rounded-t-lg bg-background">
        {item.photo_url && <Image src={item.photo_url} alt={item.name} fill className="object-cover" sizes="100px" />}
      </div>
      <div className="relative px-1.5 pt-2.5 pb-1.5">
        <span className="absolute -top-2 left-1.5 rounded-full bg-brand px-2 py-0.5 text-[7.5px] font-bold whitespace-nowrap text-brand-foreground shadow">
          ₱{item.price}
        </span>
        <p className="truncate text-[8.5px] font-medium text-foreground">{item.name}</p>
      </div>
    </div>
  );
}
