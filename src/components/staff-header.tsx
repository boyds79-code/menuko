import Link from "next/link";
import { signOut } from "@/app/actions/sign-out";
import { BrandMark } from "./brand-mark";
import { StaffNav } from "./staff-nav";
import { UiIcon } from "./ui-icon";

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
    <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex items-center gap-2" aria-label="Menuko home">
            <BrandMark className="h-6 w-6" />
            <span className="font-display text-lg font-bold tracking-tight">Menuko</span>
          </Link>
          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
          <span className="truncate text-sm font-semibold">{restaurantName}</span>
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-ink">{roleLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {nav && <StaffNav nav={nav} />}
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition hover:border-brand hover:text-brand"
            >
              <UiIcon name="logout" className="h-[18px] w-[18px]" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
