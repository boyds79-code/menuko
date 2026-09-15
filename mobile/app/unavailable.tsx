import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSession } from "@/ctx";

// Reached when a signed-in user isn't a kitchen/cashier account — most
// commonly an owner account (the native app doesn't cover /admin yet, spec
// says keep using the mobile-responsive web admin), or an account row that
// couldn't be resolved.
export default function Unavailable() {
  const { account, signOut } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menuko</Text>
      {account?.role === "owner" ? (
        <Text style={styles.body}>
          Owner accounts aren&apos;t supported in this app yet. Please use the web admin page
          (/admin) in your browser for now.
        </Text>
      ) : (
        <Text style={styles.body}>We couldn&apos;t find a restaurant linked to this account.</Text>
      )}
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
