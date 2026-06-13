# Session Handoff

> Last updated: 2026-06-13 (KST)
> Branch: `main`
> Latest commit: `20be934` - Phase 4(SM-2 복습): 간격 반복 복습 — 레슨·복습 SM-2 갱신 + /review 세션 (e2e 9개 체크 검증 완료)
> Repo: https://github.com/withwooyong/ted_duolingo (**public**, 푸시 완료)

## Current Status

Phase 0 → 1 → 2 → 3(로컬) 완료에 이어 **Phase 4 첫 항목 SM-2 간격 반복 복습 로컬 구현 완료**. 레슨·복습 풀이마다 문제별 SM-2 상태를 갱신하고, 홈 복습 배너(due)→`/review` 세션→완료까지 실동작. 검증: vitest 56개 + 모바일 e2e 62개(학습) + 9개(복습) + Admin e2e 15개. **`origin/main` 푸시 완료**.

## Completed This Session (Phase 4 — SM-2 복습)

| # | Task | Files |
|---|------|-------|
| 1 | SM-2 순수 로직 + 상수 + vitest 56개(+5) | packages/shared/src/{logic,constants,logic.test}.ts |
| 2 | `UserReviewState` 모델 + 마이그레이션 + RLS 0004 | packages/db/prisma/schema.prisma, migrations/20260613022526_review_state, supabase/policies/0004_review_state.sql |
| 3 | 레슨 완료 시 SM-2 갱신(`upsertReviewStates`) — 레슨→스킬 언어쌍 조회 후 upsert | src/lib/gamification.ts, src/hooks/use-game.ts |
| 4 | 복습 훅 — due 카운트·세션(due 순 10)·완료(SM-2+XP) | src/hooks/use-review.ts |
| 5 | `/review` 화면 + 홈 복습 배너·완료 스킬 탭 진입 | src/app/review.tsx, src/app/(tabs)/index.tsx |
| 6 | 복습 e2e 9개 체크 (psql due_at 백데이트) | apps/mobile/e2e/review_loop.py, e2e/README.md |
| 7 | 문서 — PLAN v0.6(D19)·CLAUDE.md·CHANGELOG | PLAN.md, CLAUDE.md, CHANGELOG.md |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | RevenueCat + IAP 실연동 | ⬜ 클라우드 전환 후 | **클라우드 Supabase + EAS 빌드 시점을 사용자와 논의 후 진행.** 교체 지점은 `hooks/use-premium.ts` mutationFn + RevenueCat 웹훅→Edge Function (D16 주석 참조) |
| 2 | Phase 4 — 고도화 | 🔵 진행 중 | SM-2 복습 ✅. 남은 후보: Shadowing(STT), 오프라인 모드, Web/PWA (PLAN §8) |
| 3 | 게임화 수치 서버 검증 (Edge Function) | ⬜ 클라우드 전환 시 | 클라이언트가 profiles·league_entries 직접 update — RLS 0002 주석 참조 |
| 4 | Google·Apple OAuth | ⬜ 보류 | 클라우드 Supabase 전환 시 (로컬은 이메일만) |
| 5 | 완료 스킬 복습 기능 | ✅ 완료 | SM-2 복습으로 구현 — 완료 스킬 탭/홈 배너 → `/review` |
| 6 | Lottie 에셋 교체 / 실광고(AdMob) | ⬜ 선택 | 완료 연출은 Reanimated(D15), 광고는 ad-banner.tsx placeholder — 에셋·네이티브 빌드 확보 시 교체 |
| 7 | Premium 가격 확정 | ⬜ 스토어 제출 전 | PREMIUM_PLANS(월 9,900/연 79,000)는 임시값 (D16) — 앱 이름(U2)과 함께 제출 전 결정 |

## Key Decisions Made

- **D16 — 구독은 로컬 mock 결제**: RevenueCat/IAP는 Expo Go·로컬에서 테스트 불가. `use-premium.ts`가 profiles의 `is_premium`+`premium_expires_at`을 직접 갱신하고, 만료 판정은 `isPremiumActive` 순수 함수로 조회 시점에 수행. 실연동 시 훅 내부만 교체
- **D17 — 활성 언어쌍은 user_languages.is_active 기준 1개**: 스킬 트리·홈 배너·TTS 로케일이 이를 따름. 전환은 클라이언트(전체 비활성→선택 upsert). 무료는 1개(FREE_MAX_LEARNING_LANGS), 초과 추가는 페이월로
- **D18 — Admin은 Hono SSR (React 없음)**: Expo의 hoisted node_modules에서 Next.js/Vite React가 React 버전 충돌을 일으킬 위험 회피. Prisma 직접 연결(postgres 롤)로 RLS 우회 — 로컬/사설망 전용
- **D19 — SM-2 복습은 전용 상태 테이블**: 이력(`user_exercise_history`)에서 매번 재계산하지 않고 `UserReviewState`에 (사용자×문제) 스케줄을 영속. binary 채점은 quality 정답5·오답2로 매핑. 활성 언어쌍 필터를 위해 `language_pair_id`를 비정규화(3단계 조인 회피). 복습 XP는 총합만 반영(주간 리그·일일 목표 제외)·하트 무소모. 서버 검증은 클라우드 전환 시 Edge Function으로
- **AI 생성은 구조화 출력 + 발행 전 검증 이중 방어**: zod 스키마(`zodOutputFormat`)로 형태 보장, `validateDraftSkill`로 도메인 규약(5~8문제, options[0] 정답, ORDER 단어 포함 등) 강제. 키 없으면 모의 생성 모드로 파이프라인 검증 가능
- **content_drafts RLS는 정책 없이 활성화만**: anon/authenticated PostgREST 접근 전부 차단, Admin은 직접 연결이라 영향 없음

