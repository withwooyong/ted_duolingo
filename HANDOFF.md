# Session Handoff

> Last updated: 2026-06-13 (KST)
> Branch: `main`
> Latest commit: `7cb87f7` - Phase 4(오프라인): 읽기 캐시 — TanStack Query persistence + 진입 차단 (D21). **`origin/main` 푸시 완료**
> Repo: https://github.com/withwooyong/ted_duolingo (**public**, 푸시 완료)

## Current Status

Phase 0 → 1 → 2 → 3(로컬) → Phase 4 SM-2 복습 → Shadowing 완료에 이어 **Phase 4 오프라인 읽기 캐시(D21) 로컬 구현 완료**. 네트워크가 끊겨도 스킬트리·레슨·문제·프로필 등 콘텐츠 스냅샷을 열람(TanStack Query persistence → AsyncStorage), 오프라인 배너 표시, 레슨·복습 풀이는 진입 시점에 차단(다 풀고 저장 실패 방지). 쓰기 큐는 충돌 위험으로 범위 제외(후속 세션 후보). 사용자별 캐시는 persister storage 키에 userId를 넣어 물리 분리(로그아웃 시 제거). 검증: **vitest 63개 + 모바일 e2e 67개(학습) + 9개(복습) + 15개(오프라인, 신규)** 전부 통과. typecheck·lint clean. (Admin e2e는 이번 변경 영향 없음 — 미실행.) **`origin/main` 푸시 완료** (`7cb87f7`).

## Completed This Session (Phase 4 — 오프라인 읽기 캐시)

| # | Task | Files |
|---|------|-------|
| 1 | 의존성 — persist-client·async-storage-persister·netinfo(12.0.1) | apps/mobile/package.json |
| 2 | QueryClient·persist 설정 모듈(gcTime 24h, 사용자별 persister, BUSTER, shouldDehydrateQuery) | apps/mobile/src/lib/query-client.ts (신규) |
| 3 | 네트워크 감지 onlineManager 연결(네이티브만 NetInfo, 웹 기본) + `useOnline()` | apps/mobile/src/lib/online-status.ts, src/hooks/use-online.ts (신규) |
| 4 | 오프라인 배너(무애니메이션) + `_layout` PersistQueryClientProvider(key=userId, 로그아웃 정리) | apps/mobile/src/components/offline-banner.tsx (신규), src/app/_layout.tsx |
| 5 | 오프라인 풀이 진입 차단(홈 가드 + offline-blocked 인라인, review 2차 방어) | apps/mobile/src/app/(tabs)/index.tsx, src/app/review.tsx |
| 6 | e2e(15체크) + 문서 | apps/mobile/e2e/offline_loop.py(신규), e2e/README.md, PLAN.md(v0.8 D21), CLAUDE.md, CHANGELOG.md |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | RevenueCat + IAP 실연동 | ⬜ 클라우드 전환 후 | **클라우드 Supabase + EAS 빌드 시점을 사용자와 논의 후 진행.** 교체 지점은 `hooks/use-premium.ts` mutationFn + RevenueCat 웹훅→Edge Function (D16 주석 참조) |
| 2 | Phase 4 — 고도화 | 🔵 진행 중 | SM-2 복습 ✅, Shadowing(STT) ✅, 오프라인 읽기 캐시 ✅. 남은 후보: Web/PWA, 오프라인 쓰기 큐(범위 외였음) (PLAN §8) |
| 2b | Shadowing 네이티브 실 STT | ⬜ EAS 빌드 시 | 현재 웹만 실연동. `lib/speech-recognition.ts`의 네이티브 분기(null 반환)에 `@react-native-voice/voice` 또는 `expo-speech-recognition` 연결. 동일 인터페이스라 컴포넌트 수정 불필요 |
| 2c | 오프라인 쓰기 큐 | ⬜ 후속 세션 | 이번엔 읽기 캐시만(D21). 오프라인 레슨 풀이→복귀 시 동기화는 XP·스트릭·하트·리그 충돌 해결 필요. 진입 차단 가드(`startLesson`/`startReview`)를 큐잉으로 교체하는 지점 |
| 2d | 오프라인 full reload 복원(PWA) | ⬜ Web/PWA 시 | dev web은 서비스워커 없어 오프라인 reload 불가. persist 캐시는 이미 기록됨 — PWA SW(또는 네이티브 임베드 번들)에서 복원 동작 |
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
- **D21 — 오프라인은 읽기 캐시 중심**: 쓰기 큐는 XP·스트릭·하트·리그가 서버 단일 소스라 병합 충돌 위험이 커 범위 제외. TanStack Query persistence(AsyncStorage)로 콘텐츠 스냅샷만 영속하고, 시각·주간 마감 의존 쿼리(`league`·`review-count`·`review-session`)는 stale 값이 오해를 부르므로 `shouldDehydrateQuery`로 제외. 사용자별 캐시는 persister storage 키에 userId를 넣어 물리 분리(로그아웃 시 `clear()`+`removePersistedCache`). 오프라인 감지는 플랫폼 분기 — 웹은 onlineManager 기본 리스너, 네이티브만 NetInfo(웹 NetInfo는 window offline에 즉시 반응 안 함). 풀이는 진입 차단(다 풀고 저장 실패 방지). dev web은 SW 없어 오프라인 full reload 불가 → 실제 복원은 native/PWA
- **AI 생성은 구조화 출력 + 발행 전 검증 이중 방어**: zod 스키마(`zodOutputFormat`)로 형태 보장, `validateDraftSkill`로 도메인 규약(5~8문제, options[0] 정답, ORDER 단어 포함 등) 강제. 키 없으면 모의 생성 모드로 파이프라인 검증 가능
- **content_drafts RLS는 정책 없이 활성화만**: anon/authenticated PostgREST 접근 전부 차단, Admin은 직접 연결이라 영향 없음

