-- Lets a premium restaurant limit which customer-menu languages are
-- offered (the switcher always still offers English regardless of this
-- list — see src/app/order/[qrToken]/order-client.tsx). Null means "no
-- restriction set yet" and every language stays available, so existing
-- restaurants keep today's behavior until an owner opts in to narrowing it.
alter table restaurants add column enabled_languages text[];
