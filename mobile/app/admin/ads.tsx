import { useCallback, useEffect, useState } from "react";
import {
  Image,
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
import { pickAndUploadPhoto } from "@/lib/upload-photo";
import { AdminHeader } from "@/components/AdminHeader";

type Ad = {
  id: string;
  template_id: string;
  headline: string;
  subcopy: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
};

const TEMPLATES = [
  { id: "classic", label: "Classic" },
  { id: "warm", label: "Warm" },
  { id: "minimal", label: "Minimal" },
];

export default function AdminAds() {
  const { account } = useSession();
  const restaurantId = account?.restaurantId;

  const [ads, setAds] = useState<Ad[]>([]);
  const [templateId, setTemplateId] = useState("classic");
  const [headline, setHeadline] = useState("");
  const [subcopy, setSubcopy] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("ads")
      .select("id, template_id, headline, subcopy, image_url, link_url, is_active")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });
    setAds(data ?? []);
  }, [restaurantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function createAd() {
    if (!headline.trim() || !restaurantId) return;
    setSubmitting(true);
    try {
      await supabase.from("ads").insert({
        restaurant_id: restaurantId,
        template_id: templateId,
        headline: headline.trim(),
        subcopy: subcopy.trim() || null,
        image_url: imageUrl,
        link_url: linkUrl.trim() || null,
      });
      setHeadline("");
      setSubcopy("");
      setLinkUrl("");
      setImageUrl(null);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAd(id: string, isActive: boolean) {
    await supabase.from("ads").update({ is_active: isActive }).eq("id", id);
    load();
  }

  async function deleteAd(id: string) {
    await supabase.from("ads").delete().eq("id", id);
    load();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminHeader title="Ads" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Ads you create show up on other restaurants&apos; customers when they check their
          total — restaurants see cafe ads and cafes see restaurant ads first.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create a new ad</Text>
          <View style={styles.templateRow}>
            {TEMPLATES.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setTemplateId(t.id)}
                style={[styles.templateChip, templateId === t.id && styles.templateChipActive]}
              >
                <Text style={styles.templateChipText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.photoBox}
            onPress={async () => {
              const url = await pickAndUploadPhoto("ad-images", restaurantId ?? "");
              if (url) setImageUrl(url);
            }}
          >
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.photoBoxImage} />
            ) : (
              <Text style={styles.photoBoxText}>Add photo (optional)</Text>
            )}
          </TouchableOpacity>
          <TextInput
            value={headline}
            onChangeText={setHeadline}
            placeholder="Headline (e.g. How about a coffee after your meal?)"
            placeholderTextColor="#8a7c68"
            style={styles.input}
          />
          <TextInput
            value={subcopy}
            onChangeText={setSubcopy}
            placeholder="Subtext (optional)"
            placeholderTextColor="#8a7c68"
            style={styles.input}
          />
          <TextInput
            value={linkUrl}
            onChangeText={setLinkUrl}
            placeholder="Link (optional — location, page URL, etc.)"
            placeholderTextColor="#8a7c68"
            style={styles.input}
          />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={createAd}
            disabled={submitting || !headline.trim()}
          >
            <Text style={styles.primaryButtonText}>{submitting ? "Creating..." : "Create ad"}</Text>
          </TouchableOpacity>
        </View>

        {ads.map((ad) => (
          <View key={ad.id} style={styles.card}>
            <View style={styles.adRow}>
              {ad.image_url && <Image source={{ uri: ad.image_url }} style={styles.adThumb} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.adHeadline}>{ad.headline}</Text>
                {ad.subcopy && <Text style={styles.adSubcopy}>{ad.subcopy}</Text>}
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => toggleAd(ad.id, !ad.is_active)}>
                <Text style={styles.link}>{ad.is_active ? "Active ✓ (tap to pause)" : "Paused (tap to activate)"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteAd(ad.id)}>
                <Text style={styles.link}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fffaf3" },
  content: { padding: 16, gap: 12 },
  hint: { fontSize: 12, color: "#8a7c68", lineHeight: 17 },
  card: { backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#ece2d3", padding: 14, gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  templateRow: { flexDirection: "row", gap: 8 },
  templateChip: { borderWidth: 1, borderColor: "#ece2d3", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  templateChipActive: { borderColor: "#ea7c1f", backgroundColor: "#fff0e0" },
  templateChipText: { fontSize: 12 },
  photoBox: {
    height: 80,
    borderRadius: 10,
    backgroundColor: "#fffaf3",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoBoxImage: { width: "100%", height: "100%" },
  photoBoxText: { fontSize: 12, color: "#8a7c68" },
  input: {
    borderWidth: 1,
    borderColor: "#ece2d3",
    backgroundColor: "#fffaf3",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  primaryButton: { backgroundColor: "#ea7c1f", borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  adRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  adThumb: { width: 48, height: 48, borderRadius: 8 },
  adHeadline: { fontWeight: "700", fontSize: 13 },
  adSubcopy: { fontSize: 12, color: "#8a7c68" },
  cardActions: { flexDirection: "row", justifyContent: "space-between" },
  link: { fontSize: 12, color: "#8a7c68", textDecorationLine: "underline" },
});
