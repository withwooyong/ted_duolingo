# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/).

## [Unreleased]

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
