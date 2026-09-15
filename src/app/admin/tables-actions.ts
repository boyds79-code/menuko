"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addTable(label: string, capacity: number) {
  const ctx = await requireStaff("owner");
  if (!label.trim()) return;
  const supabase = await createClient();
  await supabase.from("tables").insert({
    restaurant_id: ctx.restaurantId,
    label: label.trim(),
    capacity: capacity > 0 ? capacity : 4,
  });
  revalidatePath("/admin/tables");
}

export async function renameTable(tableId: string, label: string) {
  await requireStaff("owner");
  if (!label.trim()) return;
  const supabase = await createClient();
  await supabase.from("tables").update({ label: label.trim() }).eq("id", tableId);
  revalidatePath("/admin/tables");
}

export async function updateTableCapacity(tableId: string, capacity: number) {
  await requireStaff("owner");
  if (!(capacity > 0)) return;
  const supabase = await createClient();
  await supabase.from("tables").update({ capacity }).eq("id", tableId);
  revalidatePath("/admin/tables");
  revalidatePath("/cashier");
}

export async function deleteTable(tableId: string) {
  await requireStaff("owner");
  const supabase = await createClient();
  await supabase.from("tables").delete().eq("id", tableId);
  revalidatePath("/admin/tables");
}
