import Link from "next/link";
import { DocShell } from "@/components/doc-shell";

// Required by Google Play's Data safety section: a public URL (no login
// needed to read it) naming the app/developer, showing the deletion steps,
// and stating what's deleted vs retained. See also /privacy Section 7.

export const metadata = {
  title: "Delete Your Account — Menuko",
};

export default function DeleteAccountPage() {
  return (
    <DocShell>
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">Delete Your Account</h1>
        <p className="mt-1 text-xs text-muted">Last updated: September 28, 2026</p>
      </div>

      <p>
        This page explains how to delete your Menuko (Menuko Staff app, operated by DBandSolution)
        restaurant account and what happens to your data when you do.
      </p>

      <Section title="How to delete your account">
        <p>Only the restaurant owner account can do this (it deletes the whole restaurant):</p>
        <ol className="list-decimal pl-5">
          <li>Open the Menuko Staff app and sign in as the owner</li>
          <li>Open the <strong>Store</strong> tab, then switch to <strong>Account</strong></li>
          <li>Scroll to the <strong>Delete account</strong> card</li>
          <li>Type your restaurant&apos;s name to confirm, then tap <strong>Delete my account</strong></li>
        </ol>
        <p className="mt-2">
          Don&apos;t have access to the app? Email <strong>hello@menuko.net</strong> from the account&apos;s
          registered email address with your restaurant name, and we&apos;ll delete it for you.
        </p>
      </Section>

      <Section title="What gets deleted">
        <p>
          Your restaurant record, menu (categories, items, photos), tables and QR codes, order and
          payment-confirmation history, uploaded logo and payment QR image, every staff (kitchen/cashier)
          account tied to the restaurant, and your login itself.
        </p>
      </Section>

      <Section title="Retention after deletion">
        <p>
          We don&apos;t keep your data after deletion is processed, except where a limited amount must be
          retained for a reasonable period to comply with applicable law (for example, financial or tax
          records) — see our <Link href="/privacy" className="font-semibold text-brand underline underline-offset-4">Privacy Policy</Link> for
          more detail.
        </p>
      </Section>

      <p className="mt-4 text-xs text-muted">
        See also our <Link href="/terms" className="font-semibold text-brand underline underline-offset-4">Terms of Service</Link> and{" "}
        <Link href="/privacy" className="font-semibold text-brand underline underline-offset-4">Privacy Policy</Link>.
      </p>
    </DocShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
