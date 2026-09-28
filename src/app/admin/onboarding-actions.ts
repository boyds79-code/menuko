"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Called from the "Save" button in onboarding-checklist.tsx, only reachable
// once every required step is done (the button is disabled otherwise) —
// this just records that the owner explicitly finished it, so the checklist
// stops showing on every admin page for good.
export async function completeOnboarding() {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();
  await supabase
    .from("restaurants")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", ctx.restaurantId);
  revalidatePath("/admin", "layout");
}
