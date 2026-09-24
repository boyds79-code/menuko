import { useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";

type DraftItem = { name: string; price: string; description: string | null };
type DraftCategory = { name: string; items: DraftItem[] };

const MAX_PDF_BYTES = 8 * 1024 * 1024;

async function fileToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Same review-before-save flow as the web app's src/app/admin/menu-import.tsx
// (extract-menu edge function never writes to the menu itself — only this
// component's confirmImport does, after the owner has reviewed/edited the
// draft). Category matching is also the same: case-insensitive name match
// against the restaurant's existing categories, so re-importing (or
// importing a second page of the same paper menu) doesn't create
// duplicate categories.
export function MenuImportModal({
  restaurantId,
  onImported,
}: {
  restaurantId: string;
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftCategory[] | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    await handleFile(result.assets[0].uri, result.assets[0].mimeType ?? "application/octet-stream", result.assets[0].size ?? 0);
  }

  async function handleFile(uri: string, mimeType: string, size: number) {
    setLoading(true);
    setError(null);
    try {
      let base64: string;
      let sendMediaType: string;
      if (mimeType === "application/pdf") {
        if (size > MAX_PDF_BYTES) {
          setError("That PDF is too large — try a shorter file or a photo instead.");
          return;
        }
        base64 = await fileToBase64(uri);
        sendMediaType = "application/pdf";
      } else {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 2200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
        );
        base64 = await fileToBase64(manipulated.uri);
        sendMediaType = "image/jpeg";
      }

      const { data, error: fnError } = await supabase.functions.invoke("extract-menu", {
        body: { fileBase64: base64, mediaType: sendMediaType },
      });
      if (fnError || !data?.categories) {
        setError("Couldn't read that menu. Try a clearer photo or a different file.");
        return;
      }
      const categories = data.categories as {
        name: string;
        items: { name: string; price: number | null; description: string | null }[];
      }[];
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
      const { data: existing } = await supabase
        .from("menu_categories")
        .select("id, name")
        .eq("restaurant_id", restaurantId);
      const existingByName = new Map((existing ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]));
      let nextSortOrder = (existing ?? []).length;

      for (const category of draft) {
        if (!category.name.trim() || category.items.length === 0) continue;
        const key = category.name.trim().toLowerCase();
        let categoryId = existingByName.get(key);
        if (!categoryId) {
          const { data: inserted } = await supabase
            .from("menu_categories")
            .insert({ restaurant_id: restaurantId, name: category.name.trim(), sort_order: nextSortOrder })
            .select("id")
            .single();
          if (!inserted) continue;
          categoryId = inserted.id;
          existingByName.set(key, inserted.id);
          nextSortOrder += 1;
        }
        const rows = category.items
          .filter((item) => item.name.trim() && Number(item.price) >= 0)
          .map((item) => ({
            restaurant_id: restaurantId,
            category_id: categoryId,
            name: item.name.trim(),
            price: Number(item.price) || 0,
            description: item.description,
          }));
        if (rows.length > 0) await supabase.from("menu_items").insert(rows);
      }
      closeAll();
      onImported();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TouchableOpacity style={styles.openButton} onPress={() => setOpen(true)}>
        <Text style={styles.openButtonText}>Import menu from photo/PDF</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={closeAll}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{draft ? "Review imported menu" : "Import menu from photo/PDF"}</Text>
            <TouchableOpacity onPress={closeAll}>
              <Text style={styles.link}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {!draft && (
              <View style={{ gap: 12 }}>
                <Text style={styles.hint}>
                  Upload a photo or PDF of your existing paper menu — categories, items, and prices are
                  read automatically. You&apos;ll review everything before it&apos;s added.
                </Text>
                <TouchableOpacity style={styles.pickButton} onPress={pickFile} disabled={loading}>
                  {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.pickButtonText}>Choose photo or PDF</Text>}
                </TouchableOpacity>
                {error && <Text style={styles.error}>{error}</Text>}
              </View>
            )}

            {draft && (
              <View style={{ gap: 16 }}>
                <Text style={styles.hint}>
                  Check the names and prices below — fix anything that looks wrong, or remove items you
                  don&apos;t want to add.
                </Text>
                {draft.length === 0 && <Text style={styles.hint}>Nothing was found — try a clearer photo.</Text>}
                {draft.map((category, catIndex) => (
                  <View key={catIndex} style={styles.categoryBlock}>
                    <View style={styles.categoryHeader}>
                      <TextInput
                        value={category.name}
                        onChangeText={(v) => updateCategoryName(catIndex, v)}
                        style={styles.categoryInput}
                      />
                      <TouchableOpacity onPress={() => removeCategory(catIndex)}>
                        <Text style={styles.link}>Remove category</Text>
                      </TouchableOpacity>
                    </View>
                    {category.items.map((item, itemIndex) => (
                      <View key={itemIndex} style={styles.itemRow}>
                        <TextInput
                          value={item.name}
                          onChangeText={(v) => updateItem(catIndex, itemIndex, { name: v })}
                          style={[styles.input, { flex: 1 }]}
                        />
                        <TextInput
                          value={item.price}
                          onChangeText={(v) => updateItem(catIndex, itemIndex, { price: v })}
                          keyboardType="decimal-pad"
                          placeholder="Price"
                          placeholderTextColor="#8a7c68"
                          style={[styles.input, { width: 70 }]}
                        />
                        <TouchableOpacity onPress={() => removeItem(catIndex, itemIndex)}>
                          <Text style={styles.link}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {draft && draft.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.confirmButton} onPress={confirmImport} disabled={saving}>
                <Text style={styles.confirmButtonText}>
                  {saving ? "Adding…" : `Add ${draft.reduce((s, c) => s + c.items.length, 0)} items to menu`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  openButton: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ece2d3",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  openButtonText: { fontSize: 13, fontWeight: "600", color: "#8a7c68" },
  modal: { flex: 1, backgroundColor: "#fffaf3" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 56,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#ece2d3",
  },
  title: { fontSize: 15, fontWeight: "700" },
  link: { fontSize: 12, color: "#8a7c68", textDecorationLine: "underline" },
  content: { padding: 16, gap: 16 },
  hint: { fontSize: 12, color: "#8a7c68", lineHeight: 17 },
  pickButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  pickButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  error: { color: "#dc2626", fontSize: 12 },
  categoryBlock: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ece2d3",
    padding: 12,
    gap: 8,
  },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  categoryInput: { flex: 1, fontSize: 14, fontWeight: "700", paddingVertical: 2 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ece2d3",
    backgroundColor: "#fffaf3",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
  },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: "#ece2d3", backgroundColor: "#ffffff" },
  confirmButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  confirmButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
});
