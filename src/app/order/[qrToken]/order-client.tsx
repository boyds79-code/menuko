"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { formatPeso } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import type { OrderStatus } from "@/lib/database.types";
import { DIGITAL_TEMPLATE_STYLES, type MenuTemplateId } from "@/lib/menu-templates";
import { AdBanner, type AdContent } from "@/components/ad-banner";
import { uploadPaymentProof, type UploadPaymentProofState } from "./actions";
import { MENU_LANGUAGES, RTL_LANGUAGES, tr, ui, type MenuLanguage } from "@/lib/menu-i18n";
import type { Json } from "@/lib/database.types";

// The DB column is generic `jsonb` (typed as `Json`), but the
// translate-content edge function always writes the narrower
// `{lang: {field: string}}` shape (see 0025_menu_translations.sql) — `tr()`
// in menu-i18n.ts casts to that shape internally.
type Translations = Json;

type Category = { id: string; name: string; sort_order: number; translations: Translations };
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
  translations: Translations;
};
type Restaurant = {
  id: string;
  name: string;
  about: string | null;
  payment_qr_url: string | null;
  payment_link: string | null;
  plan: string;
  translations: Translations;
};

type CartLine = { item: MenuItem; quantity: number };
type ConfirmationLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
};
type Confirmation = {
  orderId: string;
  accessToken: string;
  lines: ConfirmationLine[];
  total: number;
};
type ChangeRequest = {
  id: string;
  kind: "cancel" | "edit";
  status: "pending" | "approved" | "denied";
  denyReason: string | null;
};

function storageKey(qrToken: string) {
  return `menuko:order:${qrToken}`;
}

function CallServerButton({ calling, called, onCall, lang }: { calling: boolean; called: boolean; onCall: () => void; lang: MenuLanguage }) {
  return (
    <button onClick={onCall} disabled={calling || called} className="shrink-0 rounded-full border border-brand px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand hover:text-brand-foreground disabled:opacity-60">
      {called ? ui(lang, "callServerCalled") : calling ? ui(lang, "callServerCalling") : ui(lang, "callServer")}
    </button>
  );
}

