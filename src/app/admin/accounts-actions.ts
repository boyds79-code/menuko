"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FREE_TIER_ROLE_LIMITS } from "@/lib/constants";
import type { AccountRole } from "@/lib/database.types";

export type InviteAccountState = { error: string | null; success: boolean };

export async function inviteAccount(
  _prevState: InviteAccountState,
  formData: FormData,
): Promise<InviteAccountState> {
  const ctx = await requireStaff("owner");
  const role = String(formData.get("role") ?? "") as AccountRole;
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (role !== "kitchen" && role !== "cashier") {
    return { error: "Please choose a role.", success: false };
  }
  if (!email || password.length < 6) {
    return { error: "Please enter an email and a password of at least 6 characters.", success: false };
  }

  const supabase = await createClient();
  const [{ count }, { data: restaurant }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", ctx.restaurantId)
      .eq("role", role),
    supabase.from("restaurants").select("plan").eq("id", ctx.restaurantId).single(),
  ]);

  // Free tier: 1 owner + 1 kitchen + 1 cashier per restaurant (spec 4.1).
  // Premium restaurants (toggled from /internal/restaurants for now — no
  // billing exists yet) get unlimited extra accounts.
  const isPremium = restaurant?.plan === "premium";
  if (!isPremium && (count ?? 0) >= FREE_TIER_ROLE_LIMITS[role]) {
    return {
      error: `The free plan supports 1 ${role === "kitchen" ? "kitchen" : "cashier"} account. Additional accounts require the premium plan.`,
      success: false,
    };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "Failed to create the account.", success: false };
  }

  const { error: insertError } = await admin.from("accounts").insert({
    id: created.user.id,
    restaurant_id: ctx.restaurantId,
    role,
    email,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: insertError.message, success: false };
  }

  revalidatePath("/admin/accounts");
  return { error: null, success: true };
}

export async function removeAccount(accountId: string) {
  const ctx = await requireStaff("owner");
  const admin = createAdminClient();

  // Only ever remove accounts inside the caller's own restaurant, and never
  // the owner account itself.
  const { data: target } = await admin
    .from("accounts")
    .select("restaurant_id, role")
    .eq("id", accountId)
    .single();

  if (!target || target.restaurant_id !== ctx.restaurantId || target.role === "owner") {
    return;
  }

  await admin.from("accounts").delete().eq("id", accountId);
  await admin.auth.admin.deleteUser(accountId);
  revalidatePath("/admin/accounts");
}
