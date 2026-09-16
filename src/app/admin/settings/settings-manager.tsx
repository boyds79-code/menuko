"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { uploadPhoto } from "@/lib/upload-photo";
import { updateRestaurant } from "../settings-actions";
import type { BusinessType } from "@/lib/database.types";

type Restaurant = {
  name: string;
  address: string | null;
  business_type: BusinessType;
  payment_qr_url: string | null;
  payment_link: string | null;
  logo_url: string | null;
} | null;

export function SettingsManager({
  restaurantId,
  initial,
}: {
  restaurantId: string;
  initial: Restaurant;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [businessType, setBusinessType] = useState<BusinessType>(initial?.business_type ?? "restaurant");
  const [paymentLink, setPaymentLink] = useState(initial?.payment_link ?? "");
  const [qrUrl, setQrUrl] = useState(initial?.payment_qr_url ?? null);
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  async function handleQrUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadPhoto("payment-qr", restaurantId, file);
      setQrUrl(url);
      await updateRestaurant({ paymentQrUrl: url });
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    try {
      const url = await uploadPhoto("restaurant-logo", restaurantId, file);
      setLogoUrl(url);
      await updateRestaurant({ logoUrl: url });
      router.refresh();
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Restaurant info</h2>
        <label className="flex flex-col gap-1 text-sm">
          Logo (optional)
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => logoFileRef.current?.click()}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-background"
            >
              {logoUrl ? (
                <Image src={logoUrl} alt="Restaurant logo" fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                  Add logo
                </span>
              )}
              {uploadingLogo && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] text-white">
                  Uploading
                </span>
              )}
            </button>
            <input
              ref={logoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
                e.target.value = "";
              }}
            />
            <span className="text-xs text-muted">Shown if you add it — not required to get started.</span>
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Restaurant name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => updateRestaurant({ name })}
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Address
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={() => updateRestaurant({ address })}
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Business type
          <select
            value={businessType}
            onChange={(e) => {
              const next = e.target.value as BusinessType;
              setBusinessType(next);
              updateRestaurant({ businessType: next });
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          >
            <option value="restaurant">Restaurant</option>
            <option value="cafe">Cafe</option>
          </select>
          <span className="text-xs text-muted">
            Used to target cross-promotion ads (restaurants see cafe ads and cafes see
            restaurant ads by default).
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Payment info</h2>
        <p className="text-xs text-muted">
          Upload a payment QR image you already have (GCash/Maya, etc.) and it&apos;s shown as-is
          on the customer order screen and cashier screen. Menuko never processes payments
          directly.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-background"
          >
            {qrUrl ? (
              <Image src={qrUrl} alt="Payment QR" fill className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs text-muted">
                Upload QR
              </span>
            )}
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                Uploading
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleQrUpload(file);
              e.target.value = "";
            }}
          />
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Payment link (optional — from PayMongo or another external provider)
            <input
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              onBlur={() => updateRestaurant({ paymentLink })}
              placeholder="https://..."
              className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
