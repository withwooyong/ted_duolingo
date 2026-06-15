# Session Handoff

> Last updated: 2026-06-15 (KST)
> Branch: `main`
> Latest commit: `126b8e5` - fix: 학습 루프 UI 2건 — 짝 맞추기 좌우 한 장씩 선택 + 따라하기 STT 에러 원인별 안내. **`origin/main` 푸시 완료** (+ 본 문서 커밋)
> Repo: https://github.com/withwooyong/ted_duolingo (**public**)

## Current Status

Phase 0 → 1 → 2 → 3(로컬) → Phase 4 전체(SM-2 복습·Shadowing·오프라인 읽기 D21·쓰기 D22·PWA D23·오프라인 복습 D24)까지 **로컬 범위 완결** 상태. 이번 세션은 신규 기능/D-결정 없이 **Phase 1 학습 루프 UI 버그 2건 수정**: ① 짝 맞추기(MATCH_PAIRS)가 카드를 한 그리드에 섞어 깔아 같은 쪽 두 장도 선택돼 오답 처리되던 문제를 좌(한국어)·우(영어) 두 열 + 한 장씩 선택으로 수정. ② 따라하기(SHADOW_SPEAK)의 STT 실패 시 원인 불문 동일 문구를 띄우던 onError를 Web Speech 에러 코드별 안내로 분기 + start() 동기 예외 처리. typecheck·lint clean, Playwright 실구동 검증 완료.

## Completed This Session (학습 루프 UI 버그 수정)

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | 짝 맞추기 좌/우 한 장씩 선택 (열별 독립 셔플 + 같은 열 재탭은 선택 이동) | `126b8e5` | apps/mobile/src/components/exercise/match-pairs.tsx |
| 2 | 따라하기 STT 에러 코드별 안내 분기 + start() try/catch | `126b8e5` | apps/mobile/src/components/exercise/shadow-speak.tsx |
| 3 | 인수인계 문서 현행화 | (본 커밋) | CHANGELOG.md, HANDOFF.md |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | RevenueCat + IAP 실연동 | ⬜ 클라우드 전환 후 | 교체 지점 `hooks/use-premium.ts` mutationFn + RevenueCat 웹훅→Edge Function (D16) |
| 2 | Phase 4 — 고도화 | ✅ §8 로컬 범위 완결 | SM-2 ✅, Shadowing ✅, 오프라인 읽기 ✅, 오프라인 쓰기 ✅, 오프라인 복습 ✅(D24), PWA full reload ✅(D23). 로컬로 가능한 §8 항목 전부 완료 — 남은 건 클라우드 전환 의존뿐 |
| 2b | Shadowing 네이티브 실 STT | ⬜ EAS 빌드 시 | 웹만 실연동. `lib/speech-recognition.ts` 네이티브 분기에 `@react-native-voice/voice` 등 연결 |
| 2d | PWA 실배포(호스팅·HTTPS·아이콘 보강) | ⬜ 선택 | SW·매니페스트·오프라인 복원 구현·검증 완료. 실배포 시 `dist/` 정적 호스팅(HTTPS 필수) |
| 3 | 게임화 수치 서버 검증 (Edge Function) | ⬜ 클라우드 전환 시 | 클라이언트가 profiles·league_entries·user_review_state·user_review_session 직접 쓰기 — RLS 주석 참조 |
| 4 | Google·Apple OAuth | ⬜ 보류 | 클라우드 Supabase 전환 시 (로컬은 이메일만) |
| 5 | Lottie 에셋 교체 / 실광고(AdMob) | ⬜ 선택 | 완료 연출 Reanimated(D15), 광고 ad-banner.tsx placeholder |
| 6 | Premium 가격 확정 | ⬜ 스토어 제출 전 | PREMIUM_PLANS(월 9,900/연 79,000) 임시값 (D16) — 앱 이름(U2)과 함께 제출 전 결정 |

## Key Decisions Made

- **이번 세션 — UI 버그 수정(D-결정 아님)**: ① **짝 맞추기**는 좌(한국어)·우(영어) **두 열로 물리 분리**하고 열별로 독립 셔플(같은 행에 정답이 나란히 안 놓이게). 탭 로직은 "선택 없음 또는 같은 열 재탭 → 선택만 이동 / 다른 열 → 정·오답 판정"이라, 같은 쪽 두 장을 골라도 오답이 아니라 선택이 옮겨간다. testID 유지로 e2e 무영향. ② **따라하기 STT 에러**는 `lib/speech-recognition.ts`가 이미 `e.error`(에러 코드)를 onError로 넘기고 있었으나 컴포넌트가 이를 버리고 고정 문구를 띄우던 게 원인 — 컴포넌트에 `sttErrorMessage(reason)` 매핑을 추가해 권한/네트워크/장치/노스피치/중단을 구분. "바로 빠지는" 증상은 보통 마이크 권한 미허용·차단 또는 `network`(Chrome STT는 구글 서버로 오디오 전송, 온라인 필요) 또는 LAN IP 접속(비보안 컨텍스트)
- **D24 — 오프라인 복습 큐 = "시점 동결 스냅샷 + 의도 재실행"**: live `review-session`(persist 제외)과 분리된 영속 `review-snapshot`(온라인일 때 재동결, 오프라인은 paused로 자연 동결). 쓰기는 `completeReviewWrite`(온라인 훅·큐 공용)를 fresh 상태에 재실행, 멱등성은 새 테이블 `user_review_session`(RLS 0005). 복습 XP는 `@ted/shared` `reviewXp` 단일 소스. (상세는 이전 핸드오프 git 이력 참조)
- **D23 — PWA 앱 셸 캐시**: 정적 export + `public/sw.js`가 앱 셸만 캐시, 교차 오리진(Supabase)·비-GET 통과(데이터=persist, 쓰기=sync-queue), 등록은 production export만
- **D22 — 오프라인 쓰기 큐(레슨)**: 레슨 입력을 영속 큐에 적재→복귀 시 `completeLessonWrite` fresh 재실행, 멱등성 `progressId`. **D24가 이 패턴을 복습으로 확장**
- **D21 — 오프라인 읽기 캐시**: TanStack Query persistence, 시각·주간 의존 쿼리 persist 제외
- **D16~D20** — 구독 mock / 활성 언어쌍 1개 / Admin Hono SSR / SM-2 / Shadowing. (git 이력·CLAUDE.md 참조)

