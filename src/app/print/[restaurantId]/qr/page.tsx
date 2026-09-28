import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMenuColorId } from "@/lib/menu-templates";
import { QrPrintView } from "./qr-print-view";

// Public — an owner hands this link to a print shop or opens it on any
// device, no login needed. The qr_token values aren't secret (they're
// printed on paper and sit on the table anyway); nothing here can be used
// to act as the restaurant, just to view its order page.
export default async function PrintQrPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, menu_color")
    .eq("id", restaurantId)
    .single();

  if (!restaurant) notFound();

  const { data: tables } = await supabase
    .from("tables")
    .select("id, label, qr_token")
    .eq("restaurant_id", restaurantId)
    .eq("is_virtual", false)
    .order("label");

  const menuColor = isMenuColorId(restaurant.menu_color) ? restaurant.menu_color : "terracotta";

  return <QrPrintView restaurant={restaurant} tables={tables ?? []} menuColor={menuColor} />;
}
