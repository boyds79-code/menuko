// "Market Green" design tokens for the staff/owner app (chosen 2026-09 in
// the redesign canvas). Existing screens still carry these as literal hex
// values in their StyleSheets — they were swapped 1:1 from the old orange
// palette — so when changing a color here, grep for the old hex too.
// Customer-menu colors are NOT here: those live per-template in
// src/lib/menu-templates.ts and must stay independent of the app chrome.
export const colors = {
  bg: "#F2F4EE",
  surface: "#FFFFFF",
  surfaceAlt: "#F7F9F4",
  ink: "#15261E",
  inkSoft: "#3E4D44",
  muted: "#55645B",
  faint: "#8A968E",
  line: "#E0E6DC",
  track: "#E6EBE2",
  accent: "#1F5C45",
  onAccent: "#FFFFFF",
  accentSoft: "#DCEBE2",
  accentText: "#184B38",
  saffron: "#EAA93B",
  saffronSoft: "#FDF3DF",
  live: "#1F9D63",
  heroMuted: "#CBE2D5",
  danger: "#B42318",
} as const;

// Loaded in app/_layout.tsx via expo-font. Display face for titles and big
// numbers only; body text stays on the platform font (a custom body face
// was tried and dropped — its word spacing read as cramped).
export const fonts = {
  display: "BricolageGrotesque_700Bold",
  displayHeavy: "BricolageGrotesque_800ExtraBold",
} as const;

export const radius = { card: 22, pill: 999, control: 14 } as const;

// Floating tab bar geometry — screens pad their scroll content by
// TAB_BAR_SPACE so the last card isn't hidden behind the bar.
export const TAB_BAR_HEIGHT = 68;
export const TAB_BAR_SPACE = TAB_BAR_HEIGHT + 48;