## Known Issues

- **따라하기(SHADOW_SPEAK)**: ① Chrome Web Speech API는 **온라인 필수**(구글 음성 서버로 오디오 전송) — 오프라인/차단 시 `network` 에러. ② 마이크 권한 미허용·차단 시 `not-allowed`/`service-not-allowed`(주소창 🎤에서 허용). ③ **`localhost`가 아닌 LAN IP(`192.168.x.x:8081`)로 접속하면 비보안 컨텍스트라 STT 불가** — 반드시 `http://localhost:8081`. ④ 헤드리스 크로뮴엔 Web Speech 없어 fallback("직접 확인") — e2e는 `window.__mockShadowTranscript` 주입. ⑤ 네이티브 실 STT는 EAS 빌드 시 `lib/speech-recognition.ts` 네이티브 분기 연결 필요
- **짝 맞추기(MATCH_PAIRS)**: 좌=한국어/우=영어 고정. 시드 `pairs`는 `[ko, en]` 순서 전제 — 다른 언어쌍 추가 시에도 `pairs[0]`=학습자 모국어 표기, `pairs[1]`=학습어 표기 유지할 것
- **오프라인(D21~D24)**: dev web은 SW 없어 오프라인 full reload 불가(Metro 메모리 번들), persist 쓰로틀(1s) 전 reload 시 데이터 복원 실패, 스냅샷 `staleTime:0` 필수(stale-empty 굳으면 배너 미표시), 동기화 부분 실패는 멱등 가드로 이중 적용은 없으나 후속 쓰기 손실 가능. CLAUDE.md 참조
- **Alert.alert는 Expo web에서 no-op**(네이티브 전용 UX)
- 이번 세션은 **새 라우트 파일 없음**(기존 컴포넌트 2개만 수정) — typed routes 재생성 불필요
- 봇 코호트·시드 주차·Metro 캐시(`--clear`)·cuid() 기본값·Timestamptz 등 기존 함정은 CLAUDE.md 참조

## Context for Next Session

- **사용자 목표**: PLAN.md 기반 앱 전체 완성. 품질 우선, Phase 순서 (0✅→1✅→2✅→3 로컬✅→4 §8 로컬 범위✅). 최근엔 실제 앱을 구동하며 발견한 학습 루프 UX 버그를 잡는 흐름
- **다음 작업 후보**: ① 계속 **실구동 QA** — 다른 문제 유형(단어 배열·빈칸·독해)·게임화·복습 흐름에서 추가 UX 이슈 점검. ② PLAN.md §8 로컬 항목은 전부 완료라, 남은 큰 덩어리는 **클라우드 전환 의존**(클라우드 Supabase + EAS 빌드 + RevenueCat + Shadowing 네이티브 STT + OAuth + 게임화 서버 검증 — **계정/비용 논의 선행 필요**) 또는 **선택 항목**(PWA 실배포 / Lottie·실광고). 방향은 시작 전 확인
- **앱 실구동 방법(이번 세션 확립)**: `supabase start`(이미 기동·시드됨) 후 `cd apps/mobile && npx expo start --web --port 8081` → 브라우저에서 **`http://localhost:8081`**(LAN IP 말 것). 회원가입→온보딩→홈→레슨으로 전체 루프 확인 가능. 백그라운드 dev 서버는 세션 종료 시 정리됨
- **개발 환경 기동(클린)**: `supabase start` → `pnpm db:migrate` → policies/ SQL 번호순 수동 적용(**0001~0005**) → `pnpm db:seed`
- **검증 루틴**: `pnpm typecheck` + `pnpm lint` + `pnpm test`(vitest 66) + 모바일 e2e. dev 8081 기반: `learning_loop.py` 67 + `review_loop.py` 9(psql) + `offline_loop.py` 15 + `offline_write_loop.py` 21 + `offline_review_loop.py` 20(psql). PWA는 별도: `pnpm build:web` 후 `python3 e2e/pwa_offline_reload.py` 13(자체 SPA 서버 3010). e2e는 CI 모드 워치 안 하니 lib 수정 후 `--clear` 재기동
- **컴포넌트 위치**: 문제 유형 6종은 `apps/mobile/src/components/exercise/` (짝 맞추기 `match-pairs.tsx`, 따라하기 `shadow-speak.tsx`, STT 추상화 `lib/speech-recognition.ts`). 게임화·Freemium 수치는 `@ted/shared/constants.ts`
- **푸시 상태**: 이번 세션(학습 루프 UI 수정 — `126b8e5`)은 **`origin/main` 푸시 완료**(본 문서 커밋 포함)
- **사용자 선호**: 커밋 메시지 한글, 푸시는 명시 요청 시만, 미확정 항목(앱 이름 U2, Premium 가격 등)은 구현 전 확인

## Files Modified This Session (학습 루프 UI 버그 수정)

```
mobile(수정): src/components/exercise/match-pairs.tsx(좌우 두 열 + 한 장씩 선택),
              src/components/exercise/shadow-speak.tsx(STT 에러 코드별 안내 + start try/catch)
docs:         CHANGELOG.md(2026-06-15 Fixed 섹션), HANDOFF.md
```
