# Session Handoff

> Last updated: 2026-06-14 (KST)
> Branch: `main`
> Latest commit: (이번 세션 — Phase 4 오프라인 복습 큐 D24) — **로컬 커밋, 푸시 대기**
> Repo: https://github.com/withwooyong/ted_duolingo (**public**)

## Current Status

Phase 0 → 1 → 2 → 3(로컬) → Phase 4 SM-2 복습 → Shadowing → 오프라인 읽기(D21) → 오프라인 쓰기 큐(D22) → PWA full reload(D23)에 이어 **Phase 4 오프라인 복습 큐(D24) 로컬 구현 완료**. D22가 "복습은 시각 의존이라 제외"로 남겨둔 마지막 오프라인 항목을 레슨과 대칭으로 채웠다. 두 난점 — ① 복습 due 목록이 시각 의존(`due_at <= now`)이라 persist 제외였던 점 → live `review-session`과 **분리된 영속 동결 스냅샷 `review-snapshot`**(온라인일 때만 재동결, 오프라인은 paused로 자연 동결)으로 해결. ② 복습 완료가 레슨 `user_progress` 같은 멱등 키가 없어 재실행 시 SM-2 이중 전진·XP 이중 가산 위험 → **새 가드 테이블 `UserReviewSession`**(RLS 0005)으로 해결. 쓰기는 `completeReviewWrite`(온라인 훅·큐 공용 단일 소스)를 fresh 상태에 대고 재실행. 검증: **vitest 66 + 모바일 e2e 67(학습)+9(복습)+15(오프라인 읽기)+21(오프라인 쓰기)+20(오프라인 복습, 신규)+13(PWA)** 전부 통과. typecheck·lint clean.

## Completed This Session (Phase 4 — 오프라인 복습 큐 D24)

| # | Task | Files |
|---|------|-------|
| 1 | `UserReviewSession` 테이블(멱등 가드) + 마이그레이션 + RLS 0005 | packages/db/prisma/schema.prisma, …/migrations/20260613232500_add_user_review_session/, supabase/policies/0005_review_session.sql(신규) |
| 2 | `reviewXp` 순수함수 추출 + vitest 3케이스 (TDD) | packages/shared/src/logic.ts·logic.test.ts |
| 3 | `completeReviewWrite` 단일 소스(멱등 가드·fresh 재실행) | apps/mobile/src/lib/review-writes.ts(신규) |
| 4 | sync-queue 복습 확장 + SyncProcessor 복습 드레인 | apps/mobile/src/lib/sync-queue.ts, components/sync-processor.tsx |
| 5 | 동결 스냅샷 쿼리·홈 prefetch·오프라인 진입/낙관 반영 | apps/mobile/src/hooks/use-review.ts, app/review.tsx, app/(tabs)/index.tsx, lib/query-client.ts |
| 6 | e2e(20체크) + 문서 | apps/mobile/e2e/offline_review_loop.py(신규), e2e/README.md, PLAN.md(v1.1 D24·§8), CLAUDE.md, CHANGELOG.md |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | RevenueCat + IAP 실연동 | ⬜ 클라우드 전환 후 | 교체 지점 `hooks/use-premium.ts` mutationFn + RevenueCat 웹훅→Edge Function (D16) |
| 2 | Phase 4 — 고도화 | ✅ §8 로컬 범위 완결 | SM-2 ✅, Shadowing ✅, 오프라인 읽기 ✅, 오프라인 쓰기 ✅, **오프라인 복습 ✅(D24)**, PWA full reload ✅(D23). 로컬로 가능한 §8 항목 전부 완료 — 남은 건 클라우드 전환 의존뿐 |
| 2b | Shadowing 네이티브 실 STT | ⬜ EAS 빌드 시 | 웹만 실연동. `lib/speech-recognition.ts` 네이티브 분기에 `@react-native-voice/voice` 등 연결 |
| 2d | PWA 실배포(호스팅·HTTPS·아이콘 보강) | ⬜ 선택 | SW·매니페스트·오프라인 복원 구현·검증 완료. 실배포 시 `dist/` 정적 호스팅(HTTPS 필수) |
| 3 | 게임화 수치 서버 검증 (Edge Function) | ⬜ 클라우드 전환 시 | 클라이언트가 profiles·league_entries·user_review_state·user_review_session 직접 쓰기 — RLS 주석 참조 |
| 4 | Google·Apple OAuth | ⬜ 보류 | 클라우드 Supabase 전환 시 (로컬은 이메일만) |
| 5 | Lottie 에셋 교체 / 실광고(AdMob) | ⬜ 선택 | 완료 연출 Reanimated(D15), 광고 ad-banner.tsx placeholder |
| 6 | Premium 가격 확정 | ⬜ 스토어 제출 전 | PREMIUM_PLANS(월 9,900/연 79,000) 임시값 (D16) — 앱 이름(U2)과 함께 제출 전 결정 |

