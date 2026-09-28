-- Lets a customer see what's already been ordered at their table before
-- adding their own items — reduces accidental duplicate ordering when
-- multiple people at one table order separately from their own phones.
-- No access_token needed (unlike get_order_for_customer): this is a plain
-- aggregate of item name + quantity, not any single order's private detail,
-- and anyone who scanned the table's QR is meant to see it.
--
-- Scoped to the table's *current* visit via occupied_since (set by
-- mark_table_scanned, cleared by free_table — see 0007_table_occupancy.sql)
-- so a new group seated at this table after a previous party paid and left
-- never sees that earlier party's order history.
create function get_table_order_summary(p_qr_token uuid)
returns table (menu_item_id uuid, item_name text, quantity bigint)
language sql
security definer
set search_path = public
as $$
  select mi.id, mi.name, sum(oi.quantity)::bigint
  from tables t
  join orders o on o.table_id = t.id
  join order_items oi on oi.order_id = o.id
  join menu_items mi on mi.id = oi.menu_item_id
  where t.qr_token = p_qr_token
    and t.occupied_since is not null
    and o.created_at >= t.occupied_since
    and o.status != 'cancelled'
  group by mi.id, mi.name
  order by mi.name;
$$;

grant execute on function get_table_order_summary(uuid) to anon, authenticated;
