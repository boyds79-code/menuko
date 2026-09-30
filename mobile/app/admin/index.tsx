import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AdminHeader, LiveBadge } from "@/components/AdminHeader";
import { colors } from "@/theme";
import Cashier from "../cashier";

// Floor — the owner's home tab. It IS the real cashier screen — same
// seat/free/settle/change-request logic, zero duplication (see Cashier's
// `embedded` prop). A small operator often runs the register themselves,
// so this needs to be the real thing, not a read-only status view. The one
// thing that's NOT identical is gated inside ChangeRequestsPanel itself:
// approving/denying a change request as an owner requires a fresh,
// server-verified geofence check (0019_owner_geofence.sql). In embedded
// mode the inline "+ New order" form is replaced by the tab bar's "+"
// button, and the revenue card opens Revenue history (./revenue.tsx).
export default function AdminFloor() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminHeader title="Floor" right={<LiveBadge />} />
      <Cashier embedded />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
});
