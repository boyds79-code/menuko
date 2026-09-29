import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdsManager } from "./ads-manager";
import { PageHeader } from "@/components/page-header";

export default async function AdminAdsPage() {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const { data: ads } = await supabase
    .from("ads")
    .select("id, template_id, headline, subcopy, image_url, link_url, is_active, created_at")
    .eq("restaurant_id", ctx.restaurantId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        title="Cross-promotion ads"
        description={
          <>
            Ads you create are shown to other restaurants&apos; customers when they check their total. By
            default, restaurants see cafe ads and cafes see restaurant ads first.
          </>
        }
      />
      <AdsManager restaurantId={ctx.restaurantId} restaurantName={ctx.restaurantName} initialAds={ads ?? []} />
    </main>
  );
}
