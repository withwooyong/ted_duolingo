# Session Handoff

> Last updated: 2026-06-13 (KST)
> Branch: `main`
> Latest commit: `7f68948` - Phase 2: 풀 게임화 구현 (e2e 38개 체크 검증 완료)
> Repo: https://github.com/withwooyong/ted_duolingo (**public**)

## Current Status

Phase 0(기반) → 1(핵심 학습 루프) → 2(풀 게임화)까지 완료. 로컬 Supabase 위에서 가입→온보딩→레슨(5종)→XP/스트릭/하트→리그 주간 랭킹→배지→설정(일일 목표·알림)까지 전부 실동작하며 e2e 38개 체크로 검증됨. 다음은 Phase 3(Freemium·콘텐츠·Admin).

## Completed This Session

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | 리그/주간 랭킹 — 코호트 배정·클라이언트 주간 마감(승급/강등, D14)·리그 화면 | `7f68948` | src/lib/gamification.ts, src/hooks/use-league.ts, src/app/(tabs)/league.tsx |
| 2 | 배지 6종 판정·수여 + 완료 화면 새 배지 표시 + 프로필 통계·배지 그리드 | `7f68948` | packages/shared/src/logic.ts, src/hooks/use-game.ts, src/app/(tabs)/profile.tsx |
| 3 | 스트릭 알림 (expo-notifications 일일 리마인더) + 설정 화면(일일 목표 변경) | `7f68948` | src/lib/reminder.ts, src/app/settings.tsx |
| 4 | 레슨 완료 연출 — Reanimated 컨페티·등장 (D15) | `7f68948` | src/components/confetti.tsx, src/app/lesson/[id]/complete.tsx |
| 5 | RLS 0002(리그 본인 행 쓰기·프로필 읽기 공개) + 리그 봇 9명 시드 | `7f68948` | supabase/policies/0002_phase2_league_badges.sql, packages/db/prisma/seed.ts |
| 6 | 검증 — vitest 38개(+21), e2e 38개 체크(+15), PLAN v0.4·CLAUDE.md 현행화 | `7f68948` | logic.test.ts, e2e/learning_loop.py, PLAN.md, CLAUDE.md |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Phase 3 — Freemium & 콘텐츠 | ⬜ 다음 세션 | RevenueCat+IAP 구독, Premium 기능(무제한 하트·광고 제거), Admin AI 생성+검수, 추가 언어쌍 (PLAN §8) |
| 2 | 게임화 수치 서버 검증 (Edge Function) | ⬜ 클라우드 전환 시 | 현재 클라이언트가 profiles·league_entries 직접 update — RLS 0002 주석 참조, 이전 시 league_insert/update_own 정책 제거 |
| 3 | Google·Apple OAuth | ⬜ 보류 | 클라우드 Supabase 전환 시 (로컬은 이메일만) |
| 4 | 완료 스킬 복습 기능 | ⬜ 미정 | 홈에서 완료 스킬 탭 시 "곧 추가" 알림만 표시 |
| 5 | Lottie 에셋 교체 | ⬜ 선택 | 완료 연출은 Reanimated로 구현(D15) — 디자이너 Lottie 에셋 확보 시 교체, 웹은 @lottiefiles/dotlottie-react 필요 |

## Key Decisions Made

- **D14 — 리그 주간 마감은 클라이언트 수행**: 서버 없는 Supabase only(D12) 제약. 새 주 첫 진입 시 `ensureLeagueEntry`가 직전 주 순위 확정→승급/강등→주간 XP 리셋→코호트 배정을 수행. Edge Function 일원화는 클라우드 전환 시
- **D15 — 완료 연출은 Reanimated**: 웹 Lottie는 추가 의존성 필요 + 실제 에셋 부재. 컨페티·등장 모두 shared value 직접 구동
- **주간 XP의 진실은 league_entries 행**: profiles.weekly_xp는 미러 — 새 주 진입 직후 캐시 불일치를 피하기 위해 레슨 완료 시 entry.weekly_xp 기준으로 누적
- **프로필 읽기 RLS 전체 공개로 전환** (0002): 리그 순위표에 타인 이름 표시 필요. Duolingo류 리더보드 특성상 준공개 데이터로 판단
- **리그 봇은 시드에서 고정 UUID로 생성**: Prisma 스키마에 auth FK가 없어 auth.users 없이 profiles 삽입 가능. 재시드 시 현재 주차로 참가 기록 갱신

