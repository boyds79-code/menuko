"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { startOfTodayManila } from "@/lib/manila-time";
import { toOrderView, orderTotal, type OrderView, type RawOrderRow } from "@/lib/orders";
import { formatPeso } from "@/lib/money";

const ORDER_SELECT =
  "id, status, channel, note, created_at, table_id, tables ( label ), order_items ( id, menu_item_id, quantity, unit_price_snapshot, menu_items ( name ) )";

// A remote, at-a-glance view of "how's the shop doing right now" for an
// owner who isn't on-site — total revenue collected today, how many orders
// came in, and how many tables still haven't paid. Reuses the same
// realtime-refetch pattern as the kitchen/cashier boards.
export function TodaySalesPanel({
  restaurantId,
  initialOrders,
}: {
  restaurantId: string;
  initialOrders: OrderView[];
}) {
  const [orders, setOrders] = useState<OrderView[]>(initialOrders);
  const supabase = createClient();

  const fetchToday = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("restaurant_id", restaurantId)
      .gte("created_at", startOfTodayManila().toISOString())
      .order("created_at", { ascending: true });

    setOrders(((data ?? []) as unknown as RawOrderRow[]).map(toOrderView));
  }, [restaurantId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`today-sales-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchToday(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items", filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchToday(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, supabase, fetchToday]);

  const revenueToday = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + orderTotal(o), 0);
  const orderCountToday = orders.length;
  const unpaidTableCount = new Set(
    orders.filter((o) => o.status !== "paid").map((o) => o.table_id),
  ).size;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Today</h2>
        <span className="flex items-center gap-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Live
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Revenue collected" value={formatPeso(revenueToday)} />
        <Stat label="Orders today" value={String(orderCountToday)} />
        <Stat label="Unpaid tables" value={String(unpaidTableCount)} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-background p-3">
      <span className="text-lg font-semibold text-brand">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
