import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-1">
        <Link href="/" className="text-2xl font-bold text-brand">
          Menuko
        </Link>
        <p className="text-sm text-muted">Owner / kitchen / cashier login</p>
      </div>
      <LoginForm />
      <p className="text-sm text-muted">
        Don&apos;t have an account yet?{" "}
        <Link href="/signup" className="text-brand underline">
          Get started for free
        </Link>
      </p>
    </main>
  );
}
