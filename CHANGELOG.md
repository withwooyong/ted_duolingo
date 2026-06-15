# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/).

## [Unreleased]

---

## [2026-06-15] 학습 루프 UI 버그 수정 (짝 맞추기 · 따라하기)

### Fixed
- 짝 맞추기(MATCH_PAIRS) — 좌(한국어)·우(영어) 두 열에서 각 한 장씩만 매칭에 쓰이도록 수정 (`126b8e5`). 기존엔 전체를 한 그리드에 섞어 깔아 같은 쪽 두 장(한↔한, 영↔영)도 선택돼 결국 오답 처리됐다. 전체 셔플 1개 → 열별 독립 셔플 2개로 분리하고, 같은 열 재탭은 오답이 아니라 선택만 이동, 서로 다른 열을 골랐을 때만 정/오답 판정. testID(`match-ko-i`/`match-en-i`)는 유지해 기존 e2e 5종 호환
- 따라하기(SHADOW_SPEAK) — STT 실패 시 원인과 무관하게 "잘 안 들렸어요"만 띄우던 `onError`를 Web Speech API 에러 코드별 안내로 분기 (`126b8e5`). `not-allowed`/`service-not-allowed`(마이크 권한), `network`(인식 서버 연결), `audio-capture`(장치), `no-speech`(말소리), `aborted`(중단)를 구분. `rec.start()`가 동기적으로 던지는 예외(미허용·중복 시작)도 try/catch 처리
- 검증: typecheck·expo lint clean. Playwright로 실제 앱 구동해 짝 맞추기 3케이스(같은쪽 선택 이동·좌우 정답 매칭·좌우 오답 표시) + 두 열 레이아웃(좌 한국어/우 영어) 확인, JS 에러 없음

---

## [2026-06-14] Phase 4 — 오프라인 복습 큐 (D24)

### Added
- 오프라인 복습 큐(D24) — D22(레슨 오프라인 쓰기)의 복습 확장. "시점 동결 스냅샷 + 의도 재실행"으로 복습까지 오프라인화. 레슨과 대칭이되, 복습은 시각 의존 due 목록과 멱등 키 부재라는 두 난점을 스냅샷 분리·새 가드 테이블로 해결
- `packages/db` `UserReviewSession` 테이블(마이그레이션 `20260613232500_add_user_review_session`) — 복습 완료 멱등 가드(클라이언트 생성 id). 레슨 `user_progress.id` 대칭으로 SM-2 이중 전진·XP 이중 가산 방지
- `supabase/policies/0005_review_session.sql` — `user_review_session` 본인 행 RLS(select·insert)
- `@ted/shared` `reviewXp(correct, total)` 순수함수 + vitest 3케이스 — 복습 XP(정답 비율 비례 반올림) 단일 소스(낙관 반영·서버 쓰기 공유). use-review 인라인 계산에서 추출
- `apps/mobile/src/lib/review-writes.ts` `completeReviewWrite` — 온라인 훅·오프라인 큐 공용 단일 소스. 멱등 가드 확인→가드 행 insert→`upsertReviewStates`(fresh 상태 재계산)→총 XP 가산
- `apps/mobile/src/hooks/use-review.ts` — `useReviewSnapshot`/`reviewSnapshotKey`/`fetchReviewSession`: live `review-session`과 분리된 영속 동결 스냅샷(`staleTime:0` — 온라인이면 재동결, 오프라인은 paused로 자연 동결)
- `apps/mobile/src/lib/sync-queue.ts` — `QueuedReview` + `reviews` 배열·`enqueueReview`/`removeReview`/`pendingReviewsForUser`, `clearForUser`가 레슨·복습 모두 정리
- e2e — `apps/mobile/e2e/offline_review_loop.py` (20체크): due 백데이트→온라인 스냅샷 동결→오프라인 복습 풀이→낙관 반영→복귀 동기화→서버/DB 검증(`user_review_session` 1행·due 7행 전진·XP 이중 적용 없음)

