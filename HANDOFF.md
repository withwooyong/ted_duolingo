# Session Handoff

> Last updated: 2026-06-13 (KST)
> Branch: `main`
> Latest commit: `7502e35` - Phase 4(PWA): 오프라인 full reload 복원 — 정적 export + 서비스워커 앱 셸 캐시 (D23). **로컬 커밋만 — 푸시 안 함(사용자 요청 시)**
> Repo: https://github.com/withwooyong/ted_duolingo (**public** — 직전 푸시는 `acd81dc`, 이번 D23은 미푸시)

## Current Status

Phase 0 → 1 → 2 → 3(로컬) → Phase 4 SM-2 복습 → Shadowing → 오프라인 읽기 캐시(D21) → 오프라인 쓰기 큐(D22)에 이어 **Phase 4 PWA 오프라인 full reload 복원(D23) 로컬 구현 완료 — Phase 4 §8 로컬 범위 완결**. dev web(Metro 메모리 서버)에서는 불가능했던 "오프라인 page reload 시 앱 부팅"을, 정적 export(`pnpm build:web` → `dist/`) + 서비스워커(`public/sw.js`)로 **앱 셸(index.html + 해시 JS/CSS 번들)**을 캐시해 구현. SW는 **교차 오리진(Supabase)·비-GET을 통과**시켜 역할 분리 유지(데이터=persist D21, 쓰기=sync-queue D22, 셸=SW D23). SW 등록은 **production export에서만**(dev Metro는 캐시할 해시 번들 없음). 부수 수정: onlineManager가 오프라인 로드 시 온라인으로 착각하던 문제를 `navigator.onLine` 초기 동기화로 해결. 검증: **vitest 63 + 모바일 e2e 67(학습) + 9(복습) + 15(오프라인 읽기) + 21(오프라인 쓰기) + 13(PWA, 신규)** 전부 통과. typecheck·lint clean. **푸시 안 함(로컬 커밋 `7502e35`만).**

## Completed This Session (Phase 4 — PWA 오프라인 full reload 복원)

| # | Task | Files |
|---|------|-------|
| 1 | 서비스워커(런타임 캐싱: 네비 network-first→셸 fallback, 해시 에셋 cache-first, Supabase·비-GET 통과, 버전 정리+claim) | apps/mobile/public/sw.js(신규) |
| 2 | single 모드 HTML 셸(manifest·theme-color·apple-touch-icon — `+html.tsx` 무시되므로 public/index.html) + PWA 매니페스트 + 아이콘 | apps/mobile/public/index.html·manifest.json·icon-192.png·icon-512.png(신규) |
| 3 | SW 등록 컴포넌트(web + production-only 가드) + _layout 마운트 | apps/mobile/src/components/sw-register.tsx(신규), src/app/_layout.tsx |
| 4 | onlineManager 웹 초기 상태 `navigator.onLine` 동기화(오프라인 로드 시 배너·일시정지 보장) | apps/mobile/src/lib/online-status.ts |
| 5 | `build:web` 스크립트(expo export -p web) | apps/mobile/package.json, package.json(루트 패스스루) |
| 6 | e2e(13체크 — dist/ 자체 SPA 서버 서빙·SW control·오프라인 reload 복원) + 문서 | apps/mobile/e2e/pwa_offline_reload.py(신규), e2e/README.md, PLAN.md(v1.0 D23·§8), CLAUDE.md, CHANGELOG.md |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | RevenueCat + IAP 실연동 | ⬜ 클라우드 전환 후 | **클라우드 Supabase + EAS 빌드 시점을 사용자와 논의 후 진행.** 교체 지점은 `hooks/use-premium.ts` mutationFn + RevenueCat 웹훅→Edge Function (D16 주석 참조) |
| 2 | Phase 4 — 고도화 | ✅ §8 로컬 범위 완결 | SM-2 ✅, Shadowing ✅, 오프라인 읽기 ✅, 오프라인 쓰기 ✅, **PWA full reload 복원 ✅(D23)**. 로컬로 가능한 §8 항목은 전부 완료 — 남은 건 클라우드 전환 의존 항목들뿐 |
| 2b | Shadowing 네이티브 실 STT | ⬜ EAS 빌드 시 | 현재 웹만 실연동. `lib/speech-recognition.ts`의 네이티브 분기(null 반환)에 `@react-native-voice/voice` 또는 `expo-speech-recognition` 연결. 동일 인터페이스라 컴포넌트 수정 불필요 |
| 2c | 오프라인 쓰기 큐 — 복습 확장 | ⬜ 선택 | 이번엔 레슨만(복습은 `review-session`이 시각 의존이라 제외). 복습까지 오프라인화하려면 due 목록 스냅샷 캐싱 전략(시점 동결) 설계 필요 |
| 2d | PWA 실배포(호스팅·HTTPS·아이콘 보강) | ⬜ 선택 | SW·매니페스트·오프라인 복원은 구현·검증 완료. 실배포 시 `pnpm build:web` 산출 `dist/`를 정적 호스팅(HTTPS 필수 — SW 등록 조건). 매니페스트 아이콘은 기존 icon.png 리사이즈(maskable 여백 보강·스플래시는 추후) |
| 3 | 게임화 수치 서버 검증 (Edge Function) | ⬜ 클라우드 전환 시 | 클라이언트가 profiles·league_entries 직접 update — RLS 0002 주석 참조. 오프라인 큐 재실행도 동일 클라이언트 경로 |
| 4 | Google·Apple OAuth | ⬜ 보류 | 클라우드 Supabase 전환 시 (로컬은 이메일만) |
| 5 | Lottie 에셋 교체 / 실광고(AdMob) | ⬜ 선택 | 완료 연출은 Reanimated(D15), 광고는 ad-banner.tsx placeholder — 에셋·네이티브 빌드 확보 시 교체 |
| 6 | Premium 가격 확정 | ⬜ 스토어 제출 전 | PREMIUM_PLANS(월 9,900/연 79,000)는 임시값 (D16) — 앱 이름(U2)과 함께 제출 전 결정 |

