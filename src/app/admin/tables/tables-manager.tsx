"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { addTable, deleteTable, renameTable, updateTableCapacity } from "../tables-actions";

type Table = { id: string; label: string; qr_token: string; capacity: number };

export function TablesManager({ restaurantId, initialTables }: { restaurantId: string; initialTables: Table[] }) {
  const router = useRouter();
  const [newLabel, setNewLabel] = useState("");
  const [newCapacity, setNewCapacity] = useState("4");

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newLabel.trim()) return;
          addTable(newLabel, Number(newCapacity) || 4).then(() => router.refresh());
          setNewLabel("");
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-medium text-muted">
          Table number / name
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Table 5"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Seats (people)
          <input
            value={newCapacity}
            onChange={(e) => setNewCapacity(e.target.value)}
            inputMode="numeric"
            placeholder="4"
            className="w-24 rounded-lg border border-border bg-card px-2 py-2 text-center text-sm text-foreground outline-none focus:border-brand"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90"
        >
          Add table
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {initialTables.map((table) => (
          <TableCard
            key={table.id}
            restaurantId={restaurantId}
            table={table}
            onMutate={() => router.refresh()}
          />
        ))}
      </div>
    </div>
  );
}

function TableCard({ restaurantId, table, onMutate }: { restaurantId: string; table: Table; onMutate: () => void }) {
  const [label, setLabel] = useState(table.label);
  const [capacity, setCapacity] = useState(String(table.capacity));
  const [orderUrl] = useState(() =>
    typeof window === "undefined" ? "" : `${window.location.origin}/order/${table.qr_token}`,
  );
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!orderUrl) return;
    QRCode.toDataURL(orderUrl, { width: 320, margin: 1 }).then(setQrDataUrl);
  }, [orderUrl]);

  function download() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `menuko-${table.label}.png`;
    a.click();
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
      <label className="flex w-full flex-col gap-0.5 text-center text-[11px] text-muted">
        Table number / name
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => {
            if (label.trim() && label !== table.label) renameTable(table.id, label).then(onMutate);
          }}
          className="w-full rounded-lg border border-transparent bg-transparent px-1 text-center text-base font-semibold text-foreground outline-none focus:border-brand"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-muted">
        Seats (people)
        <input
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          onBlur={() => {
            const parsed = Number(capacity);
            if (parsed > 0 && parsed !== table.capacity) {
              updateTableCapacity(table.id, parsed).then(onMutate);
            }
          }}
          inputMode="numeric"
          className="w-12 rounded-lg border border-border bg-background px-1 py-0.5 text-center outline-none focus:border-brand"
        />
      </label>
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, not a remote image */}
      {qrDataUrl && <img src={qrDataUrl} alt={`${table.label} QR`} className="h-40 w-40" />}
      <p className="max-w-full truncate text-xs text-muted">{orderUrl}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <a
          href={`/print/${restaurantId}/qr?table=${table.id}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground transition hover:opacity-90"
        >
          Print with design
        </a>
        <button
          onClick={download}
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-brand hover:text-brand"
        >
          Download PNG
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete table "${table.label}"?`)) {
              deleteTable(table.id).then(onMutate);
            }
          }}
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-red-400 hover:text-red-500"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
