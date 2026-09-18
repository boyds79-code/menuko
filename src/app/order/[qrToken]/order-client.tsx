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

type Category = { id: string; name: string; sort_order: number };
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
type Restaurant = {
  id: string;
  name: string;
  payment_qr_url: string | null;
  payment_link: string | null;
};

type CartLine = { item: MenuItem; quantity: number };
type ConfirmationLine = { id: string; name: string; quantity: number; unitPrice: number };
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

function CallServerButton({
  calling,
  called,
  onCall,
}: {
  calling: boolean;
  called: boolean;
  onCall: () => void;
}) {
  return (
    <button
      onClick={onCall}
      disabled={calling || called}
      className="shrink-0 rounded-full border border-brand px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand hover:text-brand-foreground disabled:opacity-60"
    >
      {called ? "Server called ✓" : calling ? "Calling…" : "Call Server"}
    </button>
  );
}

export function OrderClient({
  qrToken,
  table,
  restaurant,
  menuTemplate,
  categories,
  items,
  ad,
}: {
  qrToken: string;
  table: { id: string; label: string };
  restaurant: Restaurant;
  menuTemplate: MenuTemplateId;
  categories: Category[];
  items: MenuItem[];
  ad: AdContent | null;
}) {
  const supabase = createClient();
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
        p_items: cartLines.map((l) => ({ menu_item_id: l.item.id, quantity: l.quantity })),
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
      setConfirmation({ orderId: order_id, accessToken: access_token, lines, total: cartTotal });
      setStatus("open");
      setCart({});
      try {
        sessionStorage.setItem(
          storageKey(qrToken),
          JSON.stringify({ orderId: order_id, accessToken: access_token }),
        );
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
        p_items: cartLines.map((l) => ({ menu_item_id: l.item.id, quantity: l.quantity })),
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
    return (
      <ConfirmationView
        restaurant={restaurant}
        table={table}
        confirmation={confirmation}
        status={status}
        ad={ad}
        changeRequest={changeRequest}
        dismissedRequestId={dismissedRequestId}
        onDismissChangeRequest={() => changeRequest && setDismissedRequestId(changeRequest.id)}
        requestingCancel={requestingCancel}
        onRequestCancel={requestCancel}
        onStartEdit={startEditRequest}
        onOrderMore={() => setConfirmation(null)}
        callingServer={callingServer}
        serverCalled={serverCalled}
        onCallServer={callServer}
      />
    );
  }

  const style = DIGITAL_TEMPLATE_STYLES[menuTemplate];

  return (
    <div className={`flex min-h-full flex-1 flex-col pb-24 ${style.page}`}>
      <header className={`flex items-start justify-between gap-3 ${style.header}`}>
        <div>
          <h1 className={style.headerTitle}>{restaurant.name}</h1>
          <p className={style.headerSubtitle}>{table.label}</p>
        </div>
        <CallServerButton calling={callingServer} called={serverCalled} onCall={callServer} />
      </header>

      {featuredItems.length > 0 && (
        <div className="-mt-10 flex gap-3 overflow-x-auto px-4 pb-1">
          {featuredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setDetailItem(item)}
              className="relative h-[150px] w-[220px] shrink-0 overflow-hidden rounded-2xl shadow-lg transition-opacity hover:opacity-95"
            >
              {item.photo_url ? (
                <Image src={item.photo_url} alt="" fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-border text-xs text-muted">
                  Menuko
                </span>
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
              <span className="absolute bottom-3 left-3 rounded-full bg-brand px-3 py-1 text-xs font-bold text-brand-foreground">
                Our Best!
              </span>
              <span className="absolute right-3 bottom-3 max-w-[55%] truncate text-right text-xs font-semibold text-white">
                {item.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {editingRequest && (
        <div className="mx-4 mt-4 flex items-center justify-between rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-sm">
          <span>Adjust the items below, then send the change to staff.</span>
          <button
            onClick={() => {
              setEditingRequest(false);
              setCart({});
              setError(null);
            }}
            className="text-xs text-muted underline"
          >
            Cancel
          </button>
        </div>
      )}

      <main className="flex flex-1 flex-col gap-5 p-4">
        {categories.map((category) => {
          const categoryItems = items.filter((i) => i.category_id === category.id);
          if (categoryItems.length === 0) return null;
          return (
            <section key={category.id}>
              <h2 className={style.categoryTitle}>{category.name}</h2>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {categoryItems.map((item) => (
                  <RowCard key={item.id} item={item} onClick={() => setDetailItem(item)} />
                ))}
              </div>
            </section>
          );
        })}
        {items.length === 0 && (
          <p className="text-sm text-muted">No menu items yet.</p>
        )}
        <p className="pt-2 text-center text-[11px] text-muted">
          By ordering, you agree to our{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
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
          <button
            onClick={editingRequest ? sendEditRequest : () => setReviewOpen(true)}
            disabled={submitting}
            className="flex w-full items-center justify-between rounded-full bg-brand px-5 py-3 font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <span>
              {submitting
                ? editingRequest
                  ? "Sending request…"
                  : "Placing order…"
                : editingRequest
                  ? `Send change request (${cartCount})`
                  : `Check Out (${cartCount})`}
            </span>
            <span>{formatPeso(cartTotal)}</span>
          </button>
        </div>
      )}

      {reviewOpen && !editingRequest && (
        <ReviewSheet
          lines={cartLines}
          total={cartTotal}
          submitting={submitting}
          onConfirm={async () => {
            await placeOrder();
            setReviewOpen(false);
          }}
          onClose={() => setReviewOpen(false)}
        />
      )}

      {detailItem && (
        <ItemDetailOverlay
          item={detailItem}
          quantity={cart[detailItem.id] ?? 0}
          onChangeQty={(qty) => setQty(detailItem.id, qty)}
          onClose={() => setDetailItem(null)}
          canCheckout={cartCount > 0}
          onGoToCheckout={() => {
            setDetailItem(null);
            setReviewOpen(true);
          }}
        />
      )}
    </div>
  );
}

function ReviewSheet({
  lines,
  total,
  submitting,
  onConfirm,
  onClose,
}: {
  lines: CartLine[];
  total: number;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/45" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review your order"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overscroll-contain rounded-t-3xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg"
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" aria-hidden />
        <h2 className="mb-3 font-semibold">Review your order</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {lines.map((line) => (
            <li key={line.item.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {line.item.name} × {line.quantity}
              </span>
              <span className="shrink-0 tabular-nums">{formatPeso(line.item.price * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
          <span>Total</span>
          <span>{formatPeso(total)}</span>
        </div>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="mt-4 w-full rounded-full bg-brand py-3 font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Placing order…" : "Check Out"}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-center text-sm text-muted underline">
          Back to menu
        </button>
      </div>
    </div>
  );
}

function RowCard({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-36 shrink-0 overflow-visible rounded-xl border border-border bg-card text-left transition-colors hover:border-brand"
    >
      <div className="relative h-24 w-full overflow-hidden rounded-t-xl bg-background">
        {item.photo_url ? (
          <Image src={item.photo_url} alt="" fill sizes="144px" className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] text-muted">
            Menuko
          </span>
        )}
      </div>
      <div className="relative px-2 pb-2 pt-3">
        <span className="absolute -top-2 left-2 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-brand-foreground shadow">
          {formatPeso(item.price)}
        </span>
        <p className="truncate text-xs font-medium text-foreground">{item.name}</p>
      </div>
    </button>
  );
}

function ItemDetailOverlay({
  item,
  quantity,
  onChangeQty,
  onClose,
  canCheckout,
  onGoToCheckout,
}: {
  item: MenuItem;
  quantity: number;
  onChangeQty: (quantity: number) => void;
  onClose: () => void;
  canCheckout: boolean;
  onGoToCheckout: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      className="fixed inset-0 z-30 flex flex-col overflow-y-auto overscroll-contain bg-card"
    >
      <div className="relative h-64 shrink-0 bg-background">
        {item.photo_url ? (
          <Image src={item.photo_url} alt="" fill priority className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm text-muted">Menuko</span>
        )}
        <button
          onClick={onClose}
          aria-label="Back to menu"
          className="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-lg text-white transition-colors hover:bg-black/60"
        >
          ←
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="text-lg font-bold text-balance">{item.name}</h2>
        <p className="font-semibold text-brand">{formatPeso(item.price)}</p>
        {item.description && <p className="text-sm text-foreground">{item.description}</p>}
        {item.ingredients && (
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">Ingredients: </span>
            {item.ingredients}
          </p>
        )}
        {item.allergy_info && (
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">Allergy: </span>
            {item.allergy_info}
          </p>
        )}
        {item.cook_time_minutes && (
          <p className="flex items-center gap-1 text-sm text-muted">
            <span aria-hidden>🕐</span>
            {item.cook_time_minutes} min
          </p>
        )}

        <div className="mt-auto flex flex-col items-center gap-3 pt-6">
          {quantity === 0 ? (
            <button
              onClick={() => onChangeQty(1)}
              className="w-full rounded-full bg-brand py-3 font-medium text-brand-foreground transition-opacity hover:opacity-90"
            >
              Add to Cart
            </button>
          ) : (
            <div className="flex items-center gap-5">
              <button
                onClick={() => onChangeQty(quantity - 1)}
                aria-label="Decrease quantity"
                className="touch-manipulation h-10 w-10 rounded-full border border-border text-lg transition-colors hover:border-brand hover:text-brand"
              >
                −
              </button>
              <span className="w-6 text-center text-lg tabular-nums">{quantity}</span>
              <button
                onClick={() => onChangeQty(quantity + 1)}
                aria-label="Increase quantity"
                className="touch-manipulation h-10 w-10 rounded-full border border-border text-lg transition-colors hover:border-brand hover:text-brand"
              >
                +
              </button>
            </div>
          )}
          {canCheckout && (
            <button onClick={onGoToCheckout} className="text-sm text-muted underline">
              Go to Checkout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmationView({
  restaurant,
  table,
  confirmation,
  status,
  ad,
  changeRequest,
  dismissedRequestId,
  onDismissChangeRequest,
  requestingCancel,
  onRequestCancel,
  onStartEdit,
  onOrderMore,
  callingServer,
  serverCalled,
  onCallServer,
}: {
  restaurant: Restaurant;
  table: { id: string; label: string };
  confirmation: Confirmation;
  status: OrderStatus;
  ad: AdContent | null;
  changeRequest: ChangeRequest | null;
  dismissedRequestId: string | null;
  onDismissChangeRequest: () => void;
  requestingCancel: boolean;
  onRequestCancel: () => void;
  onStartEdit: () => void;
  onOrderMore: () => void;
  callingServer: boolean;
  serverCalled: boolean;
  onCallServer: () => void;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const isFinal = status === "paid" || status === "cancelled";
  const hasPendingRequest = changeRequest?.status === "pending";
  const showRequestActions = !isFinal && !hasPendingRequest;
  const showResolvedBanner =
    changeRequest &&
    changeRequest.status !== "pending" &&
    changeRequest.id !== dismissedRequestId;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-brand">{restaurant.name}</h1>
          <p className="text-sm text-muted">{table.label}</p>
        </div>
        <CallServerButton calling={callingServer} called={serverCalled} onCall={onCallServer} />
      </header>

      {hasPendingRequest && (
        <div className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-brand">
          {changeRequest.kind === "cancel" ? "Cancellation requested" : "Change requested"} — staff
          will confirm with the kitchen shortly.
        </div>
      )}

      {showResolvedBanner && (
        <div
          className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
            changeRequest!.status === "approved"
              ? "border-brand/30 bg-brand/10 text-brand"
              : "border-border bg-background text-foreground"
          }`}
        >
          <span>
            {changeRequest!.status === "approved"
              ? changeRequest!.kind === "cancel"
                ? "Your cancellation was approved."
                : "Your change was approved."
              : `Your request was declined.${changeRequest!.denyReason ? ` ${changeRequest!.denyReason}` : ""}`}
          </span>
          <button onClick={onDismissChangeRequest} className="shrink-0 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{status === "cancelled" ? "Order cancelled" : "Order received"}</h2>
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            {ORDER_STATUS_LABEL[status] ?? status}
          </span>
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
          <span>Total</span>
          <span>{formatPeso(confirmation.total)}</span>
        </div>
      </div>

      {showRequestActions && (
        <div className="flex items-center gap-4 text-sm">
          {confirmingCancel ? (
            <div className="flex flex-1 items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <span className="text-muted">Cancel this order?</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmingCancel(false)}
                  className="text-muted underline"
                  disabled={requestingCancel}
                >
                  No
                </button>
                <button
                  onClick={() => {
                    onRequestCancel();
                    setConfirmingCancel(false);
                  }}
                  className="font-medium text-red-600 underline"
                  disabled={requestingCancel}
                >
                  {requestingCancel ? "Sending…" : "Yes, cancel"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={onStartEdit} className="text-muted underline">
                Request a change
              </button>
              <button onClick={() => setConfirmingCancel(true)} className="text-muted underline">
                Request cancellation
              </button>
            </>
          )}
        </div>
      )}

      {ad && <AdBanner ad={ad} />}

      {status !== "cancelled" && (restaurant.payment_qr_url || restaurant.payment_link) && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted">Please pay at the cashier</p>
          {restaurant.payment_qr_url && (
            <Image
              src={restaurant.payment_qr_url}
              alt="Payment QR"
              width={180}
              height={180}
              className="rounded"
            />
          )}
          {restaurant.payment_link && (
            <a
              href={restaurant.payment_link}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-brand underline"
            >
              Open payment link
            </a>
          )}
          <PaymentProofUpload orderId={confirmation.orderId} accessToken={confirmation.accessToken} />
        </div>
      )}

      <button
        onClick={onOrderMore}
        className="rounded-full border border-brand px-5 py-3 text-center font-medium text-brand transition-colors hover:bg-brand hover:text-brand-foreground"
      >
        Add more from the menu
      </button>
    </div>
  );
}

function PaymentProofUpload({ orderId, accessToken }: { orderId: string; accessToken: string }) {
  const [state, formAction, pending] = useActionState<UploadPaymentProofState, FormData>(
    uploadPaymentProof,
    { error: null, url: null },
  );
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
      <p className="text-xs text-muted">
        Already paid? Upload a screenshot so the cashier can confirm before you leave.
      </p>
      {shownImage && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob preview before the real URL lands
        <img
          src={shownImage}
          alt="Payment proof"
          width={96}
          height={96}
          className="h-24 w-24 rounded object-cover"
        />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        aria-label="Upload payment screenshot"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={compressing || pending}
        className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
      >
        {compressing || pending
          ? "Uploading…"
          : state.url
            ? "Replace screenshot"
            : "Upload payment screenshot"}
      </button>
      {state.error && (
        <p role="alert" aria-live="polite" className="text-xs text-red-600">
          {state.error}
        </p>
      )}
      {state.url && !state.error && <p className="text-xs text-brand">Screenshot received ✓</p>}
    </div>
  );
}
