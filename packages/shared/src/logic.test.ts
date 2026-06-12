import { describe, expect, it } from 'vitest';

import { MAX_HEARTS, PERFECT_BONUS_XP } from './constants';
import { consumeHeart, lessonXp, localDateString, nextStreak, refillHearts } from './logic';

const HOUR = 60 * 60 * 1000;
const T0 = 1_700_000_000_000;

describe('refillHearts', () => {
  it('가득 찬 상태면 그대로, 기준 시각만 갱신', () => {
    expect(refillHearts({ hearts: 5, updatedAt: T0 }, T0 + 10 * HOUR)).toEqual({
      hearts: 5,
      updatedAt: T0 + 10 * HOUR,
    });
  });

  it('1시간마다 1개 충전', () => {
    expect(refillHearts({ hearts: 2, updatedAt: T0 }, T0 + 2 * HOUR).hearts).toBe(4);
  });

  it('1시간 미만이면 충전 없음 (기준 시각 유지)', () => {
    expect(refillHearts({ hearts: 2, updatedAt: T0 }, T0 + HOUR - 1)).toEqual({
      hearts: 2,
      updatedAt: T0,
    });
  });

  it('최대치를 넘지 않고, 가득 차면 기준 시각 리셋', () => {
    const result = refillHearts({ hearts: 1, updatedAt: T0 }, T0 + 100 * HOUR);
    expect(result.hearts).toBe(MAX_HEARTS);
    expect(result.updatedAt).toBe(T0 + 100 * HOUR);
  });

  it('부분 충전 시 기준 시각은 충전된 만큼만 전진 (남은 시간 보존)', () => {
    const result = refillHearts({ hearts: 2, updatedAt: T0 }, T0 + 1.5 * HOUR);
    expect(result).toEqual({ hearts: 3, updatedAt: T0 + HOUR });
  });
});

describe('consumeHeart', () => {
  it('가득 찬 상태에서 소모하면 충전 타이머 시작', () => {
    expect(consumeHeart({ hearts: 5, updatedAt: T0 }, T0 + HOUR)).toEqual({
      hearts: 4,
      updatedAt: T0 + HOUR,
    });
  });

  it('소모 전에 경과 시간 충전을 먼저 반영', () => {
    // 2개 + 1시간 충전 = 3개 → 소모 → 2개
    expect(consumeHeart({ hearts: 2, updatedAt: T0 }, T0 + HOUR).hearts).toBe(2);
  });

  it('0개면 더 소모되지 않음', () => {
    expect(consumeHeart({ hearts: 0, updatedAt: T0 }, T0 + 1).hearts).toBe(0);
  });
});

describe('nextStreak', () => {
  it('첫 학습이면 1', () => {
    expect(nextStreak(null, '2026-06-12', 0)).toBe(1);
  });

  it('같은 날 다시 학습해도 유지', () => {
    expect(nextStreak('2026-06-12', '2026-06-12', 3)).toBe(3);
  });

  it('어제 학습했으면 +1', () => {
    expect(nextStreak('2026-06-11', '2026-06-12', 3)).toBe(4);
  });

  it('하루 이상 끊겼으면 1로 리셋', () => {
    expect(nextStreak('2026-06-10', '2026-06-12', 7)).toBe(1);
  });

  it('같은 날인데 current가 0이면 1로 보정 (가입 당일)', () => {
    expect(nextStreak('2026-06-12', '2026-06-12', 0)).toBe(1);
  });
});

describe('lessonXp', () => {
  it('기본 보상', () => {
    expect(lessonXp(10, 4, 6)).toBe(10);
  });

  it('퍼펙트 보너스', () => {
    expect(lessonXp(10, 6, 6)).toBe(10 + PERFECT_BONUS_XP);
  });

  it('문제 0개면 보너스 없음', () => {
    expect(lessonXp(10, 0, 0)).toBe(10);
  });
});

describe('localDateString', () => {
  it('로컬 날짜를 YYYY-MM-DD로', () => {
    expect(localDateString(new Date(2026, 5, 12, 23, 59))).toBe('2026-06-12');
    expect(localDateString(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});
