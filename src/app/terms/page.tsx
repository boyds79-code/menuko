import Link from "next/link";
import { DocShell } from "@/components/doc-shell";
import { TermsContent } from "./terms-content";

// Draft legal content — not reviewed by a lawyer. See the launch checklist
// artifact / chat for what still needs filling in before this goes live for
// real.

export const metadata = {
  title: "Terms of Service — Menuko",
};

export default function TermsPage() {
  return (
    <DocShell>
      <TermsContent />

      <p className="mt-4 text-xs text-muted">
        See also our <Link href="/privacy" className="font-semibold text-brand underline underline-offset-4">Privacy Policy</Link>.
      </p>
    </DocShell>
  );
}
