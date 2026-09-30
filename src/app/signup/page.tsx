import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "./signup-form";

const NEXT_STEPS = [
  { title: "Create your account", body: "Takes about a minute. No card needed." },
  { title: "Add your menu", body: "Type it in, or import a photo or PDF of your paper menu." },
  { title: "Print your table QR codes", body: "Place them on the tables — customers can order right away." },
];

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your restaurant"
      subtitle="Free forever for ordering, kitchen and cashier — includes 1 owner + 1 kitchen + 1 cashier login."
      aside={
        <div className="relative flex flex-col gap-8">
          <p className="font-display max-w-md text-4xl leading-[1.08] font-bold tracking-[-0.02em]">
            From sign-up to your first QR order in three steps.
          </p>
          <ol className="flex flex-col gap-5">
            {NEXT_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-lg font-bold text-[#eaa93b]">
                  {i + 1}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold text-white">{s.title}</span>
                  <span className="text-sm text-[#cbe2d5]">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {["No commission", "No app for customers", "Free to start"].map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-3 py-1.5 text-[#cbe2d5]">
                {t}
              </span>
            ))}
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <p className="text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand underline underline-offset-4">
              Sign in
            </Link>
          </p>
          <p className="text-xs leading-relaxed text-muted">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-brand">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-brand">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
