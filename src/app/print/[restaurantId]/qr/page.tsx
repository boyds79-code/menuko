import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QrPrintView } from "./qr-print-view";
import { qrFontVariables } from "./fonts";

// Public — an owner hands this link to a print shop or opens it on any
// device, no login needed. The qr_token values aren't secret (they're
// printed on paper and sit on the table anyway); nothing here can be used
// to act as the restaurant, just to view its order page.
export default async function PrintQrPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { restaurantId } = await params;
  const { table: tableParam } = await searchParams;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, logo_url")
    .eq("id", restaurantId)
    .single();

  if (!restaurant) notFound();

  const { data: tables } = await supabase
    .from("tables")
    .select("id, label, qr_token")
    .eq("restaurant_id", restaurantId)
    .eq("is_virtual", false)
    .order("label");

  // ?table=<id> — the "Print QR" button on a single table card in Settings
  // opens this page with just that table preselected.
  return (
    <div className={`${qrFontVariables} flex min-h-full flex-1 flex-col`}>
      <QrPrintView
        restaurant={restaurant}
        tables={tables ?? []}
        initialTableId={typeof tableParam === "string" ? tableParam : null}
      />
    </div>
  );
}
