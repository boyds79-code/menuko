"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { toOrderView, orderTotal, type OrderView, type RawOrderRow } from "@/lib/orders";
import { formatPeso } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/constants";

const ORDER_SELECT =
  "id, status, channel, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

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
  const [settling, setSettling] = useState(false);
  const supabase = createClient();

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("restaurant_id", restaurantId)
      .neq("status", "paid")
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

  async function settle(group: TableGroup) {
    setSettling(true);
    const orderIds = group.orders.map((o) => o.id);
    await supabase.from("orders").update({ status: "paid" }).in("id", orderIds);
    setOrders((prev) => prev.filter((o) => !orderIds.includes(o.id)));
    setSettling(false);
    setExpanded(null);
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      {groups.length === 0 ? (
        <p className="text-sm text-muted">미결제 테이블이 없습니다.</p>
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
                {expanded === group.tableId ? "내역 접기" : "내역 보기"}
              </button>

              {expanded === group.tableId && (
                <div className="flex flex-col gap-3">
                  <ul className="flex flex-col gap-1 text-sm">
                    {group.orders.map((order) => (
                      <li key={order.id} className="border-t border-border pt-1 first:border-t-0 first:pt-0">
                        <p className="text-xs text-muted">
                          {ORDER_STATUS_LABEL[order.status] ?? order.status}
                        </p>
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>
                              {item.menu_item_name} × {item.quantity}
                            </span>
                            <span>{formatPeso(item.quantity * item.unit_price_snapshot)}</span>
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>

                  {(paymentQrUrl || paymentLink) && (
                    <div className="flex flex-col items-center gap-2 rounded-lg bg-background p-3">
                      {paymentQrUrl && (
                        <Image
                          src={paymentQrUrl}
                          alt="결제 QR"
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
                          결제 링크 열기
                        </a>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => settle(group)}
                    disabled={settling}
                    className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
                  >
                    정산 마감
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
