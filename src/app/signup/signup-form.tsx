"use client";

import { useActionState, useState } from "react";
import { signup, type SignupState } from "./actions";
import { LegalModal } from "./legal-modal";
import { TermsContent } from "../terms/terms-content";
import { PrivacyContent } from "../privacy/privacy-content";
import { UiIcon } from "@/components/ui-icon";

const initialState: SignupState = { error: null };

const INPUT =
  "h-12 w-full rounded-2xl border border-border bg-card px-4 outline-none transition placeholder:text-muted/60 focus:border-brand focus:ring-4 focus:ring-brand/15";

function StepHeading({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
        {n}
      </span>
      <h2 className="font-semibold">{title}</h2>
    </div>
  );
}

// Terms/Privacy can only be confirmed from inside LegalModal (after
// scrolling to the end), so these rows open the modal rather than being
// checkboxes.
function AgreementRow({ label, confirmed, onOpen }: { label: string; confirmed: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-left transition ${
        confirmed ? "border-brand/40 bg-brand-soft" : "border-border bg-card hover:border-brand"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          confirmed ? "bg-brand text-brand-foreground" : "bg-background text-muted"
        }`}
      >
        <UiIcon name={confirmed ? "check" : "doc"} className="h-[18px] w-[18px]" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-sm font-semibold">{label}</span>
        <span className={`text-xs ${confirmed ? "text-brand-ink" : "text-muted"}`}>
          {confirmed ? "Read and confirmed" : "Tap to read and confirm"}
        </span>
      </span>
      {!confirmed && <UiIcon name="arrowRight" className="h-4 w-4 text-muted" />}
    </button>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [openModal, setOpenModal] = useState<"terms" | "privacy" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const agreed = termsConfirmed && privacyConfirmed;

  return (
    <form action={formAction} className="flex w-full flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="sr-only">Your restaurant</legend>
        <StepHeading n={1} title="Your restaurant" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="restaurantName" className="text-sm font-semibold">
            Restaurant name
          </label>
          <input
            id="restaurantName"
            name="restaurantName"
            required
            autoComplete="organization"
            placeholder="e.g. Kusina ni Maria"
            className={INPUT}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span id="businessTypeLabel" className="text-sm font-semibold">
            Business type
          </span>
          <div role="radiogroup" aria-labelledby="businessTypeLabel" className="grid grid-cols-2 gap-3">
            {[
              { value: "restaurant", label: "Restaurant", icon: "utensils" as const },
              { value: "cafe", label: "Cafe", icon: "cup" as const },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/15"
              >
                <input
                  type="radio"
                  name="businessType"
                  value={opt.value}
                  defaultChecked={opt.value === "restaurant"}
                  className="peer sr-only"
                />
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-muted peer-checked:bg-brand peer-checked:text-brand-foreground">
                  <UiIcon name={opt.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="text-sm font-semibold">{opt.label}</span>
              </label>
            ))}
          </div>
          <span className="text-xs text-muted">
            You can change this later in Settings. It&apos;s used to target cross-promotion ads.
          </span>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="sr-only">Your login</legend>
        <StepHeading n={2} title="Your login" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-semibold">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={INPUT}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-semibold">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              aria-describedby="passwordHint"
              className={`${INPUT} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-1.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted transition hover:bg-background hover:text-foreground"
            >
              <UiIcon name={showPassword ? "eyeOff" : "eye"} className="h-[18px] w-[18px]" />
            </button>
          </div>
          <span id="passwordHint" className="text-xs text-muted">
            At least 6 characters.
          </span>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="sr-only">Agreements</legend>
        <StepHeading n={3} title="Agreements" />
        <input type="hidden" name="agreeToTerms" value={agreed ? "on" : ""} />
        <div className="flex flex-col gap-2">
          <AgreementRow label="Terms of Service" confirmed={termsConfirmed} onOpen={() => setOpenModal("terms")} />
          <AgreementRow label="Privacy Policy" confirmed={privacyConfirmed} onOpen={() => setOpenModal("privacy")} />
        </div>
      </fieldset>

      <LegalModal
        title="Terms of Service"
        open={openModal === "terms"}
        onClose={() => setOpenModal(null)}
        onConfirm={() => {
          setTermsConfirmed(true);
          setOpenModal(null);
        }}
      >
        <TermsContent />
      </LegalModal>

      <LegalModal
        title="Privacy Policy"
        open={openModal === "privacy"}
        onClose={() => setOpenModal(null)}
        onConfirm={() => {
          setPrivacyConfirmed(true);
          setOpenModal(null);
        }}
      >
        <PrivacyContent />
      </LegalModal>

      <div className="flex flex-col gap-3">
        {state.error && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || !agreed}
          aria-describedby={agreed ? undefined : "submitHint"}
          className="flex h-14 items-center justify-center gap-2 rounded-full bg-brand px-6 text-base font-bold text-brand-foreground shadow-[0_10px_24px_rgba(31,92,69,0.22)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {pending ? "Creating your restaurant..." : "Get started for free"}
          {!pending && <UiIcon name="arrowRight" className="h-5 w-5" />}
        </button>
        {!agreed && (
          <p id="submitHint" className="text-center text-xs text-muted">
            Read and confirm both agreements above to continue.
          </p>
        )}
      </div>
    </form>
  );
}
