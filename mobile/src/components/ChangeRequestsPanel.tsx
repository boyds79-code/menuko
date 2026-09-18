import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { formatPeso } from "@/lib/money";
import { getCurrentCoords } from "@/lib/location";
import type { AccountRole } from "@/lib/database.types";

type RequestedItem = { menu_item_id: string; quantity: number };

type ChangeRequestRow = {
  id: string;
  order_id: string;
  kind: "cancel" | "edit";
  requested_items: RequestedItem[] | null;
  note: string | null;
  orders: {
    table_id: string;
    tables: { label: string } | { label: string }[] | null;
    order_items: {
      quantity: number;
      unit_price_snapshot: number;
      menu_items: { name: string } | { name: string }[] | null;
    }[];
  } | null;
};

// Nothing else in this app can change order_items or cancel an order once
// placed — the only path is approving one of these requests (see
// supabase/migrations/0015_order_change_requests.sql). The customer can
// always ask; a human here always decides after checking with the
// kitchen, since there's no reliable digital signal for "already cooking."
export function ChangeRequestsPanel({
  restaurantId,
  menuItems,
  role,
}: {
  restaurantId: string;
  menuItems: { id: string; name: string }[];
  // Owner accounts get a fresh, on-demand location check at the moment of
  // approve/deny (server-verified against the restaurant's geofence — see
  // 0019_owner_geofence.sql). Cashier accounts skip this entirely: they're
  // presumed present by definition of being at the physical cashier station.
  role: AccountRole | null | undefined;
}) {
  const [requests, setRequests] = useState<ChangeRequestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [errorRequestId, setErrorRequestId] = useState<string | null>(null);
  const itemNameById = new Map(menuItems.map((i) => [i.id, i.name]));

  const refresh = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("order_change_requests")
      .select(
        "id, order_id, kind, requested_items, note, orders ( table_id, tables ( label ), order_items ( quantity, unit_price_snapshot, menu_items ( name ) ) )",
      )
      .eq("restaurant_id", restaurantId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setRequests((data ?? []) as unknown as ChangeRequestRow[]);
  }, [restaurantId]);

  useEffect(() => {
    // Deliberate mount-time fetch (this panel has no server-rendered
    // initial data) — not the accidental-extra-render footgun this rule
    // is meant to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    if (!restaurantId) return;
    const channel = supabase
      .channel(`change-requests-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_change_requests", filter: `restaurant_id=eq.${restaurantId}` },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, refresh]);

  async function approve(id: string) {
    setBusyId(id);
    setLocationError(null);
    setErrorRequestId(null);
    try {
      let coords: { latitude: number; longitude: number } | null = null;
      if (role === "owner") {
        coords = await getCurrentCoords();
        if (!coords) {
          setLocationError("Turn on location access to approve this as the owner.");
          setErrorRequestId(id);
          return;
        }
      }
      const { error } = await supabase.rpc("approve_order_change_request", {
        p_request_id: id,
        p_lat: coords?.latitude,
        p_lng: coords?.longitude,
      });
      if (error) {
        setLocationError(error.message);
        setErrorRequestId(id);
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function deny(id: string) {
    setBusyId(id);
    setLocationError(null);
    setErrorRequestId(null);
    try {
      let coords: { latitude: number; longitude: number } | null = null;
      if (role === "owner") {
        coords = await getCurrentCoords();
        if (!coords) {
          setLocationError("Turn on location access to resolve this as the owner.");
          setErrorRequestId(id);
          return;
        }
      }
      const { error } = await supabase.rpc("deny_order_change_request", {
        p_request_id: id,
        p_reason: denyReason || undefined,
        p_lat: coords?.latitude,
        p_lng: coords?.longitude,
      });
      if (error) {
        setLocationError(error.message);
        setErrorRequestId(id);
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setDenyingId(null);
      setDenyReason("");
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <View style={styles.container}>
      {requests.map((req) => {
        const table = Array.isArray(req.orders?.tables) ? req.orders?.tables[0] : req.orders?.tables;
        return (
          <View key={req.id} style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>
                {req.kind === "cancel" ? "Cancellation requested" : "Change requested"} — {table?.label ?? "Table"}
              </Text>
              <Text style={styles.hint}>Confirm with the kitchen first</Text>
            </View>

            {req.kind === "cancel" &&
              req.orders?.order_items?.map((item, i) => {
                const name = Array.isArray(item.menu_items) ? item.menu_items[0]?.name : item.menu_items?.name;
                return (
                  <Text key={i} style={styles.line}>
                    {name ?? "(removed item)"} × {item.quantity} — {formatPeso(item.quantity * item.unit_price_snapshot)}
                  </Text>
                );
              })}

            {req.kind === "edit" && (
              <View style={styles.compareRow}>
                <View style={styles.compareCol}>
                  <Text style={styles.compareTitle}>Current</Text>
                  {(req.orders?.order_items ?? []).map((item, i) => {
                    const name = Array.isArray(item.menu_items) ? item.menu_items[0]?.name : item.menu_items?.name;
                    return (
                      <Text key={i} style={styles.line}>
                        {name ?? "(removed item)"} × {item.quantity}
                      </Text>
                    );
                  })}
                </View>
                <View style={styles.compareCol}>
                  <Text style={[styles.compareTitle, { color: "#ea7c1f" }]}>Requested</Text>
                  {(req.requested_items ?? []).map((item, i) => (
                    <Text key={i} style={styles.line}>
                      {itemNameById.get(item.menu_item_id) ?? "(unknown item)"} × {item.quantity}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {req.note && <Text style={styles.note}>&ldquo;{req.note}&rdquo;</Text>}

            {locationError && errorRequestId === req.id && <Text style={styles.errorText}>{locationError}</Text>}

            {denyingId === req.id ? (
              <View style={styles.denyRow}>
                <TextInput
                  value={denyReason}
                  onChangeText={setDenyReason}
                  placeholder="Reason (optional)"
                  placeholderTextColor="#8a7c68"
                  style={styles.denyInput}
                />
                <TouchableOpacity
                  onPress={() => deny(req.id)}
                  disabled={busyId === req.id}
                  style={styles.confirmDenyButton}
                >
                  <Text style={styles.confirmDenyText}>Confirm deny</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setDenyingId(null);
                    setDenyReason("");
                  }}
                >
                  <Text style={styles.link}>Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={() => approve(req.id)} disabled={busyId === req.id} style={styles.approveButton}>
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDenyingId(req.id)} disabled={busyId === req.id} style={styles.denyButton}>
                  <Text style={styles.denyButtonText}>Deny</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  card: { backgroundColor: "#fff4e8", borderWidth: 1, borderColor: "#ea7c1f", borderRadius: 14, padding: 14, gap: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontWeight: "700", fontSize: 13, flex: 1 },
  hint: { fontSize: 10, color: "#8a7c68" },
  line: { fontSize: 13, color: "#5b5142" },
  compareRow: { flexDirection: "row", gap: 16 },
  compareCol: { flex: 1, gap: 2 },
  compareTitle: { fontSize: 11, fontWeight: "700", color: "#8a7c68", marginBottom: 2 },
  note: { fontSize: 11, fontStyle: "italic", color: "#8a7c68" },
  errorText: { fontSize: 12, color: "#c0392b", fontWeight: "600" },
  actionsRow: { flexDirection: "row", gap: 10 },
  approveButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
  approveButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  denyButton: { borderWidth: 1, borderColor: "#ece2d3", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
  denyButtonText: { color: "#8a7c68", fontSize: 13 },
  denyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  denyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ece2d3",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
  },
  confirmDenyButton: { backgroundColor: "#241f19", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  confirmDenyText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  link: { fontSize: 12, color: "#8a7c68", textDecorationLine: "underline" },
});
