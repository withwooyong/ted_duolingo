# Session Handoff

> Last updated: 2026-06-13 (KST)
> Branch: `main`
> Latest commit: `acd81dc` - Phase 4(오프라인): 쓰기 큐 — 오프라인 레슨 풀이→복귀 동기화 (D22). **커밋 완료 · `origin/main` 미푸시(사용자 요청 시 푸시)**
> Repo: https://github.com/withwooyong/ted_duolingo (**public**)

## Current Status

Phase 0 → 1 → 2 → 3(로컬) → Phase 4 SM-2 복습 → Shadowing → 오프라인 읽기 캐시(D21)에 이어 **Phase 4 오프라인 쓰기 큐(D22, 레슨 한정) 로컬 구현 완료**. 오프라인에서 캐시된 레슨을 풀면(낙관적 하트·XP·스트릭·스킬진행 반영) 결과를 영속 큐에 적재하고 "동기화 대기 N개"를 표시, 온라인 복귀 시 `SyncProcessor`가 서버 최신 상태에 대고 `completeLessonWrite`를 재실행해 동기화한다. 충돌 해결은 **"의도 재실행"**(완료 절대값이 아니라 레슨 입력을 큐잉 → read-modify-write 재실행). 멱등성(`progressId`)·시각 정확도(`completedAt`) 보장. **복습은 due 목록이 시각 의존이라 제외**(진입 차단 유지). 검증: **vitest 63 + 모바일 e2e 67(학습) + 9(복습) + 15(오프라인 읽기) + 21(오프라인 쓰기, 신규)** 전부 통과. typecheck·lint clean. **커밋 완료, 미푸시.**

## Completed This Session (Phase 4 — 오프라인 쓰기 큐)

| # | Task | Files |
|---|------|-------|
| 1 | skill-tree 파생 로직 순수 함수화(`deriveTree`) + 낙관적 진행 갱신 `markLessonComplete` + 레슨 문제 fetch 공유(`fetchLessonExercises`·`lessonExercisesKey`) | apps/mobile/src/hooks/use-skill-tree.ts |
| 2 | 레슨 완료 쓰기 로직 단일 소스 `completeLessonWrite`(progressId 멱등·completedAt 시각 정확·heartsLost 일괄) + `fetchProfileDto` | apps/mobile/src/lib/learning-writes.ts(신규), src/hooks/use-profile.ts, src/lib/gamification.ts(upsertReviewStates `now` 인자), src/hooks/use-game.ts(축소 호출) |
| 3 | 영속 큐 스토어(zustand+AsyncStorage, userId 태깅) | apps/mobile/src/lib/sync-queue.ts(신규) |
| 4 | 복귀 시 FIFO 드레인 컴포넌트 | apps/mobile/src/components/sync-processor.tsx(신규), src/app/_layout.tsx(마운트) |
| 5 | 레슨 화면 오프라인 분기(오답 하트 낙관 차감 + 완료 시 큐 적재·낙관 캐시·로컬 완료 화면) + 완료 화면 대기 안내 | apps/mobile/src/app/lesson/[id]/index.tsx, src/app/lesson/[id]/complete.tsx |
| 6 | 홈 오프라인 레슨 허용(캐시된 레슨)·"동기화 대기 N" pill·이어하기 prefetch | apps/mobile/src/app/(tabs)/index.tsx |
| 7 | e2e(21체크) + 기존 offline_loop 갱신 + 문서 | apps/mobile/e2e/offline_write_loop.py(신규), e2e/offline_loop.py, e2e/README.md, PLAN.md(v0.9 D22), CLAUDE.md, CHANGELOG.md |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | RevenueCat + IAP 실연동 | ⬜ 클라우드 전환 후 | **클라우드 Supabase + EAS 빌드 시점을 사용자와 논의 후 진행.** 교체 지점은 `hooks/use-premium.ts` mutationFn + RevenueCat 웹훅→Edge Function (D16 주석 참조) |
| 2 | Phase 4 — 고도화 | 🔵 진행 중 | SM-2 ✅, Shadowing ✅, 오프라인 읽기 캐시 ✅, 오프라인 쓰기 큐 ✅. 남은 후보: Web/PWA (PLAN §8) |
| 2b | Shadowing 네이티브 실 STT | ⬜ EAS 빌드 시 | 현재 웹만 실연동. `lib/speech-recognition.ts`의 네이티브 분기(null 반환)에 `@react-native-voice/voice` 또는 `expo-speech-recognition` 연결. 동일 인터페이스라 컴포넌트 수정 불필요 |
| 2c | 오프라인 쓰기 큐 — 복습 확장 | ⬜ 선택 | 이번엔 레슨만(복습은 `review-session`이 시각 의존이라 제외). 복습까지 오프라인화하려면 due 목록 스냅샷 캐싱 전략(시점 동결) 설계 필요 |
| 2d | 오프라인 full reload 복원(PWA) | ⬜ Web/PWA 시 | dev web은 서비스워커 없어 오프라인 reload 불가. persist 캐시·쓰기 큐는 이미 기록됨 — PWA SW(또는 네이티브 임베드 번들)에서 복원·재진입 동작 |
| 3 | 게임화 수치 서버 검증 (Edge Function) | ⬜ 클라우드 전환 시 | 클라이언트가 profiles·league_entries 직접 update — RLS 0002 주석 참조. 오프라인 큐 재실행도 동일 클라이언트 경로 |
| 4 | Google·Apple OAuth | ⬜ 보류 | 클라우드 Supabase 전환 시 (로컬은 이메일만) |
| 5 | Lottie 에셋 교체 / 실광고(AdMob) | ⬜ 선택 | 완료 연출은 Reanimated(D15), 광고는 ad-banner.tsx placeholder — 에셋·네이티브 빌드 확보 시 교체 |
| 6 | Premium 가격 확정 | ⬜ 스토어 제출 전 | PREMIUM_PLANS(월 9,900/연 79,000)는 임시값 (D16) — 앱 이름(U2)과 함께 제출 전 결정 |

