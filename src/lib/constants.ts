// Free-tier limits from spec section 4.1 — exactly one owner, one kitchen,
// one cashier account per restaurant. Anything beyond this is a premium
// upsell prompt only; no billing logic exists yet (spec section 8).
export const FREE_TIER_ROLE_LIMITS = {
  owner: 1,
  kitchen: 1,
  cashier: 1,
} as const;

// Every table QR (printed cards AND the PNG downloaded from Settings) points
// at the production site — never at whatever host the page happens to be
// open on (a Vercel preview URL or localhost would give a dead QR code).
// Being a constant also keeps server and client renders identical.
export const ORDER_ORIGIN = "https://menuko.net";

export const ORDER_STATUS_LABEL: Record<string, string> = {
  open: "Awaiting kitchen",
  sent_to_kitchen: "Sent to kitchen",
  preparing: "Preparing",
  served: "Served",
  paid: "Paid",
  cancelled: "Cancelled",
};
