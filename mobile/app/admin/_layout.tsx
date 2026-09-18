import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Owner-only tab group. 4 tabs: Preview (a live preview of the real
// customer page, not an editor), Floor (live table/order status, same
// screen as the cashier app), Settings (editing — business info, staff
// accounts, payment, menu design, plus the Menu/Tables editors as its own
// nested stack), and My Page (analytics + this account's own settings).
// Ads and standalone Accounts screens were folded in (ads creation moved
// to a manual "send us the file" process; accounts management lives under
// Settings > My Business).
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
      <Tabs.Screen
        name="index"
        options={{
          title: "Preview",
          tabBarIcon: ({ color, size }) => <Ionicons name="eye-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tables"
        options={{
          title: "Floor",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-page"
        options={{
          title: "My Page",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
