import Link from "next/link";
import { BrandMark } from "./brand-mark";

// Shared frame for the public text pages (Privacy, Terms, Delete account):
// the marketing site's floating header, and the document on a white card.
export function DocShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="sticky top-3 z-20 px-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between rounded-full border border-border bg-card/85 py-2 pr-2 pl-4 shadow-[0_8px_30px_rgba(21,38,30,0.06)] backdrop-blur-md">
          <Link href="/" className="flex items-center gap-2" aria-label="Menuko home">
            <BrandMark className="h-6 w-6" />
            <span className="font-display text-lg font-bold tracking-tight">Menuko</span>
          </Link>
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-background"
          >
            Log in
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-8 sm:py-12">
        <article className="flex flex-col gap-6 rounded-[32px] border border-border bg-card px-6 py-8 text-sm leading-relaxed sm:px-10 sm:py-12">
          {children}
        </article>
      </main>
    </div>
  );
}
