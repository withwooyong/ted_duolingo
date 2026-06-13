/**
 * 게임화 규칙 상수 — PLAN.md §3.3·§3.4의 단일 소스.
 * 숫자를 바꿀 때는 PLAN.md와 함께 갱신할 것.
 */
import type { LeagueTier } from './types';

/* ── 하트 (PLAN.md §3.4) ── */
export const MAX_HEARTS = 5;
export const HEART_REFILL_MINUTES = 60;

/* ── XP ── */
export const LESSON_XP = 10;
export const PERFECT_BONUS_XP = 5;
export const DAILY_GOAL_OPTIONS = [10, 20, 30] as const;
export const DEFAULT_DAILY_GOAL = 20;

/* ── 스트릭 ── */
export const FREE_STREAK_FREEZE_PER_MONTH = 1;

/* ── 리그 (주간 XP 기준, Bronze → Diamond) ── */
export const LEAGUE_TIERS: LeagueTier[] = ['BRONZE', 'SILVER', 'GOLD', 'SAPPHIRE', 'DIAMOND'];
export const LEAGUE_COHORT_SIZE = 10;
export const LEAGUE_PROMOTE_COUNT = 3;
export const LEAGUE_DEMOTE_COUNT = 3;

export const LEAGUE_TIER_LABELS: Record<LeagueTier, string> = {
  BRONZE: '브론즈',
  SILVER: '실버',
  GOLD: '골드',
  SAPPHIRE: '사파이어',
  DIAMOND: '다이아몬드',
};

export const LEAGUE_TIER_ICONS: Record<LeagueTier, string> = {
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  SAPPHIRE: '🔷',
  DIAMOND: '💎',
};

/* ── 배지 달성 기준 (시드 badges와 짝 — packages/db/prisma/seed.ts) ── */
export const BADGE_STREAK_SHORT = 3;
export const BADGE_STREAK_LONG = 7;
export const BADGE_XP_MILESTONE = 500;

/* ── Freemium ── */
export const FREE_MAX_LEARNING_LANGS = 1;

/* ── Premium 구독 플랜 (PLAN.md §3.4 — 가격은 임시값, 스토어 제출 전 확정) ── */
export const PREMIUM_PLANS = [
  { id: 'monthly', label: '월간', months: 1, priceKrw: 9900, note: '언제든 해지 가능' },
  { id: 'yearly', label: '연간', months: 12, priceKrw: 79000, note: '월 6,600원꼴 · 33% 할인' },
] as const;
export type PremiumPlan = (typeof PREMIUM_PLANS)[number];
export type PremiumPlanId = PremiumPlan['id'];

/* ── 언어 메타 (PLAN.md §9 — 언어쌍 추가 시 함께 갱신) ── */
export const LANG_FLAGS: Record<string, string> = { ko: '🇰🇷', en: '🇺🇸', ja: '🇯🇵' };
export const LANG_LABELS: Record<string, string> = { ko: '한국어', en: '영어', ja: '일본어' };
/** TTS(expo-speech) 로케일 — LISTEN_SELECT의 targetLang 기준 */
export const SPEECH_LOCALES: Record<string, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP' };

/* ── 레슨 구성 (PLAN.md §3.1 — 5~8문제, 5분 이내) ── */
export const LESSON_MIN_EXERCISES = 5;
export const LESSON_MAX_EXERCISES = 8;

/* ── 복습 (SM-2 간격 반복, PLAN.md §8 Phase 4) ── */
/** 한 복습 세션의 최대 문제 수 (due 순으로 채운다) */
export const REVIEW_BATCH_SIZE = 10;
/** 복습 세션 전부 정답 시 최대 보상 XP — 정답 비율에 비례 (총합·총 XP에만 반영, 주간 리그·일일 목표 제외) */
export const REVIEW_XP = 5;
/** SM-2 용이도 계수 하한 (표준값) */
export const SM2_MIN_EASE = 1.3;
/** SM-2 용이도 계수 초기값 (표준값) */
export const SM2_DEFAULT_EASE = 2.5;

/* ── Shadowing 발음 따라하기 (PLAN.md §3.2·§8 Phase 4) ── */
/** STT 인식 결과가 정답 단어를 이 비율 이상 포함하면 통과 — 초보자 관대 채점 */
export const SHADOW_PASS_RATIO = 0.6;
