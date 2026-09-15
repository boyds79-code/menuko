-- Seating capacity per table — restaurants vary a lot in table count and
-- size, and the cashier's table board (0007_table_occupancy.sql) needs
-- this to help guide a party to a table that actually fits them.

alter table tables
  add column capacity integer not null default 4 check (capacity > 0);