### Changed
- `apps/mobile/src/components/sync-processor.tsx` — 레슨 드레인 뒤 복습 큐도 `completeReviewWrite`로 fresh profile에 대고 드레인(복습 XP가 레슨 총 XP 위에 누적), invalidate 키에 `review-snapshot` 추가
- `apps/mobile/src/app/review.tsx` — 오프라인은 동결 스냅샷 재생, 완료 시 입력 큐잉 + 낙관 반영(총 XP·스냅샷 소진·배너 숨김) + 완료 화면 대기 안내. 하드 오프라인 차단을 "스냅샷 있으면 허용"으로 완화
- `apps/mobile/src/app/(tabs)/index.tsx` — 복습 스냅샷 prefetch(온라인), 오프라인 due 카운트·진입 게이팅을 스냅샷 기준으로, "동기화 대기" pill에 복습 합산
- `apps/mobile/src/hooks/use-review.ts` `useCompleteReview` — `completeReviewWrite` 호출·`review-snapshot` invalidate 추가
- `apps/mobile/src/lib/query-client.ts` — `review-snapshot`은 일부러 persist(동결이 의도된 동작) 주석 명시
- 검증: vitest **66**(+3) + 모바일 e2e 67(학습)+9(복습)+15(오프라인 읽기)+21(오프라인 쓰기)+**20(오프라인 복습, 신규)**+13(PWA) 전부 통과, typecheck·lint clean

---

## [2026-06-13] Phase 4 — PWA 오프라인 full reload 복원

### Added
- PWA 앱 셸 캐시(D23) — 오프라인에서 page reload 시 앱이 부팅되게 하는 마지막 조각. D21(데이터 persist)·D22(쓰기 큐)에 더해, 정적 export + 서비스워커로 **앱 셸(index.html + 해시 JS/CSS 번들)**을 캐시. SW는 교차 오리진(Supabase)·비-GET을 통과시켜 역할 분리 유지(데이터=persist, 쓰기=sync-queue)
- `apps/mobile/public/sw.js` — 런타임 캐싱 서비스워커: 네비게이션 network-first(오프라인이면 셸 `/` fallback) / `/_expo/static/`·`/assets/` 해시 에셋 cache-first / 그 외 same-origin GET network-first. 교차 오리진·비-GET 미개입. `SHELL_CACHE` 버전은 RQ `CACHE_BUSTER`와 독립, `activate`에서 구버전 정리 + `clients.claim()`
- `apps/mobile/public/index.html` — web `output:"single"`은 `+html.tsx`를 무시하므로 HTML 셸 커스터마이즈(manifest 링크·theme-color·apple-touch-icon)를 여기서. Expo가 CSS/JS 해시 링크를 자동 주입
- `apps/mobile/public/manifest.json` + `icon-192.png`/`icon-512.png`(기존 아이콘 sips 리사이즈) — PWA 매니페스트(`public/`는 export 시 `dist/` 루트로 복사)
- `apps/mobile/src/components/sw-register.tsx` — `_layout` 마운트, web + **production export에서만** `/sw.js` 등록(dev Metro는 캐시할 해시 번들 없어 제외)
- `pnpm build:web`(루트·mobile) — `expo export -p web` → `dist/`
- e2e — `apps/mobile/e2e/pwa_offline_reload.py` (13체크): `dist/`를 자체 python SPA 서버(3010)로 서빙, SW control 확보 후 `set_offline`+`reload`로 앱 셸 복원·스킬 트리 복원·배너 검증

### Changed
- `apps/mobile/src/lib/online-status.ts` — 웹 초기 상태를 `navigator.onLine`으로 동기화. onlineManager 기본값은 `online:true`이고 이벤트로만 갱신돼, 오프라인으로 full reload되면 앱이 온라인으로 착각하던 문제(배너 미표시·쿼리 일시정지 안 됨) 수정
- `apps/mobile/src/app/_layout.tsx` — `SwRegister` 마운트
- 검증: vitest 63 + 모바일 e2e 67(학습)+9(복습)+15(오프라인 읽기)+21(오프라인 쓰기)+**13(PWA, 신규)** 전부 통과, typecheck·lint clean

---

## [2026-06-13] Phase 4 — 오프라인 쓰기 큐

