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
    backgroundColor: "#E6EBE2",
    borderRadius: 999,
    padding: 4,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 11,
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
  segmentText: { fontSize: 13, fontWeight: "600", color: "#55645B" },
  segmentTextActive: { color: "#15261E", fontWeight: "700" },
  segmentLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  badge: {
    backgroundColor: "#DCEBE2",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: { fontSize: 9, fontWeight: "700", color: "#1F5C45" },
});
