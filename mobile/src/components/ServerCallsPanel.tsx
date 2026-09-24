import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "@/lib/supabase";

type ServerCallRow = {
  id: string;
  table_id: string;
  created_at: string;
  tables: { label: string } | { label: string }[] | null;
};

// A customer tapped "Call Server" on the order page (no order or login
// required — see 0020_server_calls.sql). Shown separately from
// ChangeRequestsPanel since this isn't an order decision, just a "go check
// on this table" flag — resolving it doesn't need the owner geofence
// check that approving a change request does.
export function ServerCallsPanel({ restaurantId }: { restaurantId: string }) {
  const [calls, setCalls] = useState<ServerCallRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("server_calls")
      .select("id, table_id, created_at, tables ( label )")
      .eq("restaurant_id", restaurantId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setCalls((data ?? []) as unknown as ServerCallRow[]);
  }, [restaurantId]);

  useEffect(() => {
    // Deliberate mount-time fetch (this panel has no server-rendered
    // initial data) — not the accidental-extra-render footgun this rule
    // is meant to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    if (!restaurantId) return;
    const channel = supabase
      .channel(`server-calls-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "server_calls", filter: `restaurant_id=eq.${restaurantId}` },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, refresh]);

  async function resolve(id: string) {
    setBusyId(id);
    try {
      await supabase.rpc("resolve_server_call", { p_id: id });
      setCalls((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  if (calls.length === 0) return null;

  return (
    <View style={styles.container}>
      {calls.map((call) => {
        const table = Array.isArray(call.tables) ? call.tables[0] : call.tables;
        return (
          <View key={call.id} style={styles.card}>
            <Text style={styles.text}>{table?.label ?? "A table"} is calling for a server</Text>
            <TouchableOpacity
              onPress={() => resolve(call.id)}
              disabled={busyId === call.id}
              style={styles.resolveButton}
            >
              <Text style={styles.resolveButtonText}>On it</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff4e8",
    borderWidth: 1,
    borderColor: "#ea7c1f",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  text: { flex: 1, fontSize: 13, fontWeight: "600" },
  resolveButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  resolveButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
});
