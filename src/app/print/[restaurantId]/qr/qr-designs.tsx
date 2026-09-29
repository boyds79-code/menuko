import type { CSSProperties, ReactNode } from "react";

// Printable table QR card designs. Every card is an A-series portrait
// rectangle (1 : 1.414) and a CSS size container, and all type/spacing is in
// `cqw` (percent of the card's width) — so one design renders identically as
// a full A4 stand, a quarter-page A6 table card, or a tiny picker thumbnail.
//
// The QR itself always stays dark-on-light (colors per design below) so it
// scans reliably once printed; the decoration lives around it.

export type QrCardProps = {
  restaurantName: string;
  tableLabel: string;
  logoUrl: string | null;
  // Pre-rendered QR <svg> markup (see qr-print-view.tsx), null while loading.
  qrSvg: string | null;
};

export type QrDesign = {
  id: string;
  label: string;
  description: string;
  qrColors: { dark: string; light: string };
  Card: (props: QrCardProps) => ReactNode;
};

const cq = (n: number) => `${n}cqw`;

// The outer div is the size container; the card itself is the inner div,
// so its own padding/gap in cqw resolve against the card width too (a
// container's own properties would resolve against the viewport instead).
function CardFrame({ style, className = "", children }: { style?: CSSProperties; className?: string; children: ReactNode }) {
  return (
    <div className="@container w-full">
      <div
        className={`relative aspect-[1/1.414] w-full overflow-hidden ${className}`}
        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact", ...style }}
      >
        {children}
      </div>
    </div>
  );
}

function Qr({ svg, size, background }: { svg: string | null; size: number; background?: string }) {
  return svg ? (
    <div
      className="[&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      style={{ width: cq(size), height: cq(size), background }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  ) : (
    <div className="animate-pulse rounded bg-black/10" style={{ width: cq(size), height: cq(size) }} aria-hidden />
  );
}

// Rounded viewfinder corners around the QR, like a phone camera's scan frame.
function ScanCorners({ color, inset, length, thickness, radius }: { color: string; inset: number; length: number; thickness: number; radius: number }) {
  const common: CSSProperties = { position: "absolute", width: cq(length), height: cq(length), borderColor: color };
  const w = cq(thickness);
  return (
    <>
      <span style={{ ...common, top: cq(inset), left: cq(inset), borderTopWidth: w, borderLeftWidth: w, borderTopLeftRadius: cq(radius) }} />
      <span style={{ ...common, top: cq(inset), right: cq(inset), borderTopWidth: w, borderRightWidth: w, borderTopRightRadius: cq(radius) }} />
      <span style={{ ...common, bottom: cq(inset), left: cq(inset), borderBottomWidth: w, borderLeftWidth: w, borderBottomLeftRadius: cq(radius) }} />
      <span style={{ ...common, bottom: cq(inset), right: cq(inset), borderBottomWidth: w, borderRightWidth: w, borderBottomRightRadius: cq(radius) }} />
    </>
  );
}

// The owner's logo when they've uploaded one, otherwise a generic mark.
function LogoMark({ logoUrl, size, color, children }: { logoUrl: string | null; size: number; color: string; children: ReactNode }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- print page; next/image adds nothing for a one-off print
      <img src={logoUrl} alt="" className="rounded-full object-cover" style={{ width: cq(size), height: cq(size) }} />
    );
  }
  return (
    <div className="flex items-center justify-center rounded-full" style={{ width: cq(size), height: cq(size), background: color }}>
      {children}
    </div>
  );
}

function ForkSpoonIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="62%" height="62%" fill={color} aria-hidden>
      <path d="M7 2v7a2 2 0 0 0 1.5 1.94V22h2V10.94A2 2 0 0 0 12 9V2h-1.2v6h-.9V2H8.8v6h-.9V2H7Zm9.5 0C14.6 2 13.5 4.2 13.5 6.5c0 2 .9 3.6 2 4.2V22h2V10.7c1.1-.6 2-2.2 2-4.2C19.5 4.2 18.4 2 16.5 2Z" />
    </svg>
  );
}

function CupIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="55%" height="55%" fill={color} aria-hidden>
      <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Zm13 1h1.5a2.5 2.5 0 0 1 0 5H17v-1.6h1.5a.9.9 0 0 0 0-1.8H17V10ZM3 20.5h15V22H3v-1.5ZM8 3.5c.8.8.8 1.7 0 2.5s-.8 1.7 0 2.5H6.8c-.8-.8-.8-1.7 0-2.5s.8-1.7 0-2.5H8Zm4 0c.8.8.8 1.7 0 2.5s-.8 1.7 0 2.5h-1.2c-.8-.8-.8-1.7 0-2.5s.8-1.7 0-2.5H12Z" />
    </svg>
  );
}

function LeafSprig({ color, style }: { color: string; style: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 90" fill={color} aria-hidden style={{ position: "absolute", ...style }}>
      <path d="M30 88c2-22 6-48 20-80" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="44" cy="14" rx="5" ry="11" transform="rotate(35 44 14)" />
      <ellipse cx="30" cy="22" rx="5.5" ry="12" transform="rotate(-50 30 22)" />
      <ellipse cx="50" cy="34" rx="5.5" ry="12" transform="rotate(60 50 34)" />
      <ellipse cx="24" cy="42" rx="6" ry="13" transform="rotate(-60 24 42)" />
      <ellipse cx="46" cy="56" rx="6" ry="13" transform="rotate(65 46 56)" />
      <ellipse cx="22" cy="64" rx="6" ry="13" transform="rotate(-55 22 64)" />
    </svg>
  );
}

// Washi-tape strip with torn (zigzag) ends.
function Tape({ style }: { style: CSSProperties }) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        width: cq(22),
        height: cq(6),
        background: "#4a453f",
        opacity: 0.92,
        clipPath:
          "polygon(0 0, 100% 0, 97% 17%, 100% 33%, 97% 50%, 100% 67%, 97% 83%, 100% 100%, 0 100%, 3% 83%, 0 67%, 3% 50%, 0 33%, 3% 17%)",
        ...style,
      }}
    />
  );
}

const KRAFT_NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.3 0 0 0 0 0.25 0 0 0 0 0.18 0 0 0 0.16 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// ── Designs ──────────────────────────────────────────────────────────────

function PlainCard({ restaurantName, tableLabel, qrSvg }: QrCardProps) {
  return (
    <CardFrame className="flex flex-col items-center justify-center bg-white text-center text-neutral-900" style={{ gap: cq(3) }}>
      <p className="font-medium text-neutral-500" style={{ fontSize: cq(4.5) }}>
        {restaurantName}
      </p>
      <p className="font-bold" style={{ fontSize: cq(9) }}>
        {tableLabel}
      </p>
      <Qr svg={qrSvg} size={72} />
      <p className="text-neutral-500" style={{ fontSize: cq(4.5) }}>
        Scan to order
      </p>
    </CardFrame>
  );
}

function KraftCard({ restaurantName, tableLabel, logoUrl, qrSvg }: QrCardProps) {
  const ink = "#4e4638";
  return (
    <CardFrame className="flex flex-col items-center text-center" style={{ background: `${KRAFT_NOISE}, #e9e1d3`, color: ink, fontFamily: "var(--font-qr-bebas)", paddingTop: cq(5) }}>
      <LogoMark logoUrl={logoUrl} size={8} color={ink}>
        <ForkSpoonIcon color="#e9e1d3" />
      </LogoMark>
      <p className="max-w-[85%] truncate rounded-full bg-white/90 leading-none" style={{ fontSize: cq(5), padding: `${cq(1.6)} ${cq(6)}`, marginTop: cq(2.5), letterSpacing: "0.02em" }}>
        {restaurantName}
      </p>
      <p className="leading-none" style={{ fontSize: cq(19), marginTop: cq(2.5) }}>
        SCAN HERE
      </p>
      <div className="relative" style={{ marginTop: cq(3.5) }}>
        <Tape style={{ top: cq(-1), left: cq(-9), transform: "rotate(-35deg)" }} />
        <div className="relative flex items-center justify-center bg-white" style={{ width: cq(64), height: cq(64), boxShadow: `0 ${cq(1)} ${cq(2.5)} rgba(0,0,0,0.18)` }}>
          <ScanCorners color={ink} inset={6} length={10} thickness={0.45} radius={2.5} />
          <Qr svg={qrSvg} size={44} />
        </div>
        <Tape style={{ bottom: cq(-1), right: cq(-9), transform: "rotate(-35deg)" }} />
      </div>
      <p className="leading-none" style={{ fontSize: cq(10), marginTop: cq(6) }}>
        TO SEE THE MENU
      </p>
      <p className="leading-none" style={{ fontSize: cq(5), marginTop: cq(3.5), letterSpacing: "0.04em" }}>
        {tableLabel}
      </p>
    </CardFrame>
  );
}

