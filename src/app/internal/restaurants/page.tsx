import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { RestaurantsTable } from "./restaurants-table";

export default async function InternalRestaurantsPage() {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: restaurants } = await admin
    .from("restaurants")
    .select("id, name, plan, business_type, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">Restaurants</h1>
        <p className="text-sm text-muted">
          Internal only. Toggling a restaurant to premium unlocks premium-gated features for it
          immediately — there&apos;s no billing behind this yet.
        </p>
      </div>
      <RestaurantsTable restaurants={restaurants ?? []} />
    </main>
  );
}
