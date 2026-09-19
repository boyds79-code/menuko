// RN counterpart to the web app's src/lib/menu-templates.ts DIGITAL_TEMPLATE_STYLES
// — same 4 templates, same intent (Terracotta/Heritage/Nordic/Botanical tone
// + palette), but as plain style objects since RN has no CSS cascade. Kept
// deliberately lightweight (not a 1:1 port of every web class) — just enough
// for the Settings > Menu design swatch and the full-screen preview to
// actually look different per template, not pixel-identical to the real web
// menu.

export type MobileMenuTemplateId = "terracotta" | "heritage" | "nordic" | "botanical";

export const MOBILE_MENU_TEMPLATES: { id: MobileMenuTemplateId; label: string }[] = [
  { id: "terracotta", label: "Terracotta Bistro" },
  { id: "heritage", label: "Heritage Dining" },
  { id: "nordic", label: "Nordic Minimal" },
  { id: "botanical", label: "Botanical Linen" },
];

export type MobileTemplateStyle = {
  pageBackground: string;
  cardBackground: string;
  cardBorderColor: string;
  cardBorderWidth: number;
  cardBorderRadius: number;
  photoShape: number; // border radius; a huge number reads as a circle
  photoBackground: string;
  categoryLabelColor: string;
  categoryLabelBackground?: string;
  categoryLabelRadius?: number;
  categoryLabelUppercase?: boolean;
  categoryLabelTracked?: boolean;
  categoryUnderline?: boolean;
  itemNameColor: string;
  priceColor: string;
  addButtonFilled: boolean;
  addButtonColor: string;
  addButtonRadius: number;
};

// Colors here are kept in sync with the [data-menu-theme] blocks in
// src/app/globals.css (web) — both trace back to the same Stitch
// interactive-prototype exports (see the code.html files in
// ~/Downloads/stitch_menuko_qr_restaurant_menu_app*), so a color change on
// one side should always be mirrored on the other.
export const MOBILE_TEMPLATE_STYLES: Record<MobileMenuTemplateId, MobileTemplateStyle> = {
  terracotta: {
    pageBackground: "#fff8f5",
    cardBackground: "#fff1ea",
    cardBorderColor: "#e9d6cd",
    cardBorderWidth: 1,
    cardBorderRadius: 16,
    photoShape: 12,
    photoBackground: "#fff8f5",
    categoryLabelColor: "#e0623a",
    categoryLabelBackground: "rgba(224,98,58,0.15)",
    categoryLabelRadius: 999,
    itemNameColor: "#2b1b17",
    priceColor: "#e0623a",
    addButtonFilled: true,
    addButtonColor: "#e0623a",
    addButtonRadius: 999,
  },
  heritage: {
    pageBackground: "#faf6ef",
    cardBackground: "#fdfbf7",
    cardBorderColor: "#dfcebb",
    cardBorderWidth: 1,
    cardBorderRadius: 6,
    photoShape: 4,
    photoBackground: "#faf6ef",
    categoryLabelColor: "#c5a880",
    categoryLabelUppercase: true,
    categoryLabelTracked: true,
    categoryUnderline: true,
    itemNameColor: "#2c251e",
    priceColor: "#c5a880",
    addButtonFilled: false,
    addButtonColor: "#c5a880",
    addButtonRadius: 2,
  },
  nordic: {
    pageBackground: "#faf9f7",
    cardBackground: "#ffffff",
    cardBorderColor: "#e2e2df",
    cardBorderWidth: 0,
    cardBorderRadius: 2,
    photoShape: 2,
    photoBackground: "#faf9f7",
    categoryLabelColor: "#191c1d",
    categoryLabelUppercase: true,
    categoryLabelTracked: true,
    categoryUnderline: true,
    itemNameColor: "#191c1d",
    priceColor: "#191c1d",
    addButtonFilled: false,
    addButtonColor: "#191c1d",
    addButtonRadius: 2,
  },
  botanical: {
    pageBackground: "#f7f9f6",
    cardBackground: "#eff3ee",
    cardBorderColor: "#e6eae6",
    cardBorderWidth: 1,
    cardBorderRadius: 16,
    photoShape: 12,
    photoBackground: "#f7f9f6",
    categoryLabelColor: "#1e3a2b",
    categoryLabelUppercase: true,
    categoryLabelTracked: true,
    categoryUnderline: true,
    itemNameColor: "#212623",
    priceColor: "#1e3a2b",
    addButtonFilled: true,
    addButtonColor: "#1e3a2b",
    addButtonRadius: 8,
  },
};
