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

  const isStaffRole = account?.role === "kitchen" || account?.role === "cashier";

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && !isStaffRole}>
        <Stack.Screen name="unavailable" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && account?.role === "kitchen"}>
        <Stack.Screen name="kitchen" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && account?.role === "cashier"}>
        <Stack.Screen name="cashier" />
      </Stack.Protected>

      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fffaf3" },
});
