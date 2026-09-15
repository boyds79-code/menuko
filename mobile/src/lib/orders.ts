// COPY of ../../../src/lib/orders.ts (web app) — keep in sync manually.
import type { OrderChannel, OrderStatus } from "./database.types";

export type OrderItemView = {
  id: string;
  menu_item_id: string | null;
  quantity: number;
  unit_price_snapshot: number;
  menu_item_name: string;
};

export type OrderView = {
  id: string;
  status: OrderStatus;
  channel: OrderChannel;
  created_at: string;
  table_id: string;
  table_label: string;
  items: OrderItemView[];
};

export function orderTotal(order: Pick<OrderView, "items">): number {
  return order.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_snapshot,
    0,
  );
}

// Raw shape returned by a Supabase select with nested table/order_items joins.
export type RawOrderRow = {
  id: string;
  status: OrderStatus;
  channel: OrderChannel;
  created_at: string;
  table_id: string;
  tables: { label: string } | { label: string }[] | null;
  order_items: {
    id: string;
    menu_item_id: string | null;
    quantity: number;
    unit_price_snapshot: number;
    menu_items: { name: string } | { name: string }[] | null;
  }[];
};

export function toOrderView(row: RawOrderRow): OrderView {
  const table = Array.isArray(row.tables) ? row.tables[0] : row.tables;
  return {
    id: row.id,
    status: row.status,
    channel: row.channel,
    created_at: row.created_at,
    table_id: row.table_id,
    table_label: table?.label ?? "-",
    items: row.order_items.map((item) => {
      const menuItem = Array.isArray(item.menu_items)
        ? item.menu_items[0]
        : item.menu_items;
      return {
        id: item.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price_snapshot: item.unit_price_snapshot,
        menu_item_name: menuItem?.name ?? "(삭제된 메뉴)",
      };
    }),
  };
}
