-- Fix mark_table_occupied / free_table: `my_role() not in (...)` is NULL
-- (not TRUE) when my_role() is NULL — an anonymous/unauthenticated caller —
-- so the RAISE EXCEPTION never fired for that case. It was harmless in
-- practice only by accident (my_restaurant_id() is also NULL then, so the
-- UPDATE's WHERE clause matched nothing), but returned a misleading 204
-- success instead of a clear authorization error. Explicit NULL check fixes it.

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
