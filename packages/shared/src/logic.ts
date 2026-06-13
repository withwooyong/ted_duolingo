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
  REVIEW_XP,
  SM2_DEFAULT_EASE,
  SM2_MIN_EASE,
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

/** 복습 XP — 정답 비율에 비례한 REVIEW_XP(반올림). 총합에만 반영·하트 무소모 (D19). */
export function reviewXp(correct: number, total: number): number {
  return total > 0 ? Math.round((REVIEW_XP * correct) / total) : 0;
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

/* ── SM-2 간격 반복 복습 (PLAN.md §8 Phase 4) ───────────────────
 * 문제별 복습 상태를 유지하고, 정/오답에 따라 다음 복습 간격을 정한다.
 * binary 채점(정/오답)이라 표준 SM-2의 quality를 정답=5·오답=2로 매핑한다. */

const DAY_MS_REVIEW = 24 * 60 * 60 * 1000;

export interface ReviewState {
  /** 연속 정답 횟수 (오답 시 0으로 리셋) */
  repetitions: number;
  /** 용이도 계수 (>= SM2_MIN_EASE) */
  easeFactor: number;
  /** 다음 복습까지 간격(일) */
  interval: number;
}

/** 한 번도 풀지 않은 문제의 복습 상태 초기값 */
export const INITIAL_REVIEW_STATE: ReviewState = {
  repetitions: 0,
  easeFactor: SM2_DEFAULT_EASE,
  interval: 0,
};

/**
 * SM-2 갱신 — 한 번의 정/오답으로 다음 복습 상태를 계산한다.
 * - 정답(q=5): repetitions 증가, 간격 1일 → 6일 → interval*EF 순으로 확대
 * - 오답(q=2): repetitions 리셋, 다음날(1일) 재복습. EF는 표준대로 하향 후 하한 적용
 */
export function sm2Update(state: ReviewState, isCorrect: boolean): ReviewState {
  const q = isCorrect ? 5 : 2;
  const easeFactor = Math.max(
    SM2_MIN_EASE,
    state.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );
  if (q < 3) {
    return { repetitions: 0, easeFactor, interval: 1 };
  }
  const repetitions = state.repetitions + 1;
  const interval =
    repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(state.interval * easeFactor);
  return { repetitions, easeFactor, interval };
}

/** 다음 복습 예정 시각(epoch ms) — 기준 시각 + interval일 */
export function nextReviewDue(state: ReviewState, from: number): number {
  return from + state.interval * DAY_MS_REVIEW;
}

/* ── Shadowing 발음 채점 (PLAN.md §3.2 — STT 인식 결과 vs 정답 문장) ──
 * STT는 구두점·대소문자·억양을 흘리므로 정확 일치 대신 단어 포함률(recall)로 채점한다.
 * 정답 문장의 각 단어가 인식 결과에 (중복 포함해) 들어 있으면 맞춘 것으로 본다. */

/** 채점용 정규화 — 소문자·구두점 제거·공백 분리 (아포스트로피는 단어 일부로 유지) */
function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * 발음 따라하기 점수 — 정답 단어 중 인식 결과에 포함된 비율(0~1).
 * 단어 중복은 1:1로만 매칭 (multiset 교집합 / 정답 단어 수).
 */
export function scoreShadowing(target: string, transcript: string): number {
  const want = normalizeWords(target);
  if (want.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const w of normalizeWords(transcript)) counts.set(w, (counts.get(w) ?? 0) + 1);
  let matched = 0;
  for (const w of want) {
    const n = counts.get(w) ?? 0;
    if (n > 0) {
      matched++;
      counts.set(w, n - 1);
    }
  }
  return matched / want.length;
}
