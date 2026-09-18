import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <Link href="/" className="text-2xl font-bold text-brand">
          Menuko
        </Link>
        <p className="text-sm text-muted">
          Create your owner account — free (includes 1 owner + 1 kitchen + 1 cashier account)
        </p>
      </div>
      <SignupForm />
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-brand underline">
          Sign in
        </Link>
      </p>
      <p className="max-w-xs text-center text-xs text-muted">
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
    </main>
  );
}
