import Link from "next/link";
import { DocShell } from "@/components/doc-shell";

// Draft legal content — not reviewed by a lawyer. Required by Paddle (our
// merchant of record) for live checkout approval, and linked from the
// footer next to Terms and Privacy.

export const metadata = {
  title: "Refund & Cancellation Policy — Menuko",
};

export default function RefundPolicyPage() {
  return (
    <DocShell>
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">Refund &amp; Cancellation Policy</h1>
        <p className="mt-1 text-xs text-muted">Last updated: October 2, 2026</p>
      </div>

      <p>
        This policy covers Menuko Premium, the paid plan for Restaurant accounts, operated by{" "}
        <strong>DBandSolution</strong>. Menuko&apos;s free plan has no charges and is not covered here.
        Payments for Menuko Premium are processed by our reseller and merchant of record, Paddle.com,
        which also issues refunds on our behalf.
      </p>

      <Section title="1. Plans and prices">
        <ul className="list-disc pl-5">
          <li>Monthly: USD 9 per month, billed every month.</li>
          <li>Annual: USD 90 per year, billed once a year.</li>
        </ul>
        <p>Applicable taxes are calculated and shown at checkout.</p>
      </Section>

      <Section title="2. Free trial">
        <p>
          New Restaurants can start a free Premium trial from their account settings on menuko.net. No
          payment card is required, and you are not charged when the trial ends — your account simply
          returns to the free plan, and none of your data is deleted. To keep Premium features after the
          trial, subscribe to a monthly or annual plan.
        </p>
      </Section>

      <Section title="3. Cancelling">
        <p>
          You can cancel at any time from the Billing page in your Menuko account. Cancellation stops
          future renewals. You keep Premium until the end of the period you have already paid for, after
          which your account returns to the free plan. Your data is not deleted when you cancel.
        </p>
      </Section>

      <Section title="4. Refunds — monthly plan">
        <p>
          Monthly payments are not refundable. Once a monthly billing period has started, that month is
          not refunded, including if you cancel partway through it. You keep Premium until the end of
          that month.
        </p>
      </Section>

      <Section title="5. Refunds — annual plan">
        <p>
          If you cancel an annual plan, you can request a refund for the unused part of the year. Because
          the annual price includes a discount, the months you have used are charged at the regular
          monthly price (USD 9), not the discounted rate:
        </p>
        <p className="rounded-xl bg-background px-4 py-3 font-medium">
          Refund = USD 90 − (USD 9 × months used)
        </p>
        <ul className="list-disc pl-5">
          <li>A month counts as used once it has started (partial months count as a full month).</li>
          <li>Example: cancel during the 3rd month → 3 months used → refund of USD 90 − USD 27 = USD 63.</li>
          <li>From the 10th month onward, no refund is due (10 × USD 9 = USD 90).</li>
          <li>Premium ends when the refund is issued.</li>
        </ul>
      </Section>

      <Section title="6. How to request a refund">
        <p>
          Email <a href="mailto:hello@menuko.net" className="font-semibold text-brand underline underline-offset-4">hello@menuko.net</a>{" "}
          from your account&apos;s email address with your restaurant name. We will confirm the amount and
          issue eligible refunds through Paddle to your original payment method, usually within 5–10
          business days. Your rights under applicable consumer law are not affected by this policy.
        </p>
      </Section>

      <p className="mt-4 text-xs text-muted">
        See also our{" "}
        <Link href="/terms" className="font-semibold text-brand underline underline-offset-4">Terms of Service</Link> and{" "}
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
