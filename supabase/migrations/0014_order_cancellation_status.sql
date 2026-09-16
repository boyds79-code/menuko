-- Adds the 'cancelled' order status and an updated_at column, ahead of
-- the order-change-request feature in 0015. Split into its own migration
-- because Postgres won't let a new enum value be used in the same
-- transaction that adds it (same reason 0010 is separate from 0011).

alter type order_status add value 'cancelled';

-- Lets the approve/deny RPCs in 0015 "touch" an order even when no other
-- column changes (a denied request doesn't change status or items) so the
-- customer's existing realtime subscription on `orders` UPDATE — already
-- used to live-update the order-status screen — fires and the client
-- re-fetches to pick up the request's outcome.
alter table orders add column updated_at timestamptz not null default now();