## Key Decisions Made

- **D22 — 오프라인 쓰기 큐는 레슨 한정 "의도 재실행"**: 완료된 절대값을 큐잉하면 서버 상태와 충돌하므로, 레슨 입력(`result`·`history`)을 영속 큐(`lib/sync-queue.ts`, zustand+AsyncStorage, userId 태깅)에 적재했다가 복귀 시 `SyncProcessor`가 `completeLessonWrite`를 **서버 fresh profile에 대고 재실행**한다(XP·스트릭·SM-2·리그가 read-modify-write라 충돌 흡수). 쓰기 로직은 `lib/learning-writes.ts`의 `completeLessonWrite` 단일 소스(온라인 훅도 호출). 멱등성은 `progressId`(=user_progress.id) 중복 skip, 시각 정확도는 `completedAt`(학습 시점) 기준 계산. 오프라인 완료는 홈 낙관적 갱신(`setQueryData`로 profile·daily-xp·skill-tree `markLessonComplete`) + "동기화 대기 N" pill, 복귀 시 invalidate로 보정. 하트는 오답에 캐시 낙관 차감→동기화 때 `heartsLost` 일괄. **복습은 제외**(due 목록 `review-session`이 시각 의존이라 D21에서 persist 제외, 오프라인 세션 불가 → 진입 차단 유지). 오프라인 레슨 진입은 **prefetch된 레슨만**(홈이 "이어하기" 미리 캐시)
- **D21 — 오프라인은 읽기 캐시 중심**: TanStack Query persistence(AsyncStorage)로 콘텐츠 스냅샷만 영속, 시각·주간 의존 쿼리(`league`·`review-count`·`review-session`)는 `shouldDehydrateQuery`로 제외. 사용자별 캐시는 persister storage 키에 userId. 오프라인 감지는 플랫폼 분기(웹 onlineManager 기본, 네이티브 NetInfo). dev web은 SW 없어 오프라인 full reload 불가
- **D20 — Shadowing은 6번째 ExerciseType + STT 추상화**: `SHADOW_SPEAK`로 기존 5종·레슨·복습에 편입, 채점은 단어 포함률 ≥ 0.6. STT는 `lib/speech-recognition.ts`(웹만 Web Speech 실연동, 네이티브는 EAS 시)
- **D19 — SM-2 복습은 전용 상태 테이블**: `UserReviewState`에 (사용자×문제) 스케줄 영속, 복습 XP는 총합만·하트 무소모
- **D16~D18** — 구독 mock 결제 / 활성 언어쌍 is_active 1개 / Admin Hono SSR(React 없음). (이전 핸드오프 참조)
- **AI 생성은 구조화 출력 + 발행 전 검증 이중 방어**, content_drafts RLS는 정책 없이 활성화만(직접 연결 Admin만 접근)

## Known Issues

