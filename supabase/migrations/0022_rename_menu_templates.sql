-- The 3 menu templates were redesigned with completely new, independent
-- color identities (previously classic/warm/minimal all mostly shared one
-- global brand color) — renamed to match: classic -> terracotta,
-- warm -> heritage, minimal -> nordic. Remap existing data and defaults.

update restaurants set menu_template = 'terracotta' where menu_template = 'classic';
update restaurants set menu_template = 'heritage' where menu_template = 'warm';
update restaurants set menu_template = 'nordic' where menu_template = 'minimal';
alter table restaurants alter column menu_template set default 'terracotta';

update ads set template_id = 'terracotta' where template_id = 'classic';
update ads set template_id = 'heritage' where template_id = 'warm';
update ads set template_id = 'nordic' where template_id = 'minimal';
alter table ads alter column template_id set default 'terracotta';
