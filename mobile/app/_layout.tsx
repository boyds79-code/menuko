import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque";
import { SessionProvider, useSession } from "@/ctx";
import { UpdateBanner } from "@/components/UpdateBanner";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
      <UpdateBanner />
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, account, isLoading } = useSession();
  // Fonts ship as assets, so they arrive with an EAS Update (no store build
  // needed). A failed load falls back to the system font rather than
  // blocking the app.
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  if (isLoading || (!fontsLoaded && !fontError)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
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
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F4EE" },
});
