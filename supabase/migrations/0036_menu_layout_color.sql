-- Splits the single `menu_template` value (which bundled layout shape and
-- color together) into two independent axes: `menu_layout` (structural
-- shape — Classic today, more coming in a later phase) and `menu_color`
-- (the 4 existing color identities, reusable under any layout). Existing
-- restaurants keep their exact current look: layout defaults to 'classic'
-- (the shape all 4 old templates already rendered as, once Nordic/
-- Botanical's structural quirks are folded into one Classic shape) and
-- color is backfilled from their old menu_template value.
alter table restaurants add column menu_layout text not null default 'classic';
alter table restaurants add column menu_color text not null default 'terracotta';

update restaurants set menu_color = menu_template
  where menu_template in ('terracotta', 'heritage', 'nordic', 'botanical');

alter table restaurants drop column menu_template;
