// COPY of ../../../src/lib/money.ts (web app) — keep in sync manually.
const PESO_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function formatPeso(amount: number): string {
  return PESO_FORMATTER.format(amount);
}
