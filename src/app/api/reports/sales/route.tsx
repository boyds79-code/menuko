import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import type { Database } from "@/lib/database.types";
import { fetchSalesReportData } from "@/lib/reports/sales-report-data";
import { SalesReportDocument } from "@/lib/reports/sales-report-pdf";

// Node runtime (not edge) — @react-pdf/renderer needs Node APIs.
export const runtime = "nodejs";

// Called from the mobile app's My Page → Analytics screen ("Download
// report"), not from the web admin — so auth is a bearer Supabase access
// token (Authorization header), not the cookie-based session server.ts
// uses. A plain supabase-js client with that token attached makes every
// RPC call below carry the caller's identity, so the report_* RPCs'
// `my_role() = 'owner'` / `my_restaurant_id()` checks resolve correctly
// and stay the real access-control boundary — this route doesn't bypass
// RLS with a service-role key.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return new Response("Missing Authorization header", { status: 401 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response("Invalid or expired session", { status: 401 });
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("restaurant_id, role")
    .eq("id", userData.user.id)
    .single();
  if (!account || account.role !== "owner") {
    return new Response("Only the restaurant owner can download sales reports", { status: 403 });
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("plan")
    .eq("id", account.restaurant_id)
    .single();
  if (!restaurant || restaurant.plan !== "premium") {
    return new Response("Sales reports are a premium feature", { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const now = new Date();
  const year = Number(params.get("year")) || now.getFullYear();
  const month = Number(params.get("month")) || now.getMonth() + 1;
  if (!Number.isInteger(year) || year < 2020 || !Number.isInteger(month) || month < 1 || month > 12) {
    return new Response("Invalid year/month", { status: 400 });
  }

  const data = await fetchSalesReportData(supabase, account.restaurant_id, year, month);
  const buffer = await renderToBuffer(<SalesReportDocument data={data} />);

  const monthSlug = `${year}-${String(month).padStart(2, "0")}`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="menuko-sales-report-${monthSlug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
