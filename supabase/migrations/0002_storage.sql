-- Storage buckets for menu photos and payment QR images.
-- Both are public-read (they're shown on the public customer menu page),
-- but only the owning restaurant's owner account may write, and uploads
-- must be namespaced under `${restaurant_id}/...` so ownership is checkable.

insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-qr', 'payment-qr', true)
on conflict (id) do nothing;

create policy "anyone can view menu photos"
  on storage.objects for select
  using (bucket_id = 'menu-photos');

create policy "owner can upload own restaurant menu photos"
  on storage.objects for insert
  with check (
    bucket_id = 'menu-photos'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_restaurant_id()::text
  );

create policy "owner can update own restaurant menu photos"
  on storage.objects for update
  using (
    bucket_id = 'menu-photos'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_restaurant_id()::text
  );

create policy "owner can delete own restaurant menu photos"
  on storage.objects for delete
  using (
    bucket_id = 'menu-photos'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_restaurant_id()::text
  );

create policy "anyone can view payment qr"
  on storage.objects for select
  using (bucket_id = 'payment-qr');

create policy "owner can upload own restaurant payment qr"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-qr'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_restaurant_id()::text
  );

create policy "owner can update own restaurant payment qr"
  on storage.objects for update
  using (
    bucket_id = 'payment-qr'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_restaurant_id()::text
  );

create policy "owner can delete own restaurant payment qr"
  on storage.objects for delete
  using (
    bucket_id = 'payment-qr'
    and my_role() = 'owner'
    and (storage.foldername(name))[1] = my_restaurant_id()::text
  );