## Key Decisions Made

- **D23 — PWA 앱 셸 캐시로 오프라인 full reload 복원**: D21(데이터)·D22(쓰기)의 마지막 조각. 정적 export(`pnpm build:web`→`dist/`) + 서비스워커(`public/sw.js`)가 **앱 셸만** 캐시한다. ① 역할 분리 — SW는 **교차 오리진(Supabase)·비-GET 통과**, 데이터는 persist·쓰기는 sync-queue 담당. ② SW 전략: 네비게이션 network-first(오프라인이면 셸 `/` fallback)·해시 에셋(`/_expo/static/`·`/assets/`) cache-first·그 외 same-origin GET network-first. `SHELL_CACHE` 버전은 `query-client.ts`의 `CACHE_BUSTER`와 **독립**. ③ 등록은 **production export만**(`components/sw-register.tsx`, `NODE_ENV==='production'`) — dev Metro는 해시 번들 없어 제외. ④ web `output:"single"`은 `+html.tsx`를 **무시**하므로 manifest 링크·meta는 `public/index.html`로 주입(Expo가 CSS/JS 해시 링크 자동 주입). ⑤ `public/`는 export 시 `dist/` 루트로 복사. ⑥ onlineManager 기본값 `online:true`가 오프라인 로드 시 잘못 남던 것을 `initOnlineManager`의 `navigator.onLine` 초기 동기화로 수정
- **D22 — 오프라인 쓰기 큐는 레슨 한정 "의도 재실행"**: 완료된 절대값을 큐잉하면 서버 상태와 충돌하므로, 레슨 입력(`result`·`history`)을 영속 큐(`lib/sync-queue.ts`, zustand+AsyncStorage, userId 태깅)에 적재했다가 복귀 시 `SyncProcessor`가 `completeLessonWrite`를 **서버 fresh profile에 대고 재실행**한다(XP·스트릭·SM-2·리그가 read-modify-write라 충돌 흡수). 쓰기 로직은 `lib/learning-writes.ts`의 `completeLessonWrite` 단일 소스(온라인 훅도 호출). 멱등성은 `progressId`(=user_progress.id) 중복 skip, 시각 정확도는 `completedAt`(학습 시점) 기준 계산. 오프라인 완료는 홈 낙관적 갱신(`setQueryData`로 profile·daily-xp·skill-tree `markLessonComplete`) + "동기화 대기 N" pill, 복귀 시 invalidate로 보정. 하트는 오답에 캐시 낙관 차감→동기화 때 `heartsLost` 일괄. **복습은 제외**(due 목록 `review-session`이 시각 의존이라 D21에서 persist 제외, 오프라인 세션 불가 → 진입 차단 유지). 오프라인 레슨 진입은 **prefetch된 레슨만**(홈이 "이어하기" 미리 캐시)
- **D21 — 오프라인은 읽기 캐시 중심**: TanStack Query persistence(AsyncStorage)로 콘텐츠 스냅샷만 영속, 시각·주간 의존 쿼리(`league`·`review-count`·`review-session`)는 `shouldDehydrateQuery`로 제외. 사용자별 캐시는 persister storage 키에 userId. 오프라인 감지는 플랫폼 분기(웹 onlineManager 기본, 네이티브 NetInfo). dev web은 SW 없어 오프라인 full reload 불가
- **D20 — Shadowing은 6번째 ExerciseType + STT 추상화**: `SHADOW_SPEAK`로 기존 5종·레슨·복습에 편입, 채점은 단어 포함률 ≥ 0.6. STT는 `lib/speech-recognition.ts`(웹만 Web Speech 실연동, 네이티브는 EAS 시)
- **D19 — SM-2 복습은 전용 상태 테이블**: `UserReviewState`에 (사용자×문제) 스케줄 영속, 복습 XP는 총합만·하트 무소모
- **D16~D18** — 구독 mock 결제 / 활성 언어쌍 is_active 1개 / Admin Hono SSR(React 없음). (이전 핸드오프 참조)
- **AI 생성은 구조화 출력 + 발행 전 검증 이중 방어**, content_drafts RLS는 정책 없이 활성화만(직접 연결 Admin만 접근)

