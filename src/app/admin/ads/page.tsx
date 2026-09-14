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
        <h1 className="text-lg font-semibold">크로스 프로모션 광고</h1>
        <p className="text-sm text-muted">
          만든 광고는 다른 매장 손님이 결제 총액을 확인하는 화면에 노출됩니다. 기본적으로
          식당에는 카페 광고가, 카페에는 식당 광고가 우선 노출돼요.
        </p>
      </div>
      <AdsManager restaurantId={ctx.restaurantId} restaurantName={ctx.restaurantName} initialAds={ads ?? []} />
    </main>
  );
}
