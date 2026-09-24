import { Document, Page, View, Text, Svg, Line, Rect, Circle, Polyline, StyleSheet } from "@react-pdf/renderer";
import type { SalesReportData } from "./sales-report-data";
import { pct, HOURS } from "./sales-report-data";

// The base-14 Helvetica font react-pdf/PDFKit uses by default has no glyph
// for ₱ (U+20B1) — it silently falls back to an unrelated character (±)
// instead of erroring. "PHP 1,234" avoids the symbol entirely, matching
// the sample report's own convention (it uses "PHP", never ₱).
function phpAmount(amount: number): string {
  return `PHP ${Math.round(amount).toLocaleString("en-US")}`;
}

// react-pdf's <Text> DOES support `fontSize` when nested inside an <Svg>
// (see @react-pdf/layout's SVG text renderer, which reads it straight off
// props) — the shipped SVGTextProps type just doesn't declare it. One
// narrow, verified cast here instead of scattering `as` casts everywhere
// this positioned label pattern is used.
function SvgText(props: { x: number; y: number; fontSize: number; fill: string; children: React.ReactNode }) {
  const TextAny = Text as unknown as React.ComponentType<typeof props>;
  return <TextAny {...props} />;
}

const COLOR = {
  brand: "#2563eb",
  ink: "#111827",
  muted: "#6b7280",
  line: "#e5e7eb",
  up: "#16a34a",
  down: "#dc2626",
  barBlue: "#2563eb",
  barOrange: "#ea580c",
  bannerBg: "#fff7ed",
  bannerBorder: "#ea580c",
  cardBg: "#ffffff",
  cardBorder: "#e5e7eb",
  tableHeadBg: "#2563eb",
  tableStripe: "#f3f4f6",
};

const s = StyleSheet.create({
  page: { paddingTop: 92, paddingBottom: 56, paddingHorizontal: 40, fontSize: 10, color: COLOR.ink, fontFamily: "Helvetica" },
  headerFixed: { position: "absolute", top: 0, left: 0, right: 0, height: 72, paddingHorizontal: 40, paddingTop: 24, backgroundColor: "#fafafa" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandText: { fontSize: 13, fontWeight: 700, color: COLOR.brand },
  headerRight: { fontSize: 9, color: COLOR.muted },
  headerRule: { marginTop: 12, borderBottomWidth: 1, borderBottomColor: COLOR.line },
  footerFixed: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: COLOR.muted },
  h1: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  h2: { fontSize: 13, fontWeight: 700, marginTop: 18, marginBottom: 8 },
  subtle: { fontSize: 9, color: COLOR.muted },
  rule: { marginTop: 10, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: COLOR.line },
  statRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  statCard: { flex: 1, borderWidth: 1, borderColor: COLOR.cardBorder, borderRadius: 6, padding: 10, gap: 3 },
  statValue: { fontSize: 16, fontWeight: 700 },
  statDelta: { fontSize: 8, fontWeight: 700 },
  statLabel: { fontSize: 8, color: COLOR.muted },
  narrative: { fontSize: 10, lineHeight: 1.5, marginTop: 14 },
  table: { marginTop: 8, borderWidth: 1, borderColor: COLOR.line, borderRadius: 4, overflow: "hidden" },
  tableHeadRow: { flexDirection: "row", backgroundColor: COLOR.tableHeadBg },
  tableHeadCell: { flex: 1, padding: 6, fontSize: 9, fontWeight: 700, color: "#ffffff" },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: COLOR.line },
  tableRowStripe: { backgroundColor: COLOR.tableStripe },
  tableCell: { flex: 1, padding: 6, fontSize: 9 },
  banner: { flexDirection: "row", marginTop: 10, backgroundColor: COLOR.bannerBg, borderLeftWidth: 3, borderLeftColor: COLOR.bannerBorder, padding: 10, gap: 4 },
  bannerTitle: { fontSize: 10, fontWeight: 700 },
  bannerBody: { fontSize: 9, lineHeight: 1.4, color: "#374151" },
});

function Header() {
  return (
    <View style={s.headerFixed} fixed>
      <View style={s.headerRow}>
        <Text style={s.brandText}>Menuko</Text>
        <Text style={s.headerRight}>Premium Sales Report</Text>
      </View>
      <View style={s.headerRule} />
    </View>
  );
}