### Added
- 오프라인 쓰기 큐(D22, 레슨 한정) — 오프라인에서 레슨을 풀면 입력을 영속 큐에 적재했다가 온라인 복귀 시 동기화. 충돌 해결은 "의도 재실행": 완료 절대값이 아니라 레슨 입력(result·history)을 큐잉했다가 `completeLessonWrite`를 서버 최신 상태에 대고 재실행(XP 가산·스트릭·SM-2·리그가 read-modify-write라 충돌 흡수). 복습은 due 목록이 시각 의존이라 제외(진입 차단 유지)
- `apps/mobile/src/lib/learning-writes.ts` — 레슨 완료 서버 쓰기 로직 단일 소스(`completeLessonWrite`). 훅·동기화 큐 공유. `progressId`로 멱등(중복 적용 차단), `completedAt`으로 시각 의존 값(스트릭·due·일일XP·하트) 정확 계산, `heartsLost` 일괄 차감(프리미엄 제외)
- `apps/mobile/src/lib/sync-queue.ts` — zustand+persist(AsyncStorage) 큐 스토어(userId 태깅), `pendingForUser` 셀렉터
- `apps/mobile/src/components/sync-processor.tsx` — `_layout` 마운트, online·대기 항목 있으면 FIFO 드레인(항목마다 fresh profile 재조회 → 재실행 → 성공 시 제거 → 전체 invalidate)
- `apps/mobile/src/hooks/use-profile.ts` `fetchProfileDto(userId)`, `use-skill-tree.ts` `markLessonComplete`(낙관적 진행 갱신용 순수 함수)·`fetchLessonExercises`/`lessonExercisesKey`(prefetch 공유)
- e2e — `apps/mobile/e2e/offline_write_loop.py` (21체크): 오프라인 레슨 풀이→완료(대기 안내)→홈 낙관 반영(XP·스트릭·스킬진행·대기 N)→복귀 동기화→reload 서버 반영(이중 적용 없음·배지 수여)

### Changed
- `apps/mobile/src/hooks/use-game.ts` — `useCompleteLesson` 본문을 `completeLessonWrite` 호출로 축소(쓰기 로직 단일화). `upsertReviewStates`(gamification.ts)에 `now` 인자 추가(재실행 시각 정확도)
- `apps/mobile/src/app/lesson/[id]/index.tsx` — 오프라인 분기: 오답 시 프로필 캐시 하트 낙관 차감, 완료 시 큐 적재 + 낙관적 캐시(XP·스트릭·일일XP·스킬트리) + 로컬 계산값으로 완료 화면(배지 생략)
- `apps/mobile/src/app/lesson/[id]/complete.tsx` — `pending='1'` 시 "오프라인 완료 — 연결되면 자동 저장" 안내
- `apps/mobile/src/app/(tabs)/index.tsx` — 오프라인 레슨 진입 허용(문제 캐시된 레슨만), "동기화 대기 N개" pill, "이어하기" 레슨 prefetch. 복습은 오프라인 차단 유지
- `apps/mobile/src/app/_layout.tsx` — `SyncProcessor` 마운트
- e2e — `offline_loop.py`(D21) 진입 차단 검증을 D22 동작(캐시된 레슨은 오프라인 진입 가능)으로 갱신(15체크 유지)

---

## [2026-06-13] Phase 4 — 오프라인 읽기 캐시

### Added
- 오프라인 읽기 캐시(D21) — 네트워크가 끊겨도 스킬트리·레슨·문제·프로필 등 콘텐츠 스냅샷을 열람. 쓰기 큐는 충돌 위험으로 범위 제외
- `apps/mobile/src/lib/query-client.ts` — QueryClient 모듈 분리(gcTime 24h·refetchOnReconnect), 사용자별 AsyncStorage persister 팩토리(`makePersister` — storage 키에 userId 포함), `CACHE_BUSTER`, persist 선별 `shouldDehydrateQuery`(`league`·`review-count`·`review-session` 제외)
- `apps/mobile/src/lib/online-status.ts` — `initOnlineManager()`로 네트워크 상태를 `onlineManager`에 연결(네이티브만 NetInfo, 웹은 기본 리스너)
- `apps/mobile/src/hooks/use-online.ts` — `useOnline()`(useSyncExternalStore로 onlineManager 구독)
- `apps/mobile/src/components/offline-banner.tsx` — 오프라인 시 상단 배너(무애니메이션 — Expo web 함정 회피)
- 의존성 — `@tanstack/react-query-persist-client`·`@tanstack/query-async-storage-persister`·`@react-native-community/netinfo`
- e2e — `apps/mobile/e2e/offline_loop.py` (15체크): 배너·캐시 열람·persist 키 스코프·진입 차단·사용자 캐시 분리

