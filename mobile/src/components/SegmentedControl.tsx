import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Pill-track section switcher — one screen, tap a segment to swap the
// content below it in place (no push navigation, no back button).
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; badge?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(opt.key)}
          >
            <View style={styles.segmentLabelRow}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
              {opt.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{opt.badge}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: "#efe6d8",
    borderRadius: 999,
    padding: 4,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: { fontSize: 12, fontWeight: "600", color: "#8a7c68" },
  segmentTextActive: { color: "#231f1a", fontWeight: "700" },
  segmentLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  badge: {
    backgroundColor: "#fff0e0",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: { fontSize: 9, fontWeight: "700", color: "#ea7c1f" },
});
