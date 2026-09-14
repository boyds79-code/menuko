"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addCategory(name: string) {
  const ctx = await requireStaff("owner");
  if (!name.trim()) return;
  const supabase = await createClient();
  await supabase
    .from("menu_categories")
    .insert({ restaurant_id: ctx.restaurantId, name: name.trim() });
  revalidatePath("/admin");
}

export async function renameCategory(categoryId: string, name: string) {
  await requireStaff("owner");
  if (!name.trim()) return;
  const supabase = await createClient();
  await supabase.from("menu_categories").update({ name: name.trim() }).eq("id", categoryId);
  revalidatePath("/admin");
}

export async function deleteCategory(categoryId: string) {
  await requireStaff("owner");
  const supabase = await createClient();
  await supabase.from("menu_categories").delete().eq("id", categoryId);
  revalidatePath("/admin");
}

export async function addItem(input: {
  categoryId: string | null;
  name: string;
  price: number;
  photoUrl: string | null;
}) {
  const ctx = await requireStaff("owner");
  if (!input.name.trim() || !(input.price >= 0)) return;
  const supabase = await createClient();
  await supabase.from("menu_items").insert({
    restaurant_id: ctx.restaurantId,
    category_id: input.categoryId,
    name: input.name.trim(),
    price: input.price,
    photo_url: input.photoUrl,
  });
  revalidatePath("/admin");
}

export async function updateItem(
  itemId: string,
  input: Partial<{
    name: string;
    price: number;
    categoryId: string | null;
    photoUrl: string | null;
    isAvailable: boolean;
  }>,
) {
  await requireStaff("owner");
  const supabase = await createClient();
  await supabase
    .from("menu_items")
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.categoryId !== undefined ? { category_id: input.categoryId } : {}),
      ...(input.photoUrl !== undefined ? { photo_url: input.photoUrl } : {}),
      ...(input.isAvailable !== undefined ? { is_available: input.isAvailable } : {}),
    })
    .eq("id", itemId);
  revalidatePath("/admin");
}

export async function deleteItem(itemId: string) {
  await requireStaff("owner");
  const supabase = await createClient();
  await supabase.from("menu_items").delete().eq("id", itemId);
  revalidatePath("/admin");
}
