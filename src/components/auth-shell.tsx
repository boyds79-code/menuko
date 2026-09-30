import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { UiIcon } from "./ui-icon";

// Split layout for /login and /signup: a brand panel on wide screens, the
// form on the right (full width on phones).
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  aside,
}: {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  // Replaces the default brand-panel copy (headline + bullets) when a page
  // has something more specific to say there, e.g. signup's next steps.
  aside?: React.ReactNode;
}) {
  return (
    <main className="grid flex-1 bg-background lg:h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#1f5c45] p-12 text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-[#2a6f55]" />
        <Link href="/" className="relative flex items-center gap-2" aria-label="Menuko home">
          <BrandMark className="h-7 w-7" onDark />
          <span className="font-display text-xl font-bold">Menuko</span>
        </Link>
        {aside ?? (
        <div className="relative flex flex-col gap-6">
          <p className="font-display max-w-md text-4xl leading-[1.08] font-bold tracking-[-0.02em]">
            Your menu on every table. Orders straight to the kitchen.
          </p>
          <ul className="flex flex-col gap-3 text-[#cbe2d5]">
            {["No commission on your sales", "Nothing for customers to install", "Kitchen & cashier update live"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/12 text-[#eaa93b]">
                  <UiIcon name="check" className="h-4 w-4" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        )}
        <p className="relative text-sm text-[#cbe2d5]">Built in Cebu for small restaurants &amp; cafes.</p>
      </aside>
      <section className="flex flex-col items-center justify-center gap-8 px-6 py-12 lg:overflow-y-auto">
        <Link href="/" className="flex items-center gap-2 lg:hidden" aria-label="Menuko home">
          <BrandMark className="h-7 w-7" />
          <span className="font-display text-xl font-bold">Menuko</span>
        </Link>
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">{title}</h1>
            <p className="text-sm leading-relaxed text-muted">{subtitle}</p>
          </div>
          {children}
          {footer}
        </div>
      </section>
    </main>
  );
}
