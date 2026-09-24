-- End-of-day closing: cashier or owner enters today's total delivery
-- revenue (a single manual figure — GrabFood/foodpanda orders often
-- aren't itemized in the app all day) and taps "Close day". Records the
-- closing and hands back an immediate brief summary; the client only
-- shows it as a "today's report" when the restaurant is premium (same
-- free/premium boundary as the rest of Sales Report), but closing itself
-- works on every plan since it's just record-keeping.

create table daily_closings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  business_date date not null,
  delivery_revenue numeric(10, 2) not null default 0 check (delivery_revenue >= 0),
  closed_by uuid not null references accounts (id),
  closed_at timestamptz not null default now(),
  unique (restaurant_id, business_date)
);
create index daily_closings_restaurant_id_idx on daily_closings (restaurant_id);

alter table daily_closings enable row level security;

create policy "staff can read own restaurant daily closings"
  on daily_closings for select
  using (restaurant_id = my_restaurant_id() and my_role() in ('owner', 'cashier'));

-- No insert/update policy — all writes go through close_business_day below.

-- Re-closing the same business_date (e.g. a mistyped delivery figure)
-- just updates the existing row rather than erroring, matching how
-- forgiving the rest of the staff-facing app is about redoing an action.
create or replace function close_business_day(p_delivery_revenue numeric)
returns table (
  business_date date,
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
