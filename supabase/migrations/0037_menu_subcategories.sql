-- Lets a category have subcategories (major category -> subcategories),
-- needed by two upcoming menu layouts that group items under a major
-- category (Food/Drinks) then a subcategory (Pizza/Pasta). Null = top-level
-- (a major category, or a flat category exactly as today); a value = this
-- category is a subcategory of that row. Existing rows stay parent_id null,
-- so Classic/Minimal List (which never read this column) see zero visual
-- change. Deeper nesting (a subcategory of a subcategory) isn't blocked at
-- the DB level — the admin UI only ever offers top-level categories as a
-- parent choice, the same app-only-enforcement pattern already used for
-- is_featured's "max 3" cap.
alter table menu_categories
  add column parent_id uuid references menu_categories(id) on delete cascade,
  add constraint menu_categories_parent_not_self check (parent_id is distinct from id);

create index menu_categories_parent_id_idx on menu_categories (parent_id) where parent_id is not null;
