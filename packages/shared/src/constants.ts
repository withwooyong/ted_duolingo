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

/* ── 레슨 구성 (PLAN.md §3.1 — 5~8문제, 5분 이내) ── */
export const LESSON_MIN_EXERCISES = 5;
export const LESSON_MAX_EXERCISES = 8;