// Premium-only — a restaurant on the free plan never gets translated
// content in its `translations` columns (see 0025_menu_translations.sql's
// trigger gate), so showing the switcher there would just offer languages
// that silently fall back to English for everything. Same pill shape/size
// as CallServerButton (stacked above it in the header) so the two read as
// a matched pair of controls, not one icon-only afterthought — opens a
// grid of 2-letter language codes (full native name on hover/long-press
// via the title attribute), closes on selection or outside click.
function LanguageSwitcher({ lang, onChange }: { lang: MenuLanguage; onChange: (lang: MenuLanguage) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        className="shrink-0 rounded-full border border-brand px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand hover:text-brand-foreground"
      >
        Language
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 grid w-40 grid-cols-3 gap-1 rounded-lg border border-border bg-card p-1.5 shadow-lg">
            {MENU_LANGUAGES.map((option) => (
              <button
                key={option.code}
                title={option.native}
                onClick={() => {
                  onChange(option.code);
                  setOpen(false);
                }}
                className={`rounded-md py-1.5 text-center text-xs font-semibold uppercase transition-colors hover:bg-background ${option.code === lang ? "bg-brand/15 text-brand" : "text-foreground"}`}
              >
                {option.code}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function OrderClient({ qrToken, table, restaurant, menuTemplate, categories, items, ad }: { qrToken: string; table: { id: string; label: string }; restaurant: Restaurant; menuTemplate: MenuTemplateId; categories: Category[]; items: MenuItem[]; ad: AdContent | null }) {
  const supabase = createClient();
  const isPremium = restaurant.plan === "premium";
  // Remembered per browser (not per restaurant) — a customer who picks
  // Korean at one restaurant probably wants Korean at the next one too.
  // Only ever set to a non-English value when the restaurant is premium
  // (the switcher itself is hidden otherwise), so a free-tier menu always
  // renders in the owner's original English regardless of a stale value
  // from a previous premium restaurant.
  const [lang, setLang] = useState<MenuLanguage>("en");
  useEffect(() => {
    const saved = localStorage.getItem("menuko:lang") as MenuLanguage | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage needs an effect (unavailable during SSR/first render)
    if (saved && isPremium) setLang(saved);
  }, [isPremium]);
  function changeLang(next: MenuLanguage) {
    setLang(next);
    localStorage.setItem("menuko:lang", next);
  }
  const [cart, setCart] = useState<Record<string, number>>({});
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [status, setStatus] = useState<OrderStatus>("open");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tapping any item photo (in a category row or the Our Best row) opens
  // this full-screen detail view — photos are visible by default (no
  // accordion), each category scrolls horizontally when it has more items
  // than fit on screen.
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null);
  const [dismissedRequestId, setDismissedRequestId] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState(false);
  const [requestingCancel, setRequestingCancel] = useState(false);
  const [callingServer, setCallingServer] = useState(false);
  const [serverCalled, setServerCalled] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  // Owner-curated highlights (Settings > Menu) — capped at 3 regardless of
  // how many are marked, same as the mobile admin's own cap.
  const featuredItems = useMemo(() => items.filter((i) => i.is_featured).slice(0, 3), [items]);

  const cartLines: CartLine[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, quantity]) => ({ item: itemsById.get(itemId)!, quantity }))
    .filter((line) => line.item);

  const cartTotal = cartLines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);
  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);

  function setQty(itemId: string, quantity: number) {
    setCart((prev) => ({ ...prev, [itemId]: Math.max(0, quantity) }));
  }

  // Ties to the table's QR token, not the order — a customer can call for
  // help before placing an order at all. The server only keeps one pending
  // call per table (see 0020_server_calls.sql), so this cooldown is just
  // UI feedback, not the real dedup guard.
  async function callServer() {
    setCallingServer(true);
    try {
      await supabase.rpc("request_server_call", { p_qr_token: qrToken });
      setServerCalled(true);
      setTimeout(() => setServerCalled(false), 60_000);
    } finally {
      setCallingServer(false);
    }
  }

  async function placeOrder() {
    if (cartLines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("create_order", {
        p_qr_token: qrToken,
        p_items: cartLines.map((l) => ({
          menu_item_id: l.item.id,
          quantity: l.quantity,
        })),
      });

      if (rpcError || !data || data.length === 0) {
        throw rpcError ?? new Error("Failed to place the order.");
      }

      const { order_id, access_token } = data[0];
      const lines: ConfirmationLine[] = cartLines.map((l) => ({
        id: l.item.id,
        name: l.item.name,
        quantity: l.quantity,
        unitPrice: l.item.price,
      }));
      setConfirmation({
        orderId: order_id,
        accessToken: access_token,
        lines,
        total: cartTotal,
      });
      setStatus("open");
      setCart({});
      try {
        sessionStorage.setItem(storageKey(qrToken), JSON.stringify({ orderId: order_id, accessToken: access_token }));
      } catch {
        // Private browsing / storage disabled — confirmation just won't
        // survive a refresh, order itself already succeeded.
      }
    } catch {
      setError("Failed to place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Re-fetches an order's items/status/change-request from scratch — used
  // both for the one-time rehydration below and every time the realtime
  // channel says something about this order changed (an edit approval
  // changes order_items, not just orders.status, so a full re-fetch is
  // simpler and more correct than patching individual fields in place).
  async function syncOrder(orderId: string, accessToken: string) {
    const { data } = await supabase.rpc("get_order_for_customer", {
      p_order_id: orderId,
      p_access_token: accessToken,
    });
    if (!data || data.length === 0) return;
    const lines: ConfirmationLine[] = data.map((row) => ({
      id: row.item_id,
      name: row.item_name ?? "(removed item)",
      quantity: row.quantity,
      unitPrice: row.unit_price_snapshot,
    }));
    const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    setConfirmation({ orderId, accessToken, lines, total });
    setStatus(data[0].status);
    const first = data[0];
    setChangeRequest(
      first.change_request_id
        ? {
            id: first.change_request_id,
            kind: first.change_request_kind as ChangeRequest["kind"],
            status: first.change_request_status as ChangeRequest["status"],
            denyReason: first.change_request_deny_reason,
          }
        : null,
    );
  }

  // Rehydrate the confirmation screen if the customer reloads the page
  // (e.g. phone screen locked) after already placing an order.
  useEffect(() => {
    let stored: { orderId: string; accessToken: string } | null = null;
    try {
      const raw = sessionStorage.getItem(storageKey(qrToken));
      if (raw) stored = JSON.parse(raw);
    } catch {
      stored = null;
    }
    if (!stored) return;
    // Deliberate mount-time fetch to rehydrate the confirmation screen —
    // not the accidental-extra-render footgun this rule is meant to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncOrder(stored.orderId, stored.accessToken);
    // Only run once on mount — this is a one-time rehydration, not a
    // subscription (the realtime effect below keeps status live).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!confirmation) return;
    const channel = supabase
      .channel(`order-${confirmation.orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${confirmation.orderId}`,
        },
        () => syncOrder(confirmation.orderId, confirmation.accessToken),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // confirmation.lines/total change on every sync — only orderId/accessToken
    // identify which channel to hold open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmation?.orderId, confirmation?.accessToken, supabase]);

  async function requestCancel() {
    if (!confirmation) return;
    setRequestingCancel(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("request_order_cancel", {
        p_order_id: confirmation.orderId,
        p_access_token: confirmation.accessToken,
      });
      if (rpcError) throw rpcError;
      await syncOrder(confirmation.orderId, confirmation.accessToken);
    } catch {
      setError("Couldn't send the cancellation request. Please tell a staff member directly.");
    } finally {
      setRequestingCancel(false);
    }
  }

  function startEditRequest() {
    if (!confirmation) return;
    const seeded: Record<string, number> = {};
    for (const line of confirmation.lines) seeded[line.id] = line.quantity;
    setCart(seeded);
    setEditingRequest(true);
    setError(null);
  }

  async function sendEditRequest() {
    if (!confirmation || cartLines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("request_order_edit", {
        p_order_id: confirmation.orderId,
        p_access_token: confirmation.accessToken,
        p_items: cartLines.map((l) => ({
          menu_item_id: l.item.id,
          quantity: l.quantity,
        })),
      });
      if (rpcError) throw rpcError;
      setCart({});
      setEditingRequest(false);
      await syncOrder(confirmation.orderId, confirmation.accessToken);
    } catch {
      setError("Couldn't send the change request. Please tell a staff member directly.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation && !editingRequest) {
    return <ConfirmationView restaurant={restaurant} table={table} menuTemplate={menuTemplate} confirmation={confirmation} status={status} ad={ad} changeRequest={changeRequest} dismissedRequestId={dismissedRequestId} onDismissChangeRequest={() => changeRequest && setDismissedRequestId(changeRequest.id)} requestingCancel={requestingCancel} onRequestCancel={requestCancel} onStartEdit={startEditRequest} onOrderMore={() => setConfirmation(null)} callingServer={callingServer} serverCalled={serverCalled} onCallServer={callServer} lang={lang} isPremium={isPremium} onChangeLang={changeLang} />;
  }

  const style = DIGITAL_TEMPLATE_STYLES[menuTemplate];

  return (
    <div data-menu-theme={menuTemplate} dir={RTL_LANGUAGES.has(lang) ? "rtl" : "ltr"} className={`flex min-h-full flex-1 flex-col pb-24 ${style.page}`}>
      <header className={`flex items-start justify-between gap-3 ${style.header}`}>
        <div className="min-w-0">
          <h1 className={style.headerTitle}>{restaurant.name}</h1>
          {restaurant.about && <p className="mt-1 line-clamp-2 text-xs leading-snug text-header-dark-foreground/80">{tr(restaurant.translations, lang, "about", restaurant.about)}</p>}
          <p className={`${style.headerSubtitle} mt-1`}>{table.label}</p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2">
          {isPremium && <LanguageSwitcher lang={lang} onChange={changeLang} />}
          <CallServerButton calling={callingServer} called={serverCalled} onCall={callServer} lang={lang} />
        </div>
      </header>

      {featuredItems.length > 0 && (
        <div className={`flex gap-3 overflow-x-auto px-4 pb-1 ${style.featuredOverlap}`}>
          {featuredItems.map((item) =>
            style.variant === "nordic" ? (
              <button key={item.id} onClick={() => setDetailItem(item)} className="flex w-[220px] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-brand">
                <div className="relative h-28 w-full overflow-hidden bg-background">
                  {item.photo_url ? <Image src={item.photo_url} alt="" fill className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs text-muted">Menuko</span>}
                  <span className="absolute top-2.5 left-2.5 rounded bg-foreground px-2 py-0.5 text-[10px] font-medium tracking-wider text-background uppercase">{ui(lang, "ourBest")}</span>
                </div>
                <div className="p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-bold text-foreground">{tr(item.translations, lang, "name", item.name)}</p>
                    <span className="font-mono text-xs font-bold whitespace-nowrap text-foreground">{formatPeso(item.price)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    {item.cook_time_minutes ? <span className="font-mono text-[10px] text-muted">{item.cook_time_minutes} {ui(lang, "min")}</span> : <span />}
                    <span className="text-xs font-semibold text-foreground">{ui(lang, "detailsArrow")}</span>
                  </div>
                </div>
              </button>
            ) : (
              <button key={item.id} onClick={() => setDetailItem(item)} className="relative h-[150px] w-[220px] shrink-0 overflow-hidden rounded-2xl shadow-lg transition-opacity hover:opacity-95">
                {item.photo_url ? <Image src={item.photo_url} alt="" fill className="object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-border text-xs text-muted">Menuko</span>}
                <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
                <span className="absolute bottom-3 left-3 rounded-full bg-brand px-3 py-1 text-xs font-bold text-brand-foreground">{ui(lang, "ourBest")}</span>
                <span className="absolute right-3 bottom-3 max-w-[55%] truncate text-right text-xs font-semibold text-white">{tr(item.translations, lang, "name", item.name)}</span>
              </button>
            ),
          )}
        </div>
      )}

      {editingRequest && (
        <div className="mx-4 mt-4 flex items-center justify-between rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-sm">
          <span>{ui(lang, "adjustItemsHint")}</span>
          <button
            onClick={() => {
              setEditingRequest(false);
              setCart({});
              setError(null);
            }}
            className="text-xs text-muted underline"
          >
            {ui(lang, "cancel")}
          </button>
        </div>
      )}

      <main className="flex flex-1 flex-col gap-5 p-4">
        {categories.map((category) => {
          const categoryItems = items.filter((i) => i.category_id === category.id);
          if (categoryItems.length === 0) return null;
          const categoryName = tr(category.translations, lang, "name", category.name);
          return (
            <section key={category.id}>
              <h2 className={style.categoryTitle}>{categoryName}</h2>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {categoryItems.map((item, idx) => (
                  <RowCard key={item.id} item={item} onClick={() => setDetailItem(item)} variant={style.variant} eyebrow={`${categoryName.toUpperCase()} ${String(idx + 1).padStart(2, "0")}`} lang={lang} />
                ))}
              </div>
            </section>
          );
        })}
        {items.length === 0 && <p className="text-sm text-muted">{ui(lang, "noMenuItems")}</p>}
        <p className="pt-2 text-center text-[11px] text-muted">
          {ui(lang, "byOrderingAgree")}{" "}
          <Link href="/terms" className="underline">
            {ui(lang, "terms")}
          </Link>{" "}
          {ui(lang, "and")}{" "}
          <Link href="/privacy" className="underline">
            {ui(lang, "privacyPolicy")}
          </Link>
          .
        </p>
      </main>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg">
          {error && (
            <p role="alert" aria-live="polite" className="mb-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <button onClick={editingRequest ? sendEditRequest : () => setReviewOpen(true)} disabled={submitting} className={style.variant === "nordic" ? "flex w-full items-center justify-between rounded bg-brand px-5 py-3.5 text-xs font-bold tracking-wider text-brand-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-60" : "flex w-full items-center justify-between rounded-full bg-brand px-5 py-3 font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"}>
            <span>{submitting ? (editingRequest ? ui(lang, "sendingRequest") : ui(lang, "placingOrder")) : editingRequest ? `${ui(lang, "sendChangeRequest")} (${cartCount})` : `${ui(lang, "reviewOrder")} (${cartCount})`}</span>
            <span className={style.variant === "nordic" ? "font-mono normal-case" : ""}>{formatPeso(cartTotal)}</span>
          </button>
        </div>
      )}

      {reviewOpen && !editingRequest && (
        <ReviewSheet
          lines={cartLines}
          total={cartTotal}
          variant={style.variant}
          submitting={submitting}
          onConfirm={async () => {
            await placeOrder();
            setReviewOpen(false);
          }}
          onClose={() => setReviewOpen(false)}
          lang={lang}
        />
      )}

      {detailItem && (
        <ItemDetailOverlay
          item={detailItem}
          variant={style.variant}
          quantity={cart[detailItem.id] ?? 0}
          onChangeQty={(qty) => setQty(detailItem.id, qty)}
          onClose={() => setDetailItem(null)}
          canCheckout={cartCount > 0}
          onGoToCheckout={() => {
            setDetailItem(null);
            setReviewOpen(true);
          }}
          lang={lang}
        />
      )}
    </div>
  );
}

function ReviewSheet({ lines, total, variant, submitting, onConfirm, onClose, lang }: { lines: CartLine[]; total: number; variant: "default" | "nordic" | "botanical"; submitting: boolean; onConfirm: () => void; onClose: () => void; lang: MenuLanguage }) {
  const priceClass = variant === "nordic" ? "font-mono" : "";

  // DESIGN.md's own "Floating Bill / Order Tray" spec: frosted linen blur,
  // rounded-xl top corners, a prominent Forest Sage checkout trigger.
  if (variant === "botanical") {
    return (
      <div className="fixed inset-0 z-20 flex items-end justify-center bg-foreground/40" onClick={onClose}>
        <div role="dialog" aria-modal="true" aria-label={ui(lang, "reviewYourOrder")} onClick={(e) => e.stopPropagation()} className="w-full max-w-md overscroll-contain rounded-t-2xl bg-card/95 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" aria-hidden />
          <h2 className="mb-3 text-lg font-semibold tracking-tight">{ui(lang, "reviewYourOrder")}</h2>
          <ul className="flex flex-col gap-2.5 text-sm">
            {lines.map((line) => (
              <li key={line.item.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate text-foreground/90">
                  {tr(line.item.translations, lang, "name", line.item.name)} × {line.quantity}
                </span>
                <span className="shrink-0 font-medium text-foreground tabular-nums">{formatPeso(line.item.price * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
            <span>{ui(lang, "total")}</span>
            <span className="text-brand">{formatPeso(total)}</span>
          </div>
          <button onClick={onConfirm} disabled={submitting} className="mt-4 w-full rounded-lg bg-brand py-3.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
            {submitting ? ui(lang, "placingOrder") : ui(lang, "sendOrder")}
          </button>
          <button onClick={onClose} className="mt-2 w-full text-center text-sm text-muted underline">
            {ui(lang, "backToMenu")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/45" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={ui(lang, "reviewYourOrder")} onClick={(e) => e.stopPropagation()} className="w-full max-w-md overscroll-contain rounded-t-3xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" aria-hidden />
        <h2 className="mb-3 font-semibold">{ui(lang, "reviewYourOrder")}</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {lines.map((line) => (
            <li key={line.item.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {tr(line.item.translations, lang, "name", line.item.name)} × {line.quantity}
              </span>
              <span className={`shrink-0 tabular-nums ${priceClass}`}>{formatPeso(line.item.price * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
          <span>{ui(lang, "total")}</span>
          <span className={priceClass}>{formatPeso(total)}</span>
        </div>
        <button onClick={onConfirm} disabled={submitting} className={variant === "nordic" ? "mt-4 w-full rounded bg-brand py-3.5 text-xs font-bold tracking-wider text-brand-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-60" : "mt-4 w-full rounded-full bg-brand py-3 font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"}>
          {submitting ? ui(lang, "placingOrder") : ui(lang, "sendOrder")}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-center text-sm text-muted underline">
          {ui(lang, "backToMenu")}
        </button>
      </div>
    </div>
  );
}

function RowCard({ item, onClick, variant, eyebrow, lang }: { item: MenuItem; onClick: () => void; variant: "default" | "nordic" | "botanical"; eyebrow?: string; lang: MenuLanguage }) {
  const name = tr(item.translations, lang, "name", item.name);
  if (variant === "nordic") {
    return (
      <button onClick={onClick} className="flex w-36 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-brand">
        <div className="relative h-24 w-full overflow-hidden bg-background">{item.photo_url ? <Image src={item.photo_url} alt="" fill sizes="144px" className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[10px] text-muted">Menuko</span>}</div>
        <div className="flex flex-1 flex-col justify-between p-2.5">
          <div>
            {eyebrow && <p className="mb-1 font-mono text-[10px] text-muted">{eyebrow}</p>}
            <p className="truncate text-xs font-bold text-foreground">{name}</p>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <span className="font-mono text-xs font-semibold text-foreground">{formatPeso(item.price)}</span>
            <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded bg-border text-[11px] font-bold text-foreground">
              +
            </span>
          </div>
        </div>
      </button>
    );
  }

  if (variant === "botanical") {
    // DESIGN.md's "Cards (Menu Items)" spec: Surface 1 fill, ultra-fine
    // border, rounded-lg, price in a plain accent line under the title
    // (not an overlapping badge) — the "restrained editorial" tone.
    return (
      <button onClick={onClick} className="w-36 shrink-0 overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-brand">
        <div className="relative h-24 w-full overflow-hidden bg-background">{item.photo_url ? <Image src={item.photo_url} alt="" fill sizes="144px" className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[10px] text-muted">Menuko</span>}</div>
        <div className="flex flex-col gap-1 p-2.5">
          <p className="truncate text-xs font-semibold text-foreground">{name}</p>
          <p className="text-xs font-semibold text-brand">{formatPeso(item.price)}</p>
        </div>
      </button>
    );
  }

  return (
    <button onClick={onClick} className="w-36 shrink-0 overflow-visible rounded-xl border border-border bg-card text-left transition-colors hover:border-brand">
      <div className="relative h-24 w-full overflow-hidden rounded-t-xl bg-background">{item.photo_url ? <Image src={item.photo_url} alt="" fill sizes="144px" className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[10px] text-muted">Menuko</span>}</div>
      <div className="relative px-2 pb-2 pt-3">
        <span className="absolute -top-2 left-2 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-brand-foreground shadow">{formatPeso(item.price)}</span>
        <p className="truncate text-xs font-medium text-foreground">{name}</p>
      </div>
    </button>
  );
}

function ItemDetailOverlay({ item, variant, quantity, onChangeQty, onClose, canCheckout, onGoToCheckout, lang }: { item: MenuItem; variant: "default" | "nordic" | "botanical"; quantity: number; onChangeQty: (quantity: number) => void; onClose: () => void; canCheckout: boolean; onGoToCheckout: () => void; lang: MenuLanguage }) {
  const name = tr(item.translations, lang, "name", item.name);
  const description = tr(item.translations, lang, "description", item.description);
  const ingredients = tr(item.translations, lang, "ingredients", item.ingredients);
  const allergyInfo = tr(item.translations, lang, "allergy_info", item.allergy_info);

  if (variant === "botanical") {
    return (
      <div role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-30 flex items-end justify-center bg-foreground/40 sm:items-center sm:p-4" onClick={onClose}>
        {/* Full-width bottom sheet on a phone (DESIGN.md's own mobile spec:
            rounded top corners, edge-to-edge) — becomes the DESIGN.md
            flipbook's landscape framed card, centered with room to breathe,
            once the screen is wide enough for a side-by-side layout. */}
        <div onClick={(e) => e.stopPropagation()} className="relative flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-card shadow-2xl sm:max-h-[85vh] sm:max-w-2xl sm:grid sm:grid-cols-2 sm:overflow-hidden sm:rounded-2xl">
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden />
          <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-brand shadow-sm backdrop-blur-md transition-colors hover:bg-background">
            ×
          </button>

          <div className="relative h-72 w-full shrink-0 bg-background sm:h-full sm:min-h-[300px]">
            {item.photo_url ? <Image src={item.photo_url} alt="" fill priority className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-sm text-muted">Menuko</span>}
            {item.cook_time_minutes && <span className="absolute right-3 bottom-3 rounded-full bg-background/85 px-3 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-md">{item.cook_time_minutes} {ui(lang, "min")}</span>}
          </div>

          <div className="flex flex-1 flex-col gap-3 p-5 sm:overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pr-6">
              <h2 className="text-xl font-semibold tracking-tight text-balance">{name}</h2>
              <span className="shrink-0 text-lg font-semibold whitespace-nowrap text-brand">{formatPeso(item.price)}</span>
            </div>
            {description && <p className="text-sm leading-relaxed text-foreground/80">{description}</p>}

            {(ingredients || allergyInfo) && (
              <div className="mt-1 flex flex-col gap-2.5 rounded-lg border border-border border-l-4 border-l-brand bg-background p-3.5">
                {ingredients && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{ui(lang, "ingredients")}</span>
                    <span className="text-sm text-foreground">{ingredients}</span>
                  </div>
                )}
                {allergyInfo && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{ui(lang, "allergy")}</span>
                    <span className="text-sm text-foreground">{allergyInfo}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-6">
              {quantity === 0 ? (
                <button onClick={() => onChangeQty(1)} className="w-full rounded-lg bg-brand py-3.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90">
                  {ui(lang, "addToOrder")}
                </button>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                  <span className="text-sm font-medium text-foreground">{ui(lang, "quantity")}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => onChangeQty(quantity - 1)} aria-label="Decrease quantity" className="touch-manipulation flex h-8 w-8 items-center justify-center rounded-md border border-border text-base transition-colors hover:border-brand hover:text-brand">
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                    <button onClick={() => onChangeQty(quantity + 1)} aria-label="Increase quantity" className="touch-manipulation flex h-8 w-8 items-center justify-center rounded-md bg-brand text-base text-brand-foreground transition-colors hover:opacity-90">
                      +
                    </button>
                  </div>
                </div>
              )}
              {canCheckout && (
                <button onClick={onGoToCheckout} className="py-1 text-center text-sm text-muted underline hover:text-foreground">
                  {ui(lang, "reviewOrder")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "nordic") {
    return (
      <div role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-30 flex flex-col overflow-y-auto overscroll-contain bg-card">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-3 backdrop-blur">
          <button onClick={onClose} className="flex items-center gap-1.5 text-xs font-semibold text-foreground transition-colors hover:text-brand">
            <span aria-hidden>←</span>
            <span>{ui(lang, "backToMenuCaps")}</span>
          </button>
          <span className="font-mono text-[11px] text-muted">{ui(lang, "dishSpecification")}</span>
        </div>

        <div className="relative h-64 shrink-0 bg-background">
          {item.photo_url ? <Image src={item.photo_url} alt="" fill priority className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-sm text-muted">Menuko</span>}
          {item.cook_time_minutes && <span className="absolute right-3 bottom-3 rounded bg-black/70 px-2.5 py-1 font-mono text-[11px] text-white">{item.cook_time_minutes} {ui(lang, "minPrep")}</span>}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight text-balance">{name}</h2>
            <span className="font-mono text-lg font-bold whitespace-nowrap text-foreground">{formatPeso(item.price)}</span>
          </div>
          {description && <p className="text-xs leading-relaxed text-muted">{description}</p>}

          {(ingredients || allergyInfo) && (
            <div className="mt-2 divide-y divide-border rounded-lg border border-border text-xs">
              {ingredients && (
                <div className="flex justify-between gap-3 p-3">
                  <span className="shrink-0 text-muted">{ui(lang, "ingredients")}</span>
                  <span className="text-right font-medium text-foreground">{ingredients}</span>
                </div>
              )}
              {allergyInfo && (
                <div className="flex justify-between gap-3 p-3">
                  <span className="shrink-0 text-muted">{ui(lang, "allergy")}</span>
                  <span className="text-right font-medium text-foreground">{allergyInfo}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-6">
            {quantity === 0 ? (
              <button onClick={() => onChangeQty(1)} className="w-full rounded bg-brand py-3.5 text-xs font-bold tracking-wider text-brand-foreground uppercase transition-opacity hover:opacity-90">
                {ui(lang, "addToTableOrder")}
              </button>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5">
                <span className="text-xs font-bold tracking-wider text-foreground uppercase">{ui(lang, "orderQuantity")}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => onChangeQty(quantity - 1)} aria-label="Decrease quantity" className="touch-manipulation flex h-7 w-7 items-center justify-center rounded border border-border text-sm font-bold transition-colors hover:bg-border">
                    −
                  </button>
                  <span className="w-4 text-center font-mono text-sm font-bold tabular-nums">{quantity}</span>
                  <button onClick={() => onChangeQty(quantity + 1)} aria-label="Increase quantity" className="touch-manipulation flex h-7 w-7 items-center justify-center rounded bg-brand text-sm font-bold text-brand-foreground transition-colors hover:opacity-90">
                    +
                  </button>
                </div>
              </div>
            )}
            {canCheckout && (
              <button onClick={onGoToCheckout} className="py-1 text-center text-xs text-muted underline hover:text-foreground">
                {ui(lang, "reviewOrder")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-30 flex flex-col overflow-y-auto overscroll-contain bg-card">
      <div className="relative h-64 shrink-0 bg-background">
        {item.photo_url ? <Image src={item.photo_url} alt="" fill priority className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-sm text-muted">Menuko</span>}
        <button onClick={onClose} aria-label="Back to menu" className="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-lg text-white transition-colors hover:bg-black/60">
          ←
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="text-lg font-bold text-balance">{name}</h2>
        <p className="font-semibold text-brand">{formatPeso(item.price)}</p>
        {description && <p className="text-sm text-foreground">{description}</p>}
        {ingredients && (
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">{ui(lang, "ingredients")}: </span>
            {ingredients}
          </p>
        )}
        {allergyInfo && (
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">{ui(lang, "allergy")}: </span>
            {allergyInfo}
          </p>
        )}
        {item.cook_time_minutes && (
          <p className="flex items-center gap-1 text-sm text-muted">
            <span aria-hidden>🕐</span>
            {item.cook_time_minutes} {ui(lang, "min")}
          </p>
        )}

        <div className="mt-auto flex flex-col items-center gap-3 pt-6">
          {quantity === 0 ? (
            <button onClick={() => onChangeQty(1)} className="w-full rounded-full bg-brand py-3 font-medium text-brand-foreground transition-opacity hover:opacity-90">
              {ui(lang, "addToOrder")}
            </button>
          ) : (
            <div className="flex items-center gap-5">
              <button onClick={() => onChangeQty(quantity - 1)} aria-label="Decrease quantity" className="touch-manipulation h-10 w-10 rounded-full border border-border text-lg transition-colors hover:border-brand hover:text-brand">
                −
              </button>
              <span className="w-6 text-center text-lg tabular-nums">{quantity}</span>
              <button onClick={() => onChangeQty(quantity + 1)} aria-label="Increase quantity" className="touch-manipulation h-10 w-10 rounded-full border border-border text-lg transition-colors hover:border-brand hover:text-brand">
                +
              </button>
            </div>
          )}
          {canCheckout && (
            <button onClick={onGoToCheckout} className="text-sm text-muted underline">
              {ui(lang, "reviewOrder")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmationView({ restaurant, table, menuTemplate, confirmation, status, ad, changeRequest, dismissedRequestId, onDismissChangeRequest, requestingCancel, onRequestCancel, onStartEdit, onOrderMore, callingServer, serverCalled, onCallServer, lang, isPremium, onChangeLang }: { restaurant: Restaurant; table: { id: string; label: string }; menuTemplate: MenuTemplateId; confirmation: Confirmation; status: OrderStatus; ad: AdContent | null; changeRequest: ChangeRequest | null; dismissedRequestId: string | null; onDismissChangeRequest: () => void; requestingCancel: boolean; onRequestCancel: () => void; onStartEdit: () => void; onOrderMore: () => void; callingServer: boolean; serverCalled: boolean; onCallServer: () => void; lang: MenuLanguage; isPremium: boolean; onChangeLang: (lang: MenuLanguage) => void }) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const isFinal = status === "paid" || status === "cancelled";
  const hasPendingRequest = changeRequest?.status === "pending";
  const showRequestActions = !isFinal && !hasPendingRequest;
  const showResolvedBanner = changeRequest && changeRequest.status !== "pending" && changeRequest.id !== dismissedRequestId;

  return (
    <div data-menu-theme={menuTemplate} dir={RTL_LANGUAGES.has(lang) ? "rtl" : "ltr"} className="flex flex-1 flex-col gap-6 bg-background p-4 text-foreground">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-brand">{restaurant.name}</h1>
          <p className="text-sm text-muted">{table.label}</p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2">
          {isPremium && <LanguageSwitcher lang={lang} onChange={onChangeLang} />}
          <CallServerButton calling={callingServer} called={serverCalled} onCall={onCallServer} lang={lang} />
        </div>
      </header>

      {hasPendingRequest && <div className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-brand">{changeRequest.kind === "cancel" ? ui(lang, "cancellationRequested") : ui(lang, "changeRequested")} {ui(lang, "staffWillConfirm")}</div>}

      {showResolvedBanner && (
        <div className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${changeRequest!.status === "approved" ? "border-brand/30 bg-brand/10 text-brand" : "border-border bg-background text-foreground"}`}>
          <span>{changeRequest!.status === "approved" ? (changeRequest!.kind === "cancel" ? ui(lang, "cancellationApproved") : ui(lang, "changeApproved")) : `${ui(lang, "requestDeclined")}${changeRequest!.denyReason ? ` ${changeRequest!.denyReason}` : ""}`}</span>
          <button onClick={onDismissChangeRequest} className="shrink-0 text-xs underline">
            {ui(lang, "dismiss")}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{status === "cancelled" ? ui(lang, "orderCancelled") : ui(lang, "orderReceived")}</h2>
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">{ORDER_STATUS_LABEL[status] ?? status}</span>
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          {confirmation.lines.map((line) => (
            <li key={line.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {line.name} × {line.quantity}
              </span>
              <span className="shrink-0 tabular-nums">{formatPeso(line.unitPrice * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
          <span>{ui(lang, "total")}</span>
          <span>{formatPeso(confirmation.total)}</span>
        </div>
      </div>

      {showRequestActions && (
        <div className="flex items-center gap-4 text-sm">
          {confirmingCancel ? (
            <div className="flex flex-1 items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <span className="text-muted">{ui(lang, "cancelThisOrder")}</span>
              <div className="flex gap-3">
                <button onClick={() => setConfirmingCancel(false)} className="text-muted underline" disabled={requestingCancel}>
                  {ui(lang, "no")}
                </button>
                <button
                  onClick={() => {
                    onRequestCancel();
                    setConfirmingCancel(false);
                  }}
                  className="font-medium text-red-600 underline"
                  disabled={requestingCancel}
                >
                  {requestingCancel ? ui(lang, "sendingDots") : ui(lang, "yesCancel")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={onStartEdit} className="text-muted underline">
                {ui(lang, "requestAChange")}
              </button>
              <button onClick={() => setConfirmingCancel(true)} className="text-muted underline">
                {ui(lang, "requestCancellation")}
              </button>
            </>
          )}
        </div>
      )}

      {ad && <AdBanner ad={ad} />}

      {status !== "cancelled" && (restaurant.payment_qr_url || restaurant.payment_link) && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted">{ui(lang, "pleasePayAtCashier")}</p>
          {restaurant.payment_qr_url && <Image src={restaurant.payment_qr_url} alt="Payment QR" width={180} height={180} className="rounded" />}
          {restaurant.payment_link && (
            <a href={restaurant.payment_link} target="_blank" rel="noreferrer" className="text-sm text-brand underline">
              {ui(lang, "openPaymentLink")}
            </a>
          )}
          <PaymentProofUpload orderId={confirmation.orderId} accessToken={confirmation.accessToken} lang={lang} />
        </div>
      )}

      <button onClick={onOrderMore} className="rounded-full border border-brand px-5 py-3 text-center font-medium text-brand transition-colors hover:bg-brand hover:text-brand-foreground">
        {ui(lang, "addMoreFromMenu")}
      </button>
    </div>
  );
}

function PaymentProofUpload({ orderId, accessToken, lang }: { orderId: string; accessToken: string; lang: MenuLanguage }) {
  const [state, formAction, pending] = useActionState<UploadPaymentProofState, FormData>(uploadPaymentProof, { error: null, url: null });
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setCompressing(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
      setPreview(URL.createObjectURL(compressed));
      const fd = new FormData();
      fd.append("orderId", orderId);
      fd.append("accessToken", accessToken);
      fd.append("file", compressed, "proof.jpg");
      formAction(fd);
    } finally {
      setCompressing(false);
    }
  }

  const shownImage = state.url ?? preview;

  return (
    <div className="mt-2 flex w-full flex-col items-center gap-2 border-t border-border pt-3">
      <p className="text-xs text-muted">{ui(lang, "alreadyPaidHint")}</p>
      {shownImage && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob preview before the real URL lands
        <img src={shownImage} alt="Payment proof" width={96} height={96} className="h-24 w-24 rounded object-cover" />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        aria-label={ui(lang, "uploadPaymentScreenshot")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={compressing || pending} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-60">
        {compressing || pending ? ui(lang, "uploading") : state.url ? ui(lang, "replaceScreenshot") : ui(lang, "uploadPaymentScreenshot")}
      </button>
      {state.error && (
        <p role="alert" aria-live="polite" className="text-xs text-red-600">
          {state.error}
        </p>
      )}
      {state.url && !state.error && <p className="text-xs text-brand">{ui(lang, "screenshotReceived")}</p>}
    </div>
  );
}
