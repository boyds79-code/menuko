import Link from "next/link";
import { MENU_TEMPLATES } from "@/lib/menu-templates";
import { IntroBookGate } from "@/components/marketing/IntroBookGate";

// Menuko's own marketing homepage — the company/product's public face at
// the root domain, distinct from the customer order pages (which use a
// per-restaurant menu_template) and the admin app. Uses Menuko's own brand
// (orange/cream) directly rather than the shared --brand token, since that
// token is the *admin app's* accent color and isn't meant to double as the
// company brand.
//
// Tab structure benchmarked against MenuTiger's marketing site per owner
// request: Features / Premium / (Success Stories — deliberately left out
// of the nav for now, see below) / FAQ / Contact, as anchor-scroll sections
// under one sticky top nav rather than separate routes.

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#premium", label: "Premium" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

const TEMPLATE_SWATCH: Record<string, string> = {
  terracotta: "#e0623a",
  heritage: "#c5a880",
  nordic: "#191c1d",
  botanical: "#1e3a2b",
};

const FEATURES = [
  {
    title: "3 menu designs to pick from",
    body: "Terracotta Bistro, Heritage Dining, or Nordic Minimal — choose the tone that fits your place, preview it, switch anytime.",
    swatches: true,
  },
  {
    title: "Customize by category",
    body: "Organize your menu into your own categories, reorder them, add photos per item, and pin up to 3 “Our Best” picks to the top.",
  },
  {
    title: "Built for a one-person operation",
    body: "Run the whole thing from your phone — no tech team, no IT setup. A solo owner can manage menu, tables, and orders alone.",
  },
  {
    title: "Free, unless you want Premium",
    body: "Ordering, kitchen, cashier, and today's sales are free forever, with no commission taken from your sales — ever.",
  },
  {
    title: "Scan and order, no app",
    body: "Customers scan the table's QR code and order straight from their phone's browser — nothing to download or sign up for.",
  },
  {
    title: "Real-time kitchen & cashier",
    body: "Orders land instantly in the kitchen queue; the cashier sees every table's status and total at a glance.",
  },
  {
    title: "“Call Server”, built in",
    body: "Customers can call staff over or request an order change/cancellation right from their phone — no waving anyone down.",
  },
  {
    title: "Print your QR codes in one click",
    body: "Generate and print every table's QR code — or your full menu — ready to laminate and place on the table.",
  },
];

const PREMIUM_FEATURES = [
  {
    title: "Deeper sales analytics",
    body: "Best-selling items, order combos, and your best-selling day/hour over the last week or month.",
  },
  {
    title: "Cross-promotion ads",
    body: "Put a promotional banner in front of customers at other restaurants on Menuko — and get discovered the same way.",
  },
  {
    title: "Unlimited staff logins",
    body: "Free plans include 1 owner + 1 kitchen + 1 cashier login. Premium removes that limit entirely.",
  },
];

const FAQS = [
  {
    q: "Does Menuko take a cut of my sales?",
    a: "No commission, ever. Payment still happens your way — cash, GCash, Maya — Menuko never touches your money.",
  },
  {
    q: "Do I need to buy any special hardware?",
    a: "No. Customers use their own phone's camera and browser; your kitchen and cashier can use any phone, tablet, or computer you already have.",
  },
  {
    q: "Does it connect to my existing POS?",
    a: "Not yet — Menuko currently runs on its own, separate from other POS or accounting software.",
  },
  {
    q: "What if the internet drops?",
    a: "A brief drop is fine — the kitchen and cashier apps queue up “served” and “paid” updates and sync once you're back online. Placing a new order always needs a live connection (yours or the customer's), so we recommend offering customer WiFi.",
  },
  {
    q: "How much does it cost?",
    a: "Ordering, kitchen, cashier, and today's sales are free — 1 owner + 1 kitchen + 1 cashier login included. Want deeper analytics, ads, and unlimited staff logins? Premium is ₱500/month (coming soon).",
  },
  {
    q: "Can customers pay inside the app?",
    a: "No — Menuko can show your GCash/Maya QR or payment link, but the actual payment is confirmed with your cashier, same as today.",
  },
  {
    q: "Can a customer cancel or change an order?",
    a: "They can request it right from their phone; your cashier (or you, if you're at the restaurant) approves or denies it.",
  },
  {
    q: "Is my data secure?",
    a: "Yes — encrypted connections and access-controlled data. Full details at our Privacy Policy.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col bg-[#fffaf3] text-[#231f1a]">
      <IntroBookGate />
      <SiteHeader />
      <Hero />
      <FeaturesSection />
      <PremiumSection />
      <SuccessStoriesSection />
      <FaqSection />
      <ContactSection />
      <SiteFooter />
    </div>
  );
}

