import Link from "next/link";
import { MENU_COLORS } from "@/lib/menu-templates";
import { IntroBookGate } from "@/components/marketing/IntroBookGate";

// Menuko's own marketing homepage — the company/product's public face at
// the root domain, distinct from the customer order pages (which use a
// per-restaurant menu_layout/menu_color) and the admin app. Uses Menuko's
// "Market Green" brand (2026-09 redesign: deep green, sage ground, saffron
// accent) as literal colors rather than the --brand token, so it stays the
// same in the visitor's dark mode and isn't tied to the admin chrome.
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
    title: "4 menu looks to pick from",
    body: "Terracotta Bistro, Heritage Dining, Nordic Minimal, or Botanical Linen — pick a color and layout that fits your place, preview it, switch anytime.",
    swatches: true,
  },
  {
    title: "Customize by category",
    body: "Organize your menu into your own categories, reorder them, add photos per item, and pin up to 5 “Our Best” picks to the top.",
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
    <div className="flex flex-1 flex-col bg-[#f2f4ee] text-[#15261e]">
      <IntroBookGate />
      <SiteHeader />
      <main className="flex flex-col">
        <Hero />
        <HowItWorks />
        <FeaturesSection />
        <PremiumSection />
        <FaqSection />
        <SuccessStoriesSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}

function Mark({ className = "h-7 w-7", onDark = false }: { className?: string; onDark?: boolean }) {
  const stroke = onDark ? "#cbe2d5" : "#1f5c45";
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden>
      <path d="M14 34V21.5a3 3 0 0 1 3-3h13" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
      <path d="M86 34V21.5a3 3 0 0 0-3-3H70" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
      <path d="M14 66V78.5a3 3 0 0 0 3 3h13" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
      <path d="M86 66V78.5a3 3 0 0 1-3 3H70" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
      <rect x="41" y="41" width="18" height="18" rx="5" fill="#eaa93b" />
    </svg>
  );
}

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  palette: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1-.8-1.3-.8-2.2 0-.8.7-1.3 1.5-1.3H16a5 5 0 0 0 5-5C21 6.5 17 3 12 3zM7.5 12h.01M9.5 7.5h.01M14.5 7.5h.01",
  layers: "M12 3 3 8l9 5 9-5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5",
  phone: "M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5zM11 18h2",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  scan: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 12h8",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8z",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 20a2 2 0 0 0 4 0",
  printer: "M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  arrow: "M5 12h14M13 6l6 6-6 6",
  chart: "M5 20V11M12 20V5M19 20v-6",
  megaphone: "M3 11v2a2 2 0 0 0 2 2h1l4 4V5L6 9H5a2 2 0 0 0-2 2zM14 8a5 5 0 0 1 0 8M17 5a9 9 0 0 1 0 14",
  users: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.4M15.5 4.2a3.5 3.5 0 0 1 0 6.6",
  plus: "M12 5v14M5 12h14",
};

const FEATURE_ICONS = [ICONS.palette, ICONS.layers, ICONS.phone, ICONS.heart, ICONS.scan, ICONS.bolt, ICONS.bell, ICONS.printer];
const PREMIUM_ICONS = [ICONS.chart, ICONS.megaphone, ICONS.users];

