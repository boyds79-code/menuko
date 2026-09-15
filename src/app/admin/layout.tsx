import { requireStaff } from "@/lib/auth";
import { StaffHeader } from "@/components/staff-header";

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

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <StaffHeader restaurantName={ctx.restaurantName} roleLabel="Owner" nav={NAV} />
      {children}
    </div>
  );
}
