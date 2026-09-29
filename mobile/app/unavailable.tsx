import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/ctx";
import { colors, fonts } from "@/theme";

// Reached when a signed-in user's account role couldn't be resolved to
// kitchen/cashier/owner — e.g. the accounts row is missing or malformed.
// All three real roles now have a dedicated screen, so this is purely an
// error/edge-case fallback.
export default function Unavailable() {
  const { signOut } = useSession();

  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons name="storefront-outline" size={28} color={colors.accentText} />
      </View>
      <Text style={styles.title}>No restaurant found</Text>
      <Text style={styles.body}>We couldn&apos;t find a restaurant linked to this account.</Text>
      <TouchableOpacity style={styles.button} onPress={() => signOut()} accessibilityRole="button">
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 26, fontFamily: fonts.display, color: colors.ink },
  body: { textAlign: "center", color: colors.muted, fontSize: 15, lineHeight: 22 },
  button: {
    minHeight: 48,
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: colors.accent,
    paddingHorizontal: 28,
    marginTop: 12,
  },
  buttonText: { color: colors.onAccent, fontWeight: "700", fontSize: 15 },
});
