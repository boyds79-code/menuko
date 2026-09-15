-- Table occupancy tracking for the cashier: knows when a customer scanned
-- the menu (or was manually seated), whether they've ordered yet, and
-- alerts cashier devices if 10+ minutes pass with no order.

alter table tables
  add column occupied_since timestamptz,
  add column occupied_source text check (occupied_source in ('qr_scan', 'manual')),
  add column first_order_at timestamptz,
  add column stall_alerted boolean not null default false;

alter publication supabase_realtime add table tables;

-- ---------------------------------------------------------------------------
-- Customer-facing: called once when the order page loads for a table.
-- Only starts a session if the table was free — refreshing an already-
-- occupied table's page must not reset the stall timer.
-- ---------------------------------------------------------------------------
create or replace function mark_table_scanned(p_qr_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update tables
  set occupied_since = now(), occupied_source = 'qr_scan', first_order_at = null, stall_alerted = false
  where qr_token = p_qr_token and occupied_since is null;
$$;

grant execute on function mark_table_scanned(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Staff-facing: manual seating (walk-ins who haven't scanned) and manual
-- release (false alarm, customer left, etc). Owner or cashier only.
-- ---------------------------------------------------------------------------
create or replace function mark_table_occupied(p_table_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if my_role() is null or my_role() not in ('owner', 'cashier') then
    raise exception 'not authorized';
  end if;

  update tables
  set occupied_since = now(), occupied_source = 'manual', first_order_at = null, stall_alerted = false
  where id = p_table_id and restaurant_id = my_restaurant_id() and occupied_since is null;
end;
$$;

grant execute on function mark_table_occupied(uuid) to authenticated;

create or replace function free_table(p_table_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if my_role() is null or my_role() not in ('owner', 'cashier') then
    raise exception 'not authorized';
  end if;

  update tables
  set occupied_since = null, occupied_source = null, first_order_at = null, stall_alerted = false
  where id = p_table_id and restaurant_id = my_restaurant_id();
end;
$$;

grant execute on function free_table(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- create_order: now also clears the stall condition by stamping the
-- table's first_order_at (spec section unaffected — same signature/body,
-- just one added UPDATE at the end).
-- ---------------------------------------------------------------------------
create or replace function create_order(p_qr_token uuid, p_items jsonb)
returns table (order_id uuid, access_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table record;
  v_order_id uuid;
  v_access_token uuid;
  v_item jsonb;
begin
  select t.id as table_id, t.restaurant_id
    into v_table
    from tables t
    where t.qr_token = p_qr_token;

  if v_table is null then
    raise exception 'invalid table';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'order must have at least one item';
  end if;

  insert into orders (restaurant_id, table_id)
    values (v_table.restaurant_id, v_table.table_id)
    returning id, orders.access_token into v_order_id, v_access_token;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into order_items (order_id, restaurant_id, menu_item_id, quantity, unit_price_snapshot)
    select
      v_order_id,
      v_table.restaurant_id,
      mi.id,
      greatest((v_item ->> 'quantity')::int, 1),
      mi.price
    from menu_items mi
    where mi.id = (v_item ->> 'menu_item_id')::uuid
      and mi.restaurant_id = v_table.restaurant_id
      and mi.is_available = true;
  end loop;

  update tables set first_order_at = coalesce(first_order_at, now()) where id = v_table.table_id;

  return query select v_order_id, v_access_token;
end;
$$;

-- ---------------------------------------------------------------------------
-- Scheduled stall check (pg_cron, every minute). No Edge Function needed —
-- this is one query + a loop, simple enough to do directly in plpgsql with
-- net.http_post, same primitive 0005_order_webhook.sql's trigger uses.
-- ---------------------------------------------------------------------------
create or replace function check_table_stalls()
returns void
language plpgsql
security definer
set search_path = public, net
as $$
declare
  r record;
  token_row record;
begin
  for r in
    select t.id as table_id, t.label, t.restaurant_id
    from tables t
    where t.occupied_since is not null
      and t.first_order_at is null
      and t.occupied_since < now() - interval '10 minutes'
      and t.stall_alerted = false
  loop
    for token_row in
      select dpt.expo_push_token
      from device_push_tokens dpt
      join accounts a on a.id = dpt.account_id
      where a.restaurant_id = r.restaurant_id and a.role = 'cashier'
    loop
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'to', token_row.expo_push_token,
          'title', 'No order yet',
          'body', r.label || ' scanned the menu 10+ min ago with no order — please check on them.',
          'data', jsonb_build_object('tableId', r.table_id)
        )
      );
    end loop;

    update tables set stall_alerted = true where id = r.table_id;
  end loop;
end;
$$;

select cron.schedule('check-table-stalls', '* * * * *', $$select check_table_stalls();$$);
