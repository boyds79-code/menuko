# Menuko

QR로 메뉴를 주문받고 싶은 식당·카페 소상공인을 위한 무료 앱 (Phase 1 MVP — 세부 지역 타겟).

화면 4개: 손님 주문(`/order/[qrToken]`), 주방(`/kitchen`), 캐셔(`/cashier`), 사장님 관리자(`/admin`).
스택: Next.js (App Router, TypeScript, Tailwind) + Supabase (Postgres, Auth, Realtime, Storage).

**주방/캐셔용 네이티브 앱**(Android+iOS)은 `mobile/`에 별도 Expo 프로젝트로 있습니다 —
푸시 알림 + 오프라인 동작이 필요해 네이티브로 만들었고, 손님 주문과 사장님 관리자는 계속
이 웹앱을 씁니다. 자세한 건 `mobile/README.md` 참고.

## 처음 세팅하기

1. **Supabase 프로젝트 만들기** — [supabase.com](https://supabase.com)에서 무료 프로젝트 1개 생성.
2. **환경 변수 설정** — `.env.local.example`을 `.env.local`로 복사하고, Supabase 프로젝트의
   Project Settings → API에서 URL / anon key / service role key를 채워 넣기.
   ```bash
   cp .env.local.example .env.local
   ```
3. **DB 마이그레이션 적용** — Supabase CLI로 로그인 후 프로젝트를 연결하고 마이그레이션을 push:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   (`0001_init.sql`이 테이블+RLS+RPC를, `0002_storage.sql`이 사진용 Storage 버킷 2개
   (`menu-photos`, `payment-qr`), `0003_ads.sql`이 크로스 프로모션 광고 테이블 + `ad-images`
   버킷 + `restaurants.business_type`/`menu_template` 컬럼을, `0004_push_tokens.sql`이
   모바일 앱의 푸시 토큰 테이블을, `0005_order_webhook.sql`이 주문 생성/상태변경 시
   `supabase/functions/notify-order-event`를 호출하는 DB 트리거를 만듭니다.)
4. **개발 서버 실행**
   ```bash
   npm install
   npm run dev
   ```
5. **첫 사장님 계정 만들기** — `http://localhost:3000/signup`에서 매장 이름/이메일/비밀번호로
   가입하면 매장 + 오너 계정이 함께 생성됩니다. `/admin/accounts`에서 주방/캐셔 계정을
   추가로 발급할 수 있습니다 (무료 플랜은 역할당 1개).
6. **(모바일 앱의 푸시 알림용) Edge Function 배포** — 로컬에 Docker 없어도 배포됩니다:
   ```bash
   supabase functions deploy notify-order-event --no-verify-jwt
   ```
   `--no-verify-jwt`인 이유와 그 보안 트레이드오프는 `supabase/migrations/0005_order_webhook.sql`
   상단 주석에 적어뒀습니다.

## 프로젝트 구조

```
src/app/
  order/[qrToken]/     # 손님: QR 스캔 → 메뉴 → 장바구니 → 주문 (로그인 불필요)
  kitchen/              # 주방: 실시간 주문 목록 + 조리 완료 체크
  cashier/              # 캐셔: 테이블별 누적 합계 + 결제 QR/링크 + 정산 마감
  admin/                # 사장님: 메뉴 관리, 테이블/QR, 광고, 계정 관리, 매장 설정, (잠긴) 분석
  print/[restaurantId]/ # 인쇄용 메뉴판 + 디자인 템플릿 선택 (브라우저 인쇄 → PDF로 저장)
  login/, signup/       # 인증
src/lib/
  supabase/             # client.ts(브라우저) / server.ts(서버) / admin.ts(서비스 롤, 서버 전용)
  auth.ts               # /admin,/kitchen,/cashier 페이지의 role 가드
  database.types.ts     # `supabase gen types`로 생성한 타입 — 마이그레이션 후 재생성할 것
  menu-templates.ts     # Classic/Warm/Minimal 3종 스타일 토큰 (웹 메뉴 + 인쇄 메뉴판 공유)
  pick-ad.ts             # 크로스 프로모션 광고 타겟팅 로직 (반대 업종 우선, 없으면 아무거나)
supabase/migrations/     # 스키마 + RLS + Storage 정책 (SQL)
```

## 설계 메모 (스펙과의 차이점)

- **인쇄 메뉴판은 Puppeteer 대신 브라우저 인쇄(`window.print()` + `@media print`)를 사용합니다.**
  서버리스 환경에 헤드리스 크롬을 올리는 복잡도를 피하기 위한 선택이며, 사용자가 인쇄
  대화상자에서 "PDF로 저장"을 선택하면 동일한 결과를 얻습니다.
- **결제는 직접 처리하지 않습니다.** 오너가 업로드한 GCash/Maya QR 이미지를 손님·캐셔
  화면에 그대로 띄우거나, 오너가 외부에서 발급받은 결제 링크(PayMongo 등)를 표시만 합니다.
- **주문 가격은 항상 서버에서 조회합니다.** 손님 브라우저는 `menu_item_id`+수량만 보내고,
  실제 가격은 `create_order` RPC가 그 시점의 `menu_items.price`에서 가져옵니다 — 클라이언트가
  가격을 조작할 수 없습니다.
- **주문 데이터는 REST로 직접 노출하지 않습니다.** `orders`/`order_items`에는 공개 SELECT
  정책이 없고, 손님은 주문 생성 시 발급되는 `access_token`으로만 `get_order_for_customer`
  RPC를 통해 자기 주문을 읽습니다. 매장 직원은 로그인 기반 RLS로 자기 매장 데이터만 봅니다.

## 크로스 프로모션 광고 (오너 요청으로 스펙보다 먼저 구현)

스펙 8번 표는 이 기능을 "매장 밀도가 쌓인 뒤"로 미뤄뒀지만, 슬롯/인프라를 미리 마련해두는
성격으로 지금 단계에 포함했습니다.

- 매장은 가입 시(또는 `/admin/설정`) 업종(식당/카페)을 정합니다.
- `/admin/ads`에서 오너가 직접 템플릿(Classic/Warm/Minimal)을 고르고 헤드라인/부제/사진/링크로
  광고를 만듭니다 — 결제 체계가 없는 지금은 모든 가입 매장에게 무료로 열려 있습니다.
- 손님이 주문 후 합계를 확인하는 화면(`/order/[qrToken]`의 주문 확인 뷰)에 다른 매장의 광고가
  뜹니다. 기본 규칙(식당 손님에겐 카페 광고, 카페 손님에겐 식당 광고)은 `src/lib/pick-ad.ts`
  한 곳에 모아뒀고, 반대 업종 광고 재고가 없으면 아무 매장 광고로 대체하며, 그마저 없으면
  광고 자리 자체를 렌더링하지 않습니다.
- `ads` 테이블은 `orders`와 달리 공개 콘텐츠라 공개 SELECT를 허용합니다 (`0003_ads.sql`).

## 지금 만들지 않은 것

기획서(스펙) section 8 중 나머지 — 배달앱 API 연동, 근처 매장 가격비교, 콤보 추천, 원가/순이익
계산, 기존 POS 연동, 자체 결제 게이트웨이 — 는 검증 게이트를 통과하기 전까지 의도적으로
구현하지 않았습니다.
