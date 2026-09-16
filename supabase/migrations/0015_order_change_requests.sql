-- Customer-initiated cancel/edit requests, resolved by staff after they
-- physically check with the kitchen — not an automatic cutoff. Digital
-- order_status here (open/served/paid) never distinguishes "kitchen
-- hasn't touched this yet" from "actively cooking," so any automatic
-- client-side lock (e.g. only while status = 'open') would be a guess.
-- Instead: the customer can always ASK, a human (cashier/owner) always
-- decides, same trust model already used for payment-proof screenshots.
--
-- This also structurally enforces "the server can only change the order
-- in response to a request": order_items has never had a staff RLS write
-- policy (staff only ever had SELECT on it — see 0001), and this table
-- gets no direct write policy either. The only way order_items or
-- orders.status can change after creation is through the approve RPC
-- below, which requires a pending request row to exist first.

create table order_change_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  -- Denormalized from orders.restaurant_id, same reason as order_items:
  -- RLS/Realtime filters only support simple column equality.
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  kind text not null check (kind in ('cancel', 'edit')),
  -- Only set for kind = 'edit': the customer's proposed full replacement
  -- item list, as [{menu_item_id, quantity}, ...]. Prices/availability
  -- are re-derived server-side at approval time, never trusted from here.
  requested_items jsonb,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  deny_reason text,
  resolved_by uuid references accounts (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index order_change_requests_restaurant_id_idx on order_change_requests (restaurant_id);
create index order_change_requests_order_id_idx on order_change_requests (order_id);

alter table order_change_requests enable row level security;

create policy "staff can read own restaurant change requests"
  on order_change_requests for select
  using (restaurant_id = my_restaurant_id() and my_role() in ('owner', 'kitchen', 'cashier'));

-- No insert/update policy for anyone — see comment above. All writes go
-- through the security-definer RPCs below.

-- ---------------------------------------------------------------------------
-- Customer-facing RPCs (anon, access_token-verified — same ownership proof
-- as get_order_for_customer)
-- ---------------------------------------------------------------------------

create or replace function request_order_cancel(p_order_id uuid, p_access_token uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_request_id uuid;
begin
  select o.id, o.restaurant_id, o.status
    into v_order
    from orders o
    where o.id = p_order_id and o.access_token = p_access_token;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status in ('paid', 'cancelled') then
    raise exception 'this order can no longer be changed';
  end if;

  if exists (
    select 1 from order_change_requests
    where order_id = p_order_id and status = 'pending'
  ) then
    raise exception 'a request is already pending for this order';
  end if;

  insert into order_change_requests (order_id, restaurant_id, kind, note)
    values (p_order_id, v_order.restaurant_id, 'cancel', p_note)
    returning id into v_request_id;

  return v_request_id;
end;
$$;

grant execute on function request_order_cancel(uuid, uuid, text) to anon, authenticated;

create or replace function request_order_edit(p_order_id uuid, p_access_token uuid, p_items jsonb, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_request_id uuid;
begin
  select o.id, o.restaurant_id, o.status
    into v_order
    from orders o
    where o.id = p_order_id and o.access_token = p_access_token;

  if v_order is null then
    raise exception 'order not found';
  end if;

  if v_order.status in ('paid', 'cancelled') then
    raise exception 'this order can no longer be changed';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'use a cancel request to remove the whole order';
  end if;

  if exists (
    select 1 from order_change_requests
    where order_id = p_order_id and status = 'pending'
  ) then
    raise exception 'a request is already pending for this order';
  end if;

  insert into order_change_requests (order_id, restaurant_id, kind, requested_items, note)
    values (p_order_id, v_order.restaurant_id, 'edit', p_items, p_note)
    returning id into v_request_id;

  return v_request_id;
end;
$$;

grant execute on function request_order_edit(uuid, uuid, jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Staff-facing RPCs (owner/cashier only — they're the ones who'd walk
-- over and check with the kitchen)
-- ---------------------------------------------------------------------------

create or replace function approve_order_change_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_item jsonb;
begin
  if my_role() is null or my_role() not in ('owner', 'cashier') then
    raise exception 'not authorized';
  end if;

  select * into v_request
    from order_change_requests
    where id = p_request_id
      and restaurant_id = my_restaurant_id()
      and status = 'pending';

  if v_request is null then
    raise exception 'request not found';
  end if;

  if v_request.kind = 'cancel' then
    update orders set status = 'cancelled', updated_at = now() where id = v_request.order_id;
  else
    delete from order_items where order_id = v_request.order_id;

    for v_item in select * from jsonb_array_elements(v_request.requested_items)
    loop
      insert into order_items (order_id, restaurant_id, menu_item_id, quantity, unit_price_snapshot)
      select
        v_request.order_id,
        v_request.restaurant_id,
        mi.id,
        greatest((v_item ->> 'quantity')::int, 1),
        mi.price
      from menu_items mi
      where mi.id = (v_item ->> 'menu_item_id')::uuid
        and mi.restaurant_id = v_request.restaurant_id
        and mi.is_available = true;
    end loop;

    update orders set updated_at = now() where id = v_request.order_id;
  end if;

  update order_change_requests
    set status = 'approved', resolved_by = auth.uid(), resolved_at = now()
    where id = p_request_id;
end;
$$;

grant execute on function approve_order_change_request(uuid) to authenticated;

create or replace function deny_order_change_request(p_request_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
begin
  if my_role() is null or my_role() not in ('owner', 'cashier') then
    raise exception 'not authorized';
  end if;

  select * into v_request
    from order_change_requests
    where id = p_request_id
      and restaurant_id = my_restaurant_id()
      and status = 'pending';

  if v_request is null then
    raise exception 'request not found';
  end if;

  update order_change_requests
    set status = 'denied', deny_reason = p_reason, resolved_by = auth.uid(), resolved_at = now()
    where id = p_request_id;

  -- Nothing on the order itself changes, but the customer's status
  -- screen only listens for `orders` UPDATE events — touch it so a
  -- denial reaches them too.
  update orders set updated_at = now() where id = v_request.order_id;
end;
$$;

grant execute on function deny_order_change_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Customer read-back: extend get_order_for_customer with the latest
-- change request for this order (pending/approved/denied), so the
-- existing order-status screen can show it without a second RPC.
-- ---------------------------------------------------------------------------

drop function if exists get_order_for_customer(uuid, uuid);

create function get_order_for_customer(p_order_id uuid, p_access_token uuid)
returns table (
  id uuid,
  status order_status,
  created_at timestamptz,
  item_id uuid,
  menu_item_id uuid,
  item_name text,
  quantity int,
  unit_price_snapshot numeric,
  change_request_id uuid,
  change_request_kind text,
  change_request_status text,
  change_request_deny_reason text
)
language sql
security definer
stable
set search_path = public
as $$
  select o.id, o.status, o.created_at,
         oi.id, oi.menu_item_id, mi.name, oi.quantity, oi.unit_price_snapshot,
         cr.id, cr.kind, cr.status, cr.deny_reason
  from orders o
  join order_items oi on oi.order_id = o.id
  left join menu_items mi on mi.id = oi.menu_item_id
  left join lateral (
    select id, kind, status, deny_reason
    from order_change_requests
    where order_id = o.id
    order by created_at desc
    limit 1
  ) cr on true
  where o.id = p_order_id
    and o.access_token = p_access_token;
$$;

grant execute on function get_order_for_customer(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime + notification
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table order_change_requests;

-- Same pg_net pattern as 0005_order_webhook.sql — pings notify-order-event
-- so a new pending request pushes to the restaurant's cashier devices.
create or replace function notify_change_request_event()
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
      'table', 'order_change_requests',
      'record', to_jsonb(NEW),
      'old_record', null
    )
  );
  return NEW;
end;
$$;

create trigger order_change_requests_notify_event
  after insert on order_change_requests
  for each row execute function notify_change_request_event();
