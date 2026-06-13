# Session Handoff

> Last updated: 2026-06-13 (KST)
> Branch: `main`
> Latest commit: `699b171` - Phase 3(2/2): Admin 웹 — AI 생성 + 검수 워크플로 (e2e 15개 체크 검증 완료)
> Repo: https://github.com/withwooyong/ted_duolingo (**public**, 푸시 완료 · CI 통과)

## Current Status

Phase 0(기반) → 1(학습 루프) → 2(풀 게임화) → **3(Freemium·언어쌍·Admin) 로컬 범위 완료**. 페이월(mock 구독)·광고 분기·ko→ja 언어쌍·언어 전환(무료 1개 제한→페이월)·Admin 웹(AI 생성→검수→발행)까지 실동작. 검증: vitest 51개 + 모바일 e2e 62개 + Admin e2e 15개. Phase 3 잔여는 RevenueCat/IAP 실연동뿐이며 클라우드 전환 + EAS 빌드가 선행 조건.

## Completed This Session

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | 페이월(비교·플랜·mock 구독/해지, D16) + Premium 분기(광고 배너 제거·구독 관리) | `9097423` | src/app/premium.tsx, src/hooks/use-premium.ts, src/components/ad-banner.tsx |
| 2 | 추가 언어쌍 ko→ja 시드 + 언어 전환/추가 UI + 무료 1개 제한→페이월 (D17) | `9097423` | packages/db/prisma/seed.ts, src/app/languages.tsx, src/hooks/use-languages.ts |
| 3 | 스킬 트리 활성 언어쌍 기반 전환(ko→en 하드코딩 제거) + TTS 로케일 학습어 기준 | `9097423` | src/hooks/use-skill-tree.ts, src/components/exercise/listen-select.tsx, (tabs)/index·profile |
| 4 | shared — isPremiumActive·premiumExpiryDate·PREMIUM_PLANS·언어 메타 + e2e 62개(+24) | `9097423` | packages/shared/src/{logic,constants,types}.ts, apps/mobile/e2e/learning_loop.py |
| 5 | Admin 웹 — Hono SSR, AI 생성(Claude 구조화 출력)/모의 생성, 검수·발행 (D13·D18) | `699b171` | apps/admin/src/{server.tsx,generate.ts,views.tsx,db.ts}, apps/admin/README.md |
| 6 | ContentDraft 스키마 + RLS 0003 + validateDraftSkill(+vitest 7) + Admin e2e 15개 | `699b171` | packages/db/prisma/schema.prisma, supabase/policies/0003_content_drafts.sql, packages/shared/src/draft.ts |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | RevenueCat + IAP 실연동 | ⬜ 클라우드 전환 후 | **클라우드 Supabase + EAS 빌드 시점을 사용자와 논의 후 진행.** 교체 지점은 `hooks/use-premium.ts` mutationFn + RevenueCat 웹훅→Edge Function (D16 주석 참조) |
| 2 | Phase 4 — 고도화 | ⬜ 다음 후보 | SM-2 복습(스키마 UserExerciseHistory 선반영됨), Shadowing(STT), 오프라인 모드, Web/PWA (PLAN §8) |
| 3 | 게임화 수치 서버 검증 (Edge Function) | ⬜ 클라우드 전환 시 | 클라이언트가 profiles·league_entries 직접 update — RLS 0002 주석 참조 |
| 4 | Google·Apple OAuth | ⬜ 보류 | 클라우드 Supabase 전환 시 (로컬은 이메일만) |
| 5 | 완료 스킬 복습 기능 | ⬜ 미정 | 홈에서 완료 스킬 탭 시 "곧 추가" 알림만 표시 — Phase 4 SM-2와 묶어 구현 권장 |
| 6 | Lottie 에셋 교체 / 실광고(AdMob) | ⬜ 선택 | 완료 연출은 Reanimated(D15), 광고는 ad-banner.tsx placeholder — 에셋·네이티브 빌드 확보 시 교체 |
| 7 | Premium 가격 확정 | ⬜ 스토어 제출 전 | PREMIUM_PLANS(월 9,900/연 79,000)는 임시값 (D16) — 앱 이름(U2)과 함께 제출 전 결정 |

## Key Decisions Made

- **D16 — 구독은 로컬 mock 결제**: RevenueCat/IAP는 Expo Go·로컬에서 테스트 불가. `use-premium.ts`가 profiles의 `is_premium`+`premium_expires_at`을 직접 갱신하고, 만료 판정은 `isPremiumActive` 순수 함수로 조회 시점에 수행. 실연동 시 훅 내부만 교체
- **D17 — 활성 언어쌍은 user_languages.is_active 기준 1개**: 스킬 트리·홈 배너·TTS 로케일이 이를 따름. 전환은 클라이언트(전체 비활성→선택 upsert). 무료는 1개(FREE_MAX_LEARNING_LANGS), 초과 추가는 페이월로
- **D18 — Admin은 Hono SSR (React 없음)**: Expo의 hoisted node_modules에서 Next.js/Vite React가 React 버전 충돌을 일으킬 위험 회피. Prisma 직접 연결(postgres 롤)로 RLS 우회 — 로컬/사설망 전용
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
- **다음 작업 후보**: ① **클라우드 Supabase 전환 + EAS 빌드 + RevenueCat 실연동** (Phase 3 마감 — 사용자와 계정/비용 논의 필요) 또는 ② **Phase 4 고도화**(SM-2 복습부터 — UserExerciseHistory 이력은 이미 쌓이고 있음). 시작 전 사용자에게 방향 확인할 것
- **개발 환경 기동**: `supabase start` → `pnpm db:migrate` → policies/ SQL 번호순 수동 적용(0001~0003) → `pnpm db:seed`. Admin은 `cp apps/admin/.env.example apps/admin/.env` 후 `pnpm admin`(3100). AI 생성은 .env에 `ANTHROPIC_API_KEY` 추가 시 활성
- **검증 루틴**: `pnpm typecheck` + `pnpm lint` + `pnpm test`(vitest 51개) + 모바일 e2e(`python3 apps/mobile/e2e/learning_loop.py`, Expo web 8081, 62개 체크) + Admin e2e(`python3 apps/admin/e2e/admin_flow.py`, 3100, 15개 체크)
- **게임화·Freemium 수치는 @ted/shared/constants.ts가 단일 소스** — PREMIUM_PLANS·LANG_* 포함. 변경 시 PLAN.md 동기화
- **푸시 상태**: 이번 세션 커밋 전부 `origin/main` 반영 완료, GitHub Actions CI(typecheck·lint, admin 워크스페이스 포함) 통과
- **사용자 선호**: 커밋 메시지 한글, 푸시는 명시 요청 시만, 미확정 항목(앱 이름 U2, Premium 가격 등)은 구현 전 확인

## Files Modified This Session

```
9097423 (Phase 3 1/2): 24 files, +839 -109 — premium/languages 화면, use-premium/use-languages 훅,
        ad-banner, 스킬 트리 활성 언어쌍 전환, 시드 ko→ja, shared 구독·언어 로직, e2e +24
699b171 (Phase 3 2/2): 19 files, +1202 -2 — apps/admin 신규(서버·생성·뷰·e2e),
        ContentDraft 마이그레이션, RLS 0003, shared draft 검증(+테스트), 루트 admin 스크립트
```
