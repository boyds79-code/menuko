-- Calls the notify-order-event Edge Function whenever an order is created
-- or updated, so it can push a notification to the right staff role.
--
-- The Dashboard's "Database Webhooks" convenience wrapper
-- (supabase_functions.http_request) isn't provisioned on this project, so
-- this talks to pg_net directly instead — that's the same underlying
-- primitive the Dashboard feature uses, just without the wrapper, and it's
-- fully scriptable from a migration.
--
-- Security tradeoff: this hits the function with no Authorization header,
-- so the function must be deployed with `--no-verify-jwt` (see
-- supabase/functions/notify-order-event and the README). Worst case of
-- that is someone spamming junk push notifications to a restaurant's
-- staff, not a data leak (the function only ever reads
-- device_push_tokens/accounts/tables server-side with its own
-- service-role key, and never returns any of that data to the caller).
-- Fine for MVP; a shared secret via current_setting() would tighten this
-- later without hardcoding it in a migration file.

create extension if not exists pg_net;

create or replace function notify_order_event()
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
      'type', case when TG_OP = 'INSERT' then 'INSERT' else 'UPDATE' end,
      'table', 'orders',
      'record', to_jsonb(NEW),
      'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
    )
  );
  return NEW;
end;
$$;

create trigger orders_notify_event
  after insert or update on orders
  for each row execute function notify_order_event();
