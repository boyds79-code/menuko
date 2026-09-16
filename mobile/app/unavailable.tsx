import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSession } from "@/ctx";

// Reached when a signed-in user's account role couldn't be resolved to
// kitchen/cashier/owner — e.g. the accounts row is missing or malformed.
// All three real roles now have a dedicated screen, so this is purely an
// error/edge-case fallback.
export default function Unavailable() {
  const { signOut } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menuko</Text>
      <Text style={styles.body}>We couldn&apos;t find a restaurant linked to this account.</Text>
      <TouchableOpacity style={styles.button} onPress={() => signOut()}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffaf3",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#ea7c1f" },
  body: { textAlign: "center", color: "#201a12", fontSize: 15, lineHeight: 22 },
  button: {
    borderWidth: 1,
    borderColor: "#ea7c1f",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  buttonText: { color: "#ea7c1f", fontWeight: "600" },
});