function SiteHeader() {
  return (
    <header className="sticky top-3 z-30 px-3 sm:top-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-[#e0e6dc] bg-white/85 py-2 pr-2 pl-4 shadow-[0_8px_30px_rgba(21,38,30,0.08)] backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2" aria-label="Menuko home">
          <Mark className="h-6 w-6" />
          <span className="font-display text-lg font-bold tracking-tight">Menuko</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm font-semibold text-[#55645b] md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 transition hover:bg-[#dcebe2] hover:text-[#15261e]"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-[#15261e] transition hover:bg-[#f2f4ee] sm:block"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[#1f5c45] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#184b38]"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-[#dcebe2] blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e0e6dc] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#55645b]">
            <span className="h-2 w-2 rounded-full bg-[#1f9d63]" aria-hidden />
            Built in Cebu for small restaurants &amp; cafes
          </span>
          <h1 className="font-display text-5xl leading-[0.98] font-bold tracking-[-0.03em] sm:text-7xl">
            QR ordering that fits how small restaurants{" "}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10">actually work.</span>
              <span aria-hidden className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-full bg-[#eaa93b]/60 sm:bottom-2 sm:h-4" />
            </span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-[#55645b]">
            A customer scans the table&apos;s QR code, browses a photo menu, and orders straight to your
            kitchen. No app to download, no commission on your sales, live in minutes.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-[#1f5c45] px-7 py-4 font-bold text-white shadow-[0_10px_24px_rgba(31,92,69,0.25)] transition hover:bg-[#184b38]"
            >
              Get started for free
              <Icon d={ICONS.arrow} className="h-5 w-5 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-[#e0e6dc] bg-white px-7 py-4 font-bold text-[#15261e] transition hover:border-[#1f5c45]"
            >
              Owner / staff login
            </Link>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm font-semibold text-[#15261e]">
            {["No commission, ever", "Nothing for customers to install", "Free to start"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dcebe2] text-[#1f5c45]">
                  <Icon d={ICONS.check} className="h-3.5 w-3.5" />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <p className="text-sm text-[#55645b]">
            Are you a customer? Just scan the QR code on your table — nothing to set up here.
          </p>
        </div>
        <HeroPhone />
      </div>
    </section>
  );
}

// A drawn (not screenshot) customer menu — the sample restaurant and dishes
// are illustrative, so no real restaurant's name or photos appear here.
function HeroPhone() {
  const items = [
    { name: "Chicken Inasal", price: "₱180", tone: "bg-[#e9c79a]" },
    { name: "Sinigang na Baboy", price: "₱220", tone: "bg-[#c9dcc4]" },
    { name: "Lumpiang Shanghai", price: "₱150", tone: "bg-[#f0d3b5]" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[340px] lg:mx-0 lg:justify-self-end" aria-hidden>
      <div className="relative rotate-[2deg] rounded-[46px] bg-[#15261e] p-3 shadow-[0_40px_80px_rgba(21,38,30,0.28)]">
        <div className="overflow-hidden rounded-[36px] bg-[#f7f9f6]">
          <div className="rounded-b-[28px] bg-[#1e3a2b] px-5 pt-8 pb-5 text-[#f7f9f6]">
            <div className="text-[11px] font-semibold tracking-[0.18em] uppercase opacity-70">Table 4</div>
            <div className="font-display mt-1 text-2xl font-bold">Your Restaurant</div>
            <div className="mt-3 flex gap-2 text-xs font-semibold">
              <span className="rounded-full bg-[#f7f9f6] px-3 py-1.5 text-[#1e3a2b]">Mains</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">Soups</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">Drinks</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 p-4">
            {items.map((it, idx) => (
              <div key={it.name} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm">
                <div className={`h-14 w-14 shrink-0 rounded-xl ${it.tone}`} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#212623]">{it.name}</div>
                  <div className="text-xs font-semibold text-[#1e3a2b]">{it.price}</div>
                </div>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${idx === 0 ? "bg-[#1e3a2b] text-white" : "border border-[#dfe5de] text-[#1e3a2b]"}`}
                >
                  <Icon d={idx === 0 ? ICONS.check : ICONS.plus} className="h-4 w-4" />
                </div>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between rounded-full bg-[#1e3a2b] px-5 py-3.5 text-sm font-bold text-white">
              <span>View order · 2 items</span>
              <span>₱400</span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-[44%] -left-4 flex items-center gap-3 rounded-2xl border border-[#e0e6dc] bg-white px-4 py-3 shadow-[0_16px_32px_rgba(21,38,30,0.14)] sm:-left-14">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dcebe2] text-[#1f5c45]">
          <Icon d={ICONS.bolt} className="h-5 w-5" />
        </span>
        <div>
          <div className="text-xs font-semibold text-[#55645b]">Kitchen</div>
          <div className="text-sm font-bold">New order · Table 4</div>
        </div>
      </div>
      <div className="absolute -right-3 bottom-24 rounded-2xl bg-[#eaa93b] px-4 py-3 shadow-[0_16px_32px_rgba(21,38,30,0.18)] sm:-right-8">
        <div className="text-xs font-semibold text-[#5a3d09]">Paid via GCash</div>
        <div className="font-display text-xl font-bold text-[#15261e]">₱400.00</div>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, light = false }: { eyebrow: string; title: string; light?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <span className={`text-xs font-bold tracking-[0.16em] uppercase ${light ? "text-[#eaa93b]" : "text-[#1f5c45]"}`}>
        {eyebrow}
      </span>
      <h2 className="font-display max-w-2xl text-4xl leading-[1.05] font-bold tracking-[-0.02em] sm:text-5xl">{title}</h2>
    </div>
  );
}

const STEPS = [
  { title: "Customer scans", body: "Every table has its own QR code. The phone camera opens your menu in the browser." },
  { title: "Orders from the table", body: "Photos, prices and your “Our Best” picks — they add items and send the order." },
  { title: "Kitchen & cashier see it live", body: "It lands in the kitchen queue instantly; the cashier sees each table's total." },
];

function HowItWorks() {
  return (
    <section className="px-6 pb-20 sm:pb-28">
      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex flex-col gap-3 rounded-[28px] border border-[#e0e6dc] bg-white p-7">
            <span className="font-display text-5xl font-bold text-[#dcebe2]">0{i + 1}</span>
            <h3 className="text-lg font-bold">{s.title}</h3>
            <p className="text-sm leading-relaxed text-[#55645b]">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  // Bento layout: the first and seventh tiles are wide, the last spans the row.
  const span = (i: number) => (i === 0 || i === 6 ? "lg:col-span-2" : i === 7 ? "lg:col-span-3" : "");
  return (
    <section id="features" className="scroll-mt-24 px-6 pt-4 pb-20 sm:pb-28">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <SectionHeading eyebrow="Features" title="Everything built for how small restaurants actually run." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`flex flex-col gap-4 rounded-[28px] p-7 ${span(i)} ${i === 0 ? "bg-[#1f5c45] text-white" : "border border-[#e0e6dc] bg-white"}`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${i === 0 ? "bg-white/12 text-[#eaa93b]" : "bg-[#dcebe2] text-[#1f5c45]"}`}
              >
                <Icon d={FEATURE_ICONS[i] ?? ICONS.check} />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className={`font-display font-bold ${i === 0 ? "text-2xl" : "text-xl"}`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${i === 0 ? "text-[#cbe2d5]" : "text-[#55645b]"}`}>{f.body}</p>
              </div>
              {f.swatches && (
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  {MENU_COLORS.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pr-3.5 pl-1.5 text-xs font-semibold"
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-full border border-white/40"
                        style={{ backgroundColor: TEMPLATE_SWATCH[t.id] }}
                        aria-hidden
                      />
                      {t.label}
                    </span>
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
    <section id="premium" className="scroll-mt-24 px-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 rounded-[40px] bg-[#15261e] px-6 py-16 text-[#f2f4ee] sm:px-12 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-4">
            <SectionHeading light eyebrow="Premium — coming soon" title="More insight, more reach, no seat limits." />
            <p className="max-w-lg text-[#cbe2d5]">Everything on the free plan, plus:</p>
          </div>
          <div className="flex flex-col gap-1 rounded-[28px] bg-[#eaa93b] px-7 py-5 text-[#15261e]">
            <span className="font-display text-5xl font-bold">₱500</span>
            <span className="text-sm font-semibold text-[#5a3d09]">per month</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PREMIUM_FEATURES.map((p, i) => (
            <div key={p.title} className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/[0.04] p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#eaa93b]">
                <Icon d={PREMIUM_ICONS[i] ?? ICONS.check} />
              </span>
              <h3 className="text-lg font-bold text-white">{p.title}</h3>
              <p className="text-sm leading-relaxed text-[#cbe2d5]">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-dashed border-white/20 p-7">
          <div>
            <p className="font-bold text-white">Premium isn&apos;t open for signup yet.</p>
            <span className="text-sm text-[#cbe2d5]">Want to be first in line when it launches? Let us know.</span>
          </div>
          <a
            href="mailto:hello@menuko.net"
            className="shrink-0 rounded-full bg-[#f2f4ee] px-6 py-3.5 text-sm font-bold text-[#15261e] transition hover:bg-white"
          >
            Join the waitlist
          </a>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 px-6 py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
          <SectionHeading eyebrow="FAQ" title="Questions owners ask us before switching." />
          <p className="text-[#55645b]">
            Something else on your mind?{" "}
            <a href="mailto:hello@menuko.net" className="font-semibold text-[#1f5c45] underline underline-offset-4">
              Write to us
            </a>
            .
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group rounded-[22px] border border-[#e0e6dc] bg-white px-6 py-5 open:shadow-[0_12px_30px_rgba(21,38,30,0.06)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f2f4ee] text-[#1f5c45] transition group-open:rotate-45 group-open:bg-[#1f5c45] group-open:text-white">
                  <Icon d={ICONS.plus} className="h-4 w-4" />
                </span>
              </summary>
              <p className="pt-3 pr-10 text-sm leading-relaxed text-[#55645b]">{item.a}</p>
            </details>
          ))}
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
    <section id="success-stories" className="scroll-mt-24 px-6 pb-20">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 rounded-[28px] border border-dashed border-[#c9d3c4] px-6 py-10 text-center">
        <span className="text-xs font-bold tracking-[0.16em] text-[#1f5c45] uppercase">Success stories</span>
        <p className="font-display text-2xl font-bold">Coming soon.</p>
        <p className="max-w-md text-sm text-[#55645b]">
          We&apos;re just getting started in Cebu — check back soon for real stories from owners using Menuko.
        </p>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-24 px-3 pb-20 sm:px-6">
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 overflow-hidden rounded-[40px] bg-[#eaa93b] px-6 py-16 text-center sm:py-20">
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#f3c26b]" />
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 h-60 w-60 rounded-full bg-[#f3c26b]" />
        <h2 className="font-display relative max-w-2xl text-4xl leading-[1.05] font-bold tracking-[-0.02em] text-[#15261e] sm:text-6xl">
          Put your menu on every table this week.
        </h2>
        <p className="relative max-w-md text-[#4a3408]">
          Free to start. Questions, feedback, or want to partner with us? We&apos;re a small team and we reply
          personally.
        </p>
        <div className="relative flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-[#15261e] px-7 py-4 font-bold text-white transition hover:bg-[#1f5c45]"
          >
            Get started for free
          </Link>
          <a
            href="mailto:hello@menuko.net"
            className="rounded-full bg-white/70 px-7 py-4 font-bold text-[#15261e] transition hover:bg-white"
          >
            hello@menuko.net
          </a>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  const cols = [
    {
      title: "Product",
      links: [
        { href: "#features", label: "Features" },
        { href: "#premium", label: "Premium" },
        { href: "#faq", label: "FAQ" },
      ],
    },
    {
      title: "Account",
      links: [
        { href: "/signup", label: "Create a free account" },
        { href: "/login", label: "Owner / staff login" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "mailto:hello@menuko.net", label: "Contact" },
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms of Service" },
      ],
    },
  ];
  return (
    <footer className="bg-[#15261e] px-6 pt-16 pb-10 text-[#cbe2d5]">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-white">
              <Mark className="h-6 w-6" onDark />
              <span className="font-display text-lg font-bold">Menuko</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed">
              QR ordering for small restaurants and cafes. Built in Cebu.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title} className="flex flex-col gap-3">
              <span className="text-xs font-bold tracking-[0.16em] text-white/60 uppercase">{c.title}</span>
              {c.links.map((l) =>
                l.href.startsWith("/") ? (
                  <Link key={l.label} href={l.href} className="text-sm transition hover:text-white">
                    {l.label}
                  </Link>
                ) : (
                  <a key={l.label} href={l.href} className="text-sm transition hover:text-white">
                    {l.label}
                  </a>
                ),
              )}
            </div>
          ))}
        </div>
        <div aria-hidden className="font-display text-[22vw] leading-[0.8] font-bold tracking-[-0.04em] text-white/[0.06] select-none lg:text-[220px]">
          Menuko
        </div>
        <p className="text-xs text-white/50">© Menuko · Cebu, Philippines</p>
      </div>
    </footer>
  );
}
