import Link from "next/link";
import { signOut } from "@/app/actions/sign-out";

export function StaffHeader({
  restaurantName,
  roleLabel,
  nav,
}: {
  restaurantName: string;
  roleLabel: string;
  nav?: { href: string; label: string }[];
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="font-bold text-brand">Menuko</span>
        <span className="text-sm text-muted">
          {restaurantName} · {roleLabel}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {nav?.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full px-3 py-1.5 text-sm text-foreground/80 transition hover:bg-brand/10 hover:text-brand"
          >
            {item.label}
          </Link>
        ))}
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full border border-border px-3 py-1.5 text-sm text-muted transition hover:border-brand hover:text-brand"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
