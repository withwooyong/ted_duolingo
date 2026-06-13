# Session Handoff

> Last updated: 2026-06-13 (KST)
> Branch: `main`
> Latest commit: `b512352` - Phase 4(Shadowing): 발음 따라하기 6번째 문제 유형 — STT 추상화 + 단어 포함률 채점 (e2e 67/9 검증 완료)
> Repo: https://github.com/withwooyong/ted_duolingo (**public**, 푸시 완료)

## Current Status

Phase 0 → 1 → 2 → 3(로컬) → Phase 4 SM-2 복습 완료에 이어 **Phase 4 Shadowing(발음 따라하기/STT) 로컬 구현 완료**. 6번째 문제 유형 `SHADOW_SPEAK` — 문장 TTS 재생 → 따라 말하기 → STT 단어 포함률 채점(임계 0.6). 기존 5종·레슨·SM-2 복습에 그대로 편입. STT는 추상화 레이어로 **웹만 실연동**(Web Speech API), 네이티브 실 STT는 EAS 빌드 시(현재 fallback). 검증: **vitest 63개 + 모바일 e2e 67개(학습·Shadowing 포함) + 9개(복습)** 전부 통과. typecheck·lint clean. **`origin/main` 푸시 완료** (`b512352`). (Admin e2e는 이번 변경 영향 없음 — 미실행.)

## Completed This Session (Phase 4 — Shadowing/STT)

| # | Task | Files |
|---|------|-------|
| 1 | `SHADOW_SPEAK` 타입·`ShadowSpeakPayload`·`scoreShadowing` 순수 채점 + `SHADOW_PASS_RATIO` + vitest 63개(+7) | packages/shared/src/{types,constants,logic,logic.test}.ts |
| 2 | Prisma enum + 마이그레이션 + 시드 Shadowing 문제(en 2·ja 1) | packages/db/prisma/{schema.prisma, seed.ts}, migrations/20260613045108_add_shadow_speak_exercise_type |
| 3 | STT 추상화 — 웹 Web Speech API / 네이티브 fallback / e2e mock 훅 | apps/mobile/src/lib/speech-recognition.ts |
| 4 | `shadow-speak.tsx` 컴포넌트 + 레슨·복습 렌더 분기·라벨 + `checkers.ts`·`draft.ts` switch | apps/mobile/src/components/exercise/{shadow-speak,checkers}.tsx, src/app/{lesson/[id]/index,review}.tsx, packages/shared/src/draft.ts |
| 5 | e2e Shadowing 검증 + 문서 | apps/mobile/e2e/{learning_loop,review_loop}.py, e2e/README.md, PLAN.md(v0.7 D20), CLAUDE.md, CHANGELOG.md |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | RevenueCat + IAP 실연동 | ⬜ 클라우드 전환 후 | **클라우드 Supabase + EAS 빌드 시점을 사용자와 논의 후 진행.** 교체 지점은 `hooks/use-premium.ts` mutationFn + RevenueCat 웹훅→Edge Function (D16 주석 참조) |
| 2 | Phase 4 — 고도화 | 🔵 진행 중 | SM-2 복습 ✅, Shadowing(STT) ✅. 남은 후보: 오프라인 모드, Web/PWA (PLAN §8) |
| 2b | Shadowing 네이티브 실 STT | ⬜ EAS 빌드 시 | 현재 웹만 실연동. `lib/speech-recognition.ts`의 네이티브 분기(null 반환)에 `@react-native-voice/voice` 또는 `expo-speech-recognition` 연결. 동일 인터페이스라 컴포넌트 수정 불필요 |
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
- **D20 — Shadowing은 6번째 ExerciseType + STT 추상화**: 별도 모드가 아니라 `SHADOW_SPEAK`로 기존 5종·레슨·SM-2 복습에 편입(채점만 `checkAnswer`가 transcript를 받아 처리, 하트·복습은 동일). 채점은 정확 일치 대신 **단어 포함률 ≥ 0.6**(STT가 구두점·억양을 흘리고 초보자라 관대하게). STT는 `lib/speech-recognition.ts` 추상화 — 웹만 Web Speech API 실연동, 네이티브 실 STT는 EAS 빌드 필요라 현재 fallback("직접 확인"). D16(mock 결제)·OAuth와 같은 "네이티브 실연동은 클라우드/EAS 시점" 경계
- **AI 생성은 구조화 출력 + 발행 전 검증 이중 방어**: zod 스키마(`zodOutputFormat`)로 형태 보장, `validateDraftSkill`로 도메인 규약(5~8문제, options[0] 정답, ORDER 단어 포함 등) 강제. 키 없으면 모의 생성 모드로 파이프라인 검증 가능
- **content_drafts RLS는 정책 없이 활성화만**: anon/authenticated PostgREST 접근 전부 차단, Admin은 직접 연결이라 영향 없음

## Known Issues

