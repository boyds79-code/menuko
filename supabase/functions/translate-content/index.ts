// Fired by a Postgres trigger whenever a premium restaurant's menu content
// changes (see supabase/migrations/0025_menu_translations.sql) — translates
// the row's owner-entered text into the 10 supported customer-menu
// languages via the Claude API, then writes the result into that row's own
// `translations` jsonb column. Free-tier restaurants never reach this
// function at all (the trigger only fires for plan = 'premium').
//
// Deployed with --no-verify-jwt (server-to-server DB trigger, not a
// user-facing endpoint) — same tradeoff as notify-order-event.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LANGUAGES: Record<string, string> = {
  ko: "Korean",
  ja: "Japanese",
  zh: "Chinese (Simplified)",
  es: "Spanish",
  th: "Thai",
  vi: "Vietnamese",
  ru: "Russian",
  it: "Italian",
  ar: "Arabic",
  pt: "Portuguese",
};

type MenuItemRecord = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  allergy_info: string | null;
};
type MenuCategoryRecord = { id: string; restaurant_id: string; name: string };
type RestaurantRecord = { id: string; about: string | null };

type Payload =
  | { table: "menu_items"; record: MenuItemRecord }
  | { table: "menu_categories"; record: MenuCategoryRecord }
  | { table: "restaurants"; record: RestaurantRecord };

function fieldsToTranslate(payload: Payload): Record<string, string> {
  if (payload.table === "menu_items") {
    const { name, description, ingredients, allergy_info } = payload.record;
    const fields: Record<string, string> = { name };
    if (description) fields.description = description;
    if (ingredients) fields.ingredients = ingredients;
    if (allergy_info) fields.allergy_info = allergy_info;
    return fields;
  }
  if (payload.table === "menu_categories") {
    return { name: payload.record.name };
  }
  return payload.record.about ? { about: payload.record.about } : {};
}

async function translateFields(fields: Record<string, string>): Promise<Record<string, Record<string, string>>> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
  const languageList = Object.entries(LANGUAGES)
    .map(([code, name]) => `"${code}" (${name})`)
    .join(", ");

  const prompt = `Translate this restaurant menu content (JSON object, English source) into each of these languages: ${languageList}.

Source:
${JSON.stringify(fields, null, 2)}

Rules:
- For native/regional dish names, keep the original name recognizable — prefer transliteration or keeping the original term, with a short natural translation, over a stiff literal word-for-word translation. Match how real restaurant menus handle this internationally.
- Keep the same tone and length as the source — this is menu copy, not a document.
- Translate every field for every language; do not skip or omit a field.
- Respond with ONLY a single JSON object, no markdown code fences, no commentary. Top-level keys are the language codes (${Object.keys(LANGUAGES).join(", ")}). Each value is an object with exactly the same keys as the source (${Object.keys(fields).join(", ")}), holding that field's translation.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  const cleaned = text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(cleaned);
}

Deno.serve(async (req) => {
  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const fields = fieldsToTranslate(payload);
  if (Object.keys(fields).length === 0) {
    return new Response("nothing to translate", { status: 200 });
  }

  let translations: Record<string, Record<string, string>>;
  try {
    translations = await translateFields(fields);
  } catch (err) {
    console.error("translate-content failed", err);
    return new Response("translation failed", { status: 502 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  await supabase.from(payload.table).update({ translations }).eq("id", payload.record.id);

  return new Response("ok", { status: 200 });
});
