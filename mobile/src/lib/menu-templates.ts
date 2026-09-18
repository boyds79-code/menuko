// RN counterpart to the web app's src/lib/menu-templates.ts DIGITAL_TEMPLATE_STYLES
// — same 3 templates, same intent (Classic/Warm/Minimal tone), but as plain
// style objects since RN has no Tailwind classes. Kept deliberately
// lightweight (not a 1:1 port of every web class) — just enough for the
// Settings > Menu design swatch and the full-screen preview to actually
// look different per template, not pixel-identical to the real web menu.

export type MobileMenuTemplateId = "classic" | "warm" | "minimal";

export const MOBILE_MENU_TEMPLATES: { id: MobileMenuTemplateId; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "warm", label: "Warm" },
  { id: "minimal", label: "Minimal" },
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

export const MOBILE_TEMPLATE_STYLES: Record<MobileMenuTemplateId, MobileTemplateStyle> = {
  classic: {
    pageBackground: "#ffffff",
    cardBackground: "#ffffff",
    cardBorderColor: "#ece2d3",
    cardBorderWidth: 1,
    cardBorderRadius: 12,
    photoShape: 10,
    photoBackground: "#ffffff",
    categoryLabelColor: "#231f1a",
    categoryUnderline: true,
    itemNameColor: "#231f1a",
    priceColor: "#8a7c68",
    addButtonFilled: false,
    addButtonColor: "#ea7c1f",
    addButtonRadius: 999,
  },
  warm: {
    pageBackground: "#fff3e6",
    cardBackground: "#ffffff",
    cardBorderColor: "#ffe4c2",
    cardBorderWidth: 0,
    cardBorderRadius: 20,
    photoShape: 999,
    photoBackground: "#fff3e6",
    categoryLabelColor: "#ea7c1f",
    categoryLabelBackground: "#ffe4c2",
    categoryLabelRadius: 999,
    itemNameColor: "#231f1a",
    priceColor: "#ea7c1f",
    addButtonFilled: true,
    addButtonColor: "#ea7c1f",
    addButtonRadius: 999,
  },
  minimal: {
    pageBackground: "#ffffff",
    cardBackground: "#ffffff",
    cardBorderColor: "#000000",
    cardBorderWidth: 0,
    cardBorderRadius: 0,
    photoShape: 0,
    photoBackground: "#f2f2f2",
    categoryLabelColor: "#000000",
    categoryLabelUppercase: true,
    categoryLabelTracked: true,
    categoryUnderline: true,
    itemNameColor: "#000000",
    priceColor: "rgba(0,0,0,0.6)",
    addButtonFilled: false,
    addButtonColor: "#000000",
    addButtonRadius: 0,
  },
};
