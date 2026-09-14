import { requireStaff } from "@/lib/auth";
import { StaffHeader } from "@/components/staff-header";

const NAV = [
  { href: "/admin", label: "메뉴" },
  { href: "/admin/tables", label: "테이블/QR" },
  { href: "/admin/ads", label: "광고" },
  { href: "/admin/accounts", label: "계정" },
  { href: "/admin/settings", label: "매장 설정" },
  { href: "/admin/analytics", label: "분석" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaff("owner");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <StaffHeader restaurantName={ctx.restaurantName} roleLabel="사장님" nav={NAV} />
      {children}
    </div>
  );
}
