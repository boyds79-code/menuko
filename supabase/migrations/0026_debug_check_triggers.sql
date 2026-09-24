-- Temporary diagnostic RPC — restaurants_notify_translate isn't firing on
-- UPDATE even though the same pattern works fine for menu_items/
-- menu_categories. Lists triggers on `restaurants` so we can see what
-- actually got created. Dropped by the very next migration once we've
-- looked.
create or replace function debug_list_restaurant_triggers()
returns table (trigger_name text, event_manipulation text, action_timing text)
language sql
security definer
stable
set search_path = public
as $$
  select trigger_name::text, event_manipulation::text, action_timing::text
  from information_schema.triggers
  where event_object_table = 'restaurants';
$$;

grant execute on function debug_list_restaurant_triggers() to service_role;
