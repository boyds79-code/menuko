"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TableRow = {
  id: string;
  label: string;
  capacity: number;
  occupied_since: string | null;
  occupied_source: string | null;
  first_order_at: string | null;
};

const STALL_MINUTES = 10;

// "Where should the next customer go?" at a glance, plus the 10-minute
// no-order nudge — separate from CashierBoard (which is about settling
// orders that already exist) since this is about tables with none yet.
export function TableStatusBoard({
  restaurantId,
  initialTables,
}: {
  restaurantId: string;
  initialTables: TableRow[];
}) {
  const [tables, setTables] = useState<TableRow[]>(initialTables);
  const [now, setNow] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const supabase = createClient();

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("tables")
      .select("id, label, capacity, occupied_since, occupied_source, first_order_at")
      .eq("restaurant_id", restaurantId)
      .order("label");
    setTables(data ?? []);
  }, [restaurantId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`table-status-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables", filter: `restaurant_id=eq.${restaurantId}` },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, supabase, refresh]);

  // Ticks the "waiting Xm" labels forward without needing a refetch.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  async function seat(tableId: string) {
    setBusyId(tableId);
    await supabase.rpc("mark_table_occupied", { p_table_id: tableId });
    setBusyId(null);
  }

  async function free(tableId: string) {
    setBusyId(tableId);
    await supabase.rpc("free_table", { p_table_id: tableId });
    setBusyId(null);
  }

  return (
    <section className="flex flex-col gap-2 border-b border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-muted">Tables</h2>
      <div className="flex flex-wrap gap-2">
        {tables.map((table) => {
          const waitingMinutes = table.occupied_since
            ? Math.floor((now - new Date(table.occupied_since).getTime()) / 60_000)
            : 0;
          const isFree = !table.occupied_since;
          const isOrdering = !!table.first_order_at;
          const isStalled = !isFree && !isOrdering && waitingMinutes >= STALL_MINUTES;
          const busy = busyId === table.id;

          return (
            <div
              key={table.id}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                isFree
                  ? "border-border bg-background text-muted"
                  : isStalled
                    ? "border-red-400 bg-red-50 text-red-700"
                    : isOrdering
                      ? "border-border bg-background text-foreground"
                      : "border-amber-300 bg-amber-50 text-amber-800"
              }`}
            >
              <span className="font-medium">{table.label}</span>
              <span className="text-muted">· {table.capacity} seats</span>
              {isFree ? (
                <>
                  <span>Free</span>
                  <button
                    onClick={() => seat(table.id)}
                    disabled={busy}
                    className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
                  >
                    Seat customer
                  </button>
                </>
              ) : (
                <>
                  <span title={table.occupied_source === "qr_scan" ? "Scanned QR" : "Seated manually"}>
                    {table.occupied_source === "qr_scan" ? "📷" : "✋"}
                  </span>
                  <span>{isOrdering ? "Ordering" : `Waiting ${waitingMinutes}m`}</span>
                  {isStalled && <span className="font-semibold">⚠ No order yet</span>}
                  <button
                    onClick={() => free(table.id)}
                    disabled={busy}
                    className="rounded-full border border-current px-2 py-0.5 text-[11px] font-medium transition hover:opacity-70 disabled:opacity-60"
                  >
                    Free table
                  </button>
                </>
              )}
            </div>
          );
        })}
        {tables.length === 0 && <p className="text-sm text-muted">No tables yet.</p>}
      </div>
    </section>
  );
}
