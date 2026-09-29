import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/ctx";
import { colors, fonts } from "@/theme";

// Shared top of every owner tab — restaurant name as a small eyebrow, the
// tab's name as a large display title, optional action on the right. Same
// idea as StaffHeader on the web (src/components/staff-header.tsx). Sign
// out only shows where the caller opts in (Store).
export function AdminHeader({
  title,
  showSignOut = false,
  right,
}: {
  title: string;
  showSignOut?: boolean;
  right?: ReactNode;
}) {
  const { account, signOut } = useSession();

  return (
    <View style={styles.header}>
      <View style={styles.titles}>
        <Text style={styles.eyebrow} numberOfLines={1}>
          {account?.restaurantName}
        </Text>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right}
      {showSignOut && (
        <TouchableOpacity
          onPress={() => signOut()}
          style={styles.iconButton}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// Small rounded "Live" status chip used next to the Floor title.
export function LiveBadge() {
  return (
    <View style={styles.live}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>Live</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: colors.bg,
  },
  titles: { flex: 1 },
  eyebrow: { fontSize: 13, fontWeight: "500", color: colors.muted },
  title: { fontSize: 30, fontFamily: fonts.display, color: colors.ink, letterSpacing: -0.6, marginTop: 2 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  live: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    marginBottom: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live },
  liveText: { fontSize: 12, fontWeight: "700", color: colors.accentText },
});
