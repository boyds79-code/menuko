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
  { id: "classic", label: "Classic", description: "The default look, in the warm brand color" },
  { id: "warm", label: "Warm", description: "Soft pastel tones with a cafe feel" },
  { id: "minimal", label: "Minimal", description: "Black-and-white, minimal fine-dining style" },
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
    headerSubtitle: string;
    categoryTitle: string;
    card: string;
    cardImage: string;
    priceText: string;
    addButton: string;
  }
> = {
  classic: {
    page: "bg-background",
    header: "rounded-b-3xl bg-header-dark px-4 pb-14 pt-5",
    headerTitle: "text-lg font-bold text-header-dark-foreground",
    headerSubtitle: "text-xs text-header-dark-foreground/60",
    categoryTitle:
      "mb-2 inline-block rounded-full bg-brand/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand",
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
    headerSubtitle: "text-sm text-muted",
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
    headerSubtitle: "text-sm text-black/60",
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
