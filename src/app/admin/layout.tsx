import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffHeader } from "@/components/staff-header";
import { OnboardingChecklist } from "./onboarding-checklist";

const NAV = [
  { href: "/admin", label: "Menu" },
  { href: "/admin/tables", label: "Tables/QR" },
  { href: "/admin/ads", label: "Ads" },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaff("owner");
  const supabase = await createClient();

  const [{ data: restaurant }, { count: categoryCount }, { count: itemCount }, { count: tableCount }, { count: staffCount }] =
    await Promise.all([
      supabase.from("restaurants").select("logo_url").eq("id", ctx.restaurantId).single(),
      supabase
        .from("menu_categories")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", ctx.restaurantId),
      supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", ctx.restaurantId),
      supabase
        .from("tables")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", ctx.restaurantId)
        .eq("is_virtual", false),
      supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", ctx.restaurantId)
        .in("role", ["kitchen", "cashier"]),
    ]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <StaffHeader restaurantName={ctx.restaurantName} roleLabel="Owner" nav={NAV} />
      <OnboardingChecklist
        hasLogo={!!restaurant?.logo_url}
        categoryCount={categoryCount ?? 0}
        itemCount={itemCount ?? 0}
        tableCount={tableCount ?? 0}
        staffCount={staffCount ?? 0}
      />
      {children}
    </div>
  );
}
