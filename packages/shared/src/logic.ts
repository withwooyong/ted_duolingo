/**
 * 게임화 순수 로직 — DB나 UI에 의존하지 않는 계산 함수.
 * 규칙 수치는 constants.ts 참조 (PLAN.md §3.3·§3.4).
 */
import { HEART_REFILL_MINUTES, MAX_HEARTS, PERFECT_BONUS_XP } from './constants';

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
