import Link from "next/link";
import { DocShell } from "@/components/doc-shell";
import { PrivacyContent } from "./privacy-content";

// Draft legal content — not reviewed by a lawyer. See the launch checklist
// artifact / chat for the note about Philippines Data Privacy Act (RA 10173)
// compliance before this goes live for real.

export const metadata = {
  title: "Privacy Policy — Menuko",
};

export default function PrivacyPolicyPage() {
  return (
    <DocShell>
      <PrivacyContent />

      <p className="mt-4 text-xs text-muted">
        See also our <Link href="/terms" className="font-semibold text-brand underline underline-offset-4">Terms of Service</Link>.
      </p>
    </DocShell>
  );
}
