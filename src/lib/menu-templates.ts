// Shared design tokens for the customer-facing menu (order-client.tsx).
//
// The menu design is two independent axes:
//   - `MenuLayoutId` — the structural shape (header, category grouping, card
//     shape). Classic is the original shape (all 4 old templates folded into
//     one); Minimal List is a flatter, list-row shape modeled on a simple
//     printed-menu look.
//   - `MenuColorId` — a color identity with its own palette and type pairing
//     via a `[data-menu-theme="<id>"]` CSS scope in globals.css (see that
//     file). Any color can be paired with any layout.

export type MenuColorId = "terracotta" | "heritage" | "nordic" | "botanical";

export const MENU_COLORS: {
  id: MenuColorId;
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

export function isMenuColorId(value: string): value is MenuColorId {
  return MENU_COLORS.some((c) => c.id === value);
}

export type MenuLayoutId = "classic" | "minimal-list";

export const MENU_LAYOUTS: {
  id: MenuLayoutId;
  label: string;
  description: string;
}[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Rounded header, horizontally scrolling category rows, full-screen item detail — Menuko's original menu shape.",
  },
  {
    id: "minimal-list",
    label: "Minimal List",
    description: "Compact header, one promo banner, flat list-style item rows — closest to a printed menu.",
  },
];

export function isMenuLayoutId(value: string): value is MenuLayoutId {
  return MENU_LAYOUTS.some((l) => l.id === value);
}
