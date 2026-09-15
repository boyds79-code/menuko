-- Device push tokens for the staff mobile app (Expo push notifications).
-- One row per (account, device). A staff member may have multiple devices.

create table device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  expo_push_token text not null,
  created_at timestamptz not null default now(),
  unique (account_id, expo_push_token)
);
create index device_push_tokens_account_id_idx on device_push_tokens (account_id);

alter table device_push_tokens enable row level security;

-- A signed-in staff member manages only their own device token rows.
-- accounts.id === auth.users.id, so this doesn't need the my_restaurant_id()
-- helper — direct auth.uid() comparison is enough and cheaper.
create policy "staff can manage own device tokens"
  on device_push_tokens for all
  using (account_id = auth.uid())
  with check (account_id = auth.uid());