## Known Issues

- **새 라우트 파일 추가 후 typecheck 실패 가능** — Expo typed routes(`.expo/types/router.d.ts`)는 dev 서버가 재생성해야 갱신됨. `pnpm mobile` 잠깐 기동으로 해결 (CLAUDE.md에 기록)
- **Admin e2e는 실행마다 발행 스킬이 누적됨** — `pnpm db:seed`로 정리(해당 언어쌍 콘텐츠 재생성, 진행 기록 삭제 주의). 이번 세션 재시드로 누적 테스트 스킬은 정리됨(현재 DB는 시드 콘텐츠만)
- **Shadowing**: 헤드리스 크로뮴엔 Web Speech API가 없어 `isSttSupported()`가 false→fallback("직접 확인")로 동작. e2e는 `window.__mockShadowTranscript` 주입으로 mic 경로를 검증. 실제 마이크 인식은 일반 Chrome 또는 EAS 네이티브 빌드 필요
- 프로필 화면 쿼리 증가로 배지 grid 로딩이 늦어질 수 있음 — e2e는 배지 로딩을 명시적으로 대기하도록 수정됨
- Alert.alert는 Expo web에서 no-op — 웹에서 하트 소진/레슨 이탈 다이얼로그가 안 뜸 (네이티브 전용 UX, e2e는 해당 경로 미사용)
- **오프라인(D21)**: dev web은 서비스워커가 없어 오프라인 full reload(번들 재요청)가 불가 — `offline_loop.py`는 reload 대신 SPA 탭 이동으로 캐시 열람을 검증한다. 실제 오프라인 복원은 네이티브(임베드 번들)/PWA에서만. NetInfo web은 window offline 이벤트에 즉시 반응 안 해 웹은 onlineManager 기본 리스너 사용(네이티브만 NetInfo). `lib/online-status.ts` 수정 시 Metro `--clear` 재기동 필요(CI 모드 워치 안 함)
- 봇 코호트·시드 주차·Metro 캐시·cuid() 기본값 등 기존 함정은 CLAUDE.md 참조

## Context for Next Session

- **사용자 목표**: PLAN.md 기반 앱 전체 완성. 품질 우선, Phase 순서 (0✅→1✅→2✅→3 로컬✅→4)
- **다음 작업 후보**: ① **클라우드 Supabase 전환 + EAS 빌드 + RevenueCat 실연동 + Shadowing 네이티브 STT** (Phase 3 마감 — 사용자와 계정/비용 논의 필요) 또는 ② **Phase 4 나머지**(Web·PWA / 오프라인 쓰기 큐 — SM-2 복습·Shadowing·오프라인 읽기 캐시는 완료). 시작 전 사용자에게 방향 확인할 것
- **Shadowing 채점**: `scoreShadowing`은 단어 포함률(recall) — 정답 단어가 인식 결과에 들어 있으면 매칭. 임계 `SHADOW_PASS_RATIO`=0.6(@ted/shared/constants.ts). 수치 조정 시 vitest(`scoreShadowing` 7케이스)와 함께 갱신
- **SM-2 복습 동작**: 첫 정답은 +1일 뒤 due라 레슨 직후엔 복습 대상이 없음(정상). 실기기/시간 경과로 검증하거나, e2e처럼 `update user_review_state set due_at = now() - interval '1 day'`로 강제 진입. 복습 세션은 활성 언어쌍의 due 문제만(언어 전환 시 분리)
- **개발 환경 기동**: `supabase start` → `pnpm db:migrate` → policies/ SQL 번호순 수동 적용(0001~0004) → `pnpm db:seed`. Admin은 `cp apps/admin/.env.example apps/admin/.env` 후 `pnpm admin`(3100). AI 생성은 .env에 `ANTHROPIC_API_KEY` 추가 시 활성
- **검증 루틴**: `pnpm typecheck` + `pnpm lint` + `pnpm test`(vitest 63개) + 모바일 e2e(`learning_loop.py` 67개 + `review_loop.py` 9개 + `offline_loop.py` 15개, Expo web 8081) + Admin e2e(`admin_flow.py`, 3100, 15개). ⚠️ `review_loop.py`는 psql 필요(due_at 백데이트). `offline_loop.py`는 `set_offline` 사용. 오프라인은 새 라우트 없음(컴포넌트만)이라 typed routes 재생성 불필요
- **게임화·Freemium 수치는 @ted/shared/constants.ts가 단일 소스** — PREMIUM_PLANS·LANG_*·SHADOW_PASS_RATIO 포함. 변경 시 PLAN.md 동기화. (오프라인 캐시 설정은 `apps/mobile/src/lib/query-client.ts`)
- **푸시 상태**: 이번 세션(Phase 4 오프라인 읽기 캐시, `7cb87f7`) 포함 `origin/main` 반영 완료
- **사용자 선호**: 커밋 메시지 한글, 푸시는 명시 요청 시만, 미확정 항목(앱 이름 U2, Premium 가격 등)은 구현 전 확인

## Files Modified This Session (Phase 4 오프라인 읽기 캐시 — `7cb87f7`)

```
mobile(신규): lib/query-client.ts, lib/online-status.ts, hooks/use-online.ts,
              components/offline-banner.tsx, e2e/offline_loop.py
mobile(수정): app/_layout.tsx(PersistQueryClientProvider), app/(tabs)/index.tsx(오프라인 가드),
              app/review.tsx(2차 방어), package.json(persist-client·async-storage-persister·netinfo)
docs:         e2e/README.md, PLAN.md(v0.8 D21·§8), CLAUDE.md, CHANGELOG.md, HANDOFF.md
```
