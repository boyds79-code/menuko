import Link from "next/link";

// Shared with src/app/signup/signup-form.tsx (rendered inside the
// must-open-and-confirm modal there) so the legal text has one source of
// truth instead of drifting between the standalone page and the modal.
export function TermsContent() {
  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">Terms of Service</h1>
        <p className="mt-1 text-xs text-muted">Last updated: September 28, 2026</p>
      </div>

      <p>
        These Terms govern use of Menuko, a QR-based ordering service for restaurants and cafes,
        operated by <strong>DBandSolution</strong> (&quot;Menuko,&quot; &quot;we,&quot; &quot;us&quot;),
        401-389A, 79, Gimpohangang 9-ro, Gimpo-si, Gyeonggi-do, Republic of Korea, 10071. By creating a
        Restaurant account, you (the &quot;Restaurant&quot;) agree to these Terms. A Customer who places
        an order through a Menuko-powered menu agrees to the Customer Terms in Section 6 by doing so.
      </p>

      <Section title="1. The service">
        <p>
          Menuko lets a Restaurant set up a digital menu — including automatic translation into
          multiple languages for Customers — take orders via table QR codes, and manage kitchen,
          cashier, and (on a premium plan) analytics workflows. The free plan includes one owner, one
          kitchen, and one cashier account per Restaurant, full ordering/kitchen/cashier features, and
          menu translation; additional accounts and deeper analytics require the premium plan.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must be at least 18 years old, and have the authority to bind the Restaurant to these
          Terms, to create a Restaurant account.
        </p>
      </Section>

      <Section title="3. Your account and responsibilities">
        <ul className="list-disc pl-5">
          <li>You&apos;re responsible for the accuracy of the menu, prices, and business information you enter</li>
          <li>You&apos;re responsible for keeping your account credentials secure, and for what happens under kitchen/cashier accounts you invite</li>
          <li>You must have the right to use any photo, logo, or content you upload</li>
          <li>You&apos;re responsible for complying with applicable food-service, tax, and consumer-protection laws in how you run your Restaurant</li>
          <li>
            <strong>Menuko does not manage, process, or have any involvement in payments.</strong> If
            you choose to upload a payment QR code or payment link, that is entirely your own action,
            using your own payment account (e.g. GCash, Maya, or a bank) — Menuko merely displays it.
            You&apos;re solely responsible for that QR code or link being correct, and Menuko has no
            responsibility for any error, unavailability, delay, or dispute arising from a payment made
            this way
          </li>
        </ul>
      </Section>

      <Section title="4. Payments">
        <p>
          <strong>Menuko does not process, hold, or transmit payments.</strong> Any payment QR code or
          payment link you upload belongs to your own payment account (e.g. GCash, Maya, or a bank).
          Menuko only displays it to Customers and lets a Customer optionally upload a screenshot so
          your cashier can visually confirm payment. Menuko is not a party to, and has no
          responsibility for, any payment transaction between you and a Customer, including any QR
          code or payment-link error, failure, or dispute.
        </p>
      </Section>

      <Section title="5. Premium plan">
        <p>
          Some features are gated to a premium plan; others may be offered free to all Restaurants for
          a time as part of a promotion while Menuko grows its user base. In either case, we may
          change, at our sole discretion and at any time, which features are free versus premium,
          introduce new paid plans, or end a promotional period — including for a feature you are
          currently using for free. Pricing and billing terms for the premium plan will be provided
          separately at the time it becomes self-serve; until then, plan changes are made manually by
          Menuko.
        </p>
      </Section>

      <Section title="6. Your data, and our right to use it">
        <p>
          You retain ownership of the content you upload (menu items, photos, restaurant information).
          You grant Menuko a license to host, display, and process that content to operate the
          service.
        </p>
        <p className="mt-2">
          You also agree that Menuko may share, disclose, sell, or otherwise provide the following to
          third parties, now or in the future, for business purposes including analytics, research,
          partnerships, and business development: (a) your Restaurant account and business
          information, and (b) aggregated or de-identified order-pattern and usage data generated
          through your use of Menuko (including at the level of an individual table or ordering
          session), which does not identify any individual Customer by name, email, or phone number.
          <strong>
            {" "}
            This does not include, and Menuko does not share or sell, any individual&apos;s personal
            information — name, contact number, email address, or password — belonging to you, your
            staff, or a Customer.
          </strong>{" "}
          See our <Link href="/privacy" className="text-brand underline">Privacy Policy</Link> for
          more detail, including what is explicitly excluded from this (e.g. Customer payment
          screenshots).
        </p>
      </Section>

      <Section title="7. Customer terms">
        <p>
          If you&apos;re a Customer ordering through a Menuko-powered menu: orders and prices are set by
          the Restaurant, not Menuko, and Menuko is not responsible for food quality, order fulfillment,
          or payment disputes — those are between you and the Restaurant. Order and item data from
          your session may be used and shared as described in our Privacy Policy.
        </p>
      </Section>

      <Section title="8. Disclaimers and limitation of liability">
        <p>
          Menuko is provided &quot;as is,&quot; without warranties of any kind. To the fullest extent
          permitted by law, Menuko is not liable for indirect, incidental, consequential, special, or
          punitive damages, lost profits, or lost data arising from use of the service, including
          outages, order errors, or payment disputes between a Restaurant and its Customers.
        </p>
        <p className="mt-2">
          To the maximum extent permitted by applicable law, Menuko&apos;s total liability arising out
          of or relating to these Terms or the service, whether in contract, tort, or otherwise, will
          not exceed the greater of (a) the total fees you paid to Menuko in the twelve (12) months
          immediately preceding the event giving rise to the claim, or (b) ₱5,000. Nothing in these
          Terms limits liability that cannot be limited under applicable law, including liability for
          gross negligence, willful misconduct, fraud, or death or personal injury caused by our
          negligence.
        </p>
      </Section>

      <Section title="9. Termination">
        <p>
          You may stop using Menuko and request account deletion at any time. We may suspend or
          terminate an account that violates these Terms or misuses the service.
        </p>
      </Section>

      <Section title="10. Changes">
        <p>
          We may update these Terms from time to time; continued use of Menuko after a change means
          you accept the updated Terms.
        </p>
      </Section>

      <Section title="11. Governing law">
        <p>These Terms are governed by the laws of the Republic of the Philippines.</p>
      </Section>

      <Section title="12. Contact">
        <p>
          Questions about these Terms? Contact us at hello@menuko.net, or write to DBandSolution,
          401-389A, 79, Gimpohangang 9-ro, Gimpo-si, Gyeonggi-do, Republic of Korea, 10071.
        </p>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
