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
          사장님 계정 만들기 — 무료 (오너 1 + 주방 1 + 캐셔 1 계정 포함)
        </p>
      </div>
      <SignupForm />
      <p className="text-sm text-muted">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-brand underline">
          로그인
        </Link>
      </p>
    </main>
  );
}
