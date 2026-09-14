"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MenuTemplateId } from "@/lib/menu-templates";

export async function createAd(input: {
  templateId: MenuTemplateId;
  headline: string;
  subcopy: string;
  imageUrl: string | null;
  linkUrl: string;
}) {
  const ctx = await requireStaff("owner");
  if (!input.headline.trim()) return;
  const supabase = await createClient();
  await supabase.from("ads").insert({
    restaurant_id: ctx.restaurantId,
    template_id: input.templateId,
    headline: input.headline.trim(),
    subcopy: input.subcopy.trim() || null,
    image_url: input.imageUrl,
    link_url: input.linkUrl.trim() || null,
  });
  revalidatePath("/admin/ads");
}

export async function updateAd(
  adId: string,
  input: Partial<{
    templateId: MenuTemplateId;
    headline: string;
    subcopy: string;
    imageUrl: string | null;
    linkUrl: string;
    isActive: boolean;
  }>,
) {
  await requireStaff("owner");
  const supabase = await createClient();
  await supabase
    .from("ads")
    .update({
      ...(input.templateId !== undefined ? { template_id: input.templateId } : {}),
      ...(input.headline !== undefined ? { headline: input.headline } : {}),
      ...(input.subcopy !== undefined ? { subcopy: input.subcopy || null } : {}),
      ...(input.imageUrl !== undefined ? { image_url: input.imageUrl } : {}),
      ...(input.linkUrl !== undefined ? { link_url: input.linkUrl || null } : {}),
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    })
    .eq("id", adId);
  revalidatePath("/admin/ads");
}

export async function deleteAd(adId: string) {
  await requireStaff("owner");
  const supabase = await createClient();
  await supabase.from("ads").delete().eq("id", adId);
  revalidatePath("/admin/ads");
}
