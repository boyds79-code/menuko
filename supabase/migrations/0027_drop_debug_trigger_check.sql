-- Drops the temporary diagnostic RPC from 0026 — confirmed
-- restaurants_notify_translate was correctly attached; the earlier
-- "translations stayed empty" symptom was just checking before the
-- async pg_net call had finished, not a real bug.
drop function if exists debug_list_restaurant_triggers();
