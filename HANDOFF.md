# Session Handoff

> Last updated: 2026-06-12 17:40 (KST)
> Branch: `main`
> Latest commit: `5cf29ea` - Phase 1: 핵심 학습 루프 구현 (e2e 23개 체크 검증 완료)

## Current Status

Phase 0(기반)과 Phase 1(핵심 학습 루프)이 완료된 상태. 로컬 Supabase 위에서 가입→온보딩→레슨 플레이(5종 문제)→XP/스트릭/하트까지 전부 실동작하며 e2e 23개 체크로 검증됨. 다음은 Phase 2(풀 게임화).

## Completed This Session

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | HTML 프로토타입 (동선·UI 검증, 사용자 확인 완료) | `ce530e9` | prototype/index.html |
| 2 | monorepo + Expo 앱 + Prisma 스키마 + 시드 + CI | `ce530e9` | apps/mobile, packages/*, supabase/, .github/ |
| 3 | GitHub repo 생성·푸시 (withwooyong/ted_duolingo, private) | `ce530e9`~`a55b9fa` | — |
| 4 | 로컬 Supabase + 이메일 Auth + RLS·시드 적용 | `8de65cb` | supabase/config.toml, src/app/auth.tsx, src/stores/auth.ts |
| 5 | 핵심 학습 루프 전체 (5종 문제·레슨·게임화·온보딩·스킬 트리) | `5cf29ea` | src/components/exercise/, src/hooks/, src/app/ |
| 6 | e2e 검증 (Playwright 23개 체크) + 단위 테스트 17개 | `5cf29ea` | apps/mobile/e2e/, packages/shared/src/logic.test.ts |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Phase 2 — 풀 게임화 | ⬜ 다음 세션 | 리그/주간 랭킹, 배지/업적, 스트릭 알림, 레슨 완료 Lottie 연출 |
| 2 | Google·Apple OAuth | ⬜ 보류 | 클라우드 Supabase 전환 시 (로컬은 이메일만) |
| 3 | 게임화 수치 서버 검증 | ⬜ Phase 2 | 현재 클라이언트가 profiles 직접 update — Edge Function으로 이전 예정 |
| 4 | 완료 스킬 복습 기능 | ⬜ 미정 | 홈에서 완료 스킬 탭 시 "곧 추가" 알림만 표시 |
| 5 | 커밋 3개 미푸시 | 🟡 | `8de65cb`, `1494ae7`, `5cf29ea` — 푸시는 사용자 명시 요청 시만 |

## Key Decisions Made

- **D11~D13 확정** (PLAN.md v0.3): MVP 언어쌍 ko→en / 백엔드 Supabase only(NestJS 없음) / Admin 웹은 Phase 3
- **로컬 Supabase로 개발** — 클라우드 프로젝트 없이 Docker로 전체 스택. `.env` 두 곳은 로컬 기본값(gitignore)
- **RLS SQL은 supabase/policies/** — migrations/에 두면 supabase start가 Prisma 테이블보다 먼저 적용해 기동 실패
- **게임화 로직은 @ted/shared 순수 함수** — 하트 충전/소모·스트릭·XP를 DB/UI와 분리해 vitest로 검증
- **답안은 문자열로 통일해 채점** (checkers.ts) — 5종 유형 공통 인터페이스, 짝 맞추기만 자동 제출
- **시드의 정답은 options[0] 고정, 셔플은 표시 시점** — 콘텐츠 제작 단순화
- **Expo web은 single(SPA) 모드** — e2e 검증용. 모바일이 주 타겟이므로 SSR 불필요

## Known Issues

- Prisma `@default(cuid())`는 DB 기본값이 아님 — supabase-js insert 시 `Crypto.randomUUID()`로 id 직접 생성 필요 (use-game.ts에 적용됨)
- DateTime 컬럼은 반드시 `@db.Timestamptz(3)` — 어기면 KST 파싱 9시간 오차 (이미 전 컬럼 적용)
- Metro가 가끔 파일 변경을 못 잡음 — 코드 수정이 반영 안 되면 dev 서버 재시작 (`--clear`)
- `pnpm db:seed`는 해당 언어쌍 콘텐츠를 삭제 후 재생성 — Cascade로 user_progress도 삭제됨 (운영 금지)
- supabase CLI 2.34.3 구버전 (최신 2.106.0) — 동작에는 문제 없음

## Context for Next Session

- **사용자 목표**: PLAN.md 기반으로 앱 전체 완성. 품질 우선, Phase 순서대로 진행 (0✅→1✅→2→3→4)
- **다음 작업 = Phase 2 풀 게임화**: ① 리그/주간 랭킹(league_entries 테이블·코호트 10명·상하위 3명 승급/강등 — 상수는 @ted/shared) ② 배지/업적(badges 시드 6개 존재, 판정 로직 필요) ③ 스트릭 알림 ④ 레슨 완료 Lottie 연출(lottie-react-native 설치됨)
- **개발 환경 기동**: `supabase start` → (스키마 변경 시) `pnpm db:migrate` + policies SQL 수동 적용 → `pnpm db:seed`. 명령·함정은 CLAUDE.md 참조
- **검증 루틴**: `pnpm typecheck` + `pnpm lint` + `pnpm test` + e2e(`apps/mobile/e2e/learning_loop.py`, Expo web 8081 필요)
- **디자인 기준은 prototype/index.html** — 리그·프로필·배지 화면이 이미 목업에 있음 (tailwind 팔레트 동기화됨)
- **사용자 선호**: 커밋 메시지 한글, 푸시는 명시 요청 시만, 미확정 항목(앱 이름 U2 등)은 구현 전 확인

## Files Modified This Session

```
54 files (ce530e9 초기 커밋: prototype, monorepo, schema, seed, CI)
13 files changed, 840 insertions(+), 21 deletions(-) (8de65cb: 로컬 Supabase + Auth)
32 files changed, 2186 insertions(+), 87 deletions(-) (5cf29ea: Phase 1 학습 루프)
주요 신규: src/components/exercise/ (8개), src/hooks/ (4개), packages/shared/src/logic.ts(+test),
apps/mobile/e2e/, packages/db/prisma/migrations/ (init + timestamptz)
```
