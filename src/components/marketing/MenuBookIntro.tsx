"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { MenuTemplateId } from "@/lib/menu-templates";

// A once-per-visitor, scroll-driven "menu book" intro. Each page is a
// miniature of the *real* Menuko order screen — same header/category/card
// markup and the same [data-menu-theme] CSS tokens as the actual customer
// page (src/app/order/[qrToken]/order-client.tsx) — filled with a
// different cuisine's menu, cycling through all 3 real templates twice.
// This is a product demo, not decoration: a visitor should recognize the
// exact UI they'd get once they scroll past into the real homepage.
//
// Pages flip away with a real front/back pair (CSS backface-visibility)
// and a scroll-driven curl shadow, ending on a reveal of the Menuko mark +
// a QR code. Scrolling past the book continues straight into the normal
// homepage below — no separate transition needed.

type Item = { name: string; price: number };
type Page = {
  cuisine: string;
  restaurant: string;
  table: string;
  category: string;
  template: MenuTemplateId;
  photo: string;
  featured: Item;
  items: Item[];
};

const PAGES: Page[] = [
  {
    cuisine: "Filipino",
    restaurant: "Manila Kitchen",
    table: "Table 4",
    category: "Mains",
    template: "terracotta",
    photo: "filipino",
    featured: { name: "Chicken Adobo", price: 220 },
    items: [
      { name: "Sinigang na Baboy", price: 250 },
      { name: "Lechon Kawali", price: 280 },
      { name: "Pancit Canton", price: 180 },
    ],
  },
  {
    cuisine: "Italian",
    restaurant: "Trattoria Bella",
    table: "Table 2",
    category: "Mains",
    template: "heritage",
    photo: "italian",
    featured: { name: "Margherita Pizza", price: 380 },
    items: [
      { name: "Spaghetti Carbonara", price: 320 },
      { name: "Risotto ai Funghi", price: 350 },
      { name: "Tiramisu", price: 180 },
    ],
  },
  {
    cuisine: "Korean",
    restaurant: "Seoul Table",
    table: "Table 7",
    category: "Mains",
    template: "nordic",
    photo: "korean",
    featured: { name: "Korean BBQ Set", price: 450 },
    items: [
      { name: "Bibimbap", price: 280 },
      { name: "Kimchi Jjigae", price: 260 },
      { name: "Tteokbokki", price: 200 },
    ],
  },
  {
    cuisine: "Japanese",
    restaurant: "Tokyo Ame",
    table: "Table 1",
    category: "Mains",
    template: "terracotta",
    photo: "japanese",
    featured: { name: "Sushi Platter", price: 420 },
    items: [
      { name: "Tonkotsu Ramen", price: 280 },
      { name: "Chicken Katsu", price: 260 },
      { name: "Tempura Udon", price: 240 },
    ],
  },
  {
    cuisine: "Chinese",
    restaurant: "Canton House",
    table: "Table 9",
    category: "Mains",
    template: "heritage",
    photo: "chinese",
    featured: { name: "Dim Sum Basket", price: 260 },
    items: [
      { name: "Yang Chow Fried Rice", price: 220 },
      { name: "Sweet & Sour Pork", price: 280 },
      { name: "Dumplings (6pc)", price: 180 },
    ],
  },
  {
    cuisine: "Cafe",
    restaurant: "Daily Grind",
    table: "Table 3",
    category: "Drinks",
    template: "nordic",
    photo: "cafe",
    featured: { name: "Signature Latte", price: 150 },
    items: [
      { name: "Iced Americano", price: 120 },
      { name: "Butter Croissant", price: 110 },
      { name: "Basque Cheesecake", price: 140 },
    ],
  },
];

function formatPeso(n: number) {
  return `₱${n.toFixed(2)}`;
}

