// RN counterpart to the web app's src/lib/menu-templates.ts — same two
// independent axes:
//   - `MobileMenuLayoutId` — the structural shape (Classic's rounded cards
//     vs. Minimal List's flat list rows). Fixed per layout, not per color.
//   - `MobileMenuColorId` — a color identity (Terracotta/Heritage/Nordic/
//     Botanical), just palette tokens now that shape lives on the layout.
// Kept deliberately lightweight (not a 1:1 port of every web class) — just
// enough for the Settings > Menu design picker and the full-screen preview
// to actually look different, not pixel-identical to the real web menu.

export type MobileMenuColorId = "terracotta" | "heritage" | "nordic" | "botanical";

export const MOBILE_MENU_COLORS: { id: MobileMenuColorId; label: string }[] = [
  { id: "terracotta", label: "Terracotta Bistro" },
  { id: "heritage", label: "Heritage Dining" },
  { id: "nordic", label: "Nordic Minimal" },
  { id: "botanical", label: "Botanical Linen" },
];

export type MobileMenuLayoutId = "classic" | "minimal-list";

export const MOBILE_MENU_LAYOUTS: { id: MobileMenuLayoutId; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "minimal-list", label: "Minimal List" },
];

export type MobileColorPalette = {
  pageBackground: string;
  cardBackground: string;
  cardBorderColor: string;
  // categoryLabelColor / priceColor / addButtonColor were always the same
  // hue in the old per-template styles — one accent color per identity.
  brand: string;
  foreground: string;
};

// Colors here are kept in sync with the [data-menu-theme] blocks in
// src/app/globals.css (web) and src/lib/menu-templates.ts's MENU_COLORS —
// both trace back to the same Stitch interactive-prototype exports, so a
// color change on one side should always be mirrored on the other.
export const MOBILE_COLOR_PALETTES: Record<MobileMenuColorId, MobileColorPalette> = {
  terracotta: {
    pageBackground: "#fff8f5",
    cardBackground: "#fff1ea",
    cardBorderColor: "#e9d6cd",
    brand: "#e0623a",
    foreground: "#2b1b17",
  },
  heritage: {
    pageBackground: "#faf6ef",
    cardBackground: "#fdfbf7",
    cardBorderColor: "#dfcebb",
    brand: "#c5a880",
    foreground: "#2c251e",
  },
  nordic: {
    pageBackground: "#faf9f7",
    cardBackground: "#ffffff",
    cardBorderColor: "#e2e2df",
    brand: "#191c1d",
    foreground: "#191c1d",
  },
  botanical: {
    pageBackground: "#f7f9f6",
    cardBackground: "#eff3ee",
    cardBorderColor: "#e6eae6",
    brand: "#1e3a2b",
    foreground: "#212623",
  },
};
