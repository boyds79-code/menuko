-- Split into its own migration/transaction: Postgres disallows using a
-- newly added enum value in the same transaction it was added in, so this
-- can't safely share a migration file with 0011_manual_orders.sql, which
-- references it.
alter type order_channel add value 'manual_pickup_entry';
