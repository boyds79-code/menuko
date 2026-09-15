// COPY of ../../../src/lib/constants.ts (web app) — keep in sync manually.
//
// Free-tier limits from spec section 4.1 — exactly one owner, one kitchen,
// one cashier account per restaurant. Anything beyond this is a premium
// upsell prompt only; no billing logic exists yet (spec section 8).
export const FREE_TIER_ROLE_LIMITS = {
  owner: 1,
  kitchen: 1,
  cashier: 1,
} as const;

export const ORDER_STATUS_LABEL: Record<string, string> = {
  open: "Awaiting kitchen",
  sent_to_kitchen: "Sent to kitchen",
  preparing: "Preparing",
  served: "Served",
  paid: "Paid",
};
