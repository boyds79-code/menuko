-- Enables scheduled jobs (used by the table-occupancy stall check in
-- 0007_table_occupancy.sql — a customer scans a QR but doesn't order
-- within N minutes, and nothing else in Postgres fires an event at that
-- exact moment, so this needs a periodic check rather than a trigger).
create extension if not exists pg_cron;