### Changed
- `apps/mobile/src/app/_layout.tsx` — `QueryClientProvider`→`PersistQueryClientProvider`(`key={userId}`로 사용자별 리마운트, 로그아웃 시 `clear()`+persist 캐시 제거), `OfflineBanner` 배치
- `apps/mobile/src/app/(tabs)/index.tsx` — 오프라인 시 레슨/복습 진입 차단(`startLesson`/`startReview` 가드 + `offline-blocked` 인라인 안내)
- `apps/mobile/src/app/review.tsx` — 오프라인 2차 방어(딥링크 직접 진입 차단)

---

## [2026-06-13] Phase 4 — Shadowing (발음 따라하기 / STT)

### Added
- 6번째 문제 유형 `SHADOW_SPEAK` (D20) — 문장을 TTS로 들려주고 따라 말하면 STT로 채점. 기존 5종·레슨 플레이어·SM-2 복습에 그대로 편입
- `@ted/shared` `scoreShadowing` — 단어 포함률(recall) 순수 채점(구두점·대소문자·억양 무시) + `SHADOW_PASS_RATIO`(0.6) 상수 + vitest 63개(+7)
- `ShadowSpeakPayload` 타입 + Prisma `ExerciseType` enum 값 + 마이그레이션 `20260613045108_add_shadow_speak_exercise_type` (RLS 변경 불필요 — 기존 exercises/review_state 사용)
- STT 추상화 `apps/mobile/src/lib/speech-recognition.ts` — 웹은 Web Speech API 실연동, 네이티브는 null→fallback (실 네이티브 STT는 EAS 빌드 시 연결). e2e용 `window.__mockShadowTranscript` 주입 지원
- `components/exercise/shadow-speak.tsx` — TTS 참조 재생(🔊) + 녹음(🎤)→인식 결과·일치율 표시, STT 미지원 시 "직접 확인" fallback. 레슨·복습 양쪽에 렌더 분기(문제별 `key`로 remount)
- 시드 — ko→en 2개·ko→ja 1개 Shadowing 문제 추가 (각 레슨 7문제 이내)

### Changed
- `checkers.ts`·`draft.ts`의 채점/검증 switch에 `SHADOW_SPEAK` 케이스 추가
- e2e — `learning_loop.py` 62→67체크(Shadowing 2곳), `review_loop.py`는 due 6→7문제(첫 레슨에 Shadowing 포함)

---

## [2026-06-13] Phase 4 — SM-2 간격 반복 복습

### Added
- Phase 4 SM-2 간격 반복 복습 (D19) — 레슨·복습 풀이마다 문제별 `UserReviewState`(repetitions·easeFactor·interval·dueAt) 갱신 (`20be934`)
- `@ted/shared` 복습 순수 로직 — `sm2Update`(정답=q5·오답=q2 매핑)·`nextReviewDue`·`INITIAL_REVIEW_STATE` + 상수(`REVIEW_BATCH_SIZE`·`REVIEW_XP`·`SM2_*`) + vitest 56개(+5) (`20be934`)
- `UserReviewState` 모델 마이그레이션(`20260613022526_review_state`) + RLS `0004_review_state.sql`(본인 행 read/insert/update). 활성 언어쌍 필터용 `language_pair_id` 비정규화 (`20be934`)
- `lib/gamification.ts` `upsertReviewStates` — 직전 상태 조회→SM-2 계산→(사용자×문제) upsert. `useCompleteLesson`이 레슨 완료 시 호출(레슨→스킬 언어쌍 조회) (`20be934`)
- `hooks/use-review.ts` — `useDueReviewCount`(홈 배너)·`useReviewSession`(due 순 최대 10문제)·`useCompleteReview`(SM-2 갱신 + 복습 XP). 복습 XP는 총합(profile.xp)만·주간 리그/일일 목표 제외·하트 무소모 (`20be934`)
- `/review` 화면 — 레슨과 같은 5종 컴포넌트로 due 문제 재생, 완료 시 결과(정답 수·XP). 홈 복습 배너(due>0) + 완료 스킬 탭으로 진입 (`20be934`)
- 복습 e2e `apps/mobile/e2e/review_loop.py` 9개 체크 — psql로 `due_at` 백데이트 후 배너→세션→완료→홈 반영 검증 (`20be934`)