- **오프라인 쓰기 큐(D22)**: ① dev web은 SW가 없어 오프라인 full reload 불가 — `offline_write_loop.py`는 SPA 내에서 오프라인 레슨을 풀고 복귀 후 reload로 서버 반영을 검증한다(reload 자체는 온라인 시점). ② 동기화 중 **부분 실패**(진행 삽입 후 후속 쓰기 전에 네트워크 사망)는 극히 드물게 후속 쓰기(프로필 XP 등) 손실 가능 — 재시도 시 `progressId` 멱등 skip이라 **이중 적용은 없음**(손실 < 이중 적용 우선). ③ 오프라인 레슨 진입은 prefetch된 레슨만 가능(미캐시 레슨은 `offline-blocked`). ④ 리그 주간 XP는 동기화 시점 주차에 가산 — 주 경계를 넘긴 오프라인 완료는 새 주에 반영될 수 있음(드문 edge, 문서화)
- **오프라인 읽기(D21)**: NetInfo web은 window offline에 즉시 반응 안 해 웹은 onlineManager 기본 리스너 사용. `lib/online-status.ts` 수정 시 Metro `--clear` 재기동 필요(CI 모드 워치 안 함)
- **Shadowing**: 헤드리스 크로뮴엔 Web Speech가 없어 fallback("직접 확인") — e2e는 `window.__mockShadowTranscript` 주입으로 검증. 실제 마이크는 일반 Chrome/EAS 빌드
- Alert.alert는 Expo web에서 no-op(하트 소진/이탈 다이얼로그 미표시 — 네이티브 전용 UX)
- 새 라우트 파일 추가 후 typecheck는 dev 서버가 `.expo/types/router.d.ts` 재생성 후 통과(이번 세션은 새 라우트 없음 — 컴포넌트·lib만)
- 봇 코호트·시드 주차·Metro 캐시·cuid() 기본값 등 기존 함정은 CLAUDE.md 참조

## Context for Next Session

- **사용자 목표**: PLAN.md 기반 앱 전체 완성. 품질 우선, Phase 순서 (0✅→1✅→2✅→3 로컬✅→4)
- **다음 작업 후보**: ① **클라우드 Supabase 전환 + EAS 빌드 + RevenueCat 실연동 + Shadowing 네이티브 STT + OAuth** (Phase 3 마감 — 사용자와 계정/비용 논의 필요) 또는 ② **Phase 4 나머지**(Web·PWA 오프라인 full reload 복원 / 오프라인 쓰기 큐 복습 확장). SM-2·Shadowing·오프라인 읽기·오프라인 쓰기는 완료. 시작 전 방향 확인할 것
- **오프라인 쓰기 큐 동작**: 오프라인 레슨 완료 → `lib/sync-queue.ts`에 적재(영속) + 홈 낙관 반영. 온라인 복귀 → `components/sync-processor.tsx`가 `completeLessonWrite` 재실행 → 성공 시 큐 제거 + invalidate. 쓰기 로직 손대려면 `lib/learning-writes.ts` 단일 소스만 수정(온라인/오프라인 공유). 멱등 키는 `progressId`
- **개발 환경 기동**: `supabase start` → `pnpm db:migrate` → policies/ SQL 번호순 수동 적용(0001~0004) → `pnpm db:seed`. e2e용 Expo web: `cd apps/mobile && CI=1 npx expo start --web --port 8081 --clear`
- **검증 루틴**: `pnpm typecheck` + `pnpm lint` + `pnpm test`(vitest 63) + 모바일 e2e(`learning_loop.py` 67 + `review_loop.py` 9 + `offline_loop.py` 15 + `offline_write_loop.py` 21, Expo web 8081). ⚠️ `review_loop.py`는 psql 필요. 오프라인 e2e는 `set_offline` 사용. 이번 세션은 새 라우트 없음(typed routes 재생성 불필요)
- **게임화·Freemium 수치는 @ted/shared/constants.ts**, 오프라인 캐시 설정은 `lib/query-client.ts`, 쓰기 큐는 `lib/sync-queue.ts`·`lib/learning-writes.ts`
- **푸시 상태**: 이번 세션(Phase 4 오프라인 쓰기 큐, D22)은 **커밋만 완료, `origin/main` 미푸시** — 사용자 명시 요청 시 푸시
- **사용자 선호**: 커밋 메시지 한글, 푸시는 명시 요청 시만, 미확정 항목(앱 이름 U2, Premium 가격 등)은 구현 전 확인

## Files Modified This Session (Phase 4 오프라인 쓰기 큐 — D22)

```
mobile(신규): lib/learning-writes.ts, lib/sync-queue.ts, components/sync-processor.tsx,
              e2e/offline_write_loop.py
mobile(수정): hooks/use-skill-tree.ts(deriveTree·markLessonComplete·fetchLessonExercises),
              hooks/use-profile.ts(fetchProfileDto), hooks/use-game.ts(completeLessonWrite 호출),
              lib/gamification.ts(upsertReviewStates now 인자),
              app/_layout.tsx(SyncProcessor), app/(tabs)/index.tsx(오프라인 허용·대기 pill·prefetch),
              app/lesson/[id]/index.tsx(오프라인 완료·하트 낙관), app/lesson/[id]/complete.tsx(대기 안내),
              e2e/offline_loop.py(D22 동작 반영)
docs:         e2e/README.md, PLAN.md(v0.9 D22·§8), CLAUDE.md, CHANGELOG.md, HANDOFF.md
```
