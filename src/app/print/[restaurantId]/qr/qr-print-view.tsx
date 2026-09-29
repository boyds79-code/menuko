"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QR_DESIGNS, getQrDesign } from "./qr-designs";

type Table = { id: string; label: string; qr_token: string };
type SheetSize = "small" | "large";

const SHEET_SIZES: { id: SheetSize; label: string; hint: string }[] = [
  { id: "small", label: "4 per page", hint: "A6 table cards — cut along the dashed lines" },
  { id: "large", label: "1 per page", hint: "Full A4 — for a stand or the counter" },
];

// Renders QR codes as SVG markup (crisp at any print size), keyed by
// `${dark}|${light}|${url}` so the picker thumbnails and the printed sheets
// can share one cache.
function useQrSvgs(requests: { url: string; dark: string; light: string }[]) {
  const [svgs, setSvgs] = useState<Record<string, string>>({});
  const keys = requests.map((r) => `${r.dark}|${r.light}|${r.url}`);
  const missing = keys.filter((k) => k && !svgs[k] && !k.endsWith("|"));
  const missingKey = [...new Set(missing)].join("\n");

  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    Promise.all(
      missingKey.split("\n").map(async (key) => {
        const [dark, light, ...rest] = key.split("|");
        const svg = await QRCode.toString(rest.join("|"), { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark, light } });
        return [key, svg] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setSvgs((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  return (url: string, dark: string, light: string) => (url ? (svgs[`${dark}|${light}|${url}`] ?? null) : null);
}

export function QrPrintView({
  restaurant,
  tables,
  initialTableId,
}: {
  restaurant: { id: string; name: string; logo_url: string | null };
  tables: Table[];
  initialTableId: string | null;
}) {
  const [origin, setOrigin] = useState("");
  const [designId, setDesignId] = useState("kraft");
  const [size, setSize] = useState<SheetSize>("small");
  const [tableId, setTableId] = useState<string>(initialTableId && tables.some((t) => t.id === initialTableId) ? initialTableId : "all");

  useEffect(() => {
    // window isn't available during SSR — this only ever runs once on
    // mount to read the real origin, not a re-render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const design = getQrDesign(designId);
  const selectedTables = tableId === "all" ? tables : tables.filter((t) => t.id === tableId);
  const orderUrl = (t: Table) => (origin ? `${origin}/order/${t.qr_token}` : "");
  const sampleTable = selectedTables[0] ?? tables[0] ?? null;

  const getSvg = useQrSvgs([
    ...(sampleTable ? QR_DESIGNS.map((d) => ({ url: orderUrl(sampleTable), ...d.qrColors })) : []),
    ...selectedTables.map((t) => ({ url: orderUrl(t), ...design.qrColors })),
  ]);

  const perPage = size === "small" ? 4 : 1;
  const pages: Table[][] = [];
  for (let i = 0; i < selectedTables.length; i += perPage) pages.push(selectedTables.slice(i, i + perPage));

  const cardProps = (t: Table, d = design) => ({
    restaurantName: restaurant.name,
    tableLabel: t.label,
    logoUrl: restaurant.logo_url,
    qrSvg: getSvg(orderUrl(t), d.qrColors.dark, d.qrColors.light),
  });

  return (
    <div className="flex min-h-full flex-col bg-neutral-100 print:bg-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 sm:p-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{restaurant.name} — Table QR Codes</h1>
            <p className="text-sm text-neutral-500">Pick a design, print, and place one on each table.</p>
          </div>
          <button
            onClick={() => window.print()}
            disabled={selectedTables.length === 0}
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            Print / Save as PDF
          </button>
        </div>

        {tables.length === 0 ? (
          <p className="text-sm text-neutral-500">No tables yet — add one in Settings &gt; Table Setting first.</p>
        ) : (
          <>
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">1. Design</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {QR_DESIGNS.map((d) => {
                  const active = d.id === design.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDesignId(d.id)}
                      className={`flex w-32 shrink-0 flex-col gap-1.5 rounded-xl border-2 bg-white p-2 text-left transition ${active ? "border-neutral-900" : "border-transparent hover:border-neutral-300"}`}
                    >
                      <div className="pointer-events-none overflow-hidden rounded-md shadow-sm ring-1 ring-black/5">
                        {sampleTable && <d.Card {...cardProps(sampleTable, d)} />}
                      </div>
                      <span className="text-xs font-semibold">{d.label}</span>
                      <span className="text-[11px] leading-snug text-neutral-500">{d.description}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="flex flex-wrap gap-6">
              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold">2. Size</h2>
                <div className="flex flex-wrap gap-2">
                  {SHEET_SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSize(s.id)}
                      title={s.hint}
                      className={`rounded-full border px-4 py-1.5 text-sm transition ${size === s.id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-900"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500">{SHEET_SIZES.find((s) => s.id === size)?.hint}</p>
              </section>

              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold">3. Tables</h2>
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-neutral-900"
                >
                  <option value="all">All tables ({tables.length})</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </section>
            </div>

            <p className="text-xs text-neutral-500">
              Tip: in the print dialog, set paper to A4, margins to &ldquo;None&rdquo;, and turn on &ldquo;Background graphics&rdquo; so the colors print.
            </p>
          </>
        )}
      </div>

      {/* Print sheets — exact A4 pages when printing, scaled to fit on screen. */}
      <div className="flex flex-col items-center gap-6 px-4 pb-10 print:block print:p-0">
        {pages.map((page, i) => (
          <div
            key={i}
            className="relative aspect-[210/297] w-full max-w-[210mm] overflow-hidden bg-white shadow-lg print:h-[297mm] print:w-[210mm] print:max-w-none print:break-after-page print:shadow-none"
          >
            {size === "large" ? (
              <div className="flex h-full items-center justify-center">
                <div className="w-[90.5%]">
                  <design.Card {...cardProps(page[0])} />
                </div>
              </div>
            ) : (
              <div className="grid h-full grid-cols-2 grid-rows-2">
                {page.map((t) => (
                  <div key={t.id} className="flex items-center justify-center outline-1 -outline-offset-[0.5px] outline-neutral-300 outline-dashed">
                    <div className="w-[90.5%]">
                      <design.Card {...cardProps(t)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { background: #fff; }
        }
      `}</style>
    </div>
  );
}