### Changed
- 홈 완료 스킬 탭 — "곧 추가" 알림 제거, due>0이면 `/review`로 진입 (`20be934`)

---

## [2026-06-13] Phase 3 — Freemium · 추가 언어쌍 · Admin 웹

### Added
- 페이월 화면 전면 구현 — Free vs Premium 비교 테이블(§3.4)·월/연 플랜 선택·mock 구독/해지, 구독 중이면 만료일·혜택·해지 UI (`9097423`)
- 구독 mock `hooks/use-premium.ts` — profiles의 `is_premium`·`premium_expires_at` 직접 갱신 (D16: RevenueCat 전환 시 이 훅만 교체) (`9097423`)
- 광고 배너 placeholder `components/ad-banner.tsx` — 무료 사용자 레슨 완료 화면에만 표시, 탭하면 페이월 (실광고 AdMob은 네이티브 빌드 시) (`9097423`)
- 추가 언어쌍 ko→ja — 시드 2스킬·2레슨·11문제(5종 유형 전부, 수동 제작 D13) (`9097423`)
- 학습 언어 전환·추가 화면 `/languages` (D17) — 홈 HUD 국기·설정에서 진입, 무료 1개 제한 초과 추가 시 페이월로 유도 (`9097423`)
- 언어 메타 단일 소스 — `LANG_FLAGS`·`LANG_LABELS`·`SPEECH_LOCALES`(TTS 로케일 학습어 기준) + `PREMIUM_PLANS`(가격 임시값) (`9097423`)
- shared 순수 로직 — `isPremiumActive`·`premiumExpiryDate` + vitest 44개(+6) (`9097423`)
- Admin 웹 `apps/admin` — Hono SSR 내부 도구 (D18: React 없음, Expo hoisted node_modules 충돌 회피), `pnpm admin`(포트 3100) (`699b171`)
- AI 콘텐츠 생성 — Claude `claude-opus-4-8` 구조화 출력(zod), `ANTHROPIC_API_KEY` 없으면 모의 생성(결정적 오프라인 샘플) (`699b171`)
- 검수 워크플로 — 드래프트(content_drafts) 목록/생성/JSON 수정/반려/승인·발행(skills·lessons·exercises insert, 트리 맨 뒤 order) (`699b171`)
- 드래프트 검증 `@ted/shared` `validateDraftSkill` — 레슨당 5~8문제·payload 유형 일치·LISTEN/MCQ 정답 options[0] 규약 강제 + vitest 51개(+7) (`699b171`)
- ContentDraft 모델 마이그레이션 + RLS 0003 — 정책 없이 활성화해 anon API 차단 (Admin은 Prisma 직접 연결로 우회) (`699b171`)
- Admin e2e 15개 체크 (`apps/admin/e2e/admin_flow.py`) — 모의 생성→검증 실패/복구→발행→반려 (`699b171`)

### Changed
- 스킬 트리 ko→en 하드코딩 제거 — 활성 언어쌍(user_languages.is_active) 기반 조회, 홈 단원 배너·프로필 국기 동적 표시 (`9097423`)
- 온보딩 언어 선택 — DB 언어쌍 목록 그대로 노출(ja 포함), "준비 중" 하드코딩 카드 제거 (`9097423`)
- 하트 소진 안내(레슨·홈)에 "Premium 보기" 진입점 추가, 설정에 학습 언어·구독 관리 섹션 추가 (`9097423`)
- 모바일 e2e 62개 체크로 확장(+24) — 광고 배너, 무료 언어 제한→페이월, mock 구독, 언어 전환/재전환(진행 보존), ja 레슨 풀 플레이, PREMIUM 배지 (`9097423`)
- PLAN v0.5 — D16(구독 mock)·D17(ko→ja)·D18(Admin 스택) 추가, §8 Phase 3·§9.1 언어쌍 현행화 (`9097423`, `699b171`)
- CLAUDE.md — Freemium·언어쌍·Admin 아키텍처, typed routes 재생성 함정 추가 (`9097423`, `699b171`)

