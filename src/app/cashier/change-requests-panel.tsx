"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPeso } from "@/lib/money";

type RequestedItem = { menu_item_id: string; quantity: number };

type ChangeRequestRow = {
  id: string;
  order_id: string;
  kind: "cancel" | "edit";
  requested_items: RequestedItem[] | null;
  note: string | null;
  created_at: string;
  orders: {
    table_id: string;
    tables: { label: string } | { label: string }[] | null;
    order_items: {
      quantity: number;
      unit_price_snapshot: number;
      menu_items: { name: string } | { name: string }[] | null;
    }[];
  } | null;
};

// Nothing else in the app can change order_items or cancel an order once
// placed — the only path is approving one of these requests (see
// supabase/migrations/0015_order_change_requests.sql). The customer can
// always ask; a human here always decides after checking with the
// kitchen, since there's no reliable digital signal for "already cooking."
export function ChangeRequestsPanel({
  restaurantId,
  menuItems,
}: {
  restaurantId: string;
  menuItems: { id: string; name: string }[];
}) {
  const [requests, setRequests] = useState<ChangeRequestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const supabase = createClient();
  const itemNameById = new Map(menuItems.map((i) => [i.id, i.name]));

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("order_change_requests")
      .select(
        "id, order_id, kind, requested_items, note, created_at, orders ( table_id, tables ( label ), order_items ( quantity, unit_price_snapshot, menu_items ( name ) ) )",
      )
      .eq("restaurant_id", restaurantId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setRequests((data ?? []) as unknown as ChangeRequestRow[]);
  }, [restaurantId, supabase]);

  useEffect(() => {
    // Deliberate mount-time fetch (this panel has no server-rendered
    // initial data) — not the accidental-extra-render footgun this rule
    // is meant to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const channel = supabase
      .channel(`change-requests-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_change_requests", filter: `restaurant_id=eq.${restaurantId}` },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, supabase, refresh]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await supabase.rpc("approve_order_change_request", { p_request_id: id });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function deny(id: string) {
    setBusyId(id);
    try {
      await supabase.rpc("deny_order_change_request", { p_request_id: id, p_reason: denyReason || undefined });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setDenyingId(null);
      setDenyReason("");
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 p-4 pb-0">
      {requests.map((req) => {
        const table = Array.isArray(req.orders?.tables) ? req.orders?.tables[0] : req.orders?.tables;
        return (
          <div key={req.id} className="rounded-xl border border-brand bg-brand/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">
                {req.kind === "cancel" ? "Cancellation requested" : "Change requested"} — {table?.label ?? "Table"}
              </span>
              <span className="text-xs text-muted">Please confirm with the kitchen first</span>
            </div>

            {req.kind === "cancel" && req.orders?.order_items && (
              <ul className="mb-3 flex flex-col gap-1 text-sm text-muted">
                {req.orders.order_items.map((item, i) => {
                  const name = Array.isArray(item.menu_items) ? item.menu_items[0]?.name : item.menu_items?.name;
                  return (
                    <li key={i}>
                      {name ?? "(removed item)"} × {item.quantity} — {formatPeso(item.quantity * item.unit_price_snapshot)}
                    </li>
                  );
                })}
              </ul>
            )}

            {req.kind === "edit" && (
              <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted">Current</p>
                  <ul className="flex flex-col gap-1 text-muted">
                    {(req.orders?.order_items ?? []).map((item, i) => {
                      const name = Array.isArray(item.menu_items) ? item.menu_items[0]?.name : item.menu_items?.name;
                      return (
                        <li key={i}>
                          {name ?? "(removed item)"} × {item.quantity}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-brand">Requested</p>
                  <ul className="flex flex-col gap-1">
                    {(req.requested_items ?? []).map((item, i) => (
                      <li key={i}>
                        {itemNameById.get(item.menu_item_id) ?? "(unknown item)"} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {req.note && <p className="mb-3 text-xs italic text-muted">&ldquo;{req.note}&rdquo;</p>}

            {denyingId === req.id ? (
              <div className="flex items-center gap-2">
                <input
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-sm"
                />
                <button
                  onClick={() => deny(req.id)}
                  disabled={busyId === req.id}
                  className="rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-60"
                >
                  Confirm deny
                </button>
                <button
                  onClick={() => {
                    setDenyingId(null);
                    setDenyReason("");
                  }}
                  className="text-sm text-muted underline"
                >
                  Back
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => approve(req.id)}
                  disabled={busyId === req.id}
                  className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  onClick={() => setDenyingId(req.id)}
                  disabled={busyId === req.id}
                  className="rounded-full border border-border px-4 py-1.5 text-sm text-muted disabled:opacity-60"
                >
                  Deny
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
