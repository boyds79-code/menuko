-- "Call Server" — a customer at a table taps a button (no order or login
-- required, just the table's QR token) to ask staff to come over. Same
-- request/resolve shape as order_change_requests (0015): customer creates
-- a row through a narrow anon RPC, staff read/resolve it through RLS +
-- another RPC, and an insert trigger pings notify-order-event the same way
-- (cashier devices, plus the owner's if recently at the restaurant — see
-- 0019_owner_geofence.sql).

create table server_calls (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  table_id uuid not null references tables (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  resolved_by uuid references accounts (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index server_calls_restaurant_id_idx on server_calls (restaurant_id);
create index server_calls_table_id_idx on server_calls (table_id);

alter table server_calls enable row level security;

create policy "staff can read own restaurant server calls"
  on server_calls for select
  using (restaurant_id = my_restaurant_id() and my_role() in ('owner', 'kitchen', 'cashier'));

-- No insert/update policy for anyone — same reasoning as
-- order_change_requests: all writes go through the RPCs below.

-- ---------------------------------------------------------------------------
-- Customer-facing (anon): identified by the table's QR token, same as
-- mark_table_scanned — no access_token/order needed, a customer can call
-- for help before ordering at all. One pending call per table at a time so
-- mashing the button doesn't spam staff with duplicate pushes.
-- ---------------------------------------------------------------------------
create or replace function request_server_call(p_qr_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table record;
begin
  select id, restaurant_id into v_table from tables where qr_token = p_qr_token;
  if v_table is null then
    raise exception 'table not found';
  end if;

  if exists (
    select 1 from server_calls where table_id = v_table.id and status = 'pending'
  ) then
    return;
  end if;

  insert into server_calls (restaurant_id, table_id) values (v_table.restaurant_id, v_table.id);
end;
$$;

grant execute on function request_server_call(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Staff-facing: acknowledge/clear a call. No geofence check (unlike
-- approving an order change) — this doesn't mutate an order or payment, so
-- there's no "must be physically there to verify" safety property to
-- enforce, just a "someone's handling it" flag.
-- ---------------------------------------------------------------------------
create or replace function resolve_server_call(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if my_role() is null or my_role() not in ('owner', 'kitchen', 'cashier') then
    raise exception 'not authorized';
  end if;

  update server_calls
    set status = 'resolved', resolved_by = auth.uid(), resolved_at = now()
    where id = p_id and restaurant_id = my_restaurant_id() and status = 'pending';
end;
$$;

grant execute on function resolve_server_call(uuid) to authenticated;

alter publication supabase_realtime add table server_calls;

-- Same pg_net pattern as 0005_order_webhook.sql / 0015_order_change_requests.sql.
create or replace function notify_server_call_event()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
begin
  perform net.http_post(
    url := 'https://lqdipvavnhrueogvvvjt.supabase.co/functions/v1/notify-order-event',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'server_calls',
      'record', to_jsonb(NEW),
      'old_record', null
    )
  );
  return NEW;
end;
$$;

create trigger server_calls_notify_event
  after insert on server_calls
  for each row execute function notify_server_call_event();
