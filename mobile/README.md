# Menuko Staff (mobile)

React Native(Expo) 앱 — 주방/캐셔 전용. 손님 주문 화면과 사장님 관리자 화면은 계속
`../` (Next.js 웹앱)에 있습니다. 백엔드는 웹앱과 같은 Supabase 프로젝트를 공유합니다.

## 처음 세팅하기

1. **환경 변수** — `.env.example`을 `.env`로 복사하고, 웹앱(`../.env.local`)과 같은
   프로젝트의 URL/anon key를 넣기 (service role key는 절대 넣지 않음 — 이 앱은 사용자
   기기에 설치되는 앱이라 비밀키를 담으면 안 됨).
   ```bash
   cp .env.example .env
   ```
2. **의존성 설치**
   ```bash
   npm install
   ```
3. **실행** — 실기기에 [Expo Go](https://expo.dev/go) 앱을 설치하고 QR을 스캔:
   ```bash
   npm start
   ```
4. **로그인** — 웹앱 `/admin/accounts`에서 만든 주방/캐셔 계정으로 로그인하면 됩니다.
   사장님(owner) 계정으로 로그인하면 "아직 지원하지 않음" 화면이 뜨고 웹 관리자 페이지로
   안내합니다 — 사장님용 네이티브 화면은 다음 단계로 예정.

## 푸시 알림 활성화하기 (선택, 지금은 기본 꺼짐 상태나 마찬가지)

푸시는 Expo의 EAS 프로젝트 ID가 있어야 동작합니다. 이 저장소에는 아직 연결이 안 되어
있어서, 로그인해도 "No EAS projectId configured" 경고만 뜨고 조용히 건너뜁니다(앱이
멈추거나 에러 화면이 뜨진 않음). 활성화하려면:

```bash
npx eas login       # Expo 계정 필요 (무료 가입 가능)
npx eas init         # app.json에 extra.eas.projectId가 채워짐
```

이후 실기기(시뮬레이터/에뮬레이터는 푸시 토큰을 못 받는 경우가 많음)에서 로그인하면
`device_push_tokens` 테이블에 토큰이 저장되고, 새 주문 생성 시 주방에, 주문이 "서빙완료"로
바뀌면 캐셔에 푸시가 갑니다. 서버 쪽 발송 로직은 `../supabase/functions/notify-order-event`.

## 앱스토어/플레이스토어 정식 배포

`eas.json`의 빌드 프로파일까지는 준비해뒀지만, 실제 제출은 사장님(개발자) 소유의
**Apple Developer 계정($99/년)**, **Google Play Console 계정($25 1회)**이 있어야
가능합니다. 계정 생성 후 `eas build --platform all` → `eas submit`으로 진행하면 됩니다.

## 공용 코드 동기화

`src/lib/database.types.ts`, `constants.ts`, `money.ts`, `orders.ts`는 웹앱
(`../src/lib/*`)의 **복사본**입니다 (모노레포 도구 없이 1인 개발 기준으로 단순화한 선택).
DB 마이그레이션을 추가했다면:

```bash
cd .. && supabase gen types typescript --linked > src/lib/database.types.ts
# (위 파일 상단에 웹앱용 주석을 다시 붙이고) 그대로 mobile/src/lib/database.types.ts에 복사
```

## 오프라인 동작

주방/캐셔 화면은 마지막으로 받은 주문을 기기에 캐시해두고(`src/lib/offline-cache.ts`),
"조리 완료"/"정산 마감" 같은 변경은 오프라인이어도 즉시 화면에 반영한 뒤 재시도 대기열에
쌓아둡니다(`src/lib/offline-queue.ts`). 연결이 복구되면 자동으로 순서대로 서버에
반영됩니다. 여러 대의 캐셔 기기가 동시에 오프라인 상태로 같은 주문을 바꾸는 경우의 충돌
해결은 하지 않습니다 (소규모 매장 1대 운영 전제).

## 수동 QA 체크리스트 (실기기에서 확인해 주세요)

이 환경에서는 시뮬레이터/에뮬레이터를 직접 조작할 수 없어 아래는 사람이 직접 확인해야
합니다.

- [ ] 주방 계정 로그인 → 웹에서 만든 주문이 실시간으로 뜨는지
- [ ] "조리 완료" 누르면 캐셔 화면(웹 또는 앱)에서 상태가 바뀌는지
- [ ] 캐셔 계정 로그인 → 테이블별 합계가 맞는지, 결제 QR/링크가 뜨는지, "정산 마감"이 되는지
- [ ] 비행기 모드 켜고 "조리 완료" 눌러보기 → 화면엔 바로 반영되고, 모드 끄면 서버에도
      반영되는지 (`device_push_tokens`/`orders` 확인)
- [ ] `eas init` 이후, 앱을 백그라운드로 보내고 다른 기기에서 새 주문 생성 → 푸시 알림이
      오는지 (시뮬레이터에서는 안 될 수 있음, 실기기 필요)
