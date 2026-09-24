-- close_business_day's RETURNS TABLE column `business_date` implicitly
-- becomes an OUT-parameter-like variable in scope for the whole function
-- body — colliding with daily_closings' own `business_date` column
-- (specifically inside `on conflict (restaurant_id, business_date)`) and
-- raising "column reference is ambiguous". Renaming the output column
-- sidesteps it without needing to qualify every reference. Renaming an OUT
-- parameter changes the function's row type, which `create or replace`
-- refuses — drop and recreate instead.
drop function if exists close_business_day(numeric);

create function close_business_day(p_delivery_revenue numeric)
returns table (
  closing_date date,
  table_count bigint,
  dine_in_revenue numeric,
  delivery_revenue numeric,
  best_seller_name text,
  is_premium boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_business_date date;
begin
  if my_role() is null or my_role() not in ('owner', 'cashier') then
    raise exception 'not authorized';
  end if;
  if p_delivery_revenue is null or p_delivery_revenue < 0 then
    raise exception 'invalid delivery revenue';
  end if;

  v_restaurant_id := my_restaurant_id();
  v_business_date := (now() at time zone 'Asia/Manila')::date;

  insert into daily_closings (restaurant_id, business_date, delivery_revenue, closed_by)
    values (v_restaurant_id, v_business_date, p_delivery_revenue, auth.uid())
    on conflict (restaurant_id, business_date)
    do update set
      delivery_revenue = excluded.delivery_revenue,
      closed_by = excluded.closed_by,
      closed_at = now();

  return query
  with today_orders as (
    select o.id, o.table_id, o.channel
    from orders o
    where o.restaurant_id = v_restaurant_id
      and o.status = 'paid'
      and (o.created_at at time zone 'Asia/Manila')::date = v_business_date
  ),
  best_item as (
    select mi.name, sum(oi.quantity) as qty
    from order_items oi
    join today_orders o on o.id = oi.order_id
    join menu_items mi on mi.id = oi.menu_item_id
    group by mi.name
    order by sum(oi.quantity) desc
    limit 1
  )
  select
    v_business_date,
    (
      select count(distinct o.table_id)
      from today_orders o
      join tables t on t.id = o.table_id
      where t.is_virtual = false
    ),
    (
      select coalesce(sum(oi.quantity * oi.unit_price_snapshot), 0)
      from order_items oi
      join today_orders o on o.id = oi.order_id
      where o.channel in ('dine_in', 'manual_pickup_entry')
    ),
    p_delivery_revenue,
    (select name from best_item),
    (select plan = 'premium' from restaurants where id = v_restaurant_id);
end;
$$;

grant execute on function close_business_day(numeric) to authenticated;
