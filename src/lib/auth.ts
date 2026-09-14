import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AccountRole } from "@/lib/database.types";

export type StaffContext = {
  userId: string;
  email: string;
  role: AccountRole;
  restaurantId: string;
  restaurantName: string;
};

// Server-side guard for /admin, /kitchen, /cashier pages. Middleware already
// redirects unauthenticated/wrong-role requests, but pages call this too so
// they never render with a null account (defense in depth, and it hands back
// the typed context every page needs).
export async function requireStaff(role: AccountRole): Promise<StaffContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("role, restaurant_id, restaurants ( name )")
    .eq("id", user.id)
    .single();

  if (!account || account.role !== role) {
    redirect("/login");
  }

  const restaurant = account.restaurants as unknown as { name: string } | null;

  return {
    userId: user.id,
    email: user.email ?? "",
    role: account.role,
    restaurantId: account.restaurant_id,
    restaurantName: restaurant?.name ?? "",
  };
}
