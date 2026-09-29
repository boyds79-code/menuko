import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in as the owner, kitchen or cashier."
      footer={
        <p className="text-sm text-muted">
          Don&apos;t have an account yet?{" "}
          <Link href="/signup" className="font-semibold text-brand underline underline-offset-4">
            Get started for free
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
