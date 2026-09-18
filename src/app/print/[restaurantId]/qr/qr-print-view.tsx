"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Table = { id: string; label: string; qr_token: string };

export function QrPrintView({
  restaurant,
  tables,
}: {
  restaurant: { id: string; name: string };
  tables: Table[];
}) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // window isn't available during SSR — this only ever runs once on
    // mount to read the real origin, not a re-render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-lg font-semibold">{restaurant.name} — Table QR Codes</h1>
          <p className="text-sm text-muted">
            One card per table. Cut along the borders and tape one to each table.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90"
        >
          Print / Save as PDF
        </button>
      </div>

      {tables.length === 0 ? (
        <p className="text-sm text-muted print:hidden">
          No tables yet — add one in Settings &gt; Tables first.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {tables.map((table) => (
            <QrCard key={table.id} restaurantName={restaurant.name} table={table} origin={origin} />
          ))}
        </div>
      )}

      <style>{`
        @page { margin: 12mm; }
        @media print {
          html, body { background: #fff; }
        }
      `}</style>
    </div>
  );
}

function QrCard({
  restaurantName,
  table,
  origin,
}: {
  restaurantName: string;
  table: Table;
  origin: string;
}) {
  const orderUrl = origin ? `${origin}/order/${table.qr_token}` : "";
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!orderUrl) return;
    QRCode.toDataURL(orderUrl, { width: 320, margin: 1 }).then(setQrDataUrl);
  }, [orderUrl]);

  return (
    <div className="flex break-inside-avoid flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center shadow-sm print:shadow-none">
      <p className="text-xs text-muted">{restaurantName}</p>
      <p className="font-semibold">{table.label}</p>
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data: URL, not a remote image
        <img src={qrDataUrl} alt={`${table.label} QR code`} width={320} height={320} className="h-36 w-36" />
      ) : (
        <div className="h-36 w-36 animate-pulse rounded bg-background" aria-hidden />
      )}
      <p className="text-[11px] text-muted">Scan to order</p>
    </div>
  );
}
