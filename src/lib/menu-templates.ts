// Shared design tokens for the 3 menu templates (Classic/Warm/Minimal).
// Both the digital menu (order-client.tsx) and the printable menu
// (print-view.tsx) read from this single source so the two never drift
// apart — the whole point of "one design choice drives both outputs".

export type MenuTemplateId = "classic" | "warm" | "minimal";

export const MENU_TEMPLATES: {
  id: MenuTemplateId;
  label: string;
  description: string;
}[] = [
  { id: "classic", label: "Classic", description: "따뜻한 브랜드 컬러의 기본 스타일" },
  { id: "warm", label: "Warm", description: "카페 느낌의 부드러운 파스텔 톤" },
  { id: "minimal", label: "Minimal", description: "흑백 기반의 미니멀한 파인다이닝 스타일" },
];

export function isMenuTemplateId(value: string): value is MenuTemplateId {
  return MENU_TEMPLATES.some((t) => t.id === value);
}

// Digital menu (order-client.tsx) style tokens.
export const DIGITAL_TEMPLATE_STYLES: Record<
  MenuTemplateId,
  {
    page: string;
    header: string;
    headerTitle: string;
    categoryTitle: string;
    card: string;
    cardImage: string;
    priceText: string;
    addButton: string;
  }
> = {
  classic: {
    page: "bg-background",
    header: "border-b border-border bg-card px-4 py-3",
    headerTitle: "font-bold text-brand",
    categoryTitle: "mb-3 text-base font-semibold",
    card: "flex items-center gap-3 rounded-xl border border-border bg-card p-3",
    cardImage: "h-16 w-16 rounded-lg",
    priceText: "text-sm text-muted",
    addButton:
      "rounded-full border border-brand px-3 py-1.5 text-sm font-medium text-brand transition hover:bg-brand hover:text-brand-foreground",
  },
  warm: {
    page: "bg-[#fff3e6]",
    header: "border-b-2 border-dashed border-brand/40 bg-[#fff3e6] px-4 py-4",
    headerTitle: "font-serif text-xl font-bold text-brand",
    categoryTitle:
      "mb-3 inline-block rounded-full bg-brand/15 px-3 py-1 text-sm font-semibold text-brand",
    card: "flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm",
    cardImage: "h-16 w-16 rounded-full",
    priceText: "text-sm font-medium text-brand",
    addButton:
      "rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground shadow-sm transition hover:opacity-90",
  },
  minimal: {
    page: "bg-white",
    header: "border-b border-black px-4 py-3",
    headerTitle: "font-semibold uppercase tracking-widest text-black",
    categoryTitle: "mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-black",
    card: "flex items-center gap-3 border-b border-black/10 px-1 py-3",
    cardImage: "h-14 w-14 rounded-none grayscale",
    priceText: "text-sm text-black/60",
    addButton:
      "rounded-none border border-black px-3 py-1.5 text-sm font-medium text-black transition hover:bg-black hover:text-white",
  },
};

// Print menu (print-view.tsx) style tokens.
export const PRINT_TEMPLATE_STYLES: Record<
  MenuTemplateId,
  {
    page: string;
    titleBlock: string;
    title: string;
    categoryTitle: string;
    divider: string;
  }
> = {
  classic: {
    page: "bg-white",
    titleBlock: "border-b-2 border-foreground pb-4 text-center",
    title: "text-3xl font-bold",
    categoryTitle: "mb-2 border-b border-foreground/30 pb-1 text-lg font-semibold uppercase tracking-wide",
    divider: "border-dotted border-foreground/30",
  },
  warm: {
    page: "bg-[#fffaf3]",
    titleBlock: "border-b-4 border-double border-brand pb-4 text-center",
    title: "font-serif text-3xl font-bold text-brand",
    categoryTitle: "mb-2 text-lg font-semibold text-brand",
    divider: "border-dotted border-brand/40",
  },
  minimal: {
    page: "bg-white",
    titleBlock: "border-b border-black pb-3 text-left",
    title: "text-2xl font-semibold uppercase tracking-[0.15em]",
    categoryTitle: "mb-2 text-sm font-semibold uppercase tracking-[0.25em]",
    divider: "border-solid border-black/20",
  },
};
