"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RestaurantPlan } from "@/lib/database.types";

export async function setRestaurantPlan(restaurantId: string, plan: RestaurantPlan) {
  // The client can't be trusted — re-check the allowlist here, this is the
  // real enforcement point, not the page render.
  await requirePlatformAdmin();
  const admin = createAdminClient();
  await admin.from("restaurants").update({ plan }).eq("id", restaurantId);
  revalidatePath("/internal/restaurants");
}
