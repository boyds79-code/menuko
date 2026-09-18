import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/ctx";

// Shared top bar for every /admin tab — restaurant name, same idea as
// StaffHeader on the web (src/components/staff-header.tsx). Sign out only
// shows where the caller opts in (My Page) — everywhere else the header is
// just identity, not an action bar.
export function AdminHeader({ title, showSignOut = false }: { title: string; showSignOut?: boolean }) {
  const { account, signOut } = useSession();

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>Menuko</Text>
        <Text style={styles.subtitle}>
          {account?.restaurantName} · {title}
        </Text>
      </View>
      {showSignOut && (
        <TouchableOpacity onPress={() => signOut()} style={styles.signOutButton} hitSlop={8}>
          <Ionicons name="log-out-outline" size={18} color="#8a7c68" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#ece2d3",
  },
  brand: { fontWeight: "700", color: "#ea7c1f" },
  subtitle: { fontSize: 12, color: "#8a7c68" },
  signOutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
});
