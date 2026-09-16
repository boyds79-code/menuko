-- Restaurant logo, for the new-owner onboarding checklist's "restaurant
-- info" step (name + business type are already required at signup — a
-- logo is the one optional add here) and for the customer-facing menu
-- header later if wanted. Same public-read / owner-write pattern as the
-- other image buckets in 0002_storage.sql.

alter table restaurants add column logo_url text;

insert into storage.buckets (id, name, public)
values ('restaurant-logo', 'restaurant-logo', true)
on conflict (id) do nothing;

create policy "anyone can view restaurant logos"
  on storage.objects for select
  using (bucket_id = 'restaurant-logo');

create policy "owner can upload own restaurant logo"
  on storage.objects for insert
  with check (
    bucket_id = 'restaurant-logo'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_restaurant_id()::text
  );

create policy "owner can update own restaurant logo"
  on storage.objects for update
  using (
    bucket_id = 'restaurant-logo'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_restaurant_id()::text
  );

create policy "owner can delete own restaurant logo"
  on storage.objects for delete
  using (
    bucket_id = 'restaurant-logo'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_restaurant_id()::text
  );
