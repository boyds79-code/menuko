import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AdminHeader } from "@/components/AdminHeader";
import Cashier from "../cashier";

// The owner's Floor tab IS the real cashier screen — same seat/free/settle/
// change-request logic, zero duplication (see Cashier's `embedded` prop,
// originally built for the dev-only cashier preview). A small operator often
// runs the register themselves, so this needs to be the real thing, not a
// read-only status view. The one thing that's NOT identical is gated inside
// ChangeRequestsPanel itself: approving/denying a change request as an owner
// requires a fresh, server-verified geofence check (0019_owner_geofence.sql)
// — everything else here (seat, free, settle, manual orders) works exactly
// as it does for a cashier account.
export default function AdminTables() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminHeader title="Floor" />
      <Cashier embedded />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fffaf3" },
});
