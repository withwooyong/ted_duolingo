# Ted Duolingo

Duolingo 스타일의 게임화 다국어 학습 앱 — 모바일 퍼스트 (React Native / Expo).

전체 기획은 [PLAN.md](./PLAN.md), 동선·UI 검증용 목업은 [prototype/index.html](./prototype/index.html) 참조.

## 구조 (pnpm monorepo)

```
apps/mobile/       Expo React Native 앱 (Expo Router + NativeWind)
packages/shared/   도메인 타입·게임화 상수 (@ted/shared)
packages/db/       Prisma 스키마·시드 (@ted/db)
supabase/          로컬 Supabase 설정 + RLS 정책·트리거 SQL (policies/)
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

## 로컬 개발 (Supabase Local — 권장)

Docker만 있으면 클라우드 프로젝트 없이 전체 스택이 돈다:

```bash
supabase start    # 로컬 Supabase 기동 (URL·anon key 출력)
pnpm db:migrate   # Prisma 마이그레이션 (테이블 생성)
pnpm --filter @ted/db exec prisma db execute \
  --schema prisma/schema.prisma \
  --file ../../supabase/policies/0001_rls_and_triggers.sql   # RLS + 가입 트리거
pnpm db:seed      # ko→en 1단원 시드 (4스킬 · 5레슨 · 28문제)
```

`.env`는 로컬 기본값으로 이미 구성돼 있다 (`packages/db/.env`, `apps/mobile/.env` — gitignore 대상).
이메일 가입은 로컬에서 확인 메일 없이 즉시 완료된다 (Studio: http://127.0.0.1:54323).

> ⚠️ RLS SQL은 `supabase/migrations/`가 아닌 `supabase/policies/`에 있다.
> `supabase start`가 migrations를 자동 적용하는데, 테이블은 Prisma가 만들기 때문에
> 순서가 꼬이지 않도록 분리했다. 반드시 `pnpm db:migrate` **이후** 수동 적용할 것.

## 클라우드 Supabase 전환 (배포 시)

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. `packages/db/.env`, `apps/mobile/.env`를 클라우드 값으로 교체 (각 `.env.example` 참조)
3. `pnpm db:migrate` → RLS SQL을 Supabase SQL Editor에서 실행 → `pnpm db:seed`

## 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm mobile` | Expo dev 서버 시작 |
| `pnpm typecheck` | 전체 패키지 타입체크 |
| `pnpm lint` | 전체 패키지 린트 |
| `pnpm db:generate` | Prisma 클라이언트 생성 |
| `pnpm db:migrate` | DB 마이그레이션 (개발) |
| `pnpm db:seed` | 시드 데이터 주입 (⚠️ 기존 콘텐츠 재생성) |