## Known Issues

- **새 라우트 파일 추가 후 typecheck 실패 가능** — Expo typed routes(`.expo/types/router.d.ts`)는 dev 서버가 재생성해야 갱신됨. `pnpm mobile` 잠깐 기동으로 해결 (CLAUDE.md에 기록)
- **Admin e2e는 실행마다 발행 스킬이 누적됨** — `pnpm db:seed`로 정리(해당 언어쌍 콘텐츠 재생성, 진행 기록 삭제 주의). 현재 DB에 테스트 발행 스킬 1개(en '쇼핑테스트-…', order 5) 남아 있음
- 프로필 화면 쿼리 증가로 배지 grid 로딩이 늦어질 수 있음 — e2e는 배지 로딩을 명시적으로 대기하도록 수정됨
- Alert.alert는 Expo web에서 no-op — 웹에서 하트 소진/레슨 이탈 다이얼로그가 안 뜸 (네이티브 전용 UX, e2e는 해당 경로 미사용)
- 봇 코호트·시드 주차·Metro 캐시·cuid() 기본값 등 기존 함정은 CLAUDE.md 참조

## Context for Next Session

- **사용자 목표**: PLAN.md 기반 앱 전체 완성. 품질 우선, Phase 순서 (0✅→1✅→2✅→3 로컬✅→4)
- **다음 작업 후보**: ① **클라우드 Supabase 전환 + EAS 빌드 + RevenueCat 실연동** (Phase 3 마감 — 사용자와 계정/비용 논의 필요) 또는 ② **Phase 4 나머지**(Shadowing STT / 오프라인 모드 / Web·PWA — SM-2 복습은 완료). 시작 전 사용자에게 방향 확인할 것
- **SM-2 복습 동작**: 첫 정답은 +1일 뒤 due라 레슨 직후엔 복습 대상이 없음(정상). 실기기/시간 경과로 검증하거나, e2e처럼 `update user_review_state set due_at = now() - interval '1 day'`로 강제 진입. 복습 세션은 활성 언어쌍의 due 문제만(언어 전환 시 분리)
- **개발 환경 기동**: `supabase start` → `pnpm db:migrate` → policies/ SQL 번호순 수동 적용(0001~0003) → `pnpm db:seed`. Admin은 `cp apps/admin/.env.example apps/admin/.env` 후 `pnpm admin`(3100). AI 생성은 .env에 `ANTHROPIC_API_KEY` 추가 시 활성
- **검증 루틴**: `pnpm typecheck` + `pnpm lint` + `pnpm test`(vitest 56개) + 모바일 e2e(`learning_loop.py` 62개 + `review_loop.py` 9개, Expo web 8081) + Admin e2e(`admin_flow.py`, 3100, 15개). ⚠️ `review_loop.py`는 psql 필요(due_at 백데이트). 새 라우트(`/review`) 추가했으므로 typecheck 전 `pnpm mobile` 잠깐 기동으로 router 타입 재생성됨
- **게임화·Freemium 수치는 @ted/shared/constants.ts가 단일 소스** — PREMIUM_PLANS·LANG_* 포함. 변경 시 PLAN.md 동기화
- **푸시 상태**: 이번 세션(Phase 4 SM-2, `20be934`) 포함 `origin/main` 반영 완료
- **사용자 선호**: 커밋 메시지 한글, 푸시는 명시 요청 시만, 미확정 항목(앱 이름 U2, Premium 가격 등)은 구현 전 확인

## Files Modified This Session

```
20be934 (Phase 4 SM-2 복습): 17 files, +879 -32 — shared sm2Update·상수·테스트(+5),
        UserReviewState 모델·마이그레이션·RLS 0004, upsertReviewStates(gamification),
        use-review 훅, /review 화면, 홈 복습 배너, review_loop.py e2e, PLAN/CLAUDE/CHANGELOG
ce38739 (docs): 1 file — HANDOFF 푸시 상태 현행화
```