function Footer({ restaurant, monthLabel }: { restaurant: string; monthLabel: string }) {
  return (
    <View style={s.footerFixed} fixed>
      <Text>
        {restaurant} • {monthLabel} report
      </Text>
      <Text render={({ pageNumber }) => `Page ${pageNumber}`} />
    </View>
  );
}

function Delta({ value }: { value: number }) {
  if (!Number.isFinite(value)) return <Text style={[s.statDelta, { color: COLOR.muted }]}>—</Text>;
  const up = value >= 0;
  return (
    <Text style={[s.statDelta, { color: up ? COLOR.up : COLOR.down }]}>
      {up ? "+" : "-"} {Math.abs(value).toFixed(1)}%
    </Text>
  );
}

function StatCard({ value, label, delta }: { value: string; label: string; delta: number }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statValue}>{value}</Text>
      <Delta value={delta} />
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <View style={s.table}>
      <View style={s.tableHeadRow}>
        {headers.map((h, i) => (
          <Text key={i} style={s.tableHeadCell}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowStripe : {}]}>
          {row.map((cell, j) => (
            <Text key={j} style={s.tableCell}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Charts — hand-drawn with SVG primitives (react-pdf has no chart library of
// its own). Each takes a fixed pixel box and computes its own scale.
// ---------------------------------------------------------------------------

const CHART_W = 512;

function LineChart({ a, b, days }: { a: { day: number; revenue: number }[]; b: { day: number; revenue: number }[]; days: number }) {
  const h = 140;
  const max = Math.max(1, ...a.map((d) => d.revenue), ...b.map((d) => d.revenue));
  const x = (day: number) => (day / days) * (CHART_W - 20) + 10;
  const y = (v: number) => h - 20 - (v / max) * (h - 30);
  const toPoints = (series: { day: number; revenue: number }[]) => series.map((d) => `${x(d.day)},${y(d.revenue)}`).join(" ");
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 14, marginBottom: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 2, backgroundColor: COLOR.muted }} />
          <Text style={{ fontSize: 8, color: COLOR.muted }}>Previous month</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 2, backgroundColor: COLOR.barBlue }} />
          <Text style={{ fontSize: 8, color: COLOR.muted }}>This month</Text>
        </View>
      </View>
      <Svg width={CHART_W} height={h}>
        <Line x1={10} y1={h - 20} x2={CHART_W - 10} y2={h - 20} stroke={COLOR.line} strokeWidth={1} />
        {b.length > 1 && <Polyline points={toPoints(b)} fill="none" stroke={COLOR.muted} strokeWidth={1.5} />}
        {a.length > 1 && <Polyline points={toPoints(a)} fill="none" stroke={COLOR.barBlue} strokeWidth={2} />}
      </Svg>
    </View>
  );
}

