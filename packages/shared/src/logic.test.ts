import { describe, expect, it } from 'vitest';

import { MAX_HEARTS, PERFECT_BONUS_XP } from './constants';
import {
  consumeHeart,
  earnedBadgeKeys,
  isPremiumActive,
  leagueDaysLeft,
  lessonXp,
  localDateString,
  nextStreak,
  premiumExpiryDate,
  refillHearts,
  resolveLeagueOutcome,
  weekStartDate,
} from './logic';

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

describe('weekStartDate', () => {
  it('주중이면 해당 주 월요일', () => {
    // 2026-06-12는 금요일 → 월요일은 06-08
    expect(weekStartDate(new Date(2026, 5, 12))).toBe('2026-06-08');
  });

  it('월요일이면 그대로', () => {
    expect(weekStartDate(new Date(2026, 5, 8))).toBe('2026-06-08');
  });

  it('일요일은 같은 주의 월요일 (이전 월요일)', () => {
    expect(weekStartDate(new Date(2026, 5, 14))).toBe('2026-06-08');
  });

  it('월 경계를 넘는 주', () => {
    // 2026-07-01은 수요일 → 월요일은 06-29
    expect(weekStartDate(new Date(2026, 6, 1))).toBe('2026-06-29');
  });
});

describe('leagueDaysLeft', () => {
  it('금요일이면 3일 남음 (다음 월요일 리셋)', () => {
    expect(leagueDaysLeft('2026-06-08', '2026-06-12')).toBe(3);
  });

  it('주 시작일(월)이면 7일', () => {
    expect(leagueDaysLeft('2026-06-08', '2026-06-08')).toBe(7);
  });

  it('일요일이면 1일', () => {
    expect(leagueDaysLeft('2026-06-08', '2026-06-14')).toBe(1);
  });

  it('주가 지났으면 0', () => {
    expect(leagueDaysLeft('2026-06-08', '2026-06-15')).toBe(0);
  });
});

describe('resolveLeagueOutcome', () => {
  it('상위 3명은 승급', () => {
    expect(resolveLeagueOutcome('BRONZE', 1, 10)).toEqual({ tier: 'SILVER', change: 'PROMOTE' });
    expect(resolveLeagueOutcome('GOLD', 3, 10)).toEqual({ tier: 'SAPPHIRE', change: 'PROMOTE' });
  });

  it('하위 3명은 강등', () => {
    expect(resolveLeagueOutcome('SILVER', 8, 10)).toEqual({ tier: 'BRONZE', change: 'DEMOTE' });
    expect(resolveLeagueOutcome('SILVER', 10, 10)).toEqual({ tier: 'BRONZE', change: 'DEMOTE' });
  });

  it('중위권은 유지', () => {
    expect(resolveLeagueOutcome('SILVER', 5, 10)).toEqual({ tier: 'SILVER', change: 'STAY' });
  });

  it('최상위 티어(다이아)는 승급 없음', () => {
    expect(resolveLeagueOutcome('DIAMOND', 1, 10)).toEqual({ tier: 'DIAMOND', change: 'STAY' });
  });

  it('최하위 티어(브론즈)는 강등 없음', () => {
    expect(resolveLeagueOutcome('BRONZE', 10, 10)).toEqual({ tier: 'BRONZE', change: 'STAY' });
  });

  it('작은 코호트 — 승급 구간이 강등 구간보다 우선', () => {
    // 4명 코호트: 1~3등 승급, 4등만 강등
    expect(resolveLeagueOutcome('SILVER', 3, 4)).toEqual({ tier: 'GOLD', change: 'PROMOTE' });
    expect(resolveLeagueOutcome('SILVER', 4, 4)).toEqual({ tier: 'BRONZE', change: 'DEMOTE' });
  });

  it('혼자인 코호트는 1등 승급', () => {
    expect(resolveLeagueOutcome('BRONZE', 1, 1)).toEqual({ tier: 'SILVER', change: 'PROMOTE' });
  });
});

describe('earnedBadgeKeys', () => {
  const base = {
    lessonsCompleted: 0,
    streak: 0,
    totalXp: 0,
    perfectLesson: false,
    leaguePromoted: false,
  };

  it('아무 조건도 안 되면 빈 배열', () => {
    expect(earnedBadgeKeys(base)).toEqual([]);
  });

  it('첫 레슨 완료', () => {
    expect(earnedBadgeKeys({ ...base, lessonsCompleted: 1 })).toEqual(['first_lesson']);
  });

  it('스트릭 7이면 3일·7일 배지 모두', () => {
    expect(earnedBadgeKeys({ ...base, streak: 7 })).toEqual(['streak_3', 'streak_7']);
  });

  it('500 XP 달성', () => {
    expect(earnedBadgeKeys({ ...base, totalXp: 500 })).toContain('xp_500');
    expect(earnedBadgeKeys({ ...base, totalXp: 499 })).not.toContain('xp_500');
  });

  it('퍼펙트 레슨·리그 승급', () => {
    expect(earnedBadgeKeys({ ...base, perfectLesson: true, leaguePromoted: true })).toEqual([
      'perfect_lesson',
      'league_promote',
    ]);
  });

  it('전부 달성', () => {
    expect(
      earnedBadgeKeys({
        lessonsCompleted: 10,
        streak: 7,
        totalXp: 600,
        perfectLesson: true,
        leaguePromoted: true,
      }),
    ).toEqual(['first_lesson', 'streak_3', 'streak_7', 'xp_500', 'perfect_lesson', 'league_promote']);
  });
});

describe('isPremiumActive', () => {
  const future = new Date(T0 + 24 * HOUR).toISOString();
  const past = new Date(T0 - 24 * HOUR).toISOString();

  it('플래그가 꺼져 있으면 비활성', () => {
    expect(isPremiumActive(false, future, T0)).toBe(false);
  });

  it('만료일이 미래면 활성', () => {
    expect(isPremiumActive(true, future, T0)).toBe(true);
  });

  it('만료일이 지났으면 비활성', () => {
    expect(isPremiumActive(true, past, T0)).toBe(false);
  });

  it('만료일이 없으면 플래그만 따른다', () => {
    expect(isPremiumActive(true, null, T0)).toBe(true);
  });
});

describe('premiumExpiryDate', () => {
  it('개월 수를 더한다 (월간·연간)', () => {
    const from = new Date('2026-06-13T00:00:00Z');
    expect(premiumExpiryDate(from, 1).toISOString()).toBe('2026-07-13T00:00:00.000Z');
    expect(premiumExpiryDate(from, 12).toISOString()).toBe('2027-06-13T00:00:00.000Z');
  });

  it('원본 Date를 변경하지 않는다', () => {
    const from = new Date('2026-06-13T00:00:00Z');
    premiumExpiryDate(from, 1);
    expect(from.toISOString()).toBe('2026-06-13T00:00:00.000Z');
  });
});
