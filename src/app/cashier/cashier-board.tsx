"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { toOrderView, orderTotal, CHANNEL_BADGE, type OrderView, type RawOrderRow } from "@/lib/orders";
import { formatPeso } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/constants";

const ORDER_SELECT =
  "id, status, channel, note, payment_proof_url, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

type TableGroup = {
  tableId: string;
  tableLabel: string;
  orders: OrderView[];
  total: number;
};

export function CashierBoard({
  restaurantId,
  initialOrders,
  paymentQrUrl,
  paymentLink,
}: {
  restaurantId: string;
  initialOrders: OrderView[];
  paymentQrUrl: string | null;
  paymentLink: string | null;
}) {
  const [orders, setOrders] = useState<OrderView[]>(initialOrders);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settling, setSettling] = useState<string | null>(null);
  const supabase = createClient();

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("restaurant_id", restaurantId)
      .not("status", "in", "(paid,cancelled)")
      .order("created_at", { ascending: true });

    setOrders(((data ?? []) as unknown as RawOrderRow[]).map(toOrderView));
  }, [restaurantId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`cashier-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items", filter: `restaurant_id=eq.${restaurantId}` },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, supabase, refresh]);

  const groups: TableGroup[] = Object.values(
    orders.reduce<Record<string, TableGroup>>((acc, order) => {
      const key = order.table_id;
      acc[key] ??= { tableId: key, tableLabel: order.table_label, orders: [], total: 0 };
      acc[key].orders.push(order);
      acc[key].total += orderTotal(order);
      return acc;
    }, {}),
  ).sort((a, b) => a.tableLabel.localeCompare(b.tableLabel));

  // Settling is this app's definition of "the visit is over" for that
  // table — but only once nothing else is left unpaid there. A dine-in
  // table mid-meal (someone else's order still open) must not be freed
  // just because one order on it was settled.
  async function settlePaid(orderIds: string[], tableId: string, remainingAfter: number) {
    setSettling(tableId);
    await supabase.from("orders").update({ status: "paid" }).in("id", orderIds);
    if (remainingAfter === 0) {
      await supabase.rpc("free_table", { p_table_id: tableId });
    }
    setOrders((prev) => prev.filter((o) => !orderIds.includes(o.id)));
    setSettling(null);
    setExpanded((prev) => (remainingAfter === 0 ? null : prev));
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      {groups.length === 0 ? (
        <p className="text-sm text-muted">No unpaid tables.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.tableId}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{group.tableLabel}</span>
                <span className="font-semibold text-brand">{formatPeso(group.total)}</span>
              </div>

              <button
                onClick={() => setExpanded(expanded === group.tableId ? null : group.tableId)}
                className="text-left text-xs text-muted underline"
              >
                {expanded === group.tableId ? "Hide details" : "Show details"}
              </button>

              {expanded === group.tableId && (
                <div className="flex flex-col gap-3">
                  <ul className="flex flex-col gap-2 text-sm">
                    {group.orders.map((order) => (
                      <li key={order.id} className="border-t border-border pt-2 first:border-t-0 first:pt-0">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-xs text-muted">
                            {ORDER_STATUS_LABEL[order.status] ?? order.status}
                            {CHANNEL_BADGE[order.channel] && ` · ${CHANNEL_BADGE[order.channel]}`}
                            {order.note && ` · ${order.note}`}
                          </p>
                          {group.orders.length > 1 && (
                            <button
                              onClick={() =>
                                settlePaid([order.id], group.tableId, group.orders.length - 1)
                              }
                              disabled={settling === group.tableId}
                              className="text-xs text-brand underline disabled:opacity-60"
                            >
                              Settle this order
                            </button>
                          )}
                        </div>
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>
                              {item.menu_item_name} × {item.quantity}
                            </span>
                            <span>{formatPeso(item.quantity * item.unit_price_snapshot)}</span>
                          </div>
                        ))}
                        {order.payment_proof_url && (
                          <a
                            href={order.payment_proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 flex items-center gap-2 text-xs text-brand underline"
                          >
                            <Image
                              src={order.payment_proof_url}
                              alt="Payment proof"
                              width={32}
                              height={32}
                              className="rounded object-cover"
                            />
                            View payment screenshot
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>

                  {(paymentQrUrl || paymentLink) && (
                    <div className="flex flex-col items-center gap-2 rounded-lg bg-background p-3">
                      {paymentQrUrl && (
                        <Image
                          src={paymentQrUrl}
                          alt="Payment QR"
                          width={160}
                          height={160}
                          className="rounded"
                        />
                      )}
                      {paymentLink && (
                        <a
                          href={paymentLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand underline"
                        >
                          Open payment link
                        </a>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() =>
                      settlePaid(
                        group.orders.map((o) => o.id),
                        group.tableId,
                        0,
                      )
                    }
                    disabled={settling === group.tableId}
                    className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
                  >
                    {group.orders.length > 1 ? "Settle all" : "Settle payment"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
