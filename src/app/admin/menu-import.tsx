"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { importMenu } from "./menu-actions";

type DraftItem = { name: string; price: string; description: string | null };
type DraftCategory = { name: string; items: DraftItem[] };

const MAX_PDF_BYTES = 8 * 1024 * 1024;

function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function MenuImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftCategory[] | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      let base64: string;
      let mediaType: string;
      if (file.type === "application/pdf") {
        if (file.size > MAX_PDF_BYTES) {
          setError("That PDF is too large — try a shorter file or a photo instead.");
          return;
        }
        base64 = await fileToBase64(file);
        mediaType = "application/pdf";
      } else {
        const compressed = await imageCompression(file, {
          maxSizeMB: 3,
          maxWidthOrHeight: 2200,
          useWebWorker: true,
          fileType: "image/jpeg",
        });
        base64 = await fileToBase64(compressed);
        mediaType = "image/jpeg";
      }

      const supabase = createClient();
      const { data, error: fnError } = await supabase.functions.invoke("extract-menu", {
        body: { fileBase64: base64, mediaType },
      });
      if (fnError || !data?.categories) {
        setError("Couldn't read that menu. Try a clearer photo or a different file.");
        return;
      }
      const categories = data.categories as { name: string; items: { name: string; price: number | null; description: string | null }[] }[];
      setDraft(
        categories.map((c) => ({
          name: c.name,
          items: c.items.map((i) => ({ name: i.name, price: i.price?.toString() ?? "", description: i.description })),
        })),
      );
    } finally {
      setLoading(false);
    }
  }

  function updateItem(catIndex: number, itemIndex: number, patch: Partial<DraftItem>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const items = [...next[catIndex].items];
      items[itemIndex] = { ...items[itemIndex], ...patch };
      next[catIndex] = { ...next[catIndex], items };
      return next;
    });
  }

  function removeItem(catIndex: number, itemIndex: number) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[catIndex] = { ...next[catIndex], items: next[catIndex].items.filter((_, i) => i !== itemIndex) };
      return next;
    });
  }

  function updateCategoryName(catIndex: number, name: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[catIndex] = { ...next[catIndex], name };
      return next;
    });
  }

  function removeCategory(catIndex: number) {
    setDraft((prev) => (prev ? prev.filter((_, i) => i !== catIndex) : prev));
  }

  function closeAll() {
    setOpen(false);
    setDraft(null);
    setError(null);
  }

  async function confirmImport() {
    if (!draft) return;
    setSaving(true);
    try {
      await importMenu(
        draft.map((c) => ({
          name: c.name,
          items: c.items
            .filter((i) => i.name.trim())
            .map((i) => ({ name: i.name, price: Number(i.price) || 0, description: i.description })),
        })),
      );
      closeAll();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-brand hover:text-brand"
      >
        Import menu from photo/PDF
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4" onClick={draft ? undefined : closeAll}>
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold">
                {draft ? "Review imported menu" : "Import menu from photo/PDF"}
              </h2>
              <button onClick={closeAll} className="text-sm text-muted underline">
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {!draft && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted">
                    Upload a photo or PDF of your existing paper menu — categories, items, and prices are
                    read automatically. You&apos;ll review everything before it&apos;s added.
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    disabled={loading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                      e.target.value = "";
                    }}
                    className="text-sm"
                  />
                  {loading && <p className="text-sm text-muted">Reading your menu…</p>}
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
              )}

              {draft && (
                <div className="flex flex-col gap-5">
                  <p className="text-xs text-muted">
                    Check the names and prices below — fix anything that looks wrong, or remove items you
                    don&apos;t want to add.
                  </p>
                  {draft.length === 0 && (
                    <p className="text-sm text-muted">Nothing was found — try a clearer photo.</p>
                  )}
                  {draft.map((category, catIndex) => (
                    <div key={catIndex} className="flex flex-col gap-2 rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          value={category.name}
                          onChange={(e) => updateCategoryName(catIndex, e.target.value)}
                          className="flex-1 rounded-lg border border-transparent bg-transparent px-1 text-sm font-semibold outline-none focus:border-brand"
                        />
                        <button onClick={() => removeCategory(catIndex)} className="text-xs text-muted underline">
                          Remove category
                        </button>
                      </div>
                      {category.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center gap-2">
                          <input
                            value={item.name}
                            onChange={(e) => updateItem(catIndex, itemIndex, { name: e.target.value })}
                            className="min-w-24 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
                          />
                          <input
                            value={item.price}
                            onChange={(e) => updateItem(catIndex, itemIndex, { price: e.target.value })}
                            inputMode="decimal"
                            placeholder="Price"
                            className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
                          />
                          <button
                            onClick={() => removeItem(catIndex, itemIndex)}
                            className="text-xs text-muted underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {draft && draft.length > 0 && (
              <div className="border-t border-border p-4">
                <button
                  onClick={confirmImport}
                  disabled={saving}
                  className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving
                    ? "Adding…"
                    : `Add ${draft.reduce((s, c) => s + c.items.length, 0)} items to menu`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