function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <path d="M14 34V21.5a3 3 0 0 1 3-3h13" stroke="#ea7c1f" strokeWidth="8" strokeLinecap="round" />
      <path d="M86 34V21.5a3 3 0 0 0-3-3H70" stroke="#ea7c1f" strokeWidth="8" strokeLinecap="round" />
      <path d="M14 66V78.5a3 3 0 0 0 3 3h13" stroke="#ea7c1f" strokeWidth="8" strokeLinecap="round" />
      <path d="M86 66V78.5a3 3 0 0 1-3 3H70" stroke="#ea7c1f" strokeWidth="8" strokeLinecap="round" />
      <rect x="41" y="41" width="18" height="18" rx="5" fill="#ea7c1f" />
    </svg>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[#ece2d3] bg-[#fffaf3]/95 px-5 py-3 backdrop-blur sm:px-8">
      <div className="flex items-center gap-2">
        <Mark className="h-6 w-6" />
        <span className="text-base font-extrabold tracking-tight">Menuko</span>
      </div>
      <nav className="hidden items-center gap-6 text-sm font-bold text-[#6f6252] sm:flex">
        {NAV.map((item) => (
          <a key={item.href} href={item.href} className="transition hover:text-[#ea7c1f]">
            {item.label}
          </a>
        ))}
      </nav>
      <Link
        href="/signup"
        className="shrink-0 rounded-full bg-[#ea7c1f] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#c96612]"
      >
        Get started
      </Link>
    </header>
  );
}

