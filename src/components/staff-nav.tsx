"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Pill nav for StaffHeader — client-side only so it can highlight the
// current section.
export function StaffNav({ nav }: { nav: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections" className="flex items-center gap-1 rounded-full bg-background p-1">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active ? "bg-brand text-brand-foreground shadow-sm" : "text-muted hover:bg-card hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
