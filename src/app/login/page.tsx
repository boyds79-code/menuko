import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-1">
        <Link href="/" className="text-2xl font-bold text-brand">
          Menuko
        </Link>
        <p className="text-sm text-muted">사장님 / 주방 / 캐셔 로그인</p>
      </div>
      <LoginForm />
      <p className="text-sm text-muted">
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="text-brand underline">
          무료로 시작하기
        </Link>
      </p>
    </main>
  );
}
