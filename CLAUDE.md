# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Duolingo 스타일의 게임화 다국어 학습 앱 ("Ted Duolingo"). 초보자 대상, 모바일 퍼스트, MVP부터 풀 게임화(XP·스트릭·하트·리그·배지)와 Freemium 포함. **PLAN.md(v0.3)가 단일 진실 소스** — 모든 확정 결정(D1~D13)·기능 범위·로드맵이 거기에 있다. 결정이 바뀌면 PLAN.md의 Decision Log와 버전을 함께 갱신한다.

`prototype/index.html`은 동선·UI 검증을 마친 HTML 목업으로, **Phase 1 UI 구현의 디자인 기준**이다 (색상 팔레트는 `apps/mobile/tailwind.config.js`와 동기화됨).

## 명령어

```bash
pnpm install          # 전체 워크스페이스 설치 (.npmrc: node-linker=hoisted — Expo 필수)
pnpm mobile           # Expo dev 서버 (= pnpm --filter mobile start)
pnpm typecheck        # 전체 패키지 tsc --noEmit
pnpm lint             # mobile은 expo lint, 나머지는 typecheck로 대체
pnpm db:generate      # Prisma 클라이언트 생성 (typecheck 전 필요)
pnpm db:migrate       # Prisma 마이그레이션 (packages/db/.env 필요)
pnpm db:seed          # ko→en 시드 (⚠️ 해당 언어쌍 콘텐츠 삭제 후 재생성)
```

테스트 프레임워크는 아직 없음 (Phase 1에서 도입 예정).

## 아키텍처

pnpm monorepo. 백엔드 서버 없음 — **Supabase only** (D12): 앱이 supabase-js로 직접 DB/Auth 접근, RLS로 보호.

- `apps/mobile/` — Expo SDK 56, Expo Router(파일 기반, `src/app/`), NativeWind(Tailwind), Zustand(로컬 상태) + TanStack Query(서버 상태) 분리 원칙
- `packages/shared/` (`@ted/shared`) — 도메인 타입과 게임화 상수의 단일 소스. **문제 유형별 payload는 `ExercisePayload` 구별 유니온**으로 정의되어 DB JSON(`Exercise.options`)과 앱 컴포넌트가 공유
- `packages/db/` (`@ted/db`) — Prisma 스키마(테이블만)와 시드. `Profile.id`는 Supabase `auth.users.id`(UUID)와 1:1
- `supabase/migrations/` — **RLS 정책·트리거는 Prisma가 관리 못 하므로 SQL로 별도 관리.** 테이블 변경 시 RLS 정책도 함께 검토할 것. 가입 시 `handle_new_user` 트리거가 profiles 행을 자동 생성

스키마 변경 흐름: `schema.prisma` 수정 → `pnpm db:migrate` → 필요 시 `supabase/migrations/*.sql`에 RLS 추가 → Supabase SQL Editor로 적용.

## 핵심 도메인 개념

- **문제 유형 5종** (enum 값 고정): `LISTEN_SELECT`, `FILL_BLANK`, `MATCH_PAIRS`, `ORDER_WORDS`, `COMPREHENSION_MCQ`. 각각 별도 컴포넌트로 구현. Phase 2에 Shadowing(STT)·Free Translation 추가
- **콘텐츠 계층**: LanguagePair → Skill → Lesson(5~8문제) → Exercise. 시드의 LISTEN/MCQ 정답은 항상 `options[0]` — 보기 섞기는 앱 표시 시점에 한다
- **게임화 규칙 수치는 `@ted/shared/constants.ts`가 단일 소스** (하트 5개·시간당 충전, 주간 리그 10명 코호트·상하위 3명 승급/강등, 레슨 10XP + 퍼펙트 5XP). 수치 변경 시 PLAN.md도 갱신
- **Freemium 경계**: 무료는 언어 1개·하트 제한·광고 포함 (PLAN.md §3.4 기준)
- **게임화 수치의 서버 측 검증(Edge Function)은 Phase 2로 미룸** — MVP는 클라이언트가 직접 update (RLS 주석 참조)

## 개발 원칙

- 일정보다 **학습 경험 품질 우선** — Phase 0(기반, 완료) → 1(학습 루프) → 2(게임화) → 3(Freemium·콘텐츠·Admin) → 4(고도화) 순서 (PLAN.md §8)
- MVP 언어쌍은 **한국어→영어** (D11). 시드 콘텐츠는 AI가 아닌 수동 제작 (D13). Admin 웹은 Phase 3
- 게임화는 Phase 1~2에 나눠 구현하되 설계(스키마·타입)는 처음부터 포함 — 스키마에 이미 반영됨 (SM-2용 `UserExerciseHistory` 포함)
- 앱 이름(스토어용)은 미정 (U2) — 스토어 제출 전 결정
