"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null);
  const [dismissedRequestId, setDismissedRequestId] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState(false);
  const [requestingCancel, setRequestingCancel] = useState(false);

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const cartLines: CartLine[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, quantity]) => ({ item: itemsById.get(itemId)!, quantity }))
    .filter((line) => line.item);

  const cartTotal = cartLines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);
  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);

  function setQty(itemId: string, quantity: number) {
    setCart((prev) => ({ ...prev, [itemId]: Math.max(0, quantity) }));
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
      />
    );
  }

  const style = DIGITAL_TEMPLATE_STYLES[menuTemplate];

  return (
    <div className={`flex min-h-full flex-1 flex-col pb-24 ${style.page}`}>
      <header className={style.header}>
        <p className={style.headerTitle}>{restaurant.name}</p>
        <p className="text-sm text-muted">{table.label}</p>
      </header>

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

      <main className="flex flex-1 flex-col gap-6 p-4">
        {categories.map((category) => {
          const categoryItems = items.filter((i) => i.category_id === category.id);
          if (categoryItems.length === 0) return null;
          return (
            <section key={category.id}>
              <h2 className={style.categoryTitle}>{category.name}</h2>
              <div className="flex flex-col gap-3">
                {categoryItems.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    quantity={cart[item.id] ?? 0}
                    onChange={(qty) => setQty(item.id, qty)}
                    style={style}
                  />
                ))}
              </div>
            </section>
          );
        })}
        {items.length === 0 && (
          <p className="text-sm text-muted">No menu items yet.</p>
        )}
      </main>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card p-4 shadow-lg">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <button
            onClick={editingRequest ? sendEditRequest : placeOrder}
            disabled={submitting}
            className="flex w-full items-center justify-between rounded-full bg-brand px-5 py-3 font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            <span>
              {submitting
                ? editingRequest
                  ? "Sending request..."
                  : "Placing order..."
                : editingRequest
                  ? `Send change request (${cartCount})`
                  : `Place order (${cartCount})`}
            </span>
            <span>{formatPeso(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItemRow({
  item,
  quantity,
  onChange,
  style,
}: {
  item: MenuItem;
  quantity: number;
  onChange: (quantity: number) => void;
  style: (typeof DIGITAL_TEMPLATE_STYLES)[MenuTemplateId];
}) {
  return (
    <div className={style.card}>
      <div className={`relative shrink-0 overflow-hidden bg-background ${style.cardImage}`}>
        {item.photo_url ? (
          <Image src={item.photo_url} alt={item.name} fill className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs text-muted">
            Menuko
          </span>
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium">{item.name}</p>
        <p className={style.priceText}>{formatPeso(item.price)}</p>
      </div>
      {quantity === 0 ? (
        <button onClick={() => onChange(1)} className={style.addButton}>
          Add
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(quantity - 1)}
            className="h-8 w-8 rounded-full border border-border text-lg"
          >
            −
          </button>
          <span className="w-4 text-center">{quantity}</span>
          <button
            onClick={() => onChange(quantity + 1)}
            className="h-8 w-8 rounded-full border border-border text-lg"
          >
            +
          </button>
        </div>
      )}
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
      <header>
        <p className="font-bold text-brand">{restaurant.name}</p>
        <p className="text-sm text-muted">{table.label}</p>
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
            <li key={line.id} className="flex justify-between">
              <span>
                {line.name} × {line.quantity}
              </span>
              <span>{formatPeso(line.unitPrice * line.quantity)}</span>
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
                  {requestingCancel ? "Sending..." : "Yes, cancel"}
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
        className="rounded-full border border-brand px-5 py-3 text-center font-medium text-brand transition hover:bg-brand hover:text-brand-foreground"
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
        <img src={shownImage} alt="Payment proof" className="h-24 w-24 rounded object-cover" />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
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
        className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-brand hover:text-brand disabled:opacity-60"
      >
        {compressing || pending
          ? "Uploading..."
          : state.url
            ? "Replace screenshot"
            : "Upload payment screenshot"}
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.url && !state.error && <p className="text-xs text-brand">Screenshot received ✓</p>}
    </div>
  );
}
