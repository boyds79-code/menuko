import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { formatPeso } from "@/lib/money";

type ClosingSummary = {
  closing_date: string;
  table_count: number;
  dine_in_revenue: number;
  delivery_revenue: number;
  best_seller_name: string | null;
  is_premium: boolean;
};

// Available to both the cashier app and the owner's Floor tab (this
// component is only ever rendered from cashier.tsx, which both surfaces
// share) — either role can close the day. Today's delivery revenue is one
// manually entered total rather than requiring every GrabFood/foodpanda
// order to have been itemized through New delivery order during the day.
export function CloseDayCard() {
  const [open, setOpen] = useState(false);
  const [deliveryRevenue, setDeliveryRevenue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ClosingSummary | null>(null);

  async function closeDay() {
    const parsed = deliveryRevenue.trim() ? Number(deliveryRevenue) : 0;
    if (Number.isNaN(parsed) || parsed < 0) {
      setError("Enter a valid amount (or leave blank for ₱0).");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("close_business_day", { p_delivery_revenue: parsed });
    setSubmitting(false);
    if (rpcError || !data?.[0]) {
      setError("Couldn't close the day. Please try again.");
      return;
    }
    setSummary(data[0]);
  }

  function reset() {
    setOpen(false);
    setDeliveryRevenue("");
    setError(null);
    setSummary(null);
  }

  if (!open) {
    return (
      <TouchableOpacity style={styles.openButton} onPress={() => setOpen(true)}>
        <Text style={styles.openButtonText}>Close day</Text>
      </TouchableOpacity>
    );
  }

  if (summary) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Day closed</Text>
        {summary.is_premium ? (
          <View style={styles.reportRows}>
            <View style={styles.reportRow}>
              <Text style={styles.reportLabel}>Tables served</Text>
              <Text style={styles.reportValue}>{summary.table_count}</Text>
            </View>
            <View style={styles.reportRow}>
              <Text style={styles.reportLabel}>Dine-in revenue (incl. takeout)</Text>
              <Text style={styles.reportValue}>{formatPeso(summary.dine_in_revenue)}</Text>
            </View>
            <View style={styles.reportRow}>
              <Text style={styles.reportLabel}>Delivery revenue</Text>
              <Text style={styles.reportValue}>{formatPeso(summary.delivery_revenue)}</Text>
            </View>
            <View style={styles.reportRow}>
              <Text style={styles.reportLabel}>Best seller</Text>
              <Text style={styles.reportValue}>{summary.best_seller_name ?? "—"}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.hint}>
            Today&apos;s delivery revenue was recorded. Upgrade to Premium to see a same-day sales report
            here.
          </Text>
        )}
        <TouchableOpacity style={styles.doneButton} onPress={reset}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Close day</Text>
        <TouchableOpacity onPress={reset}>
          <Text style={styles.link}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Enter today&apos;s total delivery revenue (GrabFood, foodpanda, etc.) before closing. Dine-in and
        takeout are already recorded automatically.
      </Text>
      <TextInput
        value={deliveryRevenue}
        onChangeText={setDeliveryRevenue}
        placeholder="Today's delivery revenue (₱)"
        placeholderTextColor="#8a7c68"
        keyboardType="decimal-pad"
        style={styles.input}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.submitButton} onPress={closeDay} disabled={submitting}>
        <Text style={styles.submitButtonText}>{submitting ? "Closing…" : "Close day"}</Text>
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
  hint: { fontSize: 11, color: "#8a7c68", lineHeight: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#ece2d3",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  error: { color: "#dc2626", fontSize: 12 },
  submitButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  submitButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  reportRows: { gap: 8 },
  reportRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  reportLabel: { fontSize: 12, color: "#8a7c68", flex: 1 },
  reportValue: { fontSize: 13, fontWeight: "700" },
  doneButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  doneButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
});
