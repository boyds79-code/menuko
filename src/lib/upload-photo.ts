import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

// Compresses an image client-side before upload — storage cost is the main
// server-bill variable, so we never store originals (spec section 6).
export async function uploadPhoto(
  bucket: "menu-photos" | "payment-qr" | "ad-images",
  restaurantId: string,
  file: File,
): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/webp",
  });

  const path = `${restaurantId}/${crypto.randomUUID()}.webp`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
    contentType: "image/webp",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
