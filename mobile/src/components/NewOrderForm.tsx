import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { formatPeso } from "@/lib/money";
import type { OrderChannel } from "@/lib/database.types";

type Category = { id: string; name: string; sort_order: number };
type MenuItem = { id: string; category_id: string | null; name: string; price: number };

// Grab/foodpanda direct integration isn't realistic yet (see web app's
// new-order-form.tsx for the reasoning) — manual entry is the interim.
// Creates the order against a per-channel virtual table via
// create_manual_order, so it flows through the normal kitchen/cashier
// boards untouched.
export function NewOrderForm({ categories, items }: { categories: Category[]; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<OrderChannel>("manual_delivery_entry");
  const [platform, setPlatform] = useState<"grabfood" | "foodpanda" | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsById = new Map(items.map((i) => [i.id, i]));
  const lines = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, quantity]) => ({ item: itemsById.get(itemId)!, quantity }))
    .filter((l) => l.item);
  const total = lines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);

  function setQty(itemId: string, qty: number) {
    setCart((prev) => ({ ...prev, [itemId]: Math.max(0, qty) }));
  }

  function reset() {
    setCart({});
    setNote("");
    setPlatform(null);
    setOpen(false);
  }

  async function submit() {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("create_manual_order", {
      p_channel: channel,
      p_items: lines.map((l) => ({ menu_item_id: l.item.id, quantity: l.quantity })),
      ...(note.trim() ? { p_note: note.trim() } : {}),
      ...(channel === "manual_delivery_entry" && platform ? { p_delivery_platform: platform } : {}),
    });
    setSubmitting(false);
    if (rpcError) {
      setError("Couldn't create the order. Please try again.");
      return;
    }
    reset();
  }

  if (!open) {
    return (
      <TouchableOpacity style={styles.openButton} onPress={() => setOpen(true)}>
        <Text style={styles.openButtonText}>+ New delivery / takeout order</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>New order</Text>
        <TouchableOpacity onPress={reset}>
          <Text style={styles.link}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.channelRow}>
        <TouchableOpacity
          onPress={() => setChannel("manual_delivery_entry")}
          style={[styles.channelChip, channel === "manual_delivery_entry" && styles.channelChipActive]}
        >
          <Text style={styles.channelChipText}>Delivery</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setChannel("manual_pickup_entry");
            setPlatform(null);
          }}
          style={[styles.channelChip, channel === "manual_pickup_entry" && styles.channelChipActive]}
        >
          <Text style={styles.channelChipText}>Takeout</Text>
        </TouchableOpacity>
      </View>

      {channel === "manual_delivery_entry" && (
        <View style={styles.channelRow}>
          {(["grabfood", "foodpanda"] as const).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPlatform(platform === p ? null : p)}
              style={[styles.channelChip, platform === p && styles.channelChipActive]}
            >
              <Text style={styles.channelChipText}>{p === "grabfood" ? "GrabFood" : "foodpanda"}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.itemList}>
        {categories.map((category) => {
          const categoryItems = items.filter((i) => i.category_id === category.id);
          if (categoryItems.length === 0) return null;
          return (
            <View key={category.id} style={{ marginBottom: 8 }}>
              <Text style={styles.categoryLabel}>{category.name}</Text>
              {categoryItems.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    {item.name} <Text style={styles.itemPrice}>{formatPeso(item.price)}</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setQty(item.id, (cart[item.id] ?? 0) - 1)} style={styles.stepper}>
                    <Text>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qty}>{cart[item.id] ?? 0}</Text>
                  <TouchableOpacity onPress={() => setQty(item.id, (cart[item.id] ?? 0) + 1)} style={styles.stepper}>
                    <Text>+</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Note (e.g. customer name, Grab order #)"
        placeholderTextColor="#8a7c68"
        style={styles.input}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.submitButton} onPress={submit} disabled={submitting || lines.length === 0}>
        <Text style={styles.submitButtonText}>{submitting ? "Creating..." : "Create order"}</Text>
        <Text style={styles.submitButtonText}>{formatPeso(total)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  openButton: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ece2d3",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  openButtonText: { fontSize: 13, fontWeight: "600", color: "#8a7c68" },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ece2d3",
    padding: 14,
    gap: 10,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 14, fontWeight: "700" },
  link: { fontSize: 12, color: "#8a7c68", textDecorationLine: "underline" },
  channelRow: { flexDirection: "row", gap: 8 },
  channelChip: {
    borderWidth: 1,
    borderColor: "#ece2d3",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  channelChipActive: { borderColor: "#ea7c1f", backgroundColor: "#fff0e0" },
  channelChipText: { fontSize: 12 },
  itemList: { maxHeight: 220 },
  categoryLabel: { fontSize: 11, fontWeight: "700", color: "#8a7c68", marginBottom: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  itemName: { flex: 1, fontSize: 13 },
  itemPrice: { color: "#8a7c68" },
  stepper: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ece2d3",
    alignItems: "center",
    justifyContent: "center",
  },
  qty: { width: 18, textAlign: "center", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: "#ece2d3",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  error: { color: "#dc2626", fontSize: 12 },
  submitButton: {
    backgroundColor: "#ea7c1f",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  submitButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
});
