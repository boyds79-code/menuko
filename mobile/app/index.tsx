import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "@/ctx";

// "/" just routes to the right destination — the real access control lives
// in _layout.tsx's Stack.Protected guards.
export default function Index() {
  const { session, account, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#ea7c1f" />
      </View>
    );
  }

  if (!session) return <Redirect href="/sign-in" />;
  if (account?.role === "kitchen") return <Redirect href="/kitchen" />;
  if (account?.role === "cashier") return <Redirect href="/cashier" />;
  return <Redirect href="/unavailable" />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fffaf3" },
});