## Known Issues

- **PWA(D23)**: ① **dev web은 여전히 오프라인 full reload 불가**(Metro 메모리 번들) — PWA 복원은 `pnpm build:web` 정적 export + SW 서빙에서만. `pwa_offline_reload.py`는 `dist/`를 자체 python SPA 서버(3010)로 서빙해 검증한다(다른 e2e와 달리 8081 dev 서버 불필요). ② **persist 쓰로틀(1s) 전에 오프라인 reload하면 데이터 복원 실패** — 셸은 SW로 뜨지만 데이터 캐시(localStorage)가 아직 안 써졌기 때문. 실사용은 온라인 체류가 길어 무관하나, e2e는 오프라인 전 2초 대기로 플러시를 보장한다. ③ 단일 번들(`entry-<hash>.js`)이라 미방문 라우트 청크 이슈는 없음. ④ SW 등록엔 **HTTPS 또는 localhost 필요** — 실배포 시 HTTPS 호스팅 필수. ⑤ `online-status.ts`·`sw.js`·`public/*` 수정 후엔 `pnpm build:web` 재빌드해야 e2e에 반영
- **오프라인 쓰기 큐(D22)**: ① dev web은 SW가 없어 오프라인 full reload 불가 — `offline_write_loop.py`는 SPA 내에서 오프라인 레슨을 풀고 복귀 후 reload로 서버 반영을 검증한다(reload 자체는 온라인 시점). ② 동기화 중 **부분 실패**(진행 삽입 후 후속 쓰기 전에 네트워크 사망)는 극히 드물게 후속 쓰기(프로필 XP 등) 손실 가능 — 재시도 시 `progressId` 멱등 skip이라 **이중 적용은 없음**(손실 < 이중 적용 우선). ③ 오프라인 레슨 진입은 prefetch된 레슨만 가능(미캐시 레슨은 `offline-blocked`). ④ 리그 주간 XP는 동기화 시점 주차에 가산 — 주 경계를 넘긴 오프라인 완료는 새 주에 반영될 수 있음(드문 edge, 문서화)
- **오프라인 읽기(D21)**: NetInfo web은 window offline에 즉시 반응 안 해 웹은 onlineManager 기본 리스너 사용. `lib/online-status.ts` 수정 시 Metro `--clear` 재기동 필요(CI 모드 워치 안 함)
- **Shadowing**: 헤드리스 크로뮴엔 Web Speech가 없어 fallback("직접 확인") — e2e는 `window.__mockShadowTranscript` 주입으로 검증. 실제 마이크는 일반 Chrome/EAS 빌드
- Alert.alert는 Expo web에서 no-op(하트 소진/이탈 다이얼로그 미표시 — 네이티브 전용 UX)
- 새 라우트 파일 추가 후 typecheck는 dev 서버가 `.expo/types/router.d.ts` 재생성 후 통과(이번 세션은 새 라우트 없음 — 컴포넌트·lib만)
- 봇 코호트·시드 주차·Metro 캐시·cuid() 기본값 등 기존 함정은 CLAUDE.md 참조

