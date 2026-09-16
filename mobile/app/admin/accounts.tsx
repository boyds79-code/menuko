import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { AdminHeader } from "@/components/AdminHeader";

type Account = { id: string; email: string; role: string };

const ROLE_LABEL: Record<string, string> = { owner: "Owner", kitchen: "Kitchen", cashier: "Cashier" };

export default function AdminAccounts() {
  const { account } = useSession();
  const restaurantId = account?.restaurantId;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [role, setRole] = useState<"kitchen" | "cashier">("kitchen");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("accounts")
      .select("id, email, role")
      .eq("restaurant_id", restaurantId)
      .order("role");
    setAccounts(data ?? []);
  }, [restaurantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function invite() {
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError("Please enter an email and a password of at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      // No server of its own on mobile, and the service-role key needed to
      // create an auth user can never ship inside the app — this calls the
      // manage-staff-account Edge Function instead (server-side, JWT
      // verified), same logic as the web app's inviteAccount server action.
      const { data, error: fnError } = await supabase.functions.invoke("manage-staff-account", {
        body: { action: "invite", role, email: email.trim(), password },
      });
      if (fnError || data?.error) {
        setError(data?.error ?? "Failed to create the account.");
        return;
      }
      setEmail("");
      setPassword("");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  function remove(target: Account) {
    Alert.alert("Delete account", `Delete the account ${target.email}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.functions.invoke("manage-staff-account", {
            body: { action: "remove", accountId: target.id },
          });
          load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminHeader title="Accounts" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          The free plan supports 1 owner + 1 kitchen + 1 cashier account. Additional accounts
          require the premium plan.
        </Text>

        {accounts.map((a) => (
          <View key={a.id} style={styles.accountRow}>
            <Text style={styles.accountText}>
              <Text style={styles.accountRole}>{ROLE_LABEL[a.role] ?? a.role}</Text> {a.email}
            </Text>
            {a.role !== "owner" && (
              <TouchableOpacity onPress={() => remove(a)}>
                <Text style={styles.link}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add a staff account</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              onPress={() => setRole("kitchen")}
              style={[styles.roleChip, role === "kitchen" && styles.roleChipActive]}
            >
              <Text style={styles.roleChipText}>Kitchen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setRole("cashier")}
              style={[styles.roleChip, role === "cashier" && styles.roleChipActive]}
            >
              <Text style={styles.roleChipText}>Cashier</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#8a7c68"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Temporary password (6+ characters)"
            placeholderTextColor="#8a7c68"
            style={styles.input}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={invite} disabled={submitting}>
            <Text style={styles.primaryButtonText}>{submitting ? "Creating..." : "Create account"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fffaf3" },
  content: { padding: 16, gap: 10 },
  hint: { fontSize: 12, color: "#8a7c68", lineHeight: 17 },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ece2d3",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accountText: { fontSize: 13 },
  accountRole: { fontWeight: "700" },
  link: { fontSize: 12, color: "#8a7c68", textDecorationLine: "underline" },
  card: { backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#ece2d3", padding: 14, gap: 10, marginTop: 6 },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  roleRow: { flexDirection: "row", gap: 8 },
  roleChip: { borderWidth: 1, borderColor: "#ece2d3", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  roleChipActive: { borderColor: "#ea7c1f", backgroundColor: "#fff0e0" },
  roleChipText: { fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ece2d3",
    backgroundColor: "#fffaf3",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  error: { color: "#dc2626", fontSize: 12 },
  primaryButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
});
