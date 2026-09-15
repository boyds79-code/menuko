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
    return { error: "Please enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Incorrect email or password." };
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!account) {
    await supabase.auth.signOut();
    return { error: "We couldn't find a restaurant linked to this account." };
  }

  redirect(ROLE_HOME[account.role] ?? "/login");
}
