-- Extra detail fields for a menu item's expanded view on the customer
-- order page: a description, a free-text ingredients list, allergy info,
-- and estimated cook time. All optional — existing items just show
-- name/price/photo like today until an owner fills these in.

alter table menu_items add column description text;
alter table menu_items add column ingredients text;
alter table menu_items add column allergy_info text;
alter table menu_items add column cook_time_minutes int;
