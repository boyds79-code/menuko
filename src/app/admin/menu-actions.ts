"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addCategory(name: string) {
  const ctx = await requireStaff("owner");
  if (!name.trim()) return;
  const supabase = await createClient();

  // New categories go to the end, not sort_order 0 — otherwise they'd jump
  // ahead of everything an owner has already manually reordered.
  const { count } = await supabase
    .from("menu_categories")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", ctx.restaurantId);

  await supabase
    .from("menu_categories")
    .insert({ restaurant_id: ctx.restaurantId, name: name.trim(), sort_order: count ?? 0 });
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

export async function moveCategory(categoryId: string, direction: "up" | "down") {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("restaurant_id", ctx.restaurantId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!categories) return;

  const ids = categories.map((c) => c.id);
  const index = ids.indexOf(categoryId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= ids.length) return;

  // Swap positions, then persist everyone's sort_order as their new array
  // index — this also normalizes any ties/gaps from earlier states.
  [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];

  await Promise.all(
    ids.map((id, i) => supabase.from("menu_categories").update({ sort_order: i }).eq("id", id)),
  );

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
    description: string | null;
    ingredients: string | null;
    allergyInfo: string | null;
    cookTimeMinutes: number | null;
    isFeatured: boolean;
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
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.ingredients !== undefined ? { ingredients: input.ingredients } : {}),
      ...(input.allergyInfo !== undefined ? { allergy_info: input.allergyInfo } : {}),
      ...(input.cookTimeMinutes !== undefined ? { cook_time_minutes: input.cookTimeMinutes } : {}),
      ...(input.isFeatured !== undefined ? { is_featured: input.isFeatured } : {}),
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
