import { useCallback, useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { pickAndUploadPhoto } from "@/lib/upload-photo";
import { getCurrentCoords } from "@/lib/location";
import type { BusinessType, Database } from "@/lib/database.types";
import { TablesSection } from "./TablesSection";

type RestaurantUpdate = Database["public"]["Tables"]["restaurants"]["Update"];
type Account = { id: string; email: string; role: string };

const ROLE_LABEL: Record<string, string> = { owner: "Owner", kitchen: "Kitchen", cashier: "Cashier" };

export function BusinessSection() {
  const { account } = useSession();
  const restaurantId = account?.restaurantId;

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [about, setAbout] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("restaurant");
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [grabfoodPct, setGrabfoodPct] = useState("");
  const [foodpandaPct, setFoodpandaPct] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [role, setRole] = useState<"kitchen" | "cashier">("kitchen");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffError, setStaffError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("restaurants")
      .select(
        "name, address, about, business_type, payment_qr_url, payment_link, logo_url, latitude, longitude, grabfood_commission_pct, foodpanda_commission_pct",
      )
      .eq("id", restaurantId)
      .single();
    if (data) {
      setName(data.name ?? "");
      setAddress(data.address ?? "");
      setAbout(data.about ?? "");
      setBusinessType(data.business_type);
      setPaymentQrUrl(data.payment_qr_url);
      setPaymentLink(data.payment_link ?? "");
      setLogoUrl(data.logo_url);
      setHasLocation(data.latitude !== null && data.longitude !== null);
      setGrabfoodPct(data.grabfood_commission_pct?.toString() ?? "");
      setFoodpandaPct(data.foodpanda_commission_pct?.toString() ?? "");
    }
    setLoaded(true);
  }, [restaurantId]);

  async function setRestaurantLocation() {
    setLocationError(null);
    setSavingLocation(true);
    try {
      const coords = await getCurrentCoords();
      if (!coords) {
        setLocationError("Couldn't get your location — check location permission and try again.");
        return;
      }
      await save({ latitude: coords.latitude, longitude: coords.longitude });
      setHasLocation(true);
    } finally {
      setSavingLocation(false);
    }
  }

  const loadAccounts = useCallback(async () => {
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
    loadAccounts();
  }, [load, loadAccounts]);

  async function save(patch: RestaurantUpdate) {
    if (!restaurantId) return;
    await supabase.from("restaurants").update(patch).eq("id", restaurantId);
  }

  async function inviteStaff() {
    setStaffError(null);
    if (!staffEmail.trim() || staffPassword.length < 6) {
      setStaffError("Please enter an email and a password of at least 6 characters.");
      return;
    }
    setInviting(true);
    try {
      // No server of its own on mobile, and the service-role key needed to
      // create an auth user can never ship inside the app — this calls the
      // manage-staff-account Edge Function instead (server-side, JWT
      // verified), same logic as the web app's inviteAccount server action.
      const { data, error: fnError } = await supabase.functions.invoke("manage-staff-account", {
        body: { action: "invite", role, email: staffEmail.trim(), password: staffPassword },
      });
      if (fnError || data?.error) {
        setStaffError(data?.error ?? "Failed to create the account.");
        return;
      }
      setStaffEmail("");
      setStaffPassword("");
      loadAccounts();
    } finally {
      setInviting(false);
    }
  }

  function removeStaff(target: Account) {
    Alert.alert("Delete account", `Delete the account ${target.email}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.functions.invoke("manage-staff-account", {
            body: { action: "remove", accountId: target.id },
          });
          loadAccounts();
        },
      },
    ]);
  }

  if (!loaded) return null;

  return (
    <View style={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Business</Text>
        <Text style={styles.label}>Logo (optional)</Text>
        <TouchableOpacity
          style={styles.photoBox}
          onPress={async () => {
            const url = await pickAndUploadPhoto("restaurant-logo", restaurantId ?? "");
            if (url) {
              setLogoUrl(url);
              save({ logo_url: url });
            }
          }}
        >
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.photoBoxImage} />
          ) : (
            <Text style={styles.photoBoxText}>Add logo</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.label}>Restaurant name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={() => save({ name })}
          style={styles.input}
        />
        <Text style={styles.label}>Address</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          onBlur={() => save({ address })}
          style={styles.input}
        />
        <Text style={styles.label}>About your restaurant</Text>
        <TextInput
          value={about}
          onChangeText={setAbout}
          onBlur={() => save({ about })}
          placeholder="A short line customers see on your menu page — e.g. what makes your food special, or your story."
          placeholderTextColor="#b8ab93"
          multiline
          numberOfLines={3}
          maxLength={280}
          style={[styles.input, styles.inputMultiline]}
        />
        <Text style={styles.hint}>Shown under your restaurant name on the customer menu page. Optional.</Text>
        <Text style={styles.label}>Business type</Text>
        <View style={styles.chipRow}>
          {(["restaurant", "cafe"] as BusinessType[]).map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => {
                setBusinessType(type);
                save({ business_type: type });
              }}
              style={[styles.chip, businessType === type && styles.chipActive]}
            >
              <Text style={styles.chipText}>{type === "restaurant" ? "Restaurant" : "Cafe"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Restaurant location</Text>
        <Text style={styles.hint}>
          {hasLocation
            ? "Location set — used to confirm you're on-site before approving cancel/change requests as owner."
            : "Not set yet. Stand at the restaurant and tap below."}
        </Text>
        {locationError && <Text style={styles.error}>{locationError}</Text>}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={setRestaurantLocation}
          disabled={savingLocation}
        >
          <Text style={styles.secondaryButtonText}>
            {savingLocation ? "Getting location..." : hasLocation ? "Update to current location" : "Set restaurant location"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Staff accounts</Text>
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
              <TouchableOpacity onPress={() => removeStaff(a)}>
                <Text style={styles.link}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
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
          value={staffEmail}
          onChangeText={setStaffEmail}
          placeholder="Email"
          placeholderTextColor="#8a7c68"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={staffPassword}
          onChangeText={setStaffPassword}
          placeholder="Temporary password (6+ characters)"
          placeholderTextColor="#8a7c68"
          style={styles.input}
        />
        {staffError && <Text style={styles.error}>{staffError}</Text>}
        <TouchableOpacity style={styles.primaryButton} onPress={inviteStaff} disabled={inviting}>
          <Text style={styles.primaryButtonText}>{inviting ? "Creating..." : "Create account"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment info</Text>
        <Text style={styles.hint}>
          Upload a payment QR image you already have (GCash/Maya, etc.) — shown as-is to
          customers and the cashier. Menuko never processes payments directly.
        </Text>
        <TouchableOpacity
          style={styles.photoBox}
          onPress={async () => {
            const url = await pickAndUploadPhoto("payment-qr", restaurantId ?? "");
            if (url) {
              setPaymentQrUrl(url);
              save({ payment_qr_url: url });
            }
          }}
        >
          {paymentQrUrl ? (
            <Image source={{ uri: paymentQrUrl }} style={styles.photoBoxImage} />
          ) : (
            <Text style={styles.photoBoxText}>Upload QR</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.label}>Payment link (optional)</Text>
        <TextInput
          value={paymentLink}
          onChangeText={setPaymentLink}
          onBlur={() => save({ payment_link: paymentLink || null })}
          placeholder="https://..."
          placeholderTextColor="#8a7c68"
          style={styles.input}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Delivery channels</Text>
        <Text style={styles.hint}>
          Your actual commission rate for each delivery platform, so the Sales Report can show
          real net revenue instead of an industry-average estimate (26%). Optional.
        </Text>
        <Text style={styles.label}>GrabFood commission (%)</Text>
        <TextInput
          value={grabfoodPct}
          onChangeText={setGrabfoodPct}
          onBlur={() => {
            const parsed = grabfoodPct.trim() ? Number(grabfoodPct) : null;
            save({ grabfood_commission_pct: parsed !== null && Number.isNaN(parsed) ? null : parsed });
          }}
          placeholder="e.g. 26"
          placeholderTextColor="#8a7c68"
          keyboardType="decimal-pad"
          style={[styles.input, { width: 100 }]}
        />
        <Text style={styles.label}>foodpanda commission (%)</Text>
        <TextInput
          value={foodpandaPct}
          onChangeText={setFoodpandaPct}
          onBlur={() => {
            const parsed = foodpandaPct.trim() ? Number(foodpandaPct) : null;
            save({ foodpanda_commission_pct: parsed !== null && Number.isNaN(parsed) ? null : parsed });
          }}
          placeholder="e.g. 26"
          placeholderTextColor="#8a7c68"
          keyboardType="decimal-pad"
          style={[styles.input, { width: 100 }]}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tables</Text>
        <TablesSection />
      </View>
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
    gap: 8,
    shadowColor: "#3d2f1f",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#ea7c1f" },
  label: { fontSize: 12, color: "#8a7c68" },
  hint: { fontSize: 11, color: "#8a7c68", lineHeight: 15 },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  input: {
    borderWidth: 1,
    borderColor: "#ece2d3",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#ece2d3", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { borderColor: "#ea7c1f", backgroundColor: "#fff0e0" },
  chipText: { fontSize: 12 },
  photoBox: {
    height: 90,
    width: 90,
    borderRadius: 10,
    backgroundColor: "#fffaf3",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoBoxImage: { width: "100%", height: "100%" },
  photoBoxText: { fontSize: 11, color: "#8a7c68" },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  accountText: { fontSize: 13 },
  accountRole: { fontWeight: "700" },
  link: { fontSize: 12, color: "#8a7c68", textDecorationLine: "underline" },
  roleRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  roleChip: { borderWidth: 1, borderColor: "#ece2d3", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  roleChipActive: { borderColor: "#ea7c1f", backgroundColor: "#fff0e0" },
  roleChipText: { fontSize: 12 },
  error: { color: "#dc2626", fontSize: 12 },
  primaryButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  secondaryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#ea7c1f",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  secondaryButtonText: { color: "#ea7c1f", fontWeight: "700", fontSize: 12 },
});