- **새 라우트 파일 추가 후 typecheck 실패 가능** — Expo typed routes(`.expo/types/router.d.ts`)는 dev 서버가 재생성해야 갱신됨. `pnpm mobile` 잠깐 기동으로 해결 (CLAUDE.md에 기록)
- **Admin e2e는 실행마다 발행 스킬이 누적됨** — `pnpm db:seed`로 정리(해당 언어쌍 콘텐츠 재생성, 진행 기록 삭제 주의). 이번 세션 재시드로 누적 테스트 스킬은 정리됨(현재 DB는 시드 콘텐츠만)
- **Shadowing**: 헤드리스 크로뮴엔 Web Speech API가 없어 `isSttSupported()`가 false→fallback("직접 확인")로 동작. e2e는 `window.__mockShadowTranscript` 주입으로 mic 경로를 검증. 실제 마이크 인식은 일반 Chrome 또는 EAS 네이티브 빌드 필요
- 프로필 화면 쿼리 증가로 배지 grid 로딩이 늦어질 수 있음 — e2e는 배지 로딩을 명시적으로 대기하도록 수정됨
- Alert.alert는 Expo web에서 no-op — 웹에서 하트 소진/레슨 이탈 다이얼로그가 안 뜸 (네이티브 전용 UX, e2e는 해당 경로 미사용)
- 봇 코호트·시드 주차·Metro 캐시·cuid() 기본값 등 기존 함정은 CLAUDE.md 참조

## Context for Next Session

- **사용자 목표**: PLAN.md 기반 앱 전체 완성. 품질 우선, Phase 순서 (0✅→1✅→2✅→3 로컬✅→4)
- **다음 작업 후보**: ① **클라우드 Supabase 전환 + EAS 빌드 + RevenueCat 실연동 + Shadowing 네이티브 STT** (Phase 3 마감 — 사용자와 계정/비용 논의 필요) 또는 ② **Phase 4 나머지**(오프라인 모드 / Web·PWA — SM-2 복습·Shadowing은 완료). 시작 전 사용자에게 방향 확인할 것
- **Shadowing 채점**: `scoreShadowing`은 단어 포함률(recall) — 정답 단어가 인식 결과에 들어 있으면 매칭. 임계 `SHADOW_PASS_RATIO`=0.6(@ted/shared/constants.ts). 수치 조정 시 vitest(`scoreShadowing` 7케이스)와 함께 갱신
- **SM-2 복습 동작**: 첫 정답은 +1일 뒤 due라 레슨 직후엔 복습 대상이 없음(정상). 실기기/시간 경과로 검증하거나, e2e처럼 `update user_review_state set due_at = now() - interval '1 day'`로 강제 진입. 복습 세션은 활성 언어쌍의 due 문제만(언어 전환 시 분리)
- **개발 환경 기동**: `supabase start` → `pnpm db:migrate` → policies/ SQL 번호순 수동 적용(0001~0004) → `pnpm db:seed`. Admin은 `cp apps/admin/.env.example apps/admin/.env` 후 `pnpm admin`(3100). AI 생성은 .env에 `ANTHROPIC_API_KEY` 추가 시 활성
- **검증 루틴**: `pnpm typecheck` + `pnpm lint` + `pnpm test`(vitest 63개) + 모바일 e2e(`learning_loop.py` 67개 + `review_loop.py` 9개, Expo web 8081) + Admin e2e(`admin_flow.py`, 3100, 15개). ⚠️ `review_loop.py`는 psql 필요(due_at 백데이트). Shadowing은 새 라우트 없음(컴포넌트만)이라 typed routes 재생성 불필요
- **게임화·Freemium 수치는 @ted/shared/constants.ts가 단일 소스** — PREMIUM_PLANS·LANG_*·SHADOW_PASS_RATIO 포함. 변경 시 PLAN.md 동기화
- **푸시 상태**: 이번 세션(Phase 4 Shadowing, `b512352`) 포함 `origin/main` 반영 완료
- **사용자 선호**: 커밋 메시지 한글, 푸시는 명시 요청 시만, 미확정 항목(앱 이름 U2, Premium 가격 등)은 구현 전 확인

## Files Modified This Session (Phase 4 Shadowing — `b512352`)

```
shared:   types.ts(SHADOW_SPEAK·ShadowSpeakPayload), constants.ts(SHADOW_PASS_RATIO),
          logic.ts(scoreShadowing), logic.test.ts(+7=63), draft.ts(switch)
db:       schema.prisma(enum), seed.ts(shadow helper·en2·ja1),
          migrations/20260613045108_add_shadow_speak_exercise_type
mobile:   lib/speech-recognition.ts(신규), components/exercise/shadow-speak.tsx(신규),
          components/exercise/checkers.ts, app/lesson/[id]/index.tsx, app/review.tsx
e2e/docs: e2e/learning_loop.py(67), e2e/review_loop.py(due 7), e2e/README.md,
          PLAN.md(v0.7 D20), CLAUDE.md, CHANGELOG.md, HANDOFF.md
```
