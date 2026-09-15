"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BusinessType } from "@/lib/database.types";

export type SignupState = { error: string | null };

// Self-serve onboarding: a new restaurant owner creates their restaurant +
// owner account in one step (spec 4.1 — the owner account always exists,
// free, one per restaurant). Kitchen/cashier accounts are added later from
// /admin/accounts by the owner, not here.
export async function signup(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const restaurantName = String(formData.get("restaurantName") ?? "").trim();
  const businessTypeRaw = String(formData.get("businessType") ?? "");
  const businessType: BusinessType = businessTypeRaw === "cafe" ? "cafe" : "restaurant";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!restaurantName || !email || password.length < 6) {
    return { error: "Please enter a restaurant name, email, and a password of at least 6 characters." };
  }

  const admin = createAdminClient();

  const { data: restaurant, error: restaurantError } = await admin
    .from("restaurants")
    .insert({ name: restaurantName, business_type: businessType })
    .select("id")
    .single();

  if (restaurantError || !restaurant) {
    return { error: "Failed to create the restaurant. Please try again." };
  }

  const { data: created, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createUserError || !created.user) {
    await admin.from("restaurants").delete().eq("id", restaurant.id);
    return {
      error:
        createUserError?.message === "User already registered"
          ? "This email is already registered."
          : "Failed to create the account. Please try again.",
    };
  }

  const { error: accountError } = await admin.from("accounts").insert({
    id: created.user.id,
    restaurant_id: restaurant.id,
    role: "owner",
    email,
  });

  if (accountError) {
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from("restaurants").delete().eq("id", restaurant.id);
    return { error: "Failed to create the account. Please try again." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    redirect("/login");
  }

  redirect("/admin");
}
