// Premium-only customer menu localization. Owner-entered content (item
// names/descriptions/etc.) is machine-translated per edit and cached in
// each row's own `translations` jsonb column (see
// supabase/migrations/0025_menu_translations.sql +
// supabase/functions/translate-content) — `tr()` below just reads that
// cache with an English fallback. Fixed UI chrome (button labels, etc.) is
// translated once, offline, into the static dictionary in
// menu-ui-translations.json (see scripts/translate-menu-ui-strings.mjs)
// rather than re-translated per request.
import uiTranslations from "./menu-ui-translations.json";
import type { Json } from "./database.types";

export type MenuLanguage = "en" | "ko" | "ja" | "zh" | "es" | "th" | "vi" | "ru" | "it" | "ar" | "pt";

export const MENU_LANGUAGES: { code: MenuLanguage; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "th", label: "Thai", native: "ไทย" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "pt", label: "Portuguese", native: "Português" },
];

export const RTL_LANGUAGES = new Set<MenuLanguage>(["ar"]);

// Reads a translated field for owner content, falling back to the English
// original whenever that language/field hasn't been translated yet (still
// pending, or the field was empty at translation time).
export function tr<T extends string | null | undefined>(
  translations: Json | null | undefined,
  lang: MenuLanguage,
  field: string,
  original: T,
): T {
  if (lang === "en") return original;
  const dict = translations as Record<string, Record<string, string>> | null | undefined;
  const value = dict?.[lang]?.[field];
  return (value ?? original) as T;
}

type UiStrings = typeof import("./menu-ui-translations.json")["en"];

// Fixed UI chrome text — falls back to English for any key missing from a
// language's dictionary (e.g. a string added after the last translation
// run).
export function ui(lang: MenuLanguage, key: keyof UiStrings): string {
  const dict = (uiTranslations as Record<string, Partial<UiStrings>>)[lang];
  return dict?.[key] ?? uiTranslations.en[key];
}