## Context for Next Session

- **사용자 목표**: PLAN.md 기반 앱 전체 완성. 품질 우선, Phase 순서 (0✅→1✅→2✅→3 로컬✅→4 §8 로컬 범위✅)
- **다음 작업 후보**: PLAN.md §8에서 **로컬로 가능한 항목은 전부 완료**. 남은 건 전부 **클라우드 전환 의존**: ① **클라우드 Supabase 전환 + EAS 빌드 + RevenueCat 실연동 + Shadowing 네이티브 STT + OAuth + 게임화 서버 검증(Edge Function)** (Phase 3 마감 — **계정/비용 논의 선행 필요**) 또는 ② **선택 항목**(오프라인 쓰기 큐 복습 확장 / PWA 실배포 / Lottie·실광고). 시작 전 방향 확인할 것
- **PWA 동작**: `pnpm build:web` → `dist/`(정적). 서빙된 앱은 web+production이라 `sw-register.tsx`가 `/sw.js` 등록 → SW가 셸·번들 캐시. 오프라인 reload 시 SW가 캐시된 index.html+번들로 부팅, persist(localStorage)가 데이터 복원, sync-queue가 쓰기 동기화. SW 로직 손대려면 `public/sw.js`만, HTML 셸은 `public/index.html`만. **수정 후 반드시 `pnpm build:web` 재빌드**(dev엔 SW 미등록)
- **오프라인 쓰기 큐 동작(D22)**: 오프라인 레슨 완료 → `lib/sync-queue.ts` 적재 + 홈 낙관 반영. 복귀 → `components/sync-processor.tsx`가 `completeLessonWrite` 재실행. 쓰기 로직은 `lib/learning-writes.ts` 단일 소스. 멱등 키 `progressId`
- **개발 환경 기동**: `supabase start` → `pnpm db:migrate` → policies/ SQL 번호순 수동 적용(0001~0004) → `pnpm db:seed`. e2e용 dev Expo web: `cd apps/mobile && CI=1 npx expo start --web --port 8081 --clear`
- **검증 루틴**: `pnpm typecheck` + `pnpm lint` + `pnpm test`(vitest 63) + 모바일 e2e. dev 8081 기반: `learning_loop.py` 67 + `review_loop.py` 9(psql 필요) + `offline_loop.py` 15 + `offline_write_loop.py` 21. **PWA는 별도**: `pnpm build:web` 후 `python3 e2e/pwa_offline_reload.py` 13(자체 SPA 서버 3010, 8081 불필요). 오프라인 e2e는 `set_offline` 사용. 이번 세션은 새 라우트 없음(typed routes 재생성 불필요)
- **게임화·Freemium 수치는 @ted/shared/constants.ts**, 오프라인 읽기 캐시는 `lib/query-client.ts`, 쓰기 큐는 `lib/sync-queue.ts`·`lib/learning-writes.ts`, PWA 셸 캐시는 `public/sw.js`·`public/index.html`·`components/sw-register.tsx`
- **푸시 상태**: 이번 세션(Phase 4 PWA, D23 — `7502e35`)은 **로컬 커밋만, `origin/main` 미푸시**. 직전 푸시는 D22(`acd81dc`). HANDOFF 해시 현행화 커밋도 미푸시
- **사용자 선호**: 커밋 메시지 한글, 푸시는 명시 요청 시만, 미확정 항목(앱 이름 U2, Premium 가격 등)은 구현 전 확인

## Files Modified This Session (Phase 4 PWA — D23)

```
mobile(신규): public/sw.js, public/index.html, public/manifest.json,
              public/icon-192.png, public/icon-512.png,
              src/components/sw-register.tsx, e2e/pwa_offline_reload.py
mobile(수정): src/app/_layout.tsx(SwRegister 마운트),
              src/lib/online-status.ts(웹 초기 상태 navigator.onLine 동기화),
              package.json(build:web 스크립트)
루트:         package.json(build:web 패스스루)
docs:         e2e/README.md, PLAN.md(v1.0 D23·§8), CLAUDE.md, CHANGELOG.md, HANDOFF.md
```
