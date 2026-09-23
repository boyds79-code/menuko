-- The free "Today" panel reads orders/order_items directly (RLS-scoped by
-- restaurant + role, no plan check) and stays free, unchanged. But the
-- period-based revenue RPCs (sales_by_item/day/hour, and top_combos when
-- scoped to a period) only had their premium gate in the app UI
-- (AnalyticsSection's `isPremium` check) — any free-tier owner could call
-- these RPCs directly (e.g. via the REST API) and reconstruct this
-- week's/month's revenue anyway. Add the plan check inside the functions
-- themselves so free vs. premium is actually enforced server-side, not
-- just hidden client-side.

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
    and (select plan from restaurants where id = my_restaurant_id()) = 'premium'
    and o.status = 'paid'
    and (o.created_at at time zone 'Asia/Manila')::date
      >= (now() at time zone 'Asia/Manila')::date - (p_days - 1)
  group by mi.name
  order by sum(oi.quantity) desc
  limit p_limit;
$$;

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
    and (select plan from restaurants where id = my_restaurant_id()) = 'premium'
    and o.status = 'paid'
    and (o.created_at at time zone 'Asia/Manila')::date
      >= (now() at time zone 'Asia/Manila')::date - (p_days - 1)
  group by 1
  order by 1;
$$;

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
    and (select plan from restaurants where id = my_restaurant_id()) = 'premium'
    and o.status = 'paid'
    and (o.created_at at time zone 'Asia/Manila')::date
      >= (now() at time zone 'Asia/Manila')::date - (p_days - 1)
  group by 1
  order by 1;
$$;

-- top_combos: the free "Combo suggestions" card calls this with p_days
-- omitted (all-time, item-pairing counts only — no revenue figures, so it
-- stays free as before). SalesInsights (premium panel) calls it WITH
-- p_days — that period-scoped form is now gated the same way as the RPCs
-- above.
create or replace function top_combos(p_limit int default 5, p_days int default null)
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
      or (
        (select plan from restaurants where id = my_restaurant_id()) = 'premium'
        and (o.created_at at time zone 'Asia/Manila')::date
          >= (now() at time zone 'Asia/Manila')::date - (p_days - 1)
      )
    )
  group by mia.name, mib.name
  having count(distinct a.order_id) >= 2
  order by count(distinct a.order_id) desc
  limit p_limit;
$$;
