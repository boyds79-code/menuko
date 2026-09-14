"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ROLE_HOME: Record<string, string> = {
  owner: "/admin",
  kitchen: "/kitchen",
  cashier: "/cashier",
};

export type LoginState = { error: string | null };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해 주세요." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!account) {
    await supabase.auth.signOut();
    return { error: "이 계정에 연결된 매장 정보를 찾을 수 없습니다." };
  }

  redirect(ROLE_HOME[account.role] ?? "/login");
}
