-- Menuko MVP schema (spec section 5) + RLS.
-- Passwords are not stored here; accounts.id === auth.users.id, managed by Supabase Auth.

create type account_role as enum ('owner', 'kitchen', 'cashier');
create type restaurant_plan as enum ('free', 'premium');
create type order_status as enum ('open', 'sent_to_kitchen', 'preparing', 'served', 'paid');
create type order_channel as enum ('dine_in', 'manual_delivery_entry');

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cuisine_tags text[] not null default '{}',
  address text,
  plan restaurant_plan not null default 'free',
  payment_qr_url text,
  payment_link text,
  created_at timestamptz not null default now()
);

-- One row per Supabase Auth user, linking them to a restaurant + role.
create table accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  role account_role not null,
  email text not null,
  created_at timestamptz not null default now()
);
create index accounts_restaurant_id_idx on accounts (restaurant_id);

create table tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  label text not null,
  qr_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create index tables_restaurant_id_idx on tables (restaurant_id);

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index menu_categories_restaurant_id_idx on menu_categories (restaurant_id);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  category_id uuid references menu_categories (id) on delete set null,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  photo_url text,
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index menu_items_restaurant_id_idx on menu_items (restaurant_id);
create index menu_items_category_id_idx on menu_items (category_id);

create table orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  table_id uuid not null references tables (id) on delete cascade,
  status order_status not null default 'open',
  channel order_channel not null default 'dine_in',
  -- Unguessable token handed to the customer's browser at creation time so
  -- they can read back their own order (via the get_order_for_customer RPC)
  -- without a login. Never exposed through a plain SELECT policy.
  access_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create index orders_restaurant_id_idx on orders (restaurant_id);
create index orders_table_id_idx on orders (table_id);
create index orders_status_idx on orders (status);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  -- Denormalized from orders.restaurant_id so RLS and Realtime filters
  -- (which only support simple column equality, no joins) can scope by
  -- restaurant without a subquery.
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  menu_item_id uuid references menu_items (id) on delete set null,
  quantity int not null check (quantity > 0),
  unit_price_snapshot numeric(10, 2) not null,
  created_at timestamptz not null default now()
);
create index order_items_order_id_idx on order_items (order_id);
create index order_items_restaurant_id_idx on order_items (restaurant_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table restaurants enable row level security;
alter table accounts enable row level security;
alter table tables enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Helper: the restaurant_id / role of the currently authenticated staff account, if any.
create or replace function my_restaurant_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select restaurant_id from accounts where id = auth.uid();
$$;

create or replace function my_role()
returns account_role
language sql
security definer
stable
set search_path = public
as $$
  select role from accounts where id = auth.uid();
$$;

-- restaurants: name/address/payment info is effectively the public menu page
-- header, so it's readable by anyone (same trust level as menu items below).
create policy "anyone can read restaurants"
  on restaurants for select
  using (true);

create policy "owner can update own restaurant"
  on restaurants for update
  using (id = my_restaurant_id() and my_role() = 'owner')
  with check (id = my_restaurant_id() and my_role() = 'owner');

-- accounts: private to the restaurant's own staff; only owner manages them.
create policy "staff can read own restaurant accounts"
  on accounts for select
  using (restaurant_id = my_restaurant_id());

create policy "owner can manage accounts"
  on accounts for all
  using (restaurant_id = my_restaurant_id() and my_role() = 'owner')
  with check (restaurant_id = my_restaurant_id() and my_role() = 'owner');

-- tables: public read (needed to resolve a qr_token into a menu); only owner manages.
create policy "anyone can read tables"
  on tables for select
  using (true);

create policy "owner can manage tables"
  on tables for all
  using (restaurant_id = my_restaurant_id() and my_role() = 'owner')
  with check (restaurant_id = my_restaurant_id() and my_role() = 'owner');

-- menu_categories / menu_items: public read (customer menu), owner-only writes.
create policy "anyone can read menu categories"
  on menu_categories for select
  using (true);

create policy "owner can manage menu categories"
  on menu_categories for all
  using (restaurant_id = my_restaurant_id() and my_role() = 'owner')
  with check (restaurant_id = my_restaurant_id() and my_role() = 'owner');

create policy "anyone can read menu items"
  on menu_items for select
  using (true);

create policy "owner can manage menu items"
  on menu_items for all
  using (restaurant_id = my_restaurant_id() and my_role() = 'owner')
  with check (restaurant_id = my_restaurant_id() and my_role() = 'owner');

-- orders / order_items: no public SELECT/INSERT policy at all. Revenue data
-- for a restaurant must not be listable by anonymous REST calls, and prices
-- must not be trusted from the client. Customers create + read back orders
-- only through the two RPCs below (security definer, bypass RLS internally,
-- but re-check everything explicitly). Staff get normal RLS-scoped access.

create policy "staff can read own restaurant orders"
  on orders for select
  using (restaurant_id = my_restaurant_id() and my_role() in ('owner', 'kitchen', 'cashier'));

create policy "staff can update own restaurant orders"
  on orders for update
  using (restaurant_id = my_restaurant_id() and my_role() in ('owner', 'kitchen', 'cashier'))
  with check (restaurant_id = my_restaurant_id() and my_role() in ('owner', 'kitchen', 'cashier'));

create policy "staff can read own restaurant order items"
  on order_items for select
  using (restaurant_id = my_restaurant_id() and my_role() in ('owner', 'kitchen', 'cashier'));

-- ---------------------------------------------------------------------------
-- RPCs for the anonymous customer flow (order creation + read-back)
-- ---------------------------------------------------------------------------

-- Creates an order for a table from a list of {menu_item_id, quantity}.
-- Prices are looked up server-side from menu_items — never trust a
-- client-supplied price. Returns the new order id + its access_token.
create or replace function create_order(p_qr_token uuid, p_items jsonb)
returns table (order_id uuid, access_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table record;
  v_order_id uuid;
  v_access_token uuid;
  v_item jsonb;
begin
  select t.id as table_id, t.restaurant_id
    into v_table
    from tables t
    where t.qr_token = p_qr_token;

  if v_table is null then
    raise exception 'invalid table';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'order must have at least one item';
  end if;

  insert into orders (restaurant_id, table_id)
    values (v_table.restaurant_id, v_table.table_id)
    returning id, orders.access_token into v_order_id, v_access_token;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into order_items (order_id, restaurant_id, menu_item_id, quantity, unit_price_snapshot)
    select
      v_order_id,
      v_table.restaurant_id,
      mi.id,
      greatest((v_item ->> 'quantity')::int, 1),
      mi.price
    from menu_items mi
    where mi.id = (v_item ->> 'menu_item_id')::uuid
      and mi.restaurant_id = v_table.restaurant_id
      and mi.is_available = true;
  end loop;

  return query select v_order_id, v_access_token;
end;
$$;

grant execute on function create_order(uuid, jsonb) to anon, authenticated;

-- Read back a single order + its items, but only with the matching
-- access_token — this is the confidentiality boundary for anon reads.
create or replace function get_order_for_customer(p_order_id uuid, p_access_token uuid)
returns table (
  id uuid,
  status order_status,
  created_at timestamptz,
  item_id uuid,
  menu_item_id uuid,
  item_name text,
  quantity int,
  unit_price_snapshot numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select o.id, o.status, o.created_at,
         oi.id, oi.menu_item_id, mi.name, oi.quantity, oi.unit_price_snapshot
  from orders o
  join order_items oi on oi.order_id = o.id
  left join menu_items mi on mi.id = oi.menu_item_id
  where o.id = p_order_id
    and o.access_token = p_access_token;
$$;

grant execute on function get_order_for_customer(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
