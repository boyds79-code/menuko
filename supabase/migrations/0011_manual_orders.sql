-- Manual delivery/takeout order entry for the cashier. Grabfood/foodpanda
-- integration is out of reach for now (see README) — this is the interim
-- the spec always intended (channel column reserved back in 0001_init.sql).

alter table tables add column is_virtual boolean not null default false;
alter table orders add column note text;

-- ---------------------------------------------------------------------------
-- create_manual_order: same server-priced-items shape as create_order, but
-- identifies the restaurant from the logged-in staff member (owner/cashier)
-- instead of a qr_token, and get-or-creates a per-channel "virtual" table
-- (Delivery / Takeout) instead of requiring a real physical table — the
-- whole app (cashier board, kitchen board, table status board) is already
-- built around grouping orders by table_id, so this is far less invasive
-- than making orders.table_id nullable everywhere.
-- ---------------------------------------------------------------------------
create or replace function create_manual_order(p_channel order_channel, p_items jsonb, p_note text default null)
returns table (order_id uuid, access_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_table_id uuid;
  v_label text;
  v_order_id uuid;
  v_access_token uuid;
  v_item jsonb;
begin
  if my_role() is null or my_role() not in ('owner', 'cashier') then
    raise exception 'not authorized';
  end if;

  if p_channel not in ('manual_delivery_entry', 'manual_pickup_entry') then
    raise exception 'invalid channel for a manual order';
  end if;

  v_restaurant_id := my_restaurant_id();
  v_label := case p_channel when 'manual_delivery_entry' then 'Delivery' else 'Takeout' end;

  select id into v_table_id
    from tables
    where restaurant_id = v_restaurant_id and is_virtual = true and label = v_label;

  if v_table_id is null then
    insert into tables (restaurant_id, label, is_virtual)
      values (v_restaurant_id, v_label, true)
      returning id into v_table_id;
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'order must have at least one item';
  end if;

  insert into orders (restaurant_id, table_id, channel, note)
    values (v_restaurant_id, v_table_id, p_channel, nullif(trim(p_note), ''))
    returning id, orders.access_token into v_order_id, v_access_token;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into order_items (order_id, restaurant_id, menu_item_id, quantity, unit_price_snapshot)
    select
      v_order_id,
      v_restaurant_id,
      mi.id,
      greatest((v_item ->> 'quantity')::int, 1),
      mi.price
    from menu_items mi
    where mi.id = (v_item ->> 'menu_item_id')::uuid
      and mi.restaurant_id = v_restaurant_id
      and mi.is_available = true;
  end loop;

  return query select v_order_id, v_access_token;
end;
$$;

grant execute on function create_manual_order(order_channel, jsonb, text) to authenticated;
