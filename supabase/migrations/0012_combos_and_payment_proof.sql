-- Owner-facing combo suggestions + customer-uploaded payment proof
-- screenshots (spec 8's "자체 결제 게이트웨이" stays out of scope — this is
-- just letting the cashier verify a manual GCash/Maya payment before
-- settling, no payment processing happens here).

-- ---------------------------------------------------------------------------
-- Combo suggestions: item pairs frequently ordered together, for the
-- owner to consider bundling. Read-only, so a non-owner caller just gets
-- an empty result via the WHERE clause — no data leak, unlike a mutation
-- silently no-op'ing (that was the real problem with the earlier bug).
-- ---------------------------------------------------------------------------
create or replace function top_combos(p_limit int default 5)
returns table (item_a_name text, item_b_name text, order_count bigint)
language sql
security definer
stable
set search_path = public
as $$
  select mia.name, mib.name, count(distinct a.order_id)
  from order_items a
  join order_items b on a.order_id = b.order_id and a.menu_item_id < b.menu_item_id
  join menu_items mia on mia.id = a.menu_item_id
  join menu_items mib on mib.id = b.menu_item_id
  where a.restaurant_id = my_restaurant_id() and my_role() = 'owner'
  group by mia.name, mib.name
  having count(distinct a.order_id) >= 2
  order by count(distinct a.order_id) desc
  limit p_limit;
$$;

grant execute on function top_combos(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Payment proof screenshots
-- ---------------------------------------------------------------------------
alter table orders add column payment_proof_url text;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

-- Public read (cashier views it, same trust level as the other image
-- buckets). No insert/update/delete policy for anon or authenticated —
-- customers are anonymous and can't be verified by RLS alone (all we have
-- is orders.access_token, which RLS can't see), so writes only ever
-- happen server-side via the service-role key after the order-ownership
-- check in the uploadPaymentProof server action.
create policy "anyone can view payment proofs"
  on storage.objects for select
  using (bucket_id = 'payment-proofs');
