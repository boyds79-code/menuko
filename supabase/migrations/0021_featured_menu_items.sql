-- Owner-curated "Our Best!" highlights on the customer order page (up to 3,
-- enforced client-side by only ever querying/showing the first 3 — no hard
-- DB cap, so marking a 4th just means the UI shows the first 3 it fetches).
alter table menu_items add column is_featured boolean not null default false;
