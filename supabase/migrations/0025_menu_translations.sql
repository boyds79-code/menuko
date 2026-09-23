-- Premium feature: auto-translated customer menu (10 languages). Owner
-- content stays English-authored; translations are machine-generated once
-- per edit and cached here — never re-translated per page view, and never
-- generated at all for a free-tier restaurant (see the trigger gate below).
--
-- Shape: {"ko": {...}, "ja": {...}, ...} keyed by ISO 639-1 language code
-- (ko/ja/zh/es/th/vi/ru/it/ar/pt). A missing language key, or a missing
-- field within it, means "not translated yet" — the customer menu falls
-- back to the original English for that field. restaurants/menu_categories
-- are single-field ({"about": "..."} / {"name": "..."}); menu_items carry
-- all 4 translatable fields per language.
alter table restaurants add column translations jsonb not null default '{}'::jsonb;
alter table menu_categories add column translations jsonb not null default '{}'::jsonb;
alter table menu_items add column translations jsonb not null default '{}'::jsonb;

-- No RLS changes needed — these are new columns on tables that already
-- have "anyone can read" SELECT policies (customer menu) and owner-only
-- writes; the translate-content function itself writes via the
-- service-role key, which bypasses RLS same as notify-order-event does.

-- Same pg_net-to-edge-function pattern as notify_server_call_event
-- (0020_server_calls.sql) — except this one only fires for premium
-- restaurants, so a free-tier owner editing their menu never triggers an
-- API call at all (checked here, not inside the function, so the function
-- never even runs for free tier).
create or replace function notify_translate_menu_item()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
begin
  if (select plan from restaurants where id = NEW.restaurant_id) = 'premium' then
    perform net.http_post(
      url := 'https://lqdipvavnhrueogvvvjt.supabase.co/functions/v1/translate-content',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('table', 'menu_items', 'record', to_jsonb(NEW))
    );
  end if;
  return NEW;
end;
$$;

create trigger menu_items_notify_translate
  after insert or update of name, description, ingredients, allergy_info on menu_items
  for each row execute function notify_translate_menu_item();

create or replace function notify_translate_menu_category()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
begin
  if (select plan from restaurants where id = NEW.restaurant_id) = 'premium' then
    perform net.http_post(
      url := 'https://lqdipvavnhrueogvvvjt.supabase.co/functions/v1/translate-content',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('table', 'menu_categories', 'record', to_jsonb(NEW))
    );
  end if;
  return NEW;
end;
$$;

create trigger menu_categories_notify_translate
  after insert or update of name on menu_categories
  for each row execute function notify_translate_menu_category();

create or replace function notify_translate_restaurant()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
begin
  if NEW.plan = 'premium' and NEW.about is not null and NEW.about <> '' then
    perform net.http_post(
      url := 'https://lqdipvavnhrueogvvvjt.supabase.co/functions/v1/translate-content',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('table', 'restaurants', 'record', to_jsonb(NEW))
    );
  end if;
  return NEW;
end;
$$;

-- Fires on `about` edits, and also when a restaurant is upgraded to
-- premium (plan changes) so its already-written about-blurb gets
-- translated retroactively rather than staying English-only until the
-- owner happens to re-save it.
create trigger restaurants_notify_translate
  after update of about, plan on restaurants
  for each row execute function notify_translate_restaurant();
