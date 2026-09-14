export default function AdminAnalyticsPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
      <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
        프리미엄
      </span>
      <h1 className="text-lg font-semibold">매출 분석 — 준비 중</h1>
      <p className="max-w-sm text-sm text-muted">
        요일별·시간대별 매출, 베스트셀러 순위, 메뉴별 평균 주문 횟수 등은 프리미엄 플랜에서
        제공될 예정입니다. 첫 2개월은 프리미엄도 무료로 체험할 수 있어요.
      </p>
    </main>
  );
}
