-- Lets an owner cover cashier duties themselves (common for a small
-- operator) while keeping the safety property behind order-change-request
-- approval: a human must be able to physically check with the kitchen.
-- A cashier account is presumed present by definition of being logged
-- into the physical cashier station, so none of this applies to them —
-- only 'owner' is geofence-checked.
--
-- No background location tracking: the owner app only reads location (a)
-- once every few minutes while the app is open, to refresh a lightweight
-- "was recently at the restaurant" timestamp used to decide whether to
-- push-notify them about a new request, and (b) once, fresh, at the exact
-- moment they tap approve/deny — verified server-side here, never trusted
-- from the client.

alter table restaurants add column latitude double precision;
alter table restaurants add column longitude double precision;

-- Updated only while genuinely within the geofence (see
-- update_owner_presence below) — staleness alone (an old timestamp) is
-- what naturally means "probably not there anymore", no explicit clear
-- needed.
alter table accounts add column last_at_restaurant_at timestamptz;

create or replace function haversine_meters(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
as $$
  select 6371000 * 2 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ^ 2
  ));
$$;

-- Called every few minutes while the owner app is in the foreground (see
-- mobile/app/cashier.tsx's presence effect, gated to role='owner'). A
-- no-op (returns without writing) until the restaurant's location has
-- been set in Settings.
create or replace function update_owner_presence(p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant record;
begin
  if my_role() is null or my_role() != 'owner' then
    raise exception 'not authorized';
  end if;

  select latitude, longitude into v_restaurant from restaurants where id = my_restaurant_id();
  if v_restaurant.latitude is null or v_restaurant.longitude is null then
    return;
  end if;

  if haversine_meters(v_restaurant.latitude, v_restaurant.longitude, p_lat, p_lng) <= 150 then
    update accounts set last_at_restaurant_at = now() where id = auth.uid();
  end if;
end;
$$;

grant execute on function update_owner_presence(double precision, double precision) to authenticated;

-- approve/deny now take the caller's current position — required and
-- checked against the restaurant's location only for role='owner';
-- cashier calls are unaffected (p_lat/p_lng stay null, no distance check).
drop function if exists approve_order_change_request(uuid);

create function approve_order_change_request(p_request_id uuid, p_lat double precision default null, p_lng double precision default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_item jsonb;
  v_restaurant record;
begin
  if my_role() is null or my_role() not in ('owner', 'cashier') then
    raise exception 'not authorized';
  end if;

  if my_role() = 'owner' then
    select latitude, longitude into v_restaurant from restaurants where id = my_restaurant_id();
    if v_restaurant.latitude is null or v_restaurant.longitude is null then
      raise exception 'Set your restaurant''s location in Settings before approving requests as owner.';
    end if;
    if p_lat is null or p_lng is null then
      raise exception 'Location is required to approve a request as owner.';
    end if;
    if haversine_meters(v_restaurant.latitude, v_restaurant.longitude, p_lat, p_lng) > 150 then
      raise exception 'You need to be at the restaurant to approve this.';
    end if;
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

grant execute on function approve_order_change_request(uuid, double precision, double precision) to authenticated;

drop function if exists deny_order_change_request(uuid, text);

create function deny_order_change_request(p_request_id uuid, p_reason text default null, p_lat double precision default null, p_lng double precision default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_restaurant record;
begin
  if my_role() is null or my_role() not in ('owner', 'cashier') then
    raise exception 'not authorized';
  end if;

  if my_role() = 'owner' then
    select latitude, longitude into v_restaurant from restaurants where id = my_restaurant_id();
    if v_restaurant.latitude is null or v_restaurant.longitude is null then
      raise exception 'Set your restaurant''s location in Settings before resolving requests as owner.';
    end if;
    if p_lat is null or p_lng is null then
      raise exception 'Location is required to resolve a request as owner.';
    end if;
    if haversine_meters(v_restaurant.latitude, v_restaurant.longitude, p_lat, p_lng) > 150 then
      raise exception 'You need to be at the restaurant to resolve this.';
    end if;
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

  update orders set updated_at = now() where id = v_request.order_id;
end;
$$;

grant execute on function deny_order_change_request(uuid, text, double precision, double precision) to authenticated;
