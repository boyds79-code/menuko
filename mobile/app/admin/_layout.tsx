import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { registerForPushNotifications } from "@/lib/push";
import { getCurrentCoords } from "@/lib/location";

const PRESENCE_PING_MS = 5 * 60 * 1000;

// Owner-only tab group. 4 tabs: Preview (a live preview of the real
// customer page, not an editor), Floor (live table/order status, same
// screen as the cashier app), Settings (editing — business info, staff
// accounts, payment, menu design, plus the Menu/Tables editors as its own
// nested stack), and My Page (analytics + this account's own settings).
// Ads and standalone Accounts screens were folded in (ads creation moved
// to a manual "send us the file" process; accounts management lives under
// Settings > My Business).
//
// Push token registration + the owner presence ping (see
// 0019_owner_geofence.sql) live here rather than only inside the embedded
// Cashier screen (Floor tab) — an owner who never opens Floor should still
// get push notifications (e.g. a customer's "Call Server" from Preview),
// so both need to fire for the whole admin session, not just one tab.
export default function AdminLayout() {
  const { session } = useSession();

  useEffect(() => {
    if (session?.user.id) registerForPushNotifications(session.user.id);
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id) return;
    let cancelled = false;

    async function ping() {
      const coords = await getCurrentCoords();
      if (!coords || cancelled) return;
      await supabase.rpc("update_owner_presence", { p_lat: coords.latitude, p_lng: coords.longitude });
    }

    ping();
    const id = setInterval(ping, PRESENCE_PING_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session?.user.id]);

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
