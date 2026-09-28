-- The Getting Started checklist (0031_onboarding_completed.sql) was removed
-- once Settings became a single self-explanatory accordion page — nothing
-- reads or writes this column anymore.
alter table restaurants drop column onboarding_completed_at;
