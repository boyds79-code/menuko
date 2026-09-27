import Link from "next/link";
import { TermsContent } from "./terms-content";

// Draft legal content — not reviewed by a lawyer. See the launch checklist
// artifact / chat for what still needs filling in before this goes live for
// real.

export const metadata = {
  title: "Terms of Service — Menuko",
};

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6 text-sm leading-relaxed">
      <div>
        <Link href="/" className="text-sm font-bold text-brand">
          Menuko
        </Link>
      </div>

      <TermsContent />

      <p className="mt-4 text-xs text-muted">
        See also our <Link href="/privacy" className="text-brand underline">Privacy Policy</Link>.
      </p>
    </main>
  );
}
