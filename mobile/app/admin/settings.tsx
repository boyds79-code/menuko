import { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/ctx";
import { supabase } from "@/lib/supabase";
import { pickAndUploadPhoto } from "@/lib/upload-photo";
import { AdminHeader } from "@/components/AdminHeader";
import type { BusinessType, Database } from "@/lib/database.types";

type RestaurantUpdate = Database["public"]["Tables"]["restaurants"]["Update"];

const TEMPLATES = [
  { id: "classic", label: "Classic" },
  { id: "warm", label: "Warm" },
  { id: "minimal", label: "Minimal" },
];

export default function AdminSettings() {
  const { account } = useSession();
  const restaurantId = account?.restaurantId;

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("restaurant");
  const [menuTemplate, setMenuTemplate] = useState("classic");
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("restaurants")
      .select("name, address, business_type, menu_template, payment_qr_url, payment_link, logo_url")
      .eq("id", restaurantId)
      .single();
    if (data) {
      setName(data.name ?? "");
      setAddress(data.address ?? "");
      setBusinessType(data.business_type);
      setMenuTemplate(data.menu_template);
      setPaymentQrUrl(data.payment_qr_url);
      setPaymentLink(data.payment_link ?? "");
      setLogoUrl(data.logo_url);
    }
    setLoaded(true);
  }, [restaurantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function save(patch: RestaurantUpdate) {
    if (!restaurantId) return;
    await supabase.from("restaurants").update(patch).eq("id", restaurantId);
  }

  if (!loaded) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Restaurant info</Text>
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
          <Text style={styles.hint}>Used to target cross-promotion ads.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Menu design</Text>
          <Text style={styles.hint}>Applies to both the customer web menu and the printable menu.</Text>
          <View style={styles.chipRow}>
            {TEMPLATES.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => {
                  setMenuTemplate(t.id);
                  save({ menu_template: t.id });
                }}
                style={[styles.chip, menuTemplate === t.id && styles.chipActive]}
              >
                <Text style={styles.chipText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fffaf3" },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#ece2d3", padding: 14, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  label: { fontSize: 12, color: "#8a7c68" },
  hint: { fontSize: 11, color: "#8a7c68", lineHeight: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#ece2d3",
    backgroundColor: "#fffaf3",
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
});
