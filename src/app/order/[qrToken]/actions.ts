"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type UploadPaymentProofState = { error: string | null; url: string | null };

// Customers are anonymous — the only proof they own an order is the
// access_token handed to them at checkout, and RLS can't see that value
// (it's not a JWT claim), so ownership has to be checked explicitly here
// before touching storage with the service-role key. Same shape as the
// get_order_for_customer RPC already used to re-read an order.
export async function uploadPaymentProof(
  _prevState: UploadPaymentProofState,
  formData: FormData,
): Promise<UploadPaymentProofState> {
  const orderId = String(formData.get("orderId") ?? "");
  const accessToken = String(formData.get("accessToken") ?? "");
  const file = formData.get("file") as File | null;

  if (!orderId || !accessToken || !file || file.size === 0) {
    return { error: "Please choose a screenshot to upload.", url: null };
  }

  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("get_order_for_customer", {
    p_order_id: orderId,
    p_access_token: accessToken,
  });

  if (!rows || rows.length === 0) {
    return { error: "This order couldn't be verified.", url: null };
  }

  const admin = createAdminClient();
  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `${orderId}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("payment-proofs")
    .upload(path, buffer, { contentType: file.type || "image/jpeg" });

  if (uploadError) {
    return { error: "Upload failed. Please try again.", url: null };
  }

  const { data: urlData } = admin.storage.from("payment-proofs").getPublicUrl(path);

  await admin.from("orders").update({ payment_proof_url: urlData.publicUrl }).eq("id", orderId);

  return { error: null, url: urlData.publicUrl };
}
