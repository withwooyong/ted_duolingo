/**
 * 게임화 순수 로직 — DB나 UI에 의존하지 않는 계산 함수.
 * 규칙 수치는 constants.ts 참조 (PLAN.md §3.3·§3.4).
 */
import {
  BADGE_STREAK_LONG,
  BADGE_STREAK_SHORT,
  BADGE_XP_MILESTONE,
  HEART_REFILL_MINUTES,
  LEAGUE_DEMOTE_COUNT,
  LEAGUE_PROMOTE_COUNT,
  LEAGUE_TIERS,
  MAX_HEARTS,
  PERFECT_BONUS_XP,
} from './constants';
import type { BadgeKey, LeagueTier } from './types';

const HEART_REFILL_MS = HEART_REFILL_MINUTES * 60 * 1000;

export interface HeartsState {
  hearts: number;
  /** 충전 기준 시각 (epoch ms) */
  updatedAt: number;
}

/**
 * 시간 경과에 따른 하트 충전 계산 (시간당 1개, 최대 MAX_HEARTS).
 * updatedAt은 마지막 충전 기준 시각 — 가득 차면 now로 리셋.
 */
export function refillHearts(state: HeartsState, now: number): HeartsState {
  if (state.hearts >= MAX_HEARTS) return { hearts: MAX_HEARTS, updatedAt: now };
  const elapsed = Math.max(0, now - state.updatedAt);
  const refilled = Math.floor(elapsed / HEART_REFILL_MS);
  if (refilled <= 0) return state;
  const hearts = Math.min(MAX_HEARTS, state.hearts + refilled);
  return {
    hearts,
    updatedAt: hearts >= MAX_HEARTS ? now : state.updatedAt + refilled * HEART_REFILL_MS,
  };
}

/** 오답으로 하트 1개 소모. 가득 찬 상태에서 소모되면 충전 타이머 시작(updatedAt=now). */
export function consumeHeart(state: HeartsState, now: number): HeartsState {
  const current = refillHearts(state, now);
  if (current.hearts <= 0) return current;
  return {
    hearts: current.hearts - 1,
    updatedAt: current.hearts >= MAX_HEARTS ? now : current.updatedAt,
  };
}

/**
 * 레슨 완료 시 스트릭 계산.
 * @param lastStudyDate 마지막 학습일 'YYYY-MM-DD' (없으면 null)
 * @param today 오늘 'YYYY-MM-DD'
 */
export function nextStreak(lastStudyDate: string | null, today: string, current: number): number {
  if (!lastStudyDate) return 1;
  if (lastStudyDate === today) return Math.max(1, current);
  const diffDays = Math.round(
    (Date.parse(today) - Date.parse(lastStudyDate)) / (24 * 60 * 60 * 1000),
  );
  return diffDays === 1 ? current + 1 : 1;
}

/** 레슨 XP — 기본 보상 + 퍼펙트(전부 정답) 보너스 */
export function lessonXp(xpReward: number, correct: number, total: number): number {
  return xpReward + (total > 0 && correct === total ? PERFECT_BONUS_XP : 0);
}

/** 로컬 기준 'YYYY-MM-DD' (스트릭·일일 목표는 사용자 로컬 날짜 기준) */
export function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 프리미엄 활성 여부 (PLAN.md §3.4).
 * 만료일이 없으면 플래그만 따른다 — mock 구독은 만료일을 항상 기록하고,
 * RevenueCat 전환 후에는 웹훅이 플래그를 갱신한다.
 */
export function isPremiumActive(
  isPremium: boolean,
  premiumExpiresAt: string | null,
  now: number,
): boolean {
  if (!isPremium) return false;
  if (!premiumExpiresAt) return true;
  return Date.parse(premiumExpiresAt) > now;
}

/** 구독 만료 시각 — 시작 시각에 개월 수를 더한다 (mock 결제·만료 표시용) */
export function premiumExpiryDate(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

/* ── 리그 (PLAN.md §3.3 — 주간 XP, 월요일 시작) ───────────────── */

const DAY_MS = 24 * 60 * 60 * 1000;

/** 해당 날짜가 속한 리그 주의 시작일(월요일) 'YYYY-MM-DD' — 로컬 기준 */
export function weekStartDate(d: Date): string {
  const sinceMonday = (d.getDay() + 6) % 7; // 일=0 → 월요일 기준으로 보정
  return localDateString(new Date(d.getFullYear(), d.getMonth(), d.getDate() - sinceMonday));
}

/** 리그 리셋(다음 월요일)까지 남은 일수 — 주 시작일엔 7, 지난 주면 0 */
export function leagueDaysLeft(weekStart: string, today: string): number {
  const elapsed = Math.round((Date.parse(today) - Date.parse(weekStart)) / DAY_MS);
  return Math.max(0, 7 - elapsed);
}

export interface LeagueOutcome {
  tier: LeagueTier;
  change: 'PROMOTE' | 'DEMOTE' | 'STAY';
}

/**
 * 주간 마감 시 승급/강등 판정 (상하위 LEAGUE_PROMOTE/DEMOTE_COUNT명).
 * 승급 구간이 강등 구간보다 우선한다 (코호트가 작을 때 겹칠 수 있음).
 */
export function resolveLeagueOutcome(
  tier: LeagueTier,
  rank: number,
  cohortSize: number,
): LeagueOutcome {
  const idx = LEAGUE_TIERS.indexOf(tier);
  if (rank <= LEAGUE_PROMOTE_COUNT && idx < LEAGUE_TIERS.length - 1) {
    return { tier: LEAGUE_TIERS[idx + 1], change: 'PROMOTE' };
  }
  if (rank > cohortSize - LEAGUE_DEMOTE_COUNT && idx > 0) {
    return { tier: LEAGUE_TIERS[idx - 1], change: 'DEMOTE' };
  }
  return { tier, change: 'STAY' };
}

/* ── 배지 (PLAN.md §3.3 — 시드 badges 6종과 짝) ──────────────── */

export interface BadgeProgress {
  lessonsCompleted: number;
  streak: number;
  totalXp: number;
  /** 이번 레슨을 오답 없이 완료했는가 */
  perfectLesson: boolean;
  /** 이번 주간 마감에서 승급했는가 */
  leaguePromoted: boolean;
}

/**
 * 현재 상태로 달성된 배지 키 전체 — 이미 보유한 배지의 제외는 호출자(DB 조회) 몫.
 */
export function earnedBadgeKeys(p: BadgeProgress): BadgeKey[] {
  const keys: BadgeKey[] = [];
  if (p.lessonsCompleted >= 1) keys.push('first_lesson');
  if (p.streak >= BADGE_STREAK_SHORT) keys.push('streak_3');
  if (p.streak >= BADGE_STREAK_LONG) keys.push('streak_7');
  if (p.totalXp >= BADGE_XP_MILESTONE) keys.push('xp_500');
  if (p.perfectLesson) keys.push('perfect_lesson');
  if (p.leaguePromoted) keys.push('league_promote');
  return keys;
}
