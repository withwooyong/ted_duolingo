# Ted Duolingo — 프로젝트 계획서

> Duolingo 스타일의 게임화 다국어 학습 앱  
> v0.3 (부록 B 미확정 항목 확정 반영) | 2026-06-12

---

## 1. 프로젝트 개요

### 1.1 한 줄 정의

**초보자를 위한 다국어 언어 학습 앱 — Duolingo의 학습 구조와 게임화를 모바일 퍼스트로 구현**

짧은 레슨, 5종 문제 유형, XP·스트릭·하트·리그·배지 등 **풀 게임화**를 MVP부터 포함한다.  
콘텐츠는 **AI 반자동 생성 + 사람 검수** 파이프라인으로 확장한다.

### 1.2 확정된 방향 (Decision Log)

| # | 항목 | 확정 |
|---|---|---|
| D1 | 앱 종류 | **언어 학습** (Duolingo 유사) |
| D2 | 학습 방향 | **다국어** (여러 언어 쌍 지원) |
| D3 | 타겟 | **초보자** (기초부터) |
| D4 | 콘텐츠 | **AI 반자동 + 사람 검수** |
| D5 | 플랫폼 | **Mobile first** (iOS/Android) |
| D6 | 게임화 | **풀** (XP, 스트릭, 하트, 리그, 배지) |
| D7 | 문제 유형 | **Duolingo 5종** |
| D8 | 기술 스택 | **React Native (Expo) + 백엔드** |
| D9 | 수익 모델 | **Freemium** (MVP부터) |
| D10 | 일정 | **유연 — 품질 우선** |
| D11 | MVP 첫 언어쌍 | **한국어 → 영어** (ko→en) |
| D12 | 백엔드 | **Supabase only** (RLS + Edge Functions, NestJS 분리 없음) |
| D13 | Admin Web | **Phase 3에 구축** (시드 콘텐츠는 수동 제작) |

### 1.3 목표

- **MVP**: 핵심 학습 루프 + 풀 게임화 + Freemium 기반을 모바일에서 완성
- **Phase 2**: 추가 언어 쌍, AI 콘텐츠 파이프라인 고도화, 발음(Shadowing)
- **Phase 3**: Web/PWA, AI 튜터, 소셜·커뮤니티

> 일정은 고정하지 않고, **학습 경험 품질**을 기준으로 단계별 출시.

---

## 2. 타겟 사용자

### 2.1 Primary Persona — "언어 초보 학습자"

- 18~35세, 외국어를 처음 또는 기초부터 다시 시작
- Duolingo처럼 **짧고 재미있게** 매일 조금씩 학습하고 싶음
- 스트릭·XP·배지 같은 **게임화**에 동기부여됨
- 모바일에서 출퇴근·자힌 시간 5~10분 학습

### 2.2 Secondary Persona — "다국어 관심자"

- 2개 이상 언어를 동시에 또는 순차적으로 학습
- 언어 전환·병행 학습 UI 필요

---

## 3. 핵심 기능 정의

### 3.1 MVP Must-Have (P0)

| 기능 | 설명 |
|---|---|
| **회원가입/로그인** | 이메일 + OAuth (Google, Apple) |
| **온보딩** | 모국어·학습 언어 선택, 일일 목표, 초급 레벨 설정 |
| **스킬 트리 / 커리큘럼** | 단원별 레슨 경로 (Duolingo 스타일) |
| **레슨 플레이** | 5~8문제, 5분 이내 |
| **문제 유형 5종** | 아래 3.2 참조 |
| **풀 게임화** | XP, 스트릭, 하트, 리그, 배지, 일일 목표 |
| **진행 저장** | 레슨·스킬·언어별 진행률 |
| **Freemium** | 무료(하트 제한) + Premium(무제한 하트, 광고 제거) |
| **프로필** | 통계, 스트릭, 배지, 리그 순위 |

### 3.2 문제 유형 (Duolingo 5종)

```
1. Listen & Select    — 오디오 듣고 올바른 문장/단어 선택
2. Fill in the Blank  — 문장 빈칸 (어휘·문법)
3. Match Pairs        — 단어 ↔ 번역 매칭
4. Order the Words    — 단어 배열로 문장 완성
5. Comprehension MCQ  — 문장·대화 이해 객관식
```

Phase 2 추가:
- Shadowing (발음 따라하기, STT)
- Free Translation (자유 번역, AI 채점)

### 3.3 게임화 (MVP 전체 포함)

| 요소 | MVP | 설명 |
|---|---|---|
| XP | ✅ | 레슨·연습 완료 시 획득 |
| 스트릭 | ✅ | 연속 학습일, 스트릭 동결(프리미엄) |
| 하트 | ✅ | 오답 시 소모, 0이면 대기 또는 프리미엄 |
| 리그/랭킹 | ✅ | 주간 XP 기반 리그 (Bronze → Diamond) |
| 배지/업적 | ✅ | 마일스톤·특수 조건 달성 |
| 일일 목표 | ✅ | XP 목표 설정·달성 축하 |
| 레슨 완료 연출 | ✅ | 애니메이션, 사운드 피드백 |