function ForestCard({ restaurantName, tableLabel, qrSvg }: QrCardProps) {
  const green = "#1d4d3e";
  const border = `${cq(0.5)} solid #000`;
  return (
    <CardFrame className="flex flex-col bg-white text-white" style={{ padding: cq(6), gap: cq(2.5) }}>
      <div className="flex flex-1 flex-col items-center text-center" style={{ background: green, border, padding: `${cq(4)} ${cq(5)} ${cq(5)}` }}>
        <p className="leading-none" style={{ fontFamily: "var(--font-qr-anton)", fontSize: cq(19) }}>
          SCAN HERE
        </p>
        <p className="leading-none font-extrabold" style={{ fontFamily: "var(--font-qr-montserrat)", fontSize: cq(5.6), marginTop: cq(2.5) }}>
          TO EXPLORE OUR MENU
        </p>
        <div className="flex flex-1 items-center justify-center bg-white" style={{ width: "100%", border, marginTop: cq(5) }}>
          <Qr svg={qrSvg} size={60} />
        </div>
      </div>
      <div className="text-center" style={{ background: green, border, padding: `${cq(2.5)} ${cq(4)}`, fontFamily: "var(--font-qr-montserrat)" }}>
        <p className="leading-tight font-extrabold" style={{ fontSize: cq(5.2) }}>
          {restaurantName}
        </p>
        <p className="font-semibold" style={{ fontSize: cq(3.4) }}>
          {tableLabel}
        </p>
      </div>
    </CardFrame>
  );
}

function RetroCard({ restaurantName, tableLabel, qrSvg }: QrCardProps) {
  const orange = "#f24e07";
  const ink = "#1c1a17";
  const rule = <div style={{ height: cq(0.3), background: ink, opacity: 0.8, width: "100%" }} />;
  const chevron = (flip: boolean) => (
    <svg viewBox="0 0 40 20" style={{ width: cq(8), transform: flip ? "scaleX(-1)" : undefined }} aria-hidden>
      <path d="M12 0h28v20H12L0 10Z" fill={ink} />
      <path d="M12 3 5 10l7 7 7-7Z" fill={orange} />
    </svg>
  );
  const star = <span style={{ color: orange, fontSize: cq(7), lineHeight: 1 }}>✶</span>;
  return (
    <CardFrame className="flex flex-col items-center text-center" style={{ background: "#ffd000", color: ink, fontFamily: "var(--font-qr-fraunces)", padding: `${cq(6)} ${cq(9)}` }}>
      <p className="font-bold" style={{ fontSize: cq(3.6), marginBottom: cq(2.5) }}>
        {restaurantName}
      </p>
      <div className="flex w-full items-center justify-between">
        {chevron(false)}
        <p className="font-black" style={{ fontSize: cq(6.2) }}>
          Ready To Order?
        </p>
        {chevron(true)}
      </div>
      <div style={{ width: "100%", marginTop: cq(2) }}>{rule}</div>
      <p style={{ fontFamily: "var(--font-qr-shrikhand)", color: orange, fontSize: cq(16), lineHeight: 1.15, marginTop: cq(1) }}>
        Scan Me!
      </p>
      {rule}
      <div className="flex w-full items-center justify-between" style={{ padding: `${cq(1.5)} ${cq(2)}` }}>
        {star}
        <p className="font-black" style={{ fontSize: cq(6.2) }}>
          To View Our Menu
        </p>
        {star}
      </div>
      {rule}
      <div className="flex flex-1 items-center justify-center" style={{ marginTop: cq(4) }}>
        <div style={{ border: `${cq(2.4)} solid ${orange}`, padding: cq(3), background: "#ffd000" }}>
          <Qr svg={qrSvg} size={52} />
        </div>
      </div>
      <p className="font-black" style={{ fontSize: cq(8), marginTop: cq(3) }}>
        {tableLabel}
      </p>
    </CardFrame>
  );
}

