import Link from "next/link";

// Draft legal content — not reviewed by a lawyer. See the launch checklist
// artifact / chat for what still needs filling in (contact email) and the
// note about Philippines Data Privacy Act (RA 10173) compliance before
// this goes live for real.

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

      <div>
        <h1 className="text-xl font-semibold">Privacy Policy</h1>
        <p className="mt-1 text-xs text-muted">Last updated: [DATE]</p>
      </div>

      <p>
        This Privacy Policy explains how Menuko (&quot;Menuko,&quot; &quot;we,&quot; &quot;us&quot;) collects,
        uses, and shares information when a restaurant or cafe (&quot;Restaurant,&quot; &quot;you&quot;) uses the
        Menuko service, and when a customer of that Restaurant (&quot;Customer&quot;) places an order
        through a Menuko-powered QR menu.
      </p>

      <Section title="1. Who this applies to">
        <p>
          Menuko has two kinds of people interacting with it: <strong>Restaurant accounts</strong> —
          the owner and any kitchen/cashier staff the owner invites, who sign up for and manage the
          service — and <strong>Customers</strong>, who scan a table&apos;s QR code to order. Customers do
          not create an account or provide their name, email, or phone number to use Menuko.
        </p>
      </Section>

      <Section title="2. Information we collect">
        <p className="font-medium">From Restaurant accounts:</p>
        <ul className="list-disc pl-5">
          <li>Account email and password (handled by our authentication provider)</li>
          <li>Restaurant name, address, business type, and menu content (categories, items, prices, photos)</li>
          <li>Table setup and QR codes you generate</li>
          <li>A payment QR code or payment link you upload, if you choose to accept GCash/Maya or similar payments directly</li>
          <li>A logo or ad images you upload, if any</li>
          <li>Push notification device tokens, so we can alert your staff about new orders</li>
        </ul>
        <p className="mt-2 font-medium">From Customers, at order time:</p>
        <ul className="list-disc pl-5">
          <li>The items and quantities in an order, which table it was placed from, and when</li>
          <li>
            A payment screenshot, only if the Customer chooses to upload one to help the cashier
            confirm payment
          </li>
        </ul>
        <p className="mt-2">
          We do not ask Customers for their name, email, phone number, or location, and Menuko does
          not use cookies or third-party tracking/advertising scripts on the order page.
        </p>
      </Section>

      <Section title="3. How we use information">
        <ul className="list-disc pl-5">
          <li>To operate the ordering, kitchen, cashier, and admin features of the service</li>
          <li>To send order and account-related notifications to Restaurant staff</li>
          <li>
            To show a Restaurant&apos;s own sales data back to its owner, including summaries and
            trends over time
          </li>
          <li>To improve Menuko and develop new features</li>
          <li>To provide cross-promotion: a headline/image a Restaurant creates as an ad may be shown to Customers of other Restaurants on the order confirmation screen</li>
        </ul>
      </Section>

      <Section title="4. Sharing, disclosure, and sale of information">
        <p>
          We may share, disclose, sell, or otherwise provide the following to third parties, now or
          in the future, for business purposes including analytics, research, partnerships, and
          business development:
        </p>
        <ul className="mt-2 list-disc pl-5">
          <li>Restaurant account and business information (e.g. restaurant name, business type, menu content, and similar account-level data)</li>
          <li>
            Aggregated or de-identified usage and order-pattern data — for example, which items are
            frequently ordered together, order volume by time of day, or menu trends — including at
            the level of an individual table or ordering session, without identifying any Customer
            personally (Menuko does not collect a Customer&apos;s name, email, or phone number in the
            first place)
          </li>
        </ul>
        <p className="mt-2">
          We do <strong>not</strong> share or sell payment screenshots uploaded by Customers — these
          are used only so your own cashier can confirm payment, and for nothing else.
        </p>
        <p className="mt-2">
          We also use service providers (such as our hosting and database provider, and our push
          notification provider) to operate Menuko; they process data on our behalf under their own
          confidentiality obligations, not as independent third parties who can use it for their own
          purposes.
        </p>
      </Section>

      <Section title="5. Data retention">
        <p>
          We keep Restaurant account and order data for as long as the account is active, and for a
          reasonable period afterward for legal, accounting, or dispute-resolution purposes. You can
          request deletion of your Restaurant account and associated data at any time (see Section 7).
        </p>
      </Section>

      <Section title="6. Security">
        <p>
          We use industry-standard safeguards — including encryption in transit, access controls, and
          row-level authorization on our database — to protect the information Menuko holds. No
          system is perfectly secure, and we cannot guarantee absolute security.
        </p>
      </Section>

      <Section title="7. Your rights">
        <p>
          If you are a Restaurant owner, you can access, correct, export, or request deletion of your
          account data at any time by contacting us at [PRIVACY CONTACT EMAIL]. If you are a
          resident of the Philippines, you have rights under the Data Privacy Act of 2012 (RA 10173),
          including the right to be informed, to object, to access, to correct, to erase or block, to
          data portability, and to file a complaint with the National Privacy Commission.
        </p>
      </Section>

      <Section title="8. Children">
        <p>Menuko is intended for business use by adults operating a restaurant or cafe, and is not directed at children.</p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we will
          update the &quot;Last updated&quot; date above and, where required, notify Restaurant owners.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>Questions about this policy? Contact us at [PRIVACY CONTACT EMAIL].</p>
      </Section>

      <p className="mt-4 text-xs text-muted">
        See also our <Link href="/terms" className="text-brand underline">Terms of Service</Link>.
      </p>
    </main>
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
