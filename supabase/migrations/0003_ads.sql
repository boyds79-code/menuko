-- Cross-promotion ads (spec section 8 item moved up on owner request — see
-- README for rationale) + menu design template selection.

create type business_type as enum ('restaurant', 'cafe');

alter table restaurants add column business_type business_type not null default 'restaurant';
alter table restaurants add column menu_template text not null default 'classic';

create table ads (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  template_id text not null default 'classic',
  headline text not null,
  subcopy text,
  image_url text,
  link_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index ads_restaurant_id_idx on ads (restaurant_id);

alter table ads enable row level security;

-- Ads are inherently public content (meant to be shown to other
-- restaurants' customers), unlike orders — so a plain public SELECT is
-- the right default, scoped only to what the owner marked active.
create policy "anyone can read active ads"
  on ads for select
  using (is_active = true);

create policy "owner can manage own ads"
  on ads for all
  using (restaurant_id = my_restaurant_id() and my_role() = 'owner')
  with check (restaurant_id = my_restaurant_id() and my_role() = 'owner');

-- ---------------------------------------------------------------------------
-- Storage bucket for ad images (same public-read / owner-write pattern as
-- menu-photos and payment-qr in 0002_storage.sql).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('ad-images', 'ad-images', true)
on conflict (id) do nothing;

create policy "anyone can view ad images"
  on storage.objects for select
  using (bucket_id = 'ad-images');

create policy "owner can upload own restaurant ad images"
  on storage.objects for insert
  with check (
    bucket_id = 'ad-images'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_restaurant_id()::text
  );

create policy "owner can update own restaurant ad images"
  on storage.objects for update
  using (
    bucket_id = 'ad-images'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_restaurant_id()::text
  );

create policy "owner can delete own restaurant ad images"
  on storage.objects for delete
  using (
    bucket_id = 'ad-images'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_restaurant_id()::text
  );