function CafeCard({ restaurantName, tableLabel, logoUrl, qrSvg }: QrCardProps) {
  const brown = "#553c2a";
  const gold = "#c4a574";
  const line = <span style={{ width: cq(10), height: cq(0.5), background: brown, borderRadius: 999 }} />;
  return (
    <CardFrame className="flex bg-white" style={{ padding: cq(3) }}>
      <div className="relative flex flex-1 flex-col items-center text-center" style={{ border: `${cq(0.6)} solid ${brown}`, borderRadius: cq(6), color: brown, fontFamily: "var(--font-qr-montserrat)", paddingTop: cq(7) }}>
        <LeafSprig color={gold} style={{ top: cq(3.5), left: cq(3), width: cq(10), transform: "rotate(-20deg)" }} />
        <LeafSprig color={gold} style={{ bottom: cq(3.5), right: cq(3), width: cq(10), transform: "rotate(160deg)" }} />
        <LogoMark logoUrl={logoUrl} size={6.5} color={brown}>
          <CupIcon color="#fff" />
        </LogoMark>
        <p className="font-semibold uppercase" style={{ fontSize: cq(4.2), letterSpacing: "0.22em", marginTop: cq(2), padding: `0 ${cq(14)}`, lineHeight: 1.3 }}>
          {restaurantName}
        </p>
        <span style={{ width: cq(7), height: cq(0.6), background: brown, borderRadius: 999, marginTop: cq(3) }} />
        <p className="leading-none" style={{ fontFamily: "var(--font-qr-anton)", fontSize: cq(15), marginTop: cq(3.5) }}>
          SCAN HERE
        </p>
        <p className="font-extrabold" style={{ color: gold, fontSize: cq(5.4), letterSpacing: "0.12em", marginTop: cq(1.5) }}>
          TO VIEW MENU
        </p>
        <div className="relative flex items-center justify-center" style={{ width: cq(52), height: cq(52), border: `${cq(1.6)} solid ${brown}`, borderRadius: cq(5), marginTop: cq(3.5) }}>
          <ScanCorners color={gold} inset={4} length={8} thickness={1.1} radius={1.8} />
          <Qr svg={qrSvg} size={34} />
        </div>
        <p className="font-medium" style={{ fontSize: cq(3.8), letterSpacing: "0.12em", marginTop: cq(4) }}>
          Open our digital menu
        </p>
        <div className="flex items-center" style={{ gap: cq(4), marginTop: cq(2.5) }}>
          {line}
          <LogoMark logoUrl={null} size={6.5} color={brown}>
            <CupIcon color="#fff" />
          </LogoMark>
          {line}
        </div>
        <p className="font-medium" style={{ fontSize: cq(4), letterSpacing: "0.2em", marginTop: cq(2) }}>
          {tableLabel}
        </p>
      </div>
    </CardFrame>
  );
}

export const QR_DESIGNS: QrDesign[] = [
  { id: "plain", label: "Plain", description: "Just the QR, no background — print on any paper or sticker.", qrColors: { dark: "#111111", light: "#ffffff" }, Card: PlainCard },
  { id: "kraft", label: "Kraft Paper", description: "Beige paper with tape, SCAN HERE.", qrColors: { dark: "#2f2a22", light: "#ffffff" }, Card: KraftCard },
  { id: "forest", label: "Forest Sticker", description: "Bold green sticker with your name below.", qrColors: { dark: "#111111", light: "#ffffff" }, Card: ForestCard },
  { id: "retro", label: "Retro Yellow", description: "Playful “Scan Me!” in yellow and orange.", qrColors: { dark: "#1c1a17", light: "#ffd000" }, Card: RetroCard },
  { id: "cafe", label: "Café Minimal", description: "White with a brown frame and gold leaves.", qrColors: { dark: "#3b2a1d", light: "#ffffff" }, Card: CafeCard },
];

export function getQrDesign(id: string | null | undefined): QrDesign {
  return QR_DESIGNS.find((d) => d.id === id) ?? QR_DESIGNS[0];
}
