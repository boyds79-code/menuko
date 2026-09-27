import Link from "next/link";
import { PrivacyContent } from "./privacy-content";

// Draft legal content — not reviewed by a lawyer. See the launch checklist
// artifact / chat for the note about Philippines Data Privacy Act (RA 10173)
// compliance before this goes live for real.

export const metadata = {
  title: "Privacy Policy — Menuko",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6 text-sm leading-relaxed">
      <div>
        <Link href="/" className="text-sm font-bold text-brand">
          Menuko
        </Link>
      </div>

      <PrivacyContent />

      <p className="mt-4 text-xs text-muted">
        See also our <Link href="/terms" className="text-brand underline">Terms of Service</Link>.
      </p>
    </main>
  );
}
