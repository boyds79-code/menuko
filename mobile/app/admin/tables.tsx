import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { AdminHeader } from "@/components/AdminHeader";

type Table = { id: string; label: string; capacity: number; qr_token: string };

const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_ORIGIN;

export default function AdminTables() {
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminHeader title="Tables" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          To print a QR code for a table, open its order link on the web admin
          (/admin/tables) — this screen is for quick previews and managing tables on the go.
        </Text>
        <View style={styles.addRow}>
          <TextInput
            value={newLabel}
            onChangeText={setNewLabel}
            placeholder="Table name (e.g. Table 5)"
            placeholderTextColor="#8a7c68"
            style={[styles.input, { flex: 1 }]}
          />
          <TextInput
            value={newCapacity}
            onChangeText={setNewCapacity}
            keyboardType="number-pad"
            style={[styles.input, { width: 56 }]}
          />
          <TouchableOpacity style={styles.primaryButton} onPress={addTable}>
            <Text style={styles.primaryButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            expanded={shownQr === table.id}
            onToggleQr={() => setShownQr(shownQr === table.id ? null : table.id)}
            onUpdate={(patch) => updateTable(table.id, patch)}
            onDelete={() => deleteTable(table.id)}
          />
        ))}
        {tables.length === 0 && <Text style={styles.empty}>No tables yet.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function TableCard({
  table,
  expanded,
  onToggleQr,
  onUpdate,
  onDelete,
}: {
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
        <TextInput
          value={label}
          onChangeText={setLabel}
          onBlur={() => label !== table.label && onUpdate({ label })}
          style={[styles.input, { flex: 1, fontWeight: "700" }]}
        />
        <TextInput
          value={capacity}
          onChangeText={setCapacity}
          onBlur={() => {
            const parsed = Number(capacity);
            if (parsed > 0 && parsed !== table.capacity) onUpdate({ capacity: parsed });
          }}
          keyboardType="number-pad"
          style={[styles.input, { width: 56 }]}
        />
        <Text style={styles.seatsLabel}>seats</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={onToggleQr}>
          <Text style={styles.link}>{expanded ? "Hide QR" : "Show QR"}</Text>
        </TouchableOpacity>
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
  safe: { flex: 1, backgroundColor: "#fffaf3" },
  content: { padding: 16, gap: 12 },
  hint: { fontSize: 12, color: "#8a7c68", lineHeight: 17 },
  addRow: { flexDirection: "row", gap: 8 },
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
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  seatsLabel: { fontSize: 12, color: "#8a7c68" },
  cardActions: { flexDirection: "row", gap: 16 },
  link: { fontSize: 12, color: "#8a7c68", textDecorationLine: "underline" },
  qrBox: { alignItems: "center", gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#ece2d3" },
  qrUrl: { fontSize: 10, color: "#8a7c68", textAlign: "center" },
  empty: { fontSize: 13, color: "#8a7c68" },
});
