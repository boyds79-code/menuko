import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { CustomerPreviewModal } from "@/components/CustomerPreviewModal";
import { form } from "@/components/form-styles";
import { colors, fonts } from "@/theme";

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
          placeholderTextColor={colors.faint}
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
          placeholderTextColor={colors.faint}
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
  content: { gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 10,
  },
  cardTitle: { fontSize: 18, fontFamily: fonts.display, color: colors.ink },
  hint: form.hint,
  label: { ...form.label, marginTop: 4 },
  input: form.input,
  status: { fontSize: 13, color: colors.accentText },
  secondaryButton: { ...form.secondaryButton, alignSelf: "flex-start" },
  secondaryButtonText: form.secondaryButtonText,
  divider: form.divider,
  dangerCard: { borderColor: "#F3C7C2", backgroundColor: "#FFF7F6" },
  dangerTitle: { color: colors.danger },
  dangerButton: { ...form.primaryButton, backgroundColor: colors.danger },
  dangerButtonDisabled: { opacity: 0.4 },
  dangerButtonText: form.primaryButtonText,
  devCard: { borderStyle: "dashed", borderColor: colors.faint },
  devCardTitle: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 1 },
  devRow: { flexDirection: "row", gap: 8 },
});
