import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";

// RN counterpart to the web app's src/lib/upload-photo.ts — same principle
// (never store the original, storage cost is the main server-bill
// variable), different toolchain: expo-image-picker to pick,
// expo-image-manipulator to resize/compress, then upload the resulting
// bytes to the same Supabase Storage buckets the web app already has RLS
// policies for (menu-photos / payment-qr / ad-images, owner-write).

export async function pickAndUploadPhoto(
  bucket: "menu-photos" | "payment-qr" | "ad-images" | "restaurant-logo",
  restaurantId: string,
): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: true,
  });
  if (result.canceled || !result.assets[0]) return null;

  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
  );

  const response = await fetch(manipulated.uri);
  const blob = await response.blob();
  const path = `${restaurantId}/${Crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
