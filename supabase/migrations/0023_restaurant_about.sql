-- Short "about us" blurb an owner can write for their own restaurant —
-- needed so the customer menu header has real content to show instead of
-- just the name (the Nordic template's editorial intro line, in particular,
-- looks bare without it).
alter table restaurants add column about text;