## Key Decisions Made

- **D24 — 오프라인 복습 큐 = "시점 동결 스냅샷 + 의도 재실행"**: D22(레슨)의 복습 확장. ① **시점 동결**: live `review-session`(gcTime:0·persist 제외, 온라인 정확성 유지)과 **분리된** 영속 쿼리 `review-snapshot`을 둬 온라인일 때 due 세션을 동결(홈이 "이어하기" 레슨처럼 prefetch). 스냅샷 `staleTime:0` — 온라인이면 진입/복귀마다 재동결, **동결은 오프라인(paused)일 때 자연히** 일어난다(이걸 안 하면 persist된 stale-empty 캐시가 굳어 오프라인 배너 미표시 — 실제로 밟은 함정). ② **쓰기**: 복습 입력을 sync-queue `reviews`에 적재→복귀 시 `completeReviewWrite`(`lib/review-writes.ts`, 온라인 훅·큐 공용)를 fresh profile에 대고 재실행. ③ **멱등성**: 복습은 레슨 `user_progress` 같은 가드가 없어 **새 테이블 `user_review_session`**(클라 생성 id, RLS 0005) 신설 — 같은 sessionId면 통째 skip(SM-2·XP 이중 적용 방지). ④ 오프라인 완료는 홈 **낙관 갱신**(총 XP만 — 복습은 일일/주간 제외, 스냅샷 소진→배너 숨김, "동기화 대기" pill 레슨+복습 합산) + 완료 화면 안내. 복습 XP는 `@ted/shared` `reviewXp` 순수함수 단일 소스
- **D23 — PWA 앱 셸 캐시로 오프라인 full reload 복원**: 정적 export + 서비스워커(`public/sw.js`)가 앱 셸만 캐시. SW는 교차 오리진(Supabase)·비-GET 통과(데이터=persist, 쓰기=sync-queue). 등록은 production export만. (이전 핸드오프 참조)
- **D22 — 오프라인 쓰기 큐는 레슨 한정 "의도 재실행"**: 레슨 입력을 영속 큐에 적재→복귀 시 `completeLessonWrite`를 서버 fresh에 재실행. 멱등성 `progressId`. **이번 D24가 이 패턴을 복습으로 확장**
- **D21 — 오프라인은 읽기 캐시 중심**: TanStack Query persistence, 시각·주간 의존 쿼리 persist 제외. (이전 핸드오프 참조)
- **D19/D20** — SM-2 복습 전용 상태 테이블 / Shadowing 6번째 유형. **D16~D18** 구독 mock / 활성 언어쌍 1개 / Admin Hono SSR. (이전 핸드오프 참조)

## Known Issues

- **오프라인 복습(D24)**: ① **dev web은 여전히 오프라인 full reload 불가**(Metro 메모리 번들) — `offline_review_loop.py`는 SPA 내에서 오프라인 복습을 풀고 복귀 후 reload로 서버 반영 검증(reload는 온라인 시점). ② **스냅샷은 `staleTime:0` 필수** — persist된 stale-empty가 굳으면 오프라인 배너 미표시. `online-status.ts`·`use-review.ts` 수정 후 e2e는 Metro `--clear` 재기동 필요(CI 모드 워치 안 함). ③ 동기화 중 **부분 실패**(가드 행 insert 후 SM-2/XP 전 네트워크 사망)는 극히 드물게 후속 쓰기 손실 — 재시도 시 `sessionId` 멱등 skip이라 **이중 적용 없음**(D22와 동일 한계). ④ 오프라인 완료 후 같은 스냅샷 재복습 방지를 위해 완료 시 스냅샷을 빈 세션으로 소진 — 재진입 시 "복습할 문제 없음". ⑤ e2e의 due 백데이트·DB 검증은 `auth.users.email`로 사용자 스코프(profiles에 email 없음, profiles.id=auth.users.id)
- **오프라인 쓰기/PWA/읽기(D22/D23/D21)**: 기존 한계 동일 — dev web SW 없음, persist 쓰로틀(1s) 전 reload 시 데이터 복원 실패, NetInfo web 즉시 미반응 등. CLAUDE.md·이전 핸드오프 참조
- **Shadowing**: 헤드리스 크로뮴엔 Web Speech 없어 fallback — e2e는 `window.__mockShadowTranscript` 주입
- **Alert.alert는 Expo web에서 no-op**(네이티브 전용 UX)
- 이번 세션은 **새 라우트 파일 없음**(lib·hooks·컴포넌트·스키마만) — typed routes 재생성 불필요
- 봇 코호트·시드 주차·Metro 캐시·cuid() 기본값 등 기존 함정은 CLAUDE.md 참조

