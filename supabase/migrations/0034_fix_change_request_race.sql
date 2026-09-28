-- approve_order_change_request / deny_order_change_request (0019) read the
-- request row with a plain SELECT (no lock), then write to it without
-- re-checking status. Two calls racing on the same request — e.g. a cashier
-- approving at nearly the same instant an owner denies — could both pass
-- the "is it pending" check before either commits, so both run their own
-- business logic, and whichever UPDATE commits last silently overwrites
-- `status` regardless of order. Net effect: the order can end up
-- cancelled/changed by an approval whose request row nonetheless reads
-- "denied" (or vice versa) — not "first request wins", just "last UPDATE
-- wins the status column" while side effects come from whoever's logic ran.
--
-- Fix: `select ... for update` takes a row lock immediately, so the second
-- concurrent call blocks until the first transaction commits, then re-reads
-- the row under that lock and correctly sees it's no longer 'pending' —
-- it now cleanly raises 'request not found' instead of racing ahead with
-- stale data. This makes the two functions properly serialize: whichever
-- call started first completes in full, the second is rejected outright.

drop function if exists approve_order_change_request(uuid, double precision, double precision);

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
      and status = 'pending'
    for update;

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

drop function if exists deny_order_change_request(uuid, text, double precision, double precision);

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
      and status = 'pending'
    for update;

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
