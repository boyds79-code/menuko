// Invite/remove kitchen+cashier accounts, callable from the mobile owner
// app. The web app does this inside a Next.js Server Action
// (src/app/admin/accounts-actions.ts) using the service-role key — the
// mobile app has no server of its own, and the service-role key must never
// ship inside a distributed client binary, so this Edge Function is the
// server-side home for the same logic instead.
//
// Deployed WITH JWT verification (no --no-verify-jwt, unlike
// notify-order-event which is called by a DB trigger with no user JWT) —
// this is called by a signed-in owner, so standard verification is right.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FREE_TIER_ROLE_LIMITS: Record<string, number> = { owner: 1, kitchen: 1, cashier: 1 };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await anon.auth.getUser();

  if (!user) {
    return json({ error: "Not authorized" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: callerAccount } = await admin
    .from("accounts")
    .select("role, restaurant_id")
    .eq("id", user.id)
    .single();

  if (!callerAccount || callerAccount.role !== "owner") {
    return json({ error: "Not authorized" }, 403);
  }

  if (body.action === "invite") {
    const role = body.role;
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");

    if (role !== "kitchen" && role !== "cashier") {
      return json({ error: "Please choose a role." }, 400);
    }
    if (!email || password.length < 6) {
      return json(
        { error: "Please enter an email and a password of at least 6 characters." },
        400,
      );
    }

    const { count } = await admin
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", callerAccount.restaurant_id)
      .eq("role", role);

    const { data: restaurant } = await admin
      .from("restaurants")
      .select("plan")
      .eq("id", callerAccount.restaurant_id)
      .single();
    const isPremium = restaurant?.plan === "premium";

    if (!isPremium && (count ?? 0) >= FREE_TIER_ROLE_LIMITS[role]) {
      return json(
        {
          error: `The free plan supports 1 ${role} account. Additional accounts require the premium plan.`,
        },
        400,
      );
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      return json({ error: createError?.message ?? "Failed to create the account." }, 400);
    }

    const { error: insertError } = await admin.from("accounts").insert({
      id: created.user.id,
      restaurant_id: callerAccount.restaurant_id,
      role,
      email,
    });

    if (insertError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: insertError.message }, 400);
    }

    return json({ success: true });
  }

  if (body.action === "remove") {
    const accountId = String(body.accountId ?? "");
    const { data: target } = await admin
      .from("accounts")
      .select("restaurant_id, role")
      .eq("id", accountId)
      .single();

    if (!target || target.restaurant_id !== callerAccount.restaurant_id || target.role === "owner") {
      return json({ error: "Not found" }, 404);
    }

    await admin.from("accounts").delete().eq("id", accountId);
    await admin.auth.admin.deleteUser(accountId);
    return json({ success: true });
  }

  return json({ error: "Unknown action" }, 400);
});
