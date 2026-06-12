# Ted Duolingo

Duolingo 스타일의 게임화 다국어 학습 앱 — 모바일 퍼스트 (React Native / Expo).

전체 기획은 [PLAN.md](./PLAN.md), 동선·UI 검증용 목업은 [prototype/index.html](./prototype/index.html) 참조.

## 구조 (pnpm monorepo)

```
apps/mobile/       Expo React Native 앱 (Expo Router + NativeWind)
packages/shared/   도메인 타입·게임화 상수 (@ted/shared)
packages/db/       Prisma 스키마·시드 (@ted/db)
supabase/          RLS 정책·트리거 SQL (Prisma가 못 다루는 부분)
prototype/         HTML 목업 (브라우저에서 바로 열기)
```

## 시작하기

```bash
pnpm install

# 모바일 앱 실행 (iOS 시뮬레이터 / Expo Go)
pnpm mobile

# 전체 검사
pnpm typecheck
pnpm lint
```

## Supabase 설정 (최초 1회)

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. `packages/db/.env.example` → `packages/db/.env` 복사 후 DB 연결 문자열 입력
3. `apps/mobile/.env.example` → `apps/mobile/.env` 복사 후 API URL·anon key 입력
4. 스키마·시드 적용:

```bash
pnpm db:migrate   # Prisma 마이그레이션 (테이블 생성)
pnpm db:seed      # ko→en 1단원 시드 (4스킬 · 6레슨 · 28문제)
```

5. `supabase/migrations/0001_rls_and_triggers.sql`을 Supabase SQL Editor에서 실행 (RLS + 가입 트리거)

## 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm mobile` | Expo dev 서버 시작 |
| `pnpm typecheck` | 전체 패키지 타입체크 |
| `pnpm lint` | 전체 패키지 린트 |
| `pnpm db:generate` | Prisma 클라이언트 생성 |
| `pnpm db:migrate` | DB 마이그레이션 (개발) |
| `pnpm db:seed` | 시드 데이터 주입 (⚠️ 기존 콘텐츠 재생성) |
