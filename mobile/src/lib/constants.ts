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
  open: "접수 대기",
  sent_to_kitchen: "주방 전달됨",
  preparing: "조리 중",
  served: "서빙 완료",
  paid: "결제 완료",
};
