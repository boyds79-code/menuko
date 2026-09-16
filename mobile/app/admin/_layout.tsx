import { Tabs } from "expo-router";

// Owner-only tab group — mirrors the web app's /admin/* nav (StaffHeader's
// NAV array in src/app/admin/layout.tsx), just as bottom tabs instead of a
// top nav bar since this is the one role that needs multiple screens.
export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ea7c1f",
        tabBarInactiveTintColor: "#8a7c68",
        tabBarStyle: { borderTopColor: "#ece2d3" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Menu" }} />
      <Tabs.Screen name="tables" options={{ title: "Tables" }} />
      <Tabs.Screen name="ads" options={{ title: "Ads" }} />
      <Tabs.Screen name="accounts" options={{ title: "Accounts" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      <Tabs.Screen name="analytics" options={{ title: "Analytics" }} />
    </Tabs>
  );
}
