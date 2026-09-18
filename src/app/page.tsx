import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="text-3xl font-bold text-brand">Menuko</span>
        <p className="max-w-md text-muted">
          A free app for restaurants and cafes who want to take orders by QR menu
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signup"
          className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-sm transition hover:opacity-90"
        >
          Get started for free
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-border px-6 py-3 font-medium text-muted transition hover:border-brand hover:text-brand"
        >
          Owner / staff login
        </Link>
      </div>
      <p className="text-sm text-muted">
        If you&apos;re a customer, please scan the QR code on your table.
      </p>
      <p className="text-xs text-muted">
        <Link href="/privacy" className="underline hover:text-brand">
          Privacy Policy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="underline hover:text-brand">
          Terms of Service
        </Link>
      </p>
    </main>
  );
}
