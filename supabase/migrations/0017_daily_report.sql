-- End-of-day snapshot pushed to the owner's app when the business day
-- closes. "Closing" here is the automatic Asia/Manila midnight boundary
-- (same day-boundary logic as src/lib/manila-time.ts and sales_by_day) —
-- there's no manual "close the register" action anywhere in this app, so
-- a scheduled job is the only thing that can know the day just ended,
-- same reasoning as the stall check in 0007_table_occupancy.sql.
--
-- Owner-only (not kitchen/cashier) — this is the "how did today go"
-- summary for someone who might not have been on-site, same audience as
-- the Today panel and Sales insights already built for /admin/analytics.
-- Restaurants with zero paid orders that day are skipped — a "you made
-- ₱0 today" push isn't useful, and this fires on every restaurant on the
-- platform every night, so it's worth not paging someone for nothing.

create or replace function send_daily_report()
returns void
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_report_date date := (now() at time zone 'Asia/Manila')::date - 1;
  r record;
  top_item record;
  token_row record;
  v_body text;
begin
  for r in
    select o.restaurant_id,
           sum(oi.quantity * oi.unit_price_snapshot) as revenue,
           count(distinct o.id) as order_count
    from orders o
    join order_items oi on oi.order_id = o.id
    where o.status = 'paid'
      and (o.created_at at time zone 'Asia/Manila')::date = v_report_date
    group by o.restaurant_id
  loop
    select mi.name, sum(oi.quantity) as qty
      into top_item
      from order_items oi
      join orders o on o.id = oi.order_id
      join menu_items mi on mi.id = oi.menu_item_id
      where o.restaurant_id = r.restaurant_id
        and o.status = 'paid'
        and (o.created_at at time zone 'Asia/Manila')::date = v_report_date
      group by mi.name
      order by sum(oi.quantity) desc
      limit 1;

    v_body := '₱' || to_char(r.revenue, 'FM999,999,990') || ' · ' || r.order_count || ' orders';
    if top_item.name is not null then
      v_body := v_body || ' · Best seller: ' || top_item.name || ' (' || top_item.qty || '×)';
    end if;

    for token_row in
      select dpt.expo_push_token
      from device_push_tokens dpt
      join accounts a on a.id = dpt.account_id
      where a.restaurant_id = r.restaurant_id and a.role = 'owner'
    loop
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'to', token_row.expo_push_token,
          'title', 'Daily report — ' || to_char(v_report_date, 'Mon DD'),
          'body', v_body,
          'data', jsonb_build_object('restaurantId', r.restaurant_id, 'reportDate', v_report_date)
        )
      );
    end loop;
  end loop;
end;
$$;

-- 16:00 UTC = 00:00 Asia/Manila (fixed UTC+8, no DST) — fires the instant
-- the Manila calendar day rolls over, so v_report_date above (that
-- instant's Manila date minus 1) is exactly the day that just closed.
select cron.schedule('send-daily-report', '0 16 * * *', $$select send_daily_report();$$);
