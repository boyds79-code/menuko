// Menuko is Cebu/Philippines-only for now, so "today" for sales reporting
// means the calendar day in Asia/Manila (UTC+8, no DST) — not the server's
// UTC day, which would roll over mid-afternoon in PH.
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export function startOfTodayManila(now: Date = new Date()): Date {
  const manilaShifted = new Date(now.getTime() + MANILA_OFFSET_MS);
  const y = manilaShifted.getUTCFullYear();
  const m = manilaShifted.getUTCMonth();
  const d = manilaShifted.getUTCDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0) - MANILA_OFFSET_MS);
}