### 3.4 Freemium 모델

| | Free | Premium |
|---|---|---|
| 하트 | 5개, 시간당 충전 | 무제한 |
| 광고 | 있음 | 없음 |
| 스트릭 동결 | 월 1회 | 무제한 |
| 오프라인 | ❌ | ✅ (Phase 2) |
| 추가 언어 | 1개 | 무제한 |
| 가격 | — | 월/연 구독 (Stripe / IAP) |

### 3.5 콘텐츠 파이프라인 (AI 반자동)

```
주제·레벨·언어쌍 정의
    ↓
AI: 어휘·문장·대화 생성 (Claude API)
    ↓
AI: 5종 문제 템플릿 자동 생성
    ↓
TTS: 오디오 생성 (Listen 유형)
    ↓
사람 검수 (Admin 도구)
    ↓
DB 저장 → 앱 배포
```

---

## 4. 사용자 여정 (User Flow)

```
[온보딩]
  → 모국어 선택
  → 학습 언어 선택 (복수 가능)
  → 일일 XP 목표
  → (선택) 알림 허용

[홈]
  → 스킬 트리 (현재 단원 강조)
  → 스트릭·하트·XP 표시
  → 이어하기 / 오늘의 레슨

[레슨]
  → 하트 표시
  → 문제 N/M 진행 바
  → 정답/오답 즉시 피드백 + 해설
  → 레슨 완료 → XP·축하 연출

[리그] (탭)
  → 주간 XP 순위
  → 승급/강등 안내

[프로필]
  → 스트릭, 총 XP, 배지
  → 언어별 진행률
  → Premium 업그레이드

[설정]
  → 언어 추가/전환
  → 알림, 계정, 구독 관리
```

---

## 5. 기술 스택

### 5.1 확정 스택 — Mobile First

| 레이어 | 기술 | 이유 |
|---|---|---|
| Mobile | **React Native (Expo)** | iOS/Android 동시, OTA 업데이트 |
| Navigation | **Expo Router** | 파일 기반 라우팅 |
| UI | **NativeWind** (Tailwind RN) | Duolingo급 커스텀 UI |
| Animation | **Reanimated + Lottie** | 레슨 완료·피드백 연출 |
| Audio | **expo-av** | Listen & Select |
| State | **Zustand + TanStack Query** | 로컬·서버 상태 분리 |
| Backend | **Supabase** (MVP) 또는 **NestJS** | Auth, DB, Realtime |
| DB | **PostgreSQL** | 다국어·진행·리그 데이터 |
| ORM | **Prisma** | 타입 안전 |
| Auth | **Supabase Auth** | Google, Apple Sign-In |
| Cache | **Upstash Redis** | 리그, 랭킹, 하트 충전 |
| AI | **Claude API** | 콘텐츠·문제 생성 |
| TTS | **Google Cloud TTS / ElevenLabs** | Listen 유형 오디오 |
| 결제 | **RevenueCat** + App Store / Play | 구독 관리 |
| 배포 | **EAS Build + EAS Submit** | 앱스토어 배포 |
| Admin | **Next.js** (별도 Web) | 콘텐츠 검수·관리 |

### 5.2 프로젝트 구조 (Monorepo 제안)

```
ted_duolingo/
├── apps/
│   ├── mobile/          # Expo React Native
│   └── admin/           # Next.js 콘텐츠 Admin
├── packages/
│   ├── shared/          # 타입, 상수, 유틸
│   └── api-client/      # API 클라이언트
└── supabase/            # 마이그레이션, RLS
```

---

## 6. 데이터 모델 (초안)

```
User
  ├── id, email, displayName
  ├── nativeLang, learningLangs[]
  ├── xp, hearts, streak, longestStreak
  ├── leagueTier, weeklyXp
  ├── isPremium, premiumExpiresAt
  └── lastStudyDate

LanguagePair
  ├── id, sourceLang, targetLang
  └── displayName

Course / Skill
  ├── id, languagePairId, order, title, icon
  └── description

Lesson
  ├── id, skillId, order, title, xpReward
  └── isLocked (선행 레슨 완료 조건)

Exercise
  ├── id, lessonId, order, type (enum)
  ├── prompt, options (JSON), correctAnswer
  ├── audioUrl, explanation
  └── sourceLang, targetLang

UserProgress
  ├── userId, lessonId, completedAt, score, xpEarned
  └── mistakes (JSON)

UserExerciseHistory
  ├── userId, exerciseId, answeredAt, isCorrect
  └── (SM-2 복습용, Phase 2)

Badge
  ├── id, title, condition, icon

UserBadge
  ├── userId, badgeId, earnedAt

League
  ├── weekStart, tier, userId, weeklyXp, rank
```

---

