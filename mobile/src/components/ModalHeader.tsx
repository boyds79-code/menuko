import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";

// Top bar for full-screen modals (Customer view, Menu preview): a clear
// "Back" button on the left, title + subtitle, optional action on the right.
// Must be rendered inside a SafeAreaView under the modal's own
// SafeAreaProvider — a Modal isn't covered by the app's root provider, so
// without one the insets read as 0 and this bar slides under the status bar.
export function ModalHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.back}
        onPress={onBack}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={20} color={colors.ink} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 44,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 999,
    backgroundColor: colors.bg,
  },
  backText: { fontSize: 15, fontWeight: "700", color: colors.ink },
  titles: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 1 },
});
