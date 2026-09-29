import { useCallback, useEffect, useState } from "react";
import { Alert, Image, LayoutAnimation, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { pickAndUploadPhoto } from "@/lib/upload-photo";
import { getCurrentCoords } from "@/lib/location";
import type { BusinessType, Database } from "@/lib/database.types";
import { TablesSection } from "./TablesSection";
import { form } from "@/components/form-styles";
import { colors } from "@/theme";

type RestaurantUpdate = Database["public"]["Tables"]["restaurants"]["Update"];
type Account = { id: string; email: string; role: string };

const ROLE_LABEL: Record<string, string> = { owner: "Owner", kitchen: "Kitchen", cashier: "Cashier" };

// Collapsed by default so the tab doesn't dump every setting on screen at
// once — tap a header to reveal that section's fields.
type IconName = React.ComponentProps<typeof Ionicons>["name"];

function AccordionCard({
  title,
  subtitle,
  icon,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.cardIcon}>
          <Ionicons name={icon} size={20} color={colors.accentText} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{title}</Text>
            {badge && <Text style={styles.badge}>{badge}</Text>}
          </View>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color={colors.muted} />
      </TouchableOpacity>
      {open && <View style={styles.cardBody}>{children}</View>}
    </View>
  );
}

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
  const [isPremium, setIsPremium] = useState(false);
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
        "name, address, about, business_type, payment_qr_url, payment_link, logo_url, latitude, longitude, grabfood_commission_pct, foodpanda_commission_pct, plan",
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
      setIsPremium(data.plan === "premium");
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
      <AccordionCard title="My Business" subtitle="Name, logo, address, location" icon="storefront-outline">
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
          placeholderTextColor={colors.faint}
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
              <Text style={[styles.chipText, businessType === type && form.chipTextActive]}>
                {type === "restaurant" ? "Restaurant" : "Cafe"}
              </Text>
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
      </AccordionCard>

      <AccordionCard title="Staff accounts" subtitle="Kitchen and cashier logins" icon="people-outline">
        <Text style={styles.hint}>
          The free plan supports 1 owner + 1 kitchen + 1 cashier account. Additional accounts
          require the premium plan.
        </Text>
        {accounts.map((a) => (
          <View key={a.id} style={styles.accountRow}>
            <Text style={styles.accountRole}>{ROLE_LABEL[a.role] ?? a.role}</Text>
            <Text style={styles.accountText} numberOfLines={1}>
              {a.email}
            </Text>
            {a.role !== "owner" && (
              <TouchableOpacity
                onPress={() => removeStaff(a)}
                style={form.iconButton}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${ROLE_LABEL[a.role] ?? a.role} account ${a.email}`}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <View style={styles.roleRow}>
          <TouchableOpacity
            onPress={() => setRole("kitchen")}
            style={[styles.roleChip, role === "kitchen" && styles.roleChipActive]}
          >
            <Text style={[styles.roleChipText, role === "kitchen" && form.chipTextActive]}>Kitchen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRole("cashier")}
            style={[styles.roleChip, role === "cashier" && styles.roleChipActive]}
          >
            <Text style={[styles.roleChipText, role === "cashier" && form.chipTextActive]}>Cashier</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          value={staffEmail}
          onChangeText={setStaffEmail}
          placeholder="Email"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={staffPassword}
          onChangeText={setStaffPassword}
          placeholder="Temporary password (6+ characters)"
          placeholderTextColor={colors.faint}
          style={styles.input}
        />
        {staffError && <Text style={styles.error}>{staffError}</Text>}
        <TouchableOpacity style={styles.primaryButton} onPress={inviteStaff} disabled={inviting}>
          <Text style={styles.primaryButtonText}>{inviting ? "Creating..." : "Create account"}</Text>
        </TouchableOpacity>
      </AccordionCard>

      <AccordionCard title="Payment info" subtitle="GCash / Maya QR and payment link" icon="qr-code-outline">
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>Not connected to any payment system</Text>
          <Text style={styles.warnText}>
            The QR image and link you add here are only shown to customers and your cashier.
            Menuko does not receive, process, or verify payments, and orders are not marked paid
            automatically. Your cashier must check each payment in your own GCash/Maya/bank app
            before confirming it in Menuko.
          </Text>
        </View>
        <Text style={styles.hint}>
          Upload a payment QR image you already have (GCash/Maya, etc.) — shown as-is to
          customers and the cashier.
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
          placeholderTextColor={colors.faint}
          style={styles.input}
        />
      </AccordionCard>

      <AccordionCard
        title="Delivery channels"
        subtitle="GrabFood and foodpanda commission"
        icon="bicycle-outline"
        badge="Premium"
      >
        {isPremium ? (
          <Text style={styles.hint}>Your Premium plan is active — these rates are used in your Sales Report.</Text>
        ) : (
          <View style={styles.warnBox}>
            <Text style={styles.warnTitle}>Not used on the Free plan</Text>
            <Text style={styles.warnText}>
              These rates only feed the Premium Sales Report, so on the Free (basic) plan they have no
              effect. You can fill them in now — they&apos;re saved and start working after you upgrade.
            </Text>
          </View>
        )}
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
          placeholderTextColor={colors.faint}
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
          placeholderTextColor={colors.faint}
          keyboardType="decimal-pad"
          style={[styles.input, { width: 100 }]}
        />
      </AccordionCard>

      <AccordionCard title="Tables & QR codes" subtitle="Add tables, print their QR codes" icon="grid-outline">
        <TablesSection />
      </AccordionCard>
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
    overflow: "hidden",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, minHeight: 72 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  cardSubtitle: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  badge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
    backgroundColor: colors.saffron,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  label: { ...form.label, marginTop: 6 },
  hint: form.hint,
  warnBox: form.warnBox,
  warnTitle: form.warnTitle,
  warnText: form.warnText,
  inputMultiline: form.inputMultiline,
  input: form.input,
  chipRow: form.chipRow,
  chip: form.chip,
  chipActive: form.chipActive,
  chipText: form.chipText,
  photoBox: {
    height: 96,
    width: 96,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoBoxImage: { width: "100%", height: "100%" },
  photoBoxText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 6,
  },
  accountText: { flex: 1, fontSize: 14, color: colors.ink },
  accountRole: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accentText,
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleRow: { ...form.chipRow, marginTop: 6 },
  roleChip: form.chip,
  roleChipActive: form.chipActive,
  roleChipText: form.chipText,
  error: form.error,
  primaryButton: { ...form.primaryButton, marginTop: 4 },
  primaryButtonText: form.primaryButtonText,
  secondaryButton: { ...form.secondaryButton, alignSelf: "flex-start" },
  secondaryButtonText: form.secondaryButtonText,
});
