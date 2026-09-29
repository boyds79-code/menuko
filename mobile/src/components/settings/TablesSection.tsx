import { useCallback, useEffect, useState } from "react";
import { Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";

type Table = { id: string; label: string; capacity: number; qr_token: string };

const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_ORIGIN;

export function TablesSection() {
  const { account } = useSession();
  const restaurantId = account?.restaurantId;

  const [tables, setTables] = useState<Table[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newCapacity, setNewCapacity] = useState("4");
  const [shownQr, setShownQr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("tables")
      .select("id, label, capacity, qr_token")
      .eq("restaurant_id", restaurantId)
      .eq("is_virtual", false)
      .order("label");
    setTables(data ?? []);
  }, [restaurantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function addTable() {
    if (!newLabel.trim() || !restaurantId) return;
    const capacity = Number(newCapacity) || 4;
    await supabase.from("tables").insert({ restaurant_id: restaurantId, label: newLabel.trim(), capacity });
    setNewLabel("");
    load();
  }

  async function updateTable(id: string, patch: Partial<Table>) {
    await supabase
      .from("tables")
      .update({
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.capacity !== undefined ? { capacity: patch.capacity } : {}),
      })
      .eq("id", id);
    load();
  }

  async function deleteTable(id: string) {
    await supabase.from("tables").delete().eq("id", id);
    load();
  }

  return (
    <View style={styles.content}>
      <Text style={styles.hint}>
        Each table gets its own QR code. Print them plain or on a ready-made design to place on each table.
      </Text>
      {WEB_ORIGIN && restaurantId && (
        <TouchableOpacity style={styles.printButton} onPress={() => Linking.openURL(`${WEB_ORIGIN}/print/${restaurantId}/qr`)}>
          <Text style={styles.primaryButtonText}>Print QR codes — choose a design</Text>
        </TouchableOpacity>
      )}
      <View style={styles.addRow}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Table number / name</Text>
          <TextInput
            value={newLabel}
            onChangeText={setNewLabel}
            placeholder="e.g. Table 5"
            placeholderTextColor="#8a7c68"
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Seats (people)</Text>
          <TextInput
            value={newCapacity}
            onChangeText={setNewCapacity}
            keyboardType="number-pad"
            placeholder="4"
            placeholderTextColor="#8a7c68"
            style={[styles.input, { width: 96, textAlign: "center" }]}
          />
        </View>
        <TouchableOpacity style={[styles.primaryButton, styles.addButton]} onPress={addTable}>
          <Text style={styles.primaryButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {tables.map((table) => (
        <TableCard
          key={table.id}
          restaurantId={restaurantId ?? null}
          table={table}
          expanded={shownQr === table.id}
          onToggleQr={() => setShownQr(shownQr === table.id ? null : table.id)}
          onUpdate={(patch) => updateTable(table.id, patch)}
          onDelete={() => deleteTable(table.id)}
        />
      ))}
      {tables.length === 0 && <Text style={styles.empty}>No tables yet.</Text>}
    </View>
  );
}

function TableCard({
  restaurantId,
  table,
  expanded,
  onToggleQr,
  onUpdate,
  onDelete,
}: {
  restaurantId: string | null;
  table: Table;
  expanded: boolean;
  onToggleQr: () => void;
  onUpdate: (patch: Partial<Table>) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(table.label);
  const [capacity, setCapacity] = useState(String(table.capacity));
  const orderUrl = WEB_ORIGIN ? `${WEB_ORIGIN}/order/${table.qr_token}` : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Table number / name</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            onBlur={() => label !== table.label && onUpdate({ label })}
            style={[styles.input, { fontWeight: "700" }]}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Seats (people)</Text>
          <TextInput
            value={capacity}
            onChangeText={setCapacity}
            onBlur={() => {
              const parsed = Number(capacity);
              if (parsed > 0 && parsed !== table.capacity) onUpdate({ capacity: parsed });
            }}
            keyboardType="number-pad"
            style={[styles.input, { width: 96, textAlign: "center" }]}
          />
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={onToggleQr}>
          <Text style={styles.link}>{expanded ? "Hide QR" : "Show QR"}</Text>
        </TouchableOpacity>
        {WEB_ORIGIN && restaurantId && (
          <TouchableOpacity onPress={() => Linking.openURL(`${WEB_ORIGIN}/print/${restaurantId}/qr?table=${table.id}`)}>
            <Text style={styles.link}>Print with design</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onDelete}>
          <Text style={styles.link}>Delete</Text>
        </TouchableOpacity>
      </View>
      {expanded && (
        <View style={styles.qrBox}>
          {orderUrl ? (
            <>
              <QRCode value={orderUrl} size={160} />
              <Text style={styles.qrUrl}>{orderUrl}</Text>
            </>
          ) : (
            <Text style={styles.qrUrl}>
              Set EXPO_PUBLIC_WEB_ORIGIN to preview this table&apos;s QR code.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  hint: { fontSize: 12, color: "#8a7c68", lineHeight: 17 },
  addRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  field: { gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: "600", color: "#8a7c68" },
  addButton: { paddingVertical: 10 },
  printButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingVertical: 11, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ece2d3",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  primaryButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingHorizontal: 16, justifyContent: "center" },
  primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  card: { backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#ece2d3", padding: 14, gap: 8 },
  cardRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  cardActions: { flexDirection: "row", gap: 16 },
  link: { fontSize: 12, color: "#8a7c68", textDecorationLine: "underline" },
  qrBox: { alignItems: "center", gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#ece2d3" },
  qrUrl: { fontSize: 10, color: "#8a7c68", textAlign: "center" },
  empty: { fontSize: 13, color: "#8a7c68" },
});
