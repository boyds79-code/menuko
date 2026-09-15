// Fired by a Postgres trigger on the `orders` table (see
// supabase/migrations/0005_order_webhook.sql) whenever an order is created
// or its status changes. Sends an Expo push notification to the right
// staff role's devices:
//   - new order (INSERT)                -> that restaurant's kitchen devices
//   - status becomes 'served' (UPDATE)  -> that restaurant's cashier devices
//
// Deployed with --no-verify-jwt (this is a server-to-server DB trigger, not
// a user-facing endpoint) — see README for the tradeoff this accepts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    restaurant_id: string;
    table_id: string;
    status: string;
  };
  old_record: { status: string } | null;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  if (payload.table !== "orders") {
    return new Response("ignored", { status: 200 });
  }

  const { type, record, old_record } = payload;

  let targetRole: "kitchen" | "cashier" | null = null;
  let title = "";
  if (type === "INSERT") {
    targetRole = "kitchen";
    title = "새 주문이 들어왔어요";
  } else if (type === "UPDATE" && old_record?.status !== "served" && record.status === "served") {
    targetRole = "cashier";
    title = "정산할 주문이 있어요";
  }

  if (!targetRole) {
    return new Response("no-op", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: table } = await supabase
    .from("tables")
    .select("label")
    .eq("id", record.table_id)
    .single();

  const { data: tokenRows, error } = await supabase
    .from("device_push_tokens")
    .select("expo_push_token, accounts!inner(role, restaurant_id)")
    .eq("accounts.restaurant_id", record.restaurant_id)
    .eq("accounts.role", targetRole);

  if (error || !tokenRows || tokenRows.length === 0) {
    return new Response("no tokens", { status: 200 });
  }

  const messages = tokenRows.map((row) => ({
    to: row.expo_push_token,
    title,
    body: `${table?.label ?? "테이블"} — 확인해 주세요`,
    data: { orderId: record.id, restaurantId: record.restaurant_id },
  }));

  await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });

  return new Response("ok", { status: 200 });
});