function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 px-6 pt-16 pb-14 text-center sm:pt-24 sm:pb-20">
      <span className="rounded-full bg-[#ea7c1f]/10 px-3 py-1 text-xs font-bold tracking-wide text-[#c96612] uppercase">
        Built in Cebu, for small restaurants &amp; cafes
      </span>
      <h1 className="max-w-3xl text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-6xl">
        QR ordering that actually fits how small restaurants work.
      </h1>
      <p className="max-w-xl text-base text-[#6f6252] sm:text-lg">
        A customer scans the table&apos;s QR code, browses a photo menu, and orders straight to your
        kitchen. No app to download, no commission on your sales, live in minutes.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/signup"
          className="rounded-full bg-[#ea7c1f] px-7 py-3.5 font-bold text-white shadow-sm transition hover:bg-[#c96612]"
        >
          Get started for free
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-[#ece2d3] px-7 py-3.5 font-bold text-[#6f6252] transition hover:border-[#ea7c1f] hover:text-[#ea7c1f]"
        >
          Owner / staff login
        </Link>
      </div>
      <p className="pt-1 text-sm text-[#6f6252]">
        Are you a customer? Just scan the QR code on your table — nothing to set up here.
      </p>
    </section>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-bold tracking-[0.14em] text-[#c96612] uppercase">{children}</span>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-16 bg-white px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <div className="flex flex-col gap-3">
          <SectionEyebrow>Features</SectionEyebrow>
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            Everything built for how small restaurants actually run.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-[#ece2d3] p-6">
              <h3 className="mb-2 font-bold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-[#6f6252]">{f.body}</p>
              {f.swatches && (
                <div className="mt-4 flex flex-col gap-2">
                  {MENU_TEMPLATES.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                        style={{ backgroundColor: TEMPLATE_SWATCH[t.id] }}
                        aria-hidden
                      />
                      <span className="text-xs font-semibold">{t.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PremiumSection() {
  return (
    <section id="premium" className="scroll-mt-16 bg-[#241f1a] px-6 py-16 text-[#fffaf3] sm:px-8 sm:py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold tracking-[0.14em] text-[#f2b479] uppercase">
              Premium — coming soon
            </span>
            <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              More insight, more reach, no seat limits.
            </h2>
            <p className="max-w-lg text-[#e7dfd0]">
              Everything on the free plan, plus:
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 rounded-2xl bg-white/[0.06] px-6 py-4">
            <span className="text-4xl font-extrabold">₱500</span>
            <span className="text-sm text-[#e7dfd0]">per month</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {PREMIUM_FEATURES.map((p) => (
            <div key={p.title} className="rounded-2xl border border-white/12 bg-white/[0.04] p-6">
              <h3 className="mb-2 font-bold text-white">{p.title}</h3>
              <p className="text-sm leading-relaxed text-[#e7dfd0]">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-white/20 p-6">
          <div>
            <p className="font-bold text-white">Premium isn&apos;t open for signup yet.</p>
            <span className="text-sm text-[#e7dfd0]">
              Want to be first in line when it launches? Let us know.
            </span>
          </div>
          <a
            href="mailto:hello@menuko.net"
            className="shrink-0 rounded-full bg-[#ea7c1f] px-6 py-3 text-sm font-bold text-[#241a10] transition hover:opacity-90"
          >
            Join the waitlist
          </a>
        </div>
      </div>
    </section>
  );
}

// Deliberately not linked from the top nav yet — Menuko doesn't have real
// restaurant success stories to show yet. The section stays on the page,
// honestly framed as "coming soon", so it's a one-line change to add it to
// NAV once there's something real to put here.
function SuccessStoriesSection() {
  return (
    <section id="success-stories" className="scroll-mt-16 bg-white px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <SectionEyebrow>Success stories</SectionEyebrow>
        <h2 className="max-w-lg text-3xl font-extrabold tracking-tight sm:text-4xl">
          Coming soon.
        </h2>
        <p className="max-w-md text-[#6f6252]">
          We&apos;re just getting started in Cebu — check back soon for real stories from owners
          using Menuko.
        </p>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-16 bg-[#fffaf3] px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <div className="flex flex-col gap-3">
          <SectionEyebrow>FAQ</SectionEyebrow>
          <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            Questions owners ask us before switching.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FAQS.map((item) => (
            <div key={item.q} className="rounded-2xl border border-[#ece2d3] bg-white p-6">
              <div className="mb-2 flex gap-2 font-bold">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ea7c1f] text-xs text-white">
                  Q
                </span>
                {item.q}
              </div>
              <p className="pl-7 text-sm leading-relaxed text-[#6f6252]">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-16 bg-white px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <SectionEyebrow>Contact</SectionEyebrow>
        <h2 className="max-w-lg text-3xl font-extrabold tracking-tight sm:text-4xl">
          Questions, feedback, or want to partner with us?
        </h2>
        <p className="max-w-md text-[#6f6252]">
          We&apos;re a small team — write to us and we&apos;ll get back to you personally.
        </p>
        <a
          href="mailto:hello@menuko.net"
          className="mt-2 rounded-full bg-[#ea7c1f] px-7 py-3.5 font-bold text-white shadow-sm transition hover:bg-[#c96612]"
        >
          hello@menuko.net
        </a>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#ece2d3] px-6 py-8 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <Mark className="h-5 w-5" />
          <span className="text-sm font-bold">Menuko</span>
        </div>
        <p className="text-xs text-[#6f6252]">
          <Link href="/privacy" className="underline hover:text-[#ea7c1f]">
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="underline hover:text-[#ea7c1f]">
            Terms of Service
          </Link>{" "}
          · <a href="mailto:hello@menuko.net" className="underline hover:text-[#ea7c1f]">Contact</a>
        </p>
      </div>
    </footer>
  );
}