## 7. 화면 구조 (Mobile IA)

```
/onboarding          온보딩 (언어·목표)
/(tabs)/
  home               스킬 트리, 이어하기
  league             주간 리그
  profile            프로필·배지·설정
/lesson/[id]         레슨 플레이
/lesson/[id]/complete 레슨 완료
/premium             구독 업그레이드
/settings            설정
```

---

## 8. 개발 로드맵 (품질 우선, 단계별)

### Phase 0 — 기반

- [ ] Monorepo 초기화 (Expo + Admin + shared)
- [ ] Supabase + Prisma 스키마
- [ ] Auth (이메일, Google, Apple)
- [ ] 시드 데이터 (언어쌍 1~2개, 스킬·레슨·문제)
- [ ] CI (lint, test, typecheck, EAS)

### Phase 1 — 핵심 학습 루프

- [ ] 온보딩 (언어 선택, 일일 목표)
- [ ] 스킬 트리 UI
- [ ] 문제 유형 5종 컴포넌트
- [ ] 레슨 플레이 (시작 → 문제 → 완료)
- [ ] XP + 진행 저장
- [ ] 하트 시스템

### Phase 2 — 풀 게임화

- [ ] 스트릭 (연속 학습일, 알림)
- [ ] 리그 / 주간 랭킹
- [ ] 배지 / 업적
- [ ] 일일 목표 UI
- [ ] 레슨 완료·정답 연출 (Lottie)

### Phase 3 — Freemium & 콘텐츠

- [ ] RevenueCat + IAP 구독
- [ ] Premium 기능 (무제한 하트, 광고 제거)
- [ ] Admin: AI 생성 + 검수 워크플로
- [ ] 추가 언어쌍 확장

### Phase 4 — 고도화

- [ ] SM-2 복습 알고리즘
- [ ] Shadowing (STT)
- [ ] 오프라인 모드
- [ ] Web/PWA (선택)

---

## 9. 다국어 전략

### 9.1 MVP 언어쌍 (제안)

| 우선순위 | 학습 방향 | 이유 |
|---|---|---|
| 1 | 한국어 → 영어 | 개발·테스트 편의 |
| 2 | 영어 → 한국어 | 국내 사용자 확장 |
| 3 | 영어 → 일본어 등 | Phase 3+ |

### 9.2 UI 현지화

- 앱 UI: i18n (react-i18next) — 모국어 기준
- 학습 콘텐츠: `LanguagePair`별 DB 분리

---

## 10. 성공 지표 (KPI)

| 지표 | 목표 |
|---|---|
| D1 Retention | 35%+ |
| D7 Retention | 20%+ |
| 레슨 완료율 | 65%+ |
| 7일 스트릭 유지율 | 15%+ |
| Free → Premium 전환 | 3~5% |
| 일평균 학습 시간 | 10분+ |

---

## 11. 리스크 & 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| Duolingo와 차별화 부족 | 사용자 이탈 | UI/UX·온�oarding·니치 언어쌍으로 차별화 |
| AI 콘텐츠 품질 | 학습 경험 저하 | 검수 워크플로 필수, 시드는 수동 제작 |
| 풀 게임화 MVP 범위 | 개발 지연 | Phase 1~2로 나누되, 설계는 처음부터 포함 |
| RN 성능 (애니메이션) | UX 저하 | Reanimated, 프로파일링 |
| IAP 심사 | 출시 지연 | RevenueCat, 가이드라인 사전 검토 |

---

## 12. 다음 단계

1. **MVP 언어쌍 1~2개 확정** (한국어→영어 등)
2. **Phase 0 킥오프** — Expo + Supabase 스캐폴딩
3. **와이어프레임** — 홈(스킬 트리) / 레슨 / 프로필
4. **시드 레슨 1 스킬** — End-to-end 검증용 (수동 제작)

---

## 부록 A — Duolingo 벤치마크 체크리스트

- [ ] 5분 이내 레슨 단위
- [ ] 즉각적 정답/오답 피드백
- [ ] 진행 바 (문제 N/M)
- [ ] 레슨 완료 축하 애니메이션
- [ ] 스트릭 알림
- [ ] 오답 시 간단한 해설
- [ ] 이어하기 (중단 지점 저장)
- [ ] 온보딩 3단계 이내
- [ ] 하트 0일 때 Premium 유도
- [ ] 주간 리그 결과 화면

## 부록 B — 미확정 항목 (추가 논의)

| # | 질문 | 상태 |
|---|---|---|
| U1 | MVP 첫 언어쌍 | ✅ 확정 → D11: 한국어→영어 |
| U2 | 앱 이름 (스토어) | ⏳ 미정 (스토어 제출 전까지 결정) |
| U3 | Admin Web | ✅ 확정 → D13: Phase 3 |
| U4 | 백엔드 | ✅ 확정 → D12: Supabase only |

---

*확정 사항 반영 v0.3 — 추가 논의 시 v0.4 업데이트*
