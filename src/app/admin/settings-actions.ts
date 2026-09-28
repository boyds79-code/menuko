"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { BusinessType } from "@/lib/database.types";
import type { MenuColorId, MenuLayoutId } from "@/lib/menu-templates";

export async function updateRestaurant(input: {
  name?: string;
  address?: string;
  about?: string;
  businessType?: BusinessType;
  menuLayout?: MenuLayoutId;
  menuColor?: MenuColorId;
  paymentQrUrl?: string | null;
  paymentLink?: string | null;
  logoUrl?: string | null;
  grabfoodCommissionPct?: number | null;
  foodpandaCommissionPct?: number | null;
  enabledLanguages?: string[] | null;
}) {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();
  await supabase
    .from("restaurants")
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.about !== undefined ? { about: input.about } : {}),
      ...(input.businessType !== undefined ? { business_type: input.businessType } : {}),
      ...(input.menuLayout !== undefined ? { menu_layout: input.menuLayout } : {}),
      ...(input.menuColor !== undefined ? { menu_color: input.menuColor } : {}),
      ...(input.paymentQrUrl !== undefined ? { payment_qr_url: input.paymentQrUrl } : {}),
      ...(input.paymentLink !== undefined ? { payment_link: input.paymentLink } : {}),
      ...(input.logoUrl !== undefined ? { logo_url: input.logoUrl } : {}),
      ...(input.grabfoodCommissionPct !== undefined ? { grabfood_commission_pct: input.grabfoodCommissionPct } : {}),
      ...(input.foodpandaCommissionPct !== undefined
        ? { foodpanda_commission_pct: input.foodpandaCommissionPct }
        : {}),
      ...(input.enabledLanguages !== undefined ? { enabled_languages: input.enabledLanguages } : {}),
    })
    .eq("id", ctx.restaurantId);
  revalidatePath("/admin/settings");
  revalidatePath("/cashier");
}
