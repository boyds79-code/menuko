// Owner uploads a photo or PDF of their existing paper menu; this extracts
// a structured draft (categories + items + prices) via Claude's vision
// input so the owner can review/edit it before anything is saved — this
// function only ever returns a draft, it never writes to menu_categories/
// menu_items itself (that insert happens client-side, through the normal
// owner-write RLS policies, only after the owner confirms the review).
//
// Standard JWT-verified function (not --no-verify-jwt) — called directly
// by the logged-in owner, not by a DB trigger.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ExtractedItem = { name: string; price: number | null; description: string | null };
type ExtractedCategory = { name: string; items: ExtractedItem[] };

const MAX_BASE64_LENGTH = 7_000_000; // ~5.2MB binary after base64 overhead

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Missing Authorization header", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return new Response("Invalid session", { status: 401 });

  const { data: account } = await supabase
    .from("accounts")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (!account || account.role !== "owner") {
    return new Response("Only the restaurant owner can import a menu", { status: 403 });
  }

  let payload: { fileBase64: string; mediaType: string };
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const { fileBase64, mediaType } = payload;
  if (!fileBase64 || !mediaType) {
    return new Response("Missing fileBase64 or mediaType", { status: 400 });
  }
  if (fileBase64.length > MAX_BASE64_LENGTH) {
    return new Response("File too large — please use a smaller photo or a shorter PDF.", { status: 413 });
  }
  const isPdf = mediaType === "application/pdf";
  const isImage = mediaType === "image/jpeg" || mediaType === "image/png";
  if (!isPdf && !isImage) {
    return new Response("Unsupported file type — use a JPEG, PNG, or PDF.", { status: 400 });
  }

  const contentBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileBase64 } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data: fileBase64 } };

  const prompt = `This is a photo or PDF of a restaurant's existing paper menu. Read it and extract every menu category, and every item within each category, as structured JSON.

Rules:
- Group items under the category headings shown on the menu (e.g. "Appetizers", "Mains", "Drinks"). If the menu has no explicit categories, group items into sensible categories yourself.
- For each item, extract its name and price. If a description is printed under the item name, include it; otherwise use null.
- Prices should be plain numbers (no currency symbol), in whatever currency is printed — if a price is genuinely unreadable, use null rather than guessing.
- Keep item names and descriptions as printed — don't translate or rewrite them.
- Skip section headers that aren't food/drink categories (e.g. "Welcome", restaurant name, address).
- Respond with ONLY a single JSON object, no markdown code fences, no commentary, in exactly this shape:
{"categories": [{"name": "Category Name", "items": [{"name": "Item Name", "price": 220, "description": null}]}]}`;

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [contentBlock, { type: "text", text: prompt }],
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("extract-menu: Anthropic API error", res.status, await res.text());
    return new Response("Couldn't read the menu — please try again.", { status: 502 });
  }

  const data = await res.json();
  // content[0] isn't reliably the text block for vision input — find it explicitly.
  const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === "text");
  const text = textBlock?.text ?? "";
  const cleaned = text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  let parsed: { categories: ExtractedCategory[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("extract-menu: failed to parse model output", text);
    return new Response("Couldn't read the menu — please try again with a clearer photo.", { status: 502 });
  }

  return new Response(JSON.stringify(parsed), {
    headers: { "content-type": "application/json" },
  });
});
