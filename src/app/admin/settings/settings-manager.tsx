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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">매장 정보</h2>
        <label className="flex flex-col gap-1 text-sm">
          매장 이름
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => updateRestaurant({ name })}
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          주소
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={() => updateRestaurant({ address })}
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          업종
          <select
            value={businessType}
            onChange={(e) => {
              const next = e.target.value as BusinessType;
              setBusinessType(next);
              updateRestaurant({ businessType: next });
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          >
            <option value="restaurant">식당</option>
            <option value="cafe">카페</option>
          </select>
          <span className="text-xs text-muted">
            크로스 프로모션 광고 노출 기준으로 쓰입니다 (식당 손님에겐 카페 광고, 카페 손님에겐
            식당 광고가 기본으로 노출돼요).
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">결제 안내</h2>
        <p className="text-xs text-muted">
          GCash/Maya 등 매장이 이미 가진 결제 QR 이미지를 올려두면, 손님 주문 화면과 캐셔 화면에
          그대로 표시됩니다. Menuko는 결제를 직접 처리하지 않습니다.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-background"
          >
            {qrUrl ? (
              <Image src={qrUrl} alt="결제 QR" fill className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs text-muted">
                QR 업로드
              </span>
            )}
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                업로드중
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
            결제 링크 (선택, PayMongo 등 외부에서 발급받은 링크)
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
