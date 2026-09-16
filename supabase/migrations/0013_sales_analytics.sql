-- Period-based sales analytics for the owner's "Deeper analytics" panel:
-- best-selling items, order combos, and the best-selling day/hour within
-- the last N days. All owner-only + restaurant-scoped, and all read only
-- "paid" orders (unpaid orders aren't realized revenue yet — same rule the
-- Today panel already uses). Day/hour buckets are computed in Asia/Manila
-- (Menuko is Cebu/Philippines-only for now, fixed UTC+8, no DST) using
-- Postgres's own tzdata rather than the hand-rolled offset math the app
-- uses client-side (src/lib/manila-time.ts), since these run inside the
-- database anyway.
--
-- Read-only, so — same as the existing top_combos — a non-owner caller
-- just gets an empty result via the WHERE clause. No data leak, unlike a
-- mutation silently no-op'ing.

create or replace function sales_by_item(p_days int, p_limit int default 10)
returns table (item_name text, total_quantity bigint, total_revenue numeric)
language sql
security definer
stable
set search_path = public
as $$
  select mi.name,
         sum(oi.quantity),
         sum(oi.quantity * oi.unit_price_snapshot)
  from order_items oi
  join orders o on o.id = oi.order_id
  join menu_items mi on mi.id = oi.menu_item_id
  where oi.restaurant_id = my_restaurant_id()
    and my_role() = 'owner'
    and o.status = 'paid'
    and (o.created_at at time zone 'Asia/Manila')::date
      >= (now() at time zone 'Asia/Manila')::date - (p_days - 1)
  group by mi.name
  order by sum(oi.quantity) desc
  limit p_limit;
$$;

grant execute on function sales_by_item(int, int) to authenticated;

create or replace function sales_by_day(p_days int)
returns table (sale_date date, revenue numeric, order_count bigint)
language sql
security definer
stable
set search_path = public
as $$
  select (o.created_at at time zone 'Asia/Manila')::date as sale_date,
         sum(oi.quantity * oi.unit_price_snapshot),
         count(distinct o.id)
  from orders o
  join order_items oi on oi.order_id = o.id
  where o.restaurant_id = my_restaurant_id()
    and my_role() = 'owner'
    and o.status = 'paid'
    and (o.created_at at time zone 'Asia/Manila')::date
      >= (now() at time zone 'Asia/Manila')::date - (p_days - 1)
  group by 1
  order by 1;
$$;

grant execute on function sales_by_day(int) to authenticated;

create or replace function sales_by_hour(p_days int)
returns table (hour_of_day int, revenue numeric, order_count bigint)
language sql
security definer
stable
set search_path = public
as $$
  select extract(hour from (o.created_at at time zone 'Asia/Manila'))::int as hour_of_day,
         sum(oi.quantity * oi.unit_price_snapshot),
         count(distinct o.id)
  from orders o
  join order_items oi on oi.order_id = o.id
  where o.restaurant_id = my_restaurant_id()
    and my_role() = 'owner'
    and o.status = 'paid'
    and (o.created_at at time zone 'Asia/Manila')::date
      >= (now() at time zone 'Asia/Manila')::date - (p_days - 1)
  group by 1
  order by 1;
$$;

grant execute on function sales_by_hour(int) to authenticated;

-- Combo suggestions were all-time only; add an optional period filter so
-- the same "which items get ordered together" signal can be scoped to the
-- last 7/30 days like the panels above. p_days stays null-default so the
-- existing all-time caller (the standalone "Combo suggestions" section)
-- keeps working unchanged. Unlike the panels above, this intentionally
-- does NOT filter to status = 'paid' — that matches the original
-- function's behavior (an order still being prepared is still a real
-- signal of what gets ordered together).
drop function if exists top_combos(int);

create function top_combos(p_limit int default 5, p_days int default null)
returns table (item_a_name text, item_b_name text, order_count bigint)
language sql
security definer
stable
set search_path = public
as $$
  select mia.name, mib.name, count(distinct a.order_id)
  from order_items a
  join order_items b on a.order_id = b.order_id and a.menu_item_id < b.menu_item_id
  join menu_items mia on mia.id = a.menu_item_id
  join menu_items mib on mib.id = b.menu_item_id
  join orders o on o.id = a.order_id
  where a.restaurant_id = my_restaurant_id()
    and my_role() = 'owner'
    and (
      p_days is null
      or (o.created_at at time zone 'Asia/Manila')::date
        >= (now() at time zone 'Asia/Manila')::date - (p_days - 1)
    )
  group by mia.name, mib.name
  having count(distinct a.order_id) >= 2
  order by count(distinct a.order_id) desc
  limit p_limit;
$$;

grant execute on function top_combos(int, int) to authenticated;
