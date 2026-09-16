import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSession } from "@/ctx";

// Shared top bar for every /admin tab — restaurant name + sign out, same
// idea as StaffHeader on the web (src/components/staff-header.tsx).
export function AdminHeader({ title }: { title: string }) {
  const { account, signOut } = useSession();

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>Menuko</Text>
        <Text style={styles.subtitle}>
          {account?.restaurantName} · {title}
        </Text>
      </View>
      <TouchableOpacity onPress={() => signOut()}>
        <Text style={styles.signOut}>Sign out</Text>
      </TouchableOpacity>
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
  signOut: { fontSize: 13, color: "#8a7c68" },
});
