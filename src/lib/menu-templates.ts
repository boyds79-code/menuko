// Shared design tokens for the customer-facing menu templates
// (order-client.tsx).
//
// Each template also gets its own independent color palette and type pairing
// via a `[data-menu-theme="<id>"]` CSS scope in globals.css (see that file) —
// the classes below only carry the *shape*/layout differences (rounded vs.
// square, filled pill vs. hairline label, etc.); the actual bg-brand/
// text-brand/etc. colors they reference resolve differently per template
// automatically through that CSS scope.

export type MenuTemplateId = "terracotta" | "heritage" | "nordic" | "botanical";

export const MENU_TEMPLATES: {
  id: MenuTemplateId;
  label: string;
  description: string;
}[] = [
  {
    id: "terracotta",
    label: "Terracotta Bistro",
    description: "Warm terracotta & craft-paper tones — casual restaurants, BBQ, carinderia",
  },
  {
    id: "heritage",
    label: "Heritage Dining",
    description: "Navy & gold, refined serif — upscale or fine-dining restaurants",
  },
  {
    id: "nordic",
    label: "Nordic Minimal",
    description: "Charcoal & taupe, architectural minimalism — cafes & specialty coffee",
  },
  {
    id: "botanical",
    label: "Botanical Linen",
    description: "Deep forest sage & warm linen, organic elegance — garden cafes, wellness dining, upscale casual",
  },
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
    // Margin pulling the "Our Best" row up so it overlaps the header's
    // curved bottom edge. Nordic's header has no curve to overlap, so it
    // uses normal spacing instead.
    featuredOverlap: string;
    // Nordic's cards/detail view follow the Stitch prototype's own layout
    // (flat bordered cards, plain mono prices, item spec codes, a sticky
    // labeled back bar in the detail view) rather than the shared markup
    // the other two templates use — this switches the whole component,
    // not just its classes. Botanical only overrides the item detail view
    // (real fields only: description/ingredients/allergy/cook time, no
    // invented provenance copy) — its row cards and review sheet stay on
    // the shared "default" markup, just recolored via its CSS theme.
    variant: "default" | "nordic" | "botanical";
  }
> = {
  terracotta: {
    page: "bg-background",
    header: "rounded-b-3xl bg-header-dark px-4 pb-14 pt-5",
    headerTitle: "text-lg font-bold text-header-dark-foreground",
    headerSubtitle: "text-xs text-header-dark-foreground/60",
    categoryTitle:
      "mb-2 inline-block rounded-full bg-brand/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand",
    featuredOverlap: "-mt-10",
    variant: "default",
  },
  heritage: {
    page: "bg-background",
    header: "bg-header-dark px-4 pb-14 pt-5",
    headerTitle: "text-lg font-bold tracking-wide text-header-dark-foreground",
    headerSubtitle: "text-xs uppercase tracking-[0.2em] text-header-dark-foreground/60",
    categoryTitle:
      "mb-2 border-b border-brand/40 pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand",
    featuredOverlap: "-mt-10",
    variant: "default",
  },
  nordic: {
    page: "bg-background",
    header: "border-b border-border bg-header-dark px-4 pb-5 pt-5",
    headerTitle: "text-lg font-semibold tracking-tight text-header-dark-foreground",
    headerSubtitle: "text-xs uppercase tracking-[0.15em] text-header-dark-foreground/60",
    categoryTitle:
      "mb-2 border-b border-border pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground",
    featuredOverlap: "mt-4",
    variant: "nordic",
  },
  botanical: {
    page: "bg-background",
    header: "rounded-b-3xl bg-header-dark px-4 pb-14 pt-5",
    headerTitle: "text-lg font-semibold tracking-tight text-header-dark-foreground",
    headerSubtitle: "text-xs uppercase tracking-[0.08em] text-header-dark-foreground/70",
    categoryTitle:
      "mb-2 border-b border-brand/25 pb-1 text-xs font-semibold uppercase tracking-[0.15em] text-foreground",
    featuredOverlap: "-mt-10",
    variant: "botanical",
  },
};
