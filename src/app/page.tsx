import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="text-3xl font-bold text-brand">Menuko</span>
        <p className="max-w-md text-muted">
          QR로 메뉴를 주문받고 싶은 식당·카페 소상공인을 위한 무료 앱
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signup"
          className="rounded-full bg-brand px-6 py-3 font-medium text-brand-foreground shadow-sm transition hover:opacity-90"
        >
          무료로 시작하기
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-border px-6 py-3 font-medium text-muted transition hover:border-brand hover:text-brand"
        >
          사장님/직원 로그인
        </Link>
      </div>
      <p className="text-sm text-muted">
        손님이시라면, 테이블의 QR 코드를 스캔해 주세요.
      </p>
    </main>
  );
}
