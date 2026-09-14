"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toOrderView, orderTotal, type OrderView, type RawOrderRow } from "@/lib/orders";
import { formatPeso } from "@/lib/money";

const ORDER_SELECT =
  "id, status, channel, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

export function KitchenBoard({
  restaurantId,
  initialOrders,
}: {
  restaurantId: string;
  initialOrders: OrderView[];
}) {
  const [orders, setOrders] = useState<OrderView[]>(initialOrders);
  const supabase = createClient();

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("restaurant_id", restaurantId)
      .in("status", ["open", "sent_to_kitchen", "preparing", "served"])
      .order("created_at", { ascending: true });

    setOrders(((data ?? []) as unknown as RawOrderRow[]).map(toOrderView));
  }, [restaurantId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`kitchen-${restaurantId}`)
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

  async function markServed(orderId: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "served" } : o)),
    );
    await supabase.from("orders").update({ status: "served" }).eq("id", orderId);
  }

  const active = orders.filter((o) => o.status !== "served");
  const done = orders.filter((o) => o.status === "served");

  return (
    <main className="flex flex-1 flex-col gap-6 p-4">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted">
          진행 중인 주문 ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted">들어온 주문이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((order) => (
              <OrderCard key={order.id} order={order} onDone={() => markServed(order.id)} />
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted">완료됨</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {done.map((order) => (
              <OrderCard key={order.id} order={order} done />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function OrderCard({
  order,
  onDone,
  done,
}: {
  order: OrderView;
  onDone?: () => void;
  done?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm ${done ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{order.table_label}</span>
        <span className="text-xs text-muted">
          {new Date(order.created_at).toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <ul className="flex flex-col gap-1 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span>
              {item.menu_item_name} × {item.quantity}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between pt-1 text-sm text-muted">
        <span>{formatPeso(orderTotal(order))}</span>
        {!done && onDone && (
          <button
            onClick={onDone}
            className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground transition hover:opacity-90"
          >
            조리 완료
          </button>
        )}
      </div>
    </div>
  );
}
