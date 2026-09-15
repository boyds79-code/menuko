import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdsManager } from "./ads-manager";

export default async function AdminAdsPage() {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const { data: ads } = await supabase
    .from("ads")
    .select("id, template_id, headline, subcopy, image_url, link_url, is_active, created_at")
    .eq("restaurant_id", ctx.restaurantId)
    .order("created_at", { ascending: false });

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-semibold">Cross-promotion ads</h1>
        <p className="text-sm text-muted">
          Ads you create are shown to other restaurants&apos; customers when they check their
          total. By default, restaurants see cafe ads and cafes see restaurant ads first.
        </p>
      </div>
      <AdsManager restaurantId={ctx.restaurantId} restaurantName={ctx.restaurantName} initialAds={ads ?? []} />
    </main>
  );
}
