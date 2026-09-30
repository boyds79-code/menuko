// Menuko's QR-corner mark — green corners, saffron center (2026-09 "Market
// Green" brand). `onDark` lightens the corners for dark backgrounds.
export function BrandMark({ className = "h-6 w-6", onDark = false }: { className?: string; onDark?: boolean }) {
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
