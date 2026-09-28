-- Tracks when an owner explicitly finishes the "Getting started" checklist
-- (see src/app/admin/onboarding-checklist.tsx) by pressing Save once every
-- required step is done. Once set, the checklist stops showing for good.
alter table restaurants add column onboarding_completed_at timestamptz;
