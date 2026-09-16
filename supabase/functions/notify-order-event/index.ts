// Fired by a Postgres trigger whenever an order is created/updated (see
// supabase/migrations/0005_order_webhook.sql) or a cancel/edit request is
// created (see 0015_order_change_requests.sql). Sends an Expo push
// notification to the right staff role's devices:
//   - new order (INSERT)                    -> that restaurant's kitchen devices
//   - status becomes 'served' (UPDATE)      -> that restaurant's cashier devices
//   - new change request (INSERT)           -> that restaurant's cashier devices
//
// Deployed with --no-verify-jwt (this is a server-to-server DB trigger, not
// a user-facing endpoint) — see README for the tradeoff this accepts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type OrderRecord = { id: string; restaurant_id: string; table_id: string; status: string };
type ChangeRequestRecord = { id: string; order_id: string; restaurant_id: string; kind: string };

type WebhookPayload =
  | { type: "INSERT" | "UPDATE" | "DELETE"; table: "orders"; record: OrderRecord; old_record: { status: string } | null }
  | { type: "INSERT"; table: "order_change_requests"; record: ChangeRequestRecord; old_record: null };

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let restaurantId: string;
  let targetRole: "kitchen" | "cashier" | null = null;
  let title = "";
  let body = "";
  let orderId: string;

  if (payload.table === "orders") {
    const { type, record, old_record } = payload;
    restaurantId = record.restaurant_id;
    orderId = record.id;

    if (type === "INSERT") {
      targetRole = "kitchen";
      title = "New order";
    } else if (type === "UPDATE" && old_record?.status !== "served" && record.status === "served") {
      targetRole = "cashier";
      title = "Order ready for payment";
    }

    if (targetRole) {
      const { data: table } = await supabase
        .from("tables")
        .select("label")
        .eq("id", record.table_id)
        .single();
      body = `${table?.label ?? "Table"} — please check`;
    }
  } else if (payload.table === "order_change_requests") {
    const { record } = payload;
    restaurantId = record.restaurant_id;
    orderId = record.order_id;
    targetRole = "cashier";
    title = record.kind === "cancel" ? "Cancellation requested" : "Order change requested";

    const { data: order } = await supabase
      .from("orders")
      .select("table_id, tables ( label )")
      .eq("id", record.order_id)
      .single();
    const tableInfo = order?.tables as unknown as { label: string } | { label: string }[] | null;
    const tableLabel = Array.isArray(tableInfo) ? tableInfo[0]?.label : tableInfo?.label;
    body = `${tableLabel ?? "Table"} — please check with the kitchen`;
  } else {
    return new Response("ignored", { status: 200 });
  }

  if (!targetRole) {
    return new Response("no-op", { status: 200 });
  }

  const { data: tokenRows, error } = await supabase
    .from("device_push_tokens")
    .select("expo_push_token, accounts!inner(role, restaurant_id)")
    .eq("accounts.restaurant_id", restaurantId)
    .eq("accounts.role", targetRole);

  if (error || !tokenRows || tokenRows.length === 0) {
    return new Response("no tokens", { status: 200 });
  }

  const messages = tokenRows.map((row) => ({
    to: row.expo_push_token,
    title,
    body,
    data: { orderId, restaurantId },
  }));

  await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });

  return new Response("ok", { status: 200 });
});
