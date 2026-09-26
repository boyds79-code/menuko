import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { CustomerPreviewModal } from "@/components/CustomerPreviewModal";

export function AccountSection() {
  const { account, session, signOut } = useSession();
  const restaurantName = account?.restaurantName ?? "";
  const restaurantId = account?.restaurantId;
  const userId = session?.user.id;
  const email = session?.user.email ?? "";

  // Dev-only: a quick way to eyeball the customer-facing screen while
  // building, without signing out of the owner account to switch roles.
  // __DEV__ is false in a production/TestFlight/App Store build, so this
  // never ships to a real owner. (The equivalent cashier preview was
  // removed once the Tables tab started rendering the real cashier screen
  // directly — see app/admin/tables.tsx.)
  const [devFirstQrToken, setDevFirstQrToken] = useState<string | null>(null);
  const [devCustomerPreviewOpen, setDevCustomerPreviewOpen] = useState(false);

  useEffect(() => {
    if (!__DEV__ || !restaurantId) return;
    supabase
      .from("tables")
      .select("qr_token")
      .eq("restaurant_id", restaurantId)
      .eq("is_virtual", false)
      .order("label")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setDevFirstQrToken(data?.qr_token ?? null));
  }, [restaurantId]);

  const [newEmail, setNewEmail] = useState(email);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function changeEmail() {
    if (!newEmail.trim() || newEmail === email) return;
    setSavingEmail(true);
    setEmailStatus(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) {
        setEmailStatus(error.message);
        return;
      }
      // Supabase requires confirming the new address by email before it
      // actually takes effect — the accounts table (used for display
      // elsewhere, e.g. the staff list) is updated right away so the UI
      // reflects the change immediately rather than waiting on that.
      if (userId) {
        await supabase.from("accounts").update({ email: newEmail.trim() }).eq("id", userId);
      }
      setEmailStatus("Check your new email to confirm the change.");
    } finally {
      setSavingEmail(false);
    }
  }

  async function changePassword() {
    setPasswordStatus(null);
    if (newPassword.length < 6) {
      setPasswordStatus("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("Passwords don't match.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setPasswordStatus(error ? error.message : "Password updated.");
      if (!error) {
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setSavingPassword(false);
    }
  }

  function confirmDelete() {
    if (confirmName !== restaurantName) return;
    Alert.alert(
      "Delete your account?",
      `This permanently deletes ${restaurantName} — its menu, tables, order history, and every staff account. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete everything", style: "destructive", onPress: deleteAccount },
      ],
    );
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data, error } = await supabase.functions.invoke("manage-staff-account", {
        body: { action: "delete_restaurant", confirmName },
      });
      if (error || data?.error) {
        setDeleteError(data?.error ?? "Failed to delete the account.");
        return;
      }
      await signOut();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={styles.content}>
      {__DEV__ && (
        <View style={[styles.card, styles.devCard]}>
          <Text style={styles.devCardTitle}>Developer preview</Text>
          <Text style={styles.hint}>
            Only visible in development builds — a quick way to check the customer-facing screen
            without switching accounts.
          </Text>
          <View style={styles.devRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setDevCustomerPreviewOpen(true)}>
              <Text style={styles.secondaryButtonText}>View as Customer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Account</Text>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={newEmail}
          onChangeText={setNewEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        {emailStatus && <Text style={styles.status}>{emailStatus}</Text>}
        <TouchableOpacity style={styles.secondaryButton} onPress={changeEmail} disabled={savingEmail}>
          <Text style={styles.secondaryButtonText}>{savingEmail ? "Saving..." : "Update email"}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.label}>New password</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="6+ characters"
          placeholderTextColor="#8a7c68"
          style={styles.input}
        />
        <Text style={styles.label}>Confirm new password</Text>
        <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry style={styles.input} />
        {passwordStatus && <Text style={styles.status}>{passwordStatus}</Text>}
        <TouchableOpacity style={styles.secondaryButton} onPress={changePassword} disabled={savingPassword}>
          <Text style={styles.secondaryButtonText}>{savingPassword ? "Saving..." : "Update password"}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, styles.dangerCard]}>
        <Text style={[styles.cardTitle, styles.dangerTitle]}>Delete account</Text>
        <Text style={styles.hint}>
          This permanently deletes {restaurantName || "your restaurant"} — menu, tables, order
          history, and every staff account. This can&apos;t be undone. Type the restaurant name to
          confirm.
        </Text>
        <TextInput
          value={confirmName}
          onChangeText={setConfirmName}
          placeholder={restaurantName}
          placeholderTextColor="#c99"
          style={styles.input}
          autoCapitalize="none"
        />
        {deleteError && <Text style={styles.status}>{deleteError}</Text>}
        <TouchableOpacity
          style={[styles.dangerButton, confirmName !== restaurantName && styles.dangerButtonDisabled]}
          onPress={confirmDelete}
          disabled={confirmName !== restaurantName || deleting}
        >
          <Text style={styles.dangerButtonText}>{deleting ? "Deleting..." : "Delete my account"}</Text>
        </TouchableOpacity>
      </View>

      {__DEV__ && (
        <CustomerPreviewModal
          visible={devCustomerPreviewOpen}
          onClose={() => setDevCustomerPreviewOpen(false)}
          qrToken={devFirstQrToken}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ece2d3",
    padding: 14,
    gap: 10,
    shadowColor: "#3d2f1f",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  hint: { fontSize: 11, color: "#8a7c68", lineHeight: 15 },
  label: { fontSize: 12, color: "#8a7c68" },
  input: {
    borderWidth: 1,
    borderColor: "#ece2d3",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  status: { fontSize: 11, color: "#8a7c68" },
  secondaryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#ea7c1f",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  secondaryButtonText: { color: "#ea7c1f", fontWeight: "700", fontSize: 12 },
  divider: { height: 1, backgroundColor: "#ece2d3", marginVertical: 2 },
  dangerCard: { borderColor: "#fca5a5", backgroundColor: "#fff5f5" },
  dangerTitle: { color: "#b3402f" },
  dangerButton: { backgroundColor: "#b3402f", borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  dangerButtonDisabled: { opacity: 0.4 },
  dangerButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  devCard: { borderStyle: "dashed", borderColor: "#8a7c68" },
  devCardTitle: { fontSize: 12, fontWeight: "700", color: "#8a7c68", textTransform: "uppercase", letterSpacing: 1 },
  devRow: { flexDirection: "row", gap: 8 },
});
