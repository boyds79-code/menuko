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
    return { error: "역할을 선택해 주세요.", success: false };
  }
  if (!email || password.length < 6) {
    return { error: "이메일과 6자 이상의 비밀번호를 입력해 주세요.", success: false };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", ctx.restaurantId)
    .eq("role", role);

  // Free tier: 1 owner + 1 kitchen + 1 cashier per restaurant (spec 4.1).
  // Adding more requires premium — no billing exists yet, so we just block.
  if ((count ?? 0) >= FREE_TIER_ROLE_LIMITS[role]) {
    return {
      error: `무료 플랜은 ${role === "kitchen" ? "주방" : "캐셔"} 계정을 1개까지 지원합니다. 추가 계정은 프리미엄 플랜이 필요합니다.`,
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
    return { error: createError?.message ?? "계정 생성에 실패했습니다.", success: false };
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
