# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/).

## [Unreleased]

---

## [2026-06-12] Phase 0~1 — 프로토타입 · 기반 구축 · 핵심 학습 루프

### Added
- HTML 프로토타입 — 전체 동선(온보딩→홈→레슨 5종→완료→리그→프로필→프리미엄) 검증용 목업, Phase 1 디자인 기준 (`ce530e9`)
- pnpm monorepo 초기화 — apps/mobile(Expo SDK 56) + packages/shared + packages/db + supabase/ (`ce530e9`)
- Prisma 스키마(PLAN §6 전체, SM-2용 UserExerciseHistory 선반영) + ko→en 시드(4스킬·5레슨·28문제 수동 제작) (`ce530e9`)
- RLS 정책·가입 트리거 SQL (본인 데이터만 접근, 콘텐츠 읽기 전용, 익명 차단) (`ce530e9`)
- GitHub Actions CI — install→prisma generate→typecheck→lint (`ce530e9`)
- 로컬 Supabase 개발 환경 (config.toml, analytics 비활성화) + 마이그레이션·시드 적용 (`8de65cb`)
- 이메일 로그인/회원가입 + zustand 세션 스토어 + Stack.Protected 인증 가드 (`8de65cb`)
- useProfile 훅(TanStack Query) — 홈 HUD·프로필 실데이터 연결 (`8de65cb`)
- 문제 유형 5종 컴포넌트 — 듣고 고르기(expo-speech TTS)·빈칸·짝 맞추기·단어 배열·독해 MCQ (`5cf29ea`)
- 레슨 플레이 화면 — 진행 바·즉시 피드백 시트+해설·완료 화면(XP·정확도·스트릭) (`5cf29ea`)
- 온보딩(학습 언어·일일 목표) + 홈 스킬 트리(잠금/진행/이어하기) + 일일 목표 바 (`5cf29ea`)
- 게임화 순수 로직(@ted/shared) — 하트 충전/소모·스트릭·퍼펙트 보너스 + vitest 17개 (`5cf29ea`)
- e2e 테스트 — Expo web + Playwright 학습 루프 전체 23개 체크 (apps/mobile/e2e/) (`5cf29ea`)

### Changed
- PLAN.md v0.3 — 부록 B 확정: D11 ko→en, D12 Supabase only, D13 Admin Phase 3 (`ce530e9`)
- CI 액션 업그레이드 — checkout/setup-node v5, pnpm/action-setup v6 (Node 20 지원 종료 대응) (`d15ea3a`, `a55b9fa`)
- RLS SQL을 supabase/migrations/ → supabase/policies/로 이동 — supabase start가 Prisma 테이블 생성 전 자동 적용해 기동 실패하는 문제 (`8de65cb`)
- PLAN.md Phase 0·1 체크리스트 완료 표시 (`1494ae7`, `5cf29ea`)

### Fixed
- 타임존 버그 — timestamp(타임존 없음) 컬럼을 KST 클라이언트가 로컬로 파싱해 하트 충전 9시간 오차 → 전 DateTime 컬럼 timestamptz 마이그레이션 (`5cf29ea`)
- 온보딩 완료 직후 캐시된 빈 user-languages로 홈→온보딩 무한 되튕김 → 캐시 즉시 갱신 (`5cf29ea`)
- Expo web SSR(static)에서 Supabase 클라이언트 크래시 → SPA(single) 모드 전환 (`5cf29ea`)
- NativeWind 웹 다크모드 충돌(Appearance.setColorScheme vs media) → tailwind darkMode: 'class' (`5cf29ea`)