function WeekTable({ weeks }: { weeks: SalesReportData["weeklyBuckets"] }) {
  const rows = weeks.map((w, i) => {
    const prev = i > 0 ? weeks[i - 1].revenue : 0;
    const delta = i === 0 ? "—" : Number.isFinite(pct(w.revenue, prev)) ? `${pct(w.revenue, prev) >= 0 ? "+" : "-"} ${Math.abs(pct(w.revenue, prev)).toFixed(1)}%` : "—";
    return [w.label, phpAmount(w.revenue), delta, String(w.orders)];
  });
  return <Table headers={["Week", "Revenue", "vs. previous week", "Orders"]} rows={rows} />;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Heatmap({ data }: { data: SalesReportData["heatmap"] }) {
  const cellW = 34;
  const cellH = 16;
  const labelW = 30;
  const max = Math.max(1, ...data.map((d) => d.count));
  const lookup = new Map(data.map((d) => [`${d.dayOfWeek}-${d.hourOfDay}`, d.count]));
  let peak = { dayOfWeek: 0, hourOfDay: HOURS[0], count: -1 };
  for (const d of data) if (d.count > peak.count) peak = d;

  return (
    <View>
      <Svg width={labelW + HOURS.length * cellW} height={7 * cellH + 16}>
        {DAY_LABELS.map((label, row) => (
          <SvgText key={label} x={0} y={row * cellH + cellH / 2 + 3} fontSize={7} fill={COLOR.muted}>
            {label}
          </SvgText>
        ))}
        {DAY_LABELS.map((_, row) =>
          HOURS.map((hour, col) => {
            const count = lookup.get(`${row}-${hour}`) ?? 0;
            const intensity = count / max;
            const isPeak = row === peak.dayOfWeek && hour === peak.hourOfDay;
            return (
              <Rect
                key={`${row}-${hour}`}
                x={labelW + col * cellW}
                y={row * cellH}
                width={cellW - 1}
                height={cellH - 1}
                fill={COLOR.brand}
                fillOpacity={Math.max(0.06, intensity)}
                stroke={isPeak ? COLOR.ink : undefined}
                strokeWidth={isPeak ? 1 : 0}
              />
            );
          }),
        )}
        {HOURS.map((hour, col) => (
          <SvgText key={hour} x={labelW + col * cellW + 2} y={7 * cellH + 12} fontSize={6.5} fill={COLOR.muted}>
            {hour}:00
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function PeakHoursBar({ data }: { data: SalesReportData["heatmap"] }) {
  const byHour = new Map<number, number>();
  for (const h of HOURS) byHour.set(h, 0);
  for (const d of data) byHour.set(d.hourOfDay, (byHour.get(d.hourOfDay) ?? 0) + d.count);
  const values = HOURS.map((h) => byHour.get(h) ?? 0);
  const max = Math.max(1, ...values);
  const barW = 34;
  const gap = 6;
  const h = 100;
  const peakIdx = values.indexOf(Math.max(...values));
  return (
    <Svg width={HOURS.length * (barW + gap)} height={h + 16}>
      {values.map((v, i) => {
        const barH = Math.max(2, (v / max) * (h - 10));
        return (
          <Rect
            key={i}
            x={i * (barW + gap)}
            y={h - barH}
            width={barW}
            height={barH}
            fill={i === peakIdx ? COLOR.barBlue : "#bfdbfe"}
          />
        );
      })}
      {HOURS.map((hour, i) => (
        <SvgText key={hour} x={i * (barW + gap)} y={h + 12} fontSize={6.5} fill={COLOR.muted}>
          {hour}:00
        </SvgText>
      ))}
    </Svg>
  );
}

function HBarChart({ items, color }: { items: { name: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const rowH = 20;
  const labelW = 110;
  const barMaxW = CHART_W - labelW - 40;
  return (
    <Svg width={CHART_W} height={items.length * rowH}>
      {items.map((item, i) => {
        const w = Math.max(2, (item.value / max) * barMaxW);
        const y = i * rowH;
        return (
          <G key={i}>
            <SvgText x={0} y={y + rowH / 2 + 3} fontSize={8} fill={COLOR.ink}>
              {item.name.length > 20 ? item.name.slice(0, 19) + "…" : item.name}
            </SvgText>
            <Rect x={labelW} y={y + 4} width={w} height={rowH - 10} fill={color} />
            <SvgText x={labelW + w + 4} y={y + rowH / 2 + 3} fontSize={8} fill={COLOR.muted}>
              {item.value}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// react-pdf's SVG <G> isn't top-level exported in this version — inline group via Fragment-like nesting isn't needed since Rect/Text can be siblings; kept for readability.
function G({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function CategoryShareBars({ items }: { items: SalesReportData["categoryRevenue"] }) {
  const rowH = 20;
  const labelW = 130;
  const barMaxW = CHART_W - labelW - 50;
  return (
    <Svg width={CHART_W} height={items.length * rowH}>
      {items.map((item, i) => {
        const w = Math.max(2, (item.share / 100) * barMaxW);
        const y = i * rowH;
        return (
          <G key={i}>
            <SvgText x={0} y={y + rowH / 2 + 3} fontSize={8} fill={COLOR.ink}>
              {item.name}
            </SvgText>
            <Rect x={labelW} y={y + 4} width={w} height={rowH - 10} fill={COLOR.barBlue} />
            <SvgText x={labelW + w + 4} y={y + rowH / 2 + 3} fontSize={8} fill={COLOR.muted}>
              {item.share.toFixed(0)}%
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function EngineeringScatter({ points }: { points: SalesReportData["menuEngineering"] }) {
  const w = CHART_W;
  const h = 220;
  const pad = 30;
  const maxX = Math.max(10, ...points.map((p) => p.quantity)) * 1.1;
  const maxY = Math.max(10, ...points.map((p) => p.marginPct)) * 1.15;
  const midX = maxX / 2;
  const midY = maxY / 2;
  const x = (v: number) => pad + (v / maxX) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / maxY) * (h - pad * 2);
  return (
    <Svg width={w} height={h}>
      <Line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={COLOR.line} strokeWidth={1} />
      <Line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={COLOR.line} strokeWidth={1} />
      <Line x1={x(midX)} y1={pad} x2={x(midX)} y2={h - pad} stroke={COLOR.line} strokeWidth={0.5} strokeDasharray="3,3" />
      <Line x1={pad} y1={y(midY)} x2={w - pad} y2={y(midY)} stroke={COLOR.line} strokeWidth={0.5} strokeDasharray="3,3" />
      <SvgText x={w - pad - 30} y={pad + 8} fontSize={7} fill={COLOR.up}>
        STARS
      </SvgText>
      <SvgText x={pad + 4} y={pad + 8} fontSize={7} fill="#c026d3">
        PUZZLES
      </SvgText>
      <SvgText x={pad + 4} y={h - pad - 4} fontSize={7} fill={COLOR.muted}>
        DOGS
      </SvgText>
      <SvgText x={w - pad - 55} y={h - pad - 4} fontSize={7} fill={COLOR.barOrange}>
        WORKHORSES
      </SvgText>
      {points.map((p, i) => {
        const isStar = p.quantity >= midX && p.marginPct >= midY;
        const isPuzzle = p.quantity < midX && p.marginPct >= midY;
        const isWorkhorse = p.quantity >= midX && p.marginPct < midY;
        const color = isStar ? COLOR.up : isPuzzle ? "#c026d3" : isWorkhorse ? COLOR.barOrange : COLOR.muted;
        return (
          <G key={i}>
            <Circle cx={x(p.quantity)} cy={y(p.marginPct)} r={3.5} fill={color} />
            <SvgText x={x(p.quantity) + 6} y={y(p.marginPct) + 3} fontSize={7} fill={COLOR.ink}>
              {p.name}
            </SvgText>
          </G>
        );
      })}
      <SvgText x={pad} y={h - 4} fontSize={7} fill={COLOR.muted}>
        {"Popularity (orders this month) >"}
      </SvgText>
    </Svg>
  );
}

function ChannelBars({ channels }: { channels: SalesReportData["channels"] }) {
  const barW = 70;
  const gap = 30;
  const h = 150;
  const max = Math.max(1, ...channels.map((c) => c.gross));
  return (
    <Svg width={channels.length * (barW + gap)} height={h + 16}>
      {channels.map((c, i) => {
        const barH = Math.max(2, (c.gross / max) * (h - 20));
        const cx = i * (barW + gap);
        return (
          <G key={i}>
            <SvgText x={cx} y={h - barH - 4} fontSize={7} fill={COLOR.ink}>
              {phpAmount(c.gross)}
            </SvgText>
            <Rect x={cx} y={h - barH} width={barW} height={barH} fill={i === 0 ? COLOR.barBlue : COLOR.barOrange} />
            <SvgText x={cx} y={h + 12} fontSize={7} fill={COLOR.muted}>
              {c.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Narrative copy — short, data-driven sentences (no LLM call; this report
// must render instantly and deterministically from the numbers themselves).
// ---------------------------------------------------------------------------

function summaryNarrative(d: SalesReportData): string {
  const revDelta = pct(d.summary.revenue, d.summary.prevRevenue);
  const trend = !Number.isFinite(revDelta) ? "This is your first month of recorded sales." : revDelta >= 0 ? `Revenue grew ${revDelta.toFixed(1)}% versus the previous month.` : `Revenue was down ${Math.abs(revDelta).toFixed(1)}% versus the previous month.`;
  const checkDelta = pct(d.summary.avgCheck, d.summary.prevAvgCheck);
  const checkNote = Number.isFinite(checkDelta) ? (checkDelta >= 0 ? `Average check size also rose ${checkDelta.toFixed(1)}%.` : `Average check size slipped ${Math.abs(checkDelta).toFixed(1)}%.`) : "";
  return `${trend} ${checkNote}`.trim();
}

export function SalesReportDocument({ data }: { data: SalesReportData }) {
  const monthLabel = new Date(data.period.year, data.period.month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Document title={`Menuko Sales Report — ${data.restaurant.name} — ${monthLabel}`}>
      {/* Page 1 — summary */}
      <Page size="LETTER" style={s.page}>
        <Header />
        <Text style={s.h1}>Monthly Sales Report</Text>
        <Text>{data.restaurant.name}</Text>
        <Text style={s.subtle}>
          Reporting period: {data.period.label} • Generated: {data.period.generatedLabel}
        </Text>
        <View style={s.rule} />
        <Text style={s.h2}>This month at a glance</Text>
        <View style={s.statRow}>
          <StatCard value={phpAmount(data.summary.revenue)} label="Total revenue" delta={pct(data.summary.revenue, data.summary.prevRevenue)} />
          <StatCard value={phpAmount(data.summary.avgCheck)} label="Average check (per order)" delta={pct(data.summary.avgCheck, data.summary.prevAvgCheck)} />
          <StatCard value={`${data.summary.tableTurnover.toFixed(1)} / day`} label={`Table turnover rate (${data.summary.tableCount} tables)`} delta={pct(data.summary.tableTurnover, data.summary.prevTableTurnover)} />
          <StatCard value={String(data.summary.orders)} label="Total orders" delta={pct(data.summary.orders, data.summary.prevOrders)} />
        </View>
        <Text style={s.narrative}>{summaryNarrative(data)}</Text>
        <Footer restaurant={data.restaurant.name} monthLabel={monthLabel} />
      </Page>

      {/* Page 2 — revenue trend */}
      <Page size="LETTER" style={s.page}>
        <Header />
        <Text style={s.h2}>Revenue trend</Text>
        <Text style={s.subtle}>Daily revenue this month, compared against last month.</Text>
        <View style={{ marginTop: 10 }}>
          <LineChart a={data.dailyThisMonth} b={data.dailyPrevMonth} days={data.period.daysInPeriod} />
        </View>
        <WeekTable weeks={data.weeklyBuckets} />
        <Footer restaurant={data.restaurant.name} monthLabel={monthLabel} />
      </Page>

      {/* Page 3 — day x hour heatmap */}
      <Page size="LETTER" style={s.page}>
        <Header />
        <Text style={s.h2}>When customers come: day × hour</Text>
        <Text style={s.subtle}>Relative dine-in order volume by day of week and hour. Darker cells mean busier.</Text>
        <View style={{ marginTop: 10 }}>
          <Heatmap data={data.heatmap} />
        </View>
        <Text style={s.h2}>Peak vs. quiet hours</Text>
        <PeakHoursBar data={data.heatmap} />
        <Footer restaurant={data.restaurant.name} monthLabel={monthLabel} />
      </Page>

      {/* Page 4 — menu performance */}
      <Page size="LETTER" style={s.page}>
        <Header />
        <Text style={s.h2}>Menu performance</Text>
        <Text style={s.subtle}>Best sellers (orders)</Text>
        {data.bestSellers.length > 0 ? (
          <HBarChart items={data.bestSellers.map((i) => ({ name: i.name, value: i.quantity }))} color={COLOR.barBlue} />
        ) : (
          <Text style={s.subtle}>No paid orders yet this month.</Text>
        )}
        <Text style={[s.subtle, { marginTop: 10 }]}>Slowest movers (orders)</Text>
        {data.slowestMovers.length > 0 && (
          <HBarChart items={data.slowestMovers.map((i) => ({ name: i.name, value: i.quantity }))} color={COLOR.barOrange} />
        )}

        <Text style={s.h2}>Revenue share by category</Text>
        {data.categoryRevenue.length > 0 ? <CategoryShareBars items={data.categoryRevenue} /> : <Text style={s.subtle}>No category data yet.</Text>}

        <Text style={s.h2}>Frequently ordered together</Text>
        {data.combos.length > 0 ? (
          <Table headers={["Combination", "Orders together"]} rows={data.combos.map((c) => [`${c.a} + ${c.b}`, String(c.count)])} />
        ) : (
          <Text style={s.subtle}>Not enough order history yet to find combos.</Text>
        )}
        <Footer restaurant={data.restaurant.name} monthLabel={monthLabel} />
      </Page>

      {/* Page 5 — menu engineering */}
      <Page size="LETTER" style={s.page}>
        <Header />
        <Text style={s.h2}>Menu profitability (menu engineering matrix)</Text>
        <Text style={[s.subtle, { lineHeight: 1.4 }]}>
          Each dish plotted by how often it&apos;s ordered (popularity) and its margin, for items with an
          ingredient cost entered. Stars are popular and profitable — protect them. Workhorses sell well but
          earn less per order. Puzzles are profitable but rarely ordered — feature them more. Dogs are
          neither — candidates to simplify off the menu.
        </Text>
        {data.menuEngineering.length > 0 ? (
          <View style={{ marginTop: 10 }}>
            <EngineeringScatter points={data.menuEngineering} />
          </View>
        ) : (
          <Text style={[s.subtle, { marginTop: 14 }]}>No items have an ingredient cost entered yet.</Text>
        )}
        {data.itemsWithCost < data.totalItems && (
          <View style={s.banner}>
            <View>
              <Text style={s.bannerTitle}>
                Complete this analysis: {data.itemsWithCost} of {data.totalItems} menu items have cost data
              </Text>
              <Text style={s.bannerBody}>
                This chart only includes items where you&apos;ve entered an ingredient cost. Add cost for the
                remaining {data.totalItems - data.itemsWithCost} items in Menu {">"} Item settings to see your
                full menu on this matrix.
              </Text>
            </View>
          </View>
        )}
        <Footer restaurant={data.restaurant.name} monthLabel={monthLabel} />
      </Page>

      {/* Page 6 — channel revenue */}
      <Page size="LETTER" style={s.page}>
        <Header />
        <Text style={s.h2}>Revenue by channel</Text>
        <Text style={s.subtle}>
          Dine-in revenue is recorded automatically. Delivery revenue is entered manually per order in the
          Floor app.
        </Text>
        {data.channels.length > 0 ? (
          <>
            <View style={{ marginTop: 10 }}>
              <ChannelBars channels={data.channels} />
            </View>
            <Table
              headers={["Channel", "Gross revenue", "Est. net"]}
              rows={data.channels.map((c) => [c.label, phpAmount(c.gross), c.net !== null ? phpAmount(c.net) : "—"])}
            />
          </>
        ) : (
          <Text style={[s.subtle, { marginTop: 14 }]}>No revenue recorded yet this month.</Text>
        )}
        {data.channels.some((c) => c.commissionEstimated) && (
          <View style={s.banner}>
            <View>
              <Text style={s.bannerTitle}>Some delivery revenue uses an estimated 26% platform commission</Text>
              <Text style={s.bannerBody}>
                Delivery-platform commissions vary by contract, typically 20–33%. Enter your actual GrabFood
                and foodpanda commission rate in Settings {">"} Delivery channels so this report can show your
                real net revenue instead of an industry-average estimate.
              </Text>
            </View>
          </View>
        )}
        <Footer restaurant={data.restaurant.name} monthLabel={monthLabel} />
      </Page>

      {/* Page 7 — data completeness */}
      <Page size="LETTER" style={s.page}>
        <Header />
        <Text style={s.h2}>Improve next month&apos;s report</Text>
        <Text style={s.subtle}>
          A few of this report&apos;s numbers are estimates because some data hasn&apos;t been entered yet.
          Complete these for a fully accurate report next month:
        </Text>
        <Table
          headers={["Item", "Status", "Where to fix it"]}
          rows={[
            ["Ingredient cost per menu item", `${data.itemsWithCost} / ${data.totalItems} items entered`, "Menu > Item settings"],
            [
              "GrabFood commission rate",
              data.restaurant.grabfoodCommissionPct !== null ? `${data.restaurant.grabfoodCommissionPct}% entered` : "Not entered (using 26% estimate)",
              "Settings > Delivery channels",
            ],
            [
              "foodpanda commission rate",
              data.restaurant.foodpandaCommissionPct !== null ? `${data.restaurant.foodpandaCommissionPct}% entered` : "Not entered (using 26% estimate)",
              "Settings > Delivery channels",
            ],
            ["Table count", `${data.summary.tableCount} tables confirmed`, "— up to date"],
          ]}
        />
        <Text style={[s.subtle, { marginTop: 16, lineHeight: 1.4 }]}>
          Menuko — QR ordering and sales insights for small restaurants and cafes.
        </Text>
        <Footer restaurant={data.restaurant.name} monthLabel={monthLabel} />
      </Page>
    </Document>
  );
}
