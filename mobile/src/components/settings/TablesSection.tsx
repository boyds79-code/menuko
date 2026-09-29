import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { form } from "@/components/form-styles";
import { colors } from "@/theme";

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
          <Ionicons name="print-outline" size={18} color={colors.onAccent} />
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
            placeholderTextColor={colors.faint}
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
            placeholderTextColor={colors.faint}
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
        <TouchableOpacity style={styles.actionChip} onPress={onToggleQr}>
          <Ionicons name="qr-code-outline" size={16} color={colors.ink} />
          <Text style={styles.actionChipText}>{expanded ? "Hide QR" : "Show QR"}</Text>
        </TouchableOpacity>
        {WEB_ORIGIN && restaurantId && (
          <TouchableOpacity
            style={styles.actionChip}
            onPress={() => Linking.openURL(`${WEB_ORIGIN}/print/${restaurantId}/qr?table=${table.id}`)}
          >
            <Ionicons name="print-outline" size={16} color={colors.ink} />
            <Text style={styles.actionChipText}>Print</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={form.iconButton}
          onPress={() =>
            Alert.alert(`Delete ${table.label}?`, "Its QR code will stop working.", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: onDelete },
            ])
          }
          accessibilityRole="button"
          accessibilityLabel={`Delete ${table.label}`}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
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
  hint: form.hint,
  addRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.muted },
  addButton: { paddingHorizontal: 18 },
  printButton: { ...form.primaryButton, flexDirection: "row", gap: 8 },
  input: form.input,
  primaryButton: form.primaryButton,
  primaryButtonText: form.primaryButtonText,
  card: { backgroundColor: colors.surfaceAlt, borderRadius: 18, padding: 14, gap: 12 },
  cardRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionChip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  actionChipText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  qrBox: {
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  qrUrl: { fontSize: 11, color: colors.muted, textAlign: "center" },
  empty: { fontSize: 13, color: colors.muted },
});
