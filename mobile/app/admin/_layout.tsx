import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { registerForPushNotifications } from "@/lib/push";
import { getCurrentCoords } from "@/lib/location";
import { TabBar } from "@/components/TabBar";
import { NewOrderSheet } from "@/components/NewOrderSheet";

const PRESENCE_PING_MS = 5 * 60 * 1000;

// Owner-only tab group (2026-09 redesign). Floor · Menu · [+] · Insights ·
// Store, drawn by the custom floating TabBar:
// - Floor (index): live table/order status, same screen as the cashier app;
//   its revenue card opens Revenue (hidden route, Premium history).
// - Menu: the menu editor + "Customer view" (the old Preview tab).
// - "+": not a route — opens NewOrderSheet (manual delivery/takeout).
// - Insights: analytics (old My Page > Analytics).
// - Store: business info, staff, payment, tables, account (old Settings >
//   My Business + My Page > Account).
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

  const [newOrderOpen, setNewOrderOpen] = useState(false);

  return (
    <>
      <Tabs
        tabBar={(props) => <TabBar {...props} onNewOrder={() => setNewOrderOpen(true)} />}
        screenOptions={{
          headerShown: false,
          // Soft rise-and-fade between tabs (RN Animated under the hood, so
          // it ships over EAS Update).
          animation: "fade",
          transitionSpec: { animation: "timing", config: { duration: 220 } },
          sceneStyleInterpolator: ({ current }) => ({
            sceneStyle: {
              opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
              transform: [
                {
                  translateY: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [12, 0, 12] }),
                },
              ],
            },
          }),
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Floor" }} />
        <Tabs.Screen name="menu" options={{ title: "Menu" }} />
        <Tabs.Screen name="insights" options={{ title: "Insights" }} />
        <Tabs.Screen name="store" options={{ title: "Store" }} />
        {/* Not a tab: opened from Floor's revenue card. The tab bar hides
            itself on it, and it slides in from the right instead of fading. */}
        <Tabs.Screen
          name="revenue"
          options={{
            href: null,
            title: "Revenue",
            sceneStyleInterpolator: ({ current }) => ({
              sceneStyle: {
                opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
                transform: [
                  {
                    translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-40, 0, 40] }),
                  },
                ],
              },
            }),
            transitionSpec: { animation: "timing", config: { duration: 260 } },
          }}
        />
      </Tabs>
      <NewOrderSheet visible={newOrderOpen} onClose={() => setNewOrderOpen(false)} />
    </>
  );
}
