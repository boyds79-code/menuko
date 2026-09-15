"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPeso } from "@/lib/money";
import type { OrderChannel } from "@/lib/database.types";

type Category = { id: string; name: string; sort_order: number };
type MenuItem = { id: string; category_id: string | null; name: string; price: number };

// Grab/foodpanda direct integration isn't realistic yet (partner API needs
// business certification; middleware like Deliverect charges a per-location
// fee that fights Menuko's free positioning) — this is the manual-entry
// interim the spec always intended. Creates the order against a
// per-channel "virtual" table via create_manual_order (see
// supabase/migrations/0011_manual_orders.sql), so it flows through the
// existing kitchen/cashier boards untouched.
export function NewOrderForm({ categories, items }: { categories: Category[]; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<OrderChannel>("manual_delivery_entry");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const itemsById = new Map(items.map((i) => [i.id, i]));
  const lines = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, quantity]) => ({ item: itemsById.get(itemId)!, quantity }))
    .filter((l) => l.item);
  const total = lines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);

  function setQty(itemId: string, qty: number) {
    setCart((prev) => ({ ...prev, [itemId]: Math.max(0, qty) }));
  }

  function reset() {
    setCart({});
    setNote("");
    setOpen(false);
  }

  async function submit() {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("create_manual_order", {
      p_channel: channel,
      p_items: lines.map((l) => ({ menu_item_id: l.item.id, quantity: l.quantity })),
      ...(note.trim() ? { p_note: note.trim() } : {}),
    });
    setSubmitting(false);
    if (rpcError) {
      setError("Couldn't create the order. Please try again.");
      return;
    }
    reset();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm font-medium text-muted transition hover:border-brand hover:text-brand"
      >
        + New delivery / takeout order
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">New order</h2>
        <button onClick={reset} className="text-xs text-muted underline">
          Cancel
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setChannel("manual_delivery_entry")}
          className={`rounded-full border px-3 py-1 text-xs ${
            channel === "manual_delivery_entry"
              ? "border-brand bg-brand/10 text-brand"
              : "border-border text-muted"
          }`}
        >
          🛵 Delivery
        </button>
        <button
          onClick={() => setChannel("manual_pickup_entry")}
          className={`rounded-full border px-3 py-1 text-xs ${
            channel === "manual_pickup_entry"
              ? "border-brand bg-brand/10 text-brand"
              : "border-border text-muted"
          }`}
        >
          🥡 Takeout
        </button>
      </div>

      <div className="flex max-h-64 flex-col gap-4 overflow-y-auto">
        {categories.map((category) => {
          const categoryItems = items.filter((i) => i.category_id === category.id);
          if (categoryItems.length === 0) return null;
          return (
            <div key={category.id}>
              <p className="mb-1 text-xs font-semibold text-muted">{category.name}</p>
              <div className="flex flex-col gap-1">
                {categoryItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex-1">
                      {item.name} <span className="text-muted">{formatPeso(item.price)}</span>
                    </span>
                    <button
                      onClick={() => setQty(item.id, (cart[item.id] ?? 0) - 1)}
                      className="h-6 w-6 rounded-full border border-border text-xs"
                    >
                      −
                    </button>
                    <span className="w-4 text-center">{cart[item.id] ?? 0}</span>
                    <button
                      onClick={() => setQty(item.id, (cart[item.id] ?? 0) + 1)}
                      className="h-6 w-6 rounded-full border border-border text-xs"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (e.g. customer name, Grab order #)"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting || lines.length === 0}
        className="flex items-center justify-between rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        <span>{submitting ? "Creating..." : "Create order"}</span>
        <span>{formatPeso(total)}</span>
      </button>
    </div>
  );
}
