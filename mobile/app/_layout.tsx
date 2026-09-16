import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "@/ctx";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, account, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#ea7c1f" />
      </View>
    );
  }

  const isKnownRole =
    account?.role === "kitchen" || account?.role === "cashier" || account?.role === "owner";

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && !isKnownRole}>
        <Stack.Screen name="unavailable" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && account?.role === "kitchen"}>
        <Stack.Screen name="kitchen" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && account?.role === "cashier"}>
        <Stack.Screen name="cashier" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && account?.role === "owner"}>
        <Stack.Screen name="admin" />
      </Stack.Protected>

      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fffaf3" },
});