## Context for Next Session

- **사용자 목표**: PLAN.md 기반 앱 전체 완성. 품질 우선, Phase 순서 (0✅→1✅→2✅→3 로컬✅→4 §8 로컬 범위✅)
- **다음 작업 후보**: PLAN.md §8에서 **로컬로 가능한 항목은 전부 완료**(D24로 오프라인 복습까지 완결). 남은 건 전부 **클라우드 전환 의존**: ① **클라우드 Supabase + EAS 빌드 + RevenueCat + Shadowing 네이티브 STT + OAuth + 게임화 서버 검증(Edge Function)** (Phase 3 마감 — **계정/비용 논의 선행 필요**) 또는 ② **선택 항목**(PWA 실배포 / Lottie·실광고). 시작 전 방향 확인할 것
- **오프라인 복습 큐 동작(D24)**: 온라인 홈 → `review-snapshot` 동결(prefetch). 오프라인 → 홈 due 카운트·배너는 스냅샷 길이 기준, 진입 시 `review.tsx`가 스냅샷 재생. 오프라인 완료 → `lib/sync-queue.ts` `reviews` 적재 + 홈 낙관(총 XP·스냅샷 소진). 복귀 → `components/sync-processor.tsx`가 `completeReviewWrite` 재실행(멱등 키 `sessionId`=user_review_session.id). 쓰기 단일 소스 `lib/review-writes.ts`, 복습 XP `@ted/shared` `reviewXp`
- **개발 환경 기동**: `supabase start` → `pnpm db:migrate` → policies/ SQL 번호순 수동 적용(**0001~0005**) → `pnpm db:seed`. e2e용 dev Expo web: `cd apps/mobile && CI=1 npx expo start --web --port 8081 --clear`
- **검증 루틴**: `pnpm typecheck` + `pnpm lint` + `pnpm test`(vitest 66) + 모바일 e2e. dev 8081 기반: `learning_loop.py` 67 + `review_loop.py` 9(psql) + `offline_loop.py` 15 + `offline_write_loop.py` 21 + **`offline_review_loop.py` 20(psql, 신규)**. PWA는 별도: `pnpm build:web` 후 `python3 e2e/pwa_offline_reload.py` 13(자체 SPA 서버 3010). 오프라인 e2e는 `set_offline` 사용
- **게임화·Freemium 수치는 @ted/shared/constants.ts**, 오프라인 읽기 캐시 `lib/query-client.ts`, 쓰기 큐 `lib/sync-queue.ts`·`lib/learning-writes.ts`·`lib/review-writes.ts`, PWA 셸 캐시 `public/sw.js`·`components/sw-register.tsx`
- **푸시 상태**: 이번 세션(Phase 4 오프라인 복습 D24)은 **로컬 커밋만 — `origin/main` 푸시 대기**(사용자 명시 요청 시 푸시)
- **사용자 선호**: 커밋 메시지 한글, 푸시는 명시 요청 시만, 미확정 항목(앱 이름 U2, Premium 가격 등)은 구현 전 확인

## Files Modified This Session (Phase 4 오프라인 복습 — D24)

```
db(신규):     packages/db/prisma/migrations/20260613232500_add_user_review_session/
db(수정):     packages/db/prisma/schema.prisma(UserReviewSession 모델 + Profile 역관계)
shared(수정): packages/shared/src/logic.ts(reviewXp), logic.test.ts(+3)
mobile(신규): src/lib/review-writes.ts, e2e/offline_review_loop.py
mobile(수정): src/hooks/use-review.ts(스냅샷·완료 단일소스), src/app/review.tsx(오프라인 재생·큐잉),
              src/app/(tabs)/index.tsx(스냅샷 prefetch·게이팅·pill), src/lib/sync-queue.ts(QueuedReview),
              src/components/sync-processor.tsx(복습 드레인), src/lib/query-client.ts(주석)
supabase:     policies/0005_review_session.sql(신규)
docs:         PLAN.md(v1.1 D24·§8), CLAUDE.md, CHANGELOG.md, e2e/README.md, HANDOFF.md
```