## Known Issues

- **Reanimated entering/exiting 프리셋(FadeIn 등)은 Expo web에서 동작 안 함** — 요소가 안 보이는 상태로 멈춤. shared value 직접 구동으로 구현할 것 (complete.tsx `Reveal`, confetti.tsx 참조) ← 이번 세션 발견, CLAUDE.md에 기록
- 봇 코호트(10명)는 e2e 반복 실행으로 차면 새 코호트가 생성됨 — e2e는 인원 대신 정렬을 검증하도록 수정됨. 봇과 다시 겨루려면 재시드
- 시드의 봇 리그 참가 기록은 시드 실행 시점의 주차 — 주가 바뀌면 `pnpm db:seed`로 갱신 필요 (콘텐츠도 재생성되므로 진행 기록 삭제 주의)
- Prisma `@default(cuid())`는 DB 기본값이 아님 — supabase-js insert 시 id 직접 생성 (`Crypto.randomUUID()`)
- Metro가 가끔 파일 변경을 못 잡음 — 반영 안 되면 dev 서버 재시작 (`--clear`)
- expo-notifications는 Expo web에서 경고 로그 출력 (동작엔 무해, 리마인더는 네이티브 전용)

## Context for Next Session

- **사용자 목표**: PLAN.md 기반 앱 전체 완성. 품질 우선, Phase 순서 (0✅→1✅→2✅→3→4)
- **다음 작업 = Phase 3 Freemium & 콘텐츠** (PLAN §8): ① RevenueCat + IAP 구독 ② Premium 기능 — 무제한 하트(`isPremium` 분기는 이미 구현됨)·광고 제거 ③ Admin 웹: AI 생성 + 검수 워크플로 (D13) ④ 추가 언어쌍 확장. IAP·RevenueCat은 로컬/Expo Go 제약이 크므로 **클라우드 Supabase 전환 + EAS 빌드 시점을 먼저 사용자와 논의**할 것
- **개발 환경 기동**: `supabase start` → (스키마 변경 시) `pnpm db:migrate` + policies/ SQL 번호순 수동 적용(0001, 0002) → `pnpm db:seed`. 명령·함정은 CLAUDE.md 참조
- **검증 루틴**: `pnpm typecheck` + `pnpm lint` + `pnpm test`(vitest 38개) + e2e(`python3 apps/mobile/e2e/learning_loop.py`, Expo web 8081 + 로컬 Supabase 필요, 38개 체크)
- **게임화 수치는 @ted/shared/constants.ts가 단일 소스** — 변경 시 PLAN.md 동기화. 리그·배지 로직은 logic.ts 순수 함수 + lib/gamification.ts(supabase 호출)
- **사용자 선호**: 커밋 메시지 한글, 푸시는 명시 요청 시만, 미확정 항목(앱 이름 U2 등)은 구현 전 확인

## Files Modified This Session

```
21 files changed, 1260 insertions(+), 88 deletions(-) (7f68948: Phase 2 풀 게임화)
신규: src/lib/gamification.ts, src/lib/reminder.ts, src/hooks/use-league.ts,
      src/components/confetti.tsx, supabase/policies/0002_phase2_league_badges.sql
주요 수정: use-game.ts(리그 XP·배지 통합), league/profile/settings/complete 화면,
      packages/shared(logic·constants·types +테스트), seed.ts(봇), e2e(+15 체크)
```