function Mark({ className = "h-16 w-16" }: { className?: string }) {
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

// A miniature of the real order-client.tsx screen: header band, one
// featured "Our Best"-style card with a real photo, then a row of plain
// RowCard-style items (no photo, same placeholder pattern the real app
// uses for items without one).
function MenuMockup({ page }: { page: Page }) {
  return (
    <div data-menu-theme={page.template} className="flex h-full w-full flex-col overflow-hidden bg-background">
      <div className="shrink-0 bg-header-dark px-4 pt-4 pb-7">
        <p className="text-sm font-bold text-header-dark-foreground">{page.restaurant}</p>
        <p className="text-[11px] text-header-dark-foreground/60">{page.table}</p>
      </div>

      <div className="-mt-4 px-4">
        <div className="relative h-28 w-full max-w-[65%] overflow-hidden rounded-xl shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element -- static marketing asset, not user content */}
          <img src={`/marketing/${page.photo}.webp`} alt={page.featured.name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" aria-hidden />
          <span className="absolute bottom-2 left-2 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-brand-foreground">
            Our Best!
          </span>
          <span className="absolute right-2 bottom-2 max-w-[55%] truncate text-right text-[11px] font-semibold text-white">
            {page.featured.name}
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 pt-5">
        <span className="mb-2 inline-block text-[10px] font-bold tracking-[0.15em] text-brand uppercase">
          {page.category}
        </span>
        <div className="flex gap-2">
          {page.items.map((item) => (
            <div key={item.name} className="w-[30%] shrink-0 overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex h-12 items-center justify-center bg-background">
                <span className="text-[8px] text-muted">Menuko</span>
              </div>
              <div className="p-1.5">
                <p className="truncate text-[10px] font-semibold text-foreground">{item.name}</p>
                <p className="text-[9px] font-medium text-brand">{formatPeso(item.price)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4 text-center">
        <span className="text-[10px] tracking-[0.2em] text-muted uppercase">{page.cuisine} · on Menuko</span>
      </div>
    </div>
  );
}

export function MenuBookIntro() {
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const currentIndexRef = useRef(0);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const origin = window.location.origin;
    QRCode.toDataURL(`${origin}/signup`, { width: 320, margin: 1 }).then(setQrDataUrl);

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Browser-only check that can't run during SSR — not a render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(query.matches);
  }, []);

  function scrollToPage(index: number) {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const top = wrapper.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + index * window.innerHeight + 40, behavior: "smooth" });
  }

  useEffect(() => {
    if (reducedMotion) return;

    let frame = 0;
    function update() {
      const wrapper = wrapperRef.current;
      if (wrapper) {
        const top = wrapper.getBoundingClientRect().top + window.scrollY;
        const vh = window.innerHeight;
        const progress = Math.min(Math.max((window.scrollY - top) / vh, 0), PAGES.length);

        const nearest = Math.min(Math.floor(progress + 0.5), PAGES.length - 1);
        if (nearest !== currentIndexRef.current) {
          currentIndexRef.current = nearest;
          setCurrentIndex(nearest);
        }

        pageRefs.current.forEach((el, i) => {
          if (!el) return;
          const local = Math.min(Math.max(progress - i, 0), 1);
          const eased = local * local * (3 - 2 * local); // smoothstep
          el.style.transform = `rotateY(${-180 * eased}deg)`;
          el.style.opacity = local > 0.94 ? `${1 - (local - 0.94) / 0.06}` : "1";

          const shadow = shadowRefs.current[i];
          if (shadow) {
            // Peaks while the page is edge-on (local ~0.5) — approximates
            // the shadow a real page catches as it curls upright.
            shadow.style.opacity = `${Math.sin(Math.min(eased, 1) * Math.PI) * 0.55}`;
          }
        });
      }
      frame = requestAnimationFrame(update);
    }
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  if (reducedMotion) {
    // Respect the visitor's OS preference — skip straight to the reveal,
    // no forced scroll-through.
    return null;
  }

  const current = PAGES[currentIndex];

  return (
    <div ref={wrapperRef} style={{ height: `${PAGES.length * 100}vh` }} className="relative">
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden bg-[#1a1512]">
        {/* Ambient vignette behind the book, for depth */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.06), transparent 65%)" }}
          aria-hidden
        />

        <div className="relative h-[76vh] w-[92vw] max-w-md" style={{ perspective: "1800px" }}>
          {/* Hardcover chassis — the static book frame everything sits inside.
              Deep layered shadow + a hairline ring gives it real physical weight
              compared to a flat rounded card. */}
          <div
            className="absolute inset-0 rounded-[26px] bg-[#fdf8ee] ring-1 ring-black/10"
            style={{ boxShadow: "0 30px 60px -15px rgba(0,0,0,0.5), 0 12px 24px -8px rgba(0,0,0,0.35)" }}
            aria-hidden
          />

          {/* Paper deckle edge — stacked box-shadows on the right suggest a
              thick block of pages behind the one showing. */}
          <div
            className="pointer-events-none absolute inset-y-4 -right-0.5 z-0 w-1 rounded-r-full"
            style={{ boxShadow: "5px 0 0 -1px #efe6d2, 10px 0 0 -2px #e4d7bb, 15px 0 0 -3px #d6c6a3" }}
            aria-hidden
          />

          {/* Header ribbon — reads the current page's table, like a real
              table-side menu book cover. */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-4 text-[10px] font-bold tracking-[0.15em] text-[#8a7a68] uppercase">
            <span>
              {current.restaurant} · {current.table}
            </span>
            <span className="tabular-nums">
              {String(currentIndex + 1).padStart(2, "0")} / {String(PAGES.length).padStart(2, "0")}
            </span>
          </div>

          {/* Page stage — inset within the chassis padding */}
          <div className="absolute inset-x-3 top-9 bottom-3 overflow-hidden rounded-2xl">
            {/* Spine crease — the book's binding shadow, layered on top of
                every page so it reads as fixed physical structure. */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-30 w-7"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.05) 45%, rgba(255,255,255,0.25) 55%, rgba(0,0,0,0.08) 70%, transparent 100%)",
              }}
              aria-hidden
            />

            {/* Final reveal — sits beneath every page, exposed as they flip away */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-[#fffaf3] p-8 text-center">
              <Mark className="h-16 w-16" />
              <span className="text-2xl font-extrabold tracking-tight text-[#231f1a]">Menuko</span>
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- data: URL, not a remote image
                <img src={qrDataUrl} alt="QR code" width={140} height={140} className="rounded-lg" />
              )}
              <span className="text-xs font-bold tracking-[0.2em] text-[#c96612] uppercase">
                Scan to Order
              </span>
            </div>

            {PAGES.map((page, i) => (
              <div
                key={page.cuisine}
                ref={(el) => {
                  pageRefs.current[i] = el;
                }}
                className="absolute inset-0"
                style={{
                  transformOrigin: "left center",
                  transformStyle: "preserve-3d",
                  zIndex: PAGES.length - i,
                }}
              >
                {/* Front face — a miniature of the real order screen */}
                <div className="absolute inset-0 overflow-hidden" style={{ backfaceVisibility: "hidden" }}>
                  <MenuMockup page={page} />
                  {/* Curl shadow — driven imperatively by scroll progress above */}
                  <div
                    ref={(el) => {
                      shadowRefs.current[i] = el;
                    }}
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: "linear-gradient(to right, transparent 55%, rgba(0,0,0,0.65) 100%)",
                      opacity: 0,
                    }}
                    aria-hidden
                  />
                </div>

                {/* Back face — the blank underside of the page */}
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: "linear-gradient(135deg, #efe4d1, #e4d6bc)",
                  }}
                >
                  <Mark className="h-9 w-9 opacity-25" />
                </div>
              </div>
            ))}
          </div>

          {/* Prev/next — jump a full page via smooth scroll, same motion the
              scroll gesture itself drives. */}
          <button
            type="button"
            onClick={() => scrollToPage(Math.max(currentIndex - 1, 0))}
            aria-label="Previous page"
            className="absolute top-1/2 -left-3 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#fdf8ee] text-[#8a7a68] shadow-lg transition hover:text-[#ea7c1f]"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollToPage(Math.min(currentIndex + 1, PAGES.length))}
            aria-label="Next page"
            className="absolute top-1/2 -right-3 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#fdf8ee] text-[#8a7a68] shadow-lg transition hover:text-[#ea7c1f]"
          >
            ›
          </button>
        </div>

        <span className="absolute bottom-8 left-1/2 z-30 -translate-x-1/2 text-xs font-bold tracking-[0.2em] text-[#e7dfd0] uppercase">
          Scroll to turn the page
        </span>
      </div>
    </div>
  );
}