---

## [2026-06-12] Phase 2 — 풀 게임화

### Added
- 리그/주간 랭킹 — 코호트 배정(10명)·클라이언트 주간 마감(순위 확정→승급/강등, D14)·리그 화면(티어 방패·순위표·승급/강등 구간) (`7f68948`)
- 리그 도메인 헬퍼 `lib/gamification.ts` — `ensureLeagueEntry`(새 주 첫 진입 시 직전 주 마감)·`awardBadges` (`7f68948`)
- 배지 6종 — `@ted/shared` `earnedBadgeKeys` 순수 판정 + 레슨 완료·리그 승급 시 수여, 완료 화면 "새 배지 획득!" 표시 (`7f68948`)
- 프로필 화면 — 통계 그리드(스트릭·총 XP·완료 레슨·현재 리그) + 배지 그리드(잠금/획득) (`7f68948`)
- 스트릭 알림 — expo-notifications 매일 20시 로컬 리마인더, 설정 토글 (네이티브 전용, 웹 미지원 안내) (`7f68948`)
- 설정 화면 — 일일 목표 변경(10/20/30 XP) (`7f68948`)
- 레슨 완료 연출 — Reanimated 컨페티·등장 애니메이션 (D15: Lottie 에셋 확보 시 교체) (`7f68948`)
- 공유 리그 로직 — `weekStartDate`·`leagueDaysLeft`·`resolveLeagueOutcome` + vitest 38개로 확장(+21) (`7f68948`)
- 리그 봇 9명 시드(프로토타입 LEAGUE_BOTS 동일, 재시드 시 현재 주차 갱신) + RLS 0002(리그 본인 행 쓰기·프로필 읽기 공개) (`7f68948`)
- e2e 38개 체크로 확장(+15) — 완료 배지·리그 랭킹·프로필 통계/배지·설정 (`7f68948`)

### Changed
- 레슨 완료 뮤테이션 — 주간 XP를 profiles가 아닌 league_entries 행 기준으로 누적, 배지 판정·수여 통합 (`7f68948`)
- PLAN.md v0.4 — D14(리그 클라이언트 마감)·D15(완료 연출 Reanimated) 추가, Phase 2 체크리스트 완료 (`7f68948`)
- CLAUDE.md — Reanimated entering 프리셋 웹 미동작·리그 주간 마감 방식 함정 추가 (`7f68948`)

### Fixed
- Reanimated entering 프리셋(FadeIn 등)이 Expo web에서 요소가 보이지 않는 상태로 멈추는 문제 — shared value 직접 구동(`Reveal`·`Confetti`)으로 교체 (`7f68948`)

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
- 저장소 공개 전환 (private → public, 커밋 내 시크릿 부재 확인 후) — github.com/withwooyong/ted_duolingo
- 세션 인수인계 문서 생성 (CHANGELOG, HANDOFF) (`9aee25f`)
- PLAN.md v0.3 — 부록 B 확정: D11 ko→en, D12 Supabase only, D13 Admin Phase 3 (`ce530e9`)
- CI 액션 업그레이드 — checkout/setup-node v5, pnpm/action-setup v6 (Node 20 지원 종료 대응) (`d15ea3a`, `a55b9fa`)
- RLS SQL을 supabase/migrations/ → supabase/policies/로 이동 — supabase start가 Prisma 테이블 생성 전 자동 적용해 기동 실패하는 문제 (`8de65cb`)
- PLAN.md Phase 0·1 체크리스트 완료 표시 (`1494ae7`, `5cf29ea`)

### Fixed
- 타임존 버그 — timestamp(타임존 없음) 컬럼을 KST 클라이언트가 로컬로 파싱해 하트 충전 9시간 오차 → 전 DateTime 컬럼 timestamptz 마이그레이션 (`5cf29ea`)
- 온보딩 완료 직후 캐시된 빈 user-languages로 홈→온보딩 무한 되튕김 → 캐시 즉시 갱신 (`5cf29ea`)
- Expo web SSR(static)에서 Supabase 클라이언트 크래시 → SPA(single) 모드 전환 (`5cf29ea`)
- NativeWind 웹 다크모드 충돌(Appearance.setColorScheme vs media) → tailwind darkMode: 'class' (`5cf29ea`)
