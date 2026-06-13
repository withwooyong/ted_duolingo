/**
 * 도메인 타입 — PLAN.md §6 데이터 모델과 1:1 대응.
 * DB 스키마(packages/db/prisma)와 모바일 앱이 공유한다.
 */

/** 문제 유형 6종 (PLAN.md §3.2) — Prisma enum ExerciseType과 동일 값 */
export type ExerciseType =
  | 'LISTEN_SELECT'
  | 'FILL_BLANK'
  | 'MATCH_PAIRS'
  | 'ORDER_WORDS'
  | 'COMPREHENSION_MCQ'
  | 'SHADOW_SPEAK';

/** 리그 티어 (PLAN.md §3.3 — Bronze → Diamond) */
export type LeagueTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'SAPPHIRE' | 'DIAMOND';

/** 배지 키 — DB badges.key와 동일 값 (packages/db 시드 참조) */
export type BadgeKey =
  | 'first_lesson'
  | 'streak_3'
  | 'streak_7'
  | 'xp_500'
  | 'perfect_lesson'
  | 'league_promote';

/* ── 문제 유형별 payload (Exercise.options JSON의 타입) ───────────── */

/** 듣고 고르기 — audioText를 TTS/오디오로 재생, 보기 중 선택 */
export interface ListenSelectPayload {
  type: 'LISTEN_SELECT';
  audioText: string;
  options: string[];
  /** options 인덱스 */
  answerIndex: number;
}

/** 빈칸 채우기 — sentence에서 null 위치가 빈칸 */
export interface FillBlankPayload {
  type: 'FILL_BLANK';
  /** 예: ['I ', null, ' like a coffee.'] */
  sentence: (string | null)[];
  options: string[];
  answer: string;
}

/** 짝 맞추기 — [원어, 학습어] 쌍 */
export interface MatchPairsPayload {
  type: 'MATCH_PAIRS';
  pairs: [string, string][];
}

/** 단어 배열 — words에는 함정 단어 포함 가능 */
export interface OrderWordsPayload {
  type: 'ORDER_WORDS';
  words: string[];
  /** 공백으로 join한 정답 문장 */
  answer: string;
}

/** 독해 객관식 */
export interface ComprehensionMcqPayload {
  type: 'COMPREHENSION_MCQ';
  passage: string;
  question: string;
  options: string[];
  answerIndex: number;
}

/** 발음 따라하기 — text를 TTS로 들려주고 사용자가 따라 말하면 STT로 채점 */
export interface ShadowSpeakPayload {
  type: 'SHADOW_SPEAK';
  /** 따라 말할 문장 (TTS 재생·STT 채점 기준) */
  text: string;
  /** 뜻(원어) — 화면 보조 표시용, 채점에는 미사용 */
  meaning?: string;
}

export type ExercisePayload =
  | ListenSelectPayload
  | FillBlankPayload
  | MatchPairsPayload
  | OrderWordsPayload
  | ComprehensionMcqPayload
  | ShadowSpeakPayload;

/* ── 조회용 DTO (앱 ↔ Supabase) ───────────────────────────────── */

export interface ExerciseDto {
  id: string;
  lessonId: string;
  order: number;
  type: ExerciseType;
  prompt: string;
  payload: ExercisePayload;
  audioUrl: string | null;
  explanation: string | null;
  /** 학습어 코드 (예: 'en') — LISTEN_SELECT의 TTS 로케일 선택용 */
  targetLang: string;
}

export interface LessonDto {
  id: string;
  skillId: string;
  order: number;
  title: string;
  xpReward: number;
}

export interface SkillDto {
  id: string;
  languagePairId: string;
  order: number;
  title: string;
  icon: string;
  description: string | null;
  lessons: LessonDto[];
}

export interface ProfileDto {
  id: string;
  displayName: string;
  nativeLang: string;
  xp: number;
  hearts: number;
  /** 하트 충전 기준 시각 (ISO) — refillHearts 계산용 */
  heartsUpdatedAt: string;
  streak: number;
  longestStreak: number;
  leagueTier: LeagueTier;
  weeklyXp: number;
  dailyGoalXp: number;
  isPremium: boolean;
  /** 구독 만료 시각 (ISO) — mock 구독은 항상 기록, 없으면 무기한 */
  premiumExpiresAt: string | null;
  lastStudyDate: string | null;
}

/** 레슨 1회 완료 결과 (진행 저장용) */
export interface LessonResult {
  lessonId: string;
  /** 정답 수 / 전체 문제 수 */
  score: number;
  total: number;
  xpEarned: number;
  /** 틀린 exerciseId 목록 */
  mistakes: string[];
}
