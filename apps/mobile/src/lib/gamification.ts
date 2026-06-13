/**
 * 리그·배지 도메인 헬퍼 — 훅이 아닌 순수 async 함수 (use-league/use-game에서 사용).
 * 주간 마감·승급/강등을 클라이언트가 수행한다 (MVP 한정 — CLAUDE.md의
 * "게임화 수치 서버 검증은 Phase 2 Edge Function으로 이전" 참조).
 */
import {
  INITIAL_REVIEW_STATE,
  LEAGUE_COHORT_SIZE,
  nextReviewDue,
  resolveLeagueOutcome,
  sm2Update,
  weekStartDate,
  type BadgeKey,
  type LeagueTier,
  type ProfileDto,
  type ReviewState,
} from '@ted/shared';
import * as Crypto from 'expo-crypto';

import { supabase } from '@/lib/supabase';

export interface LeagueEntryRow {
  week_start: string;
  user_id: string;
  tier: LeagueTier;
  cohort_id: string;
  weekly_xp: number;
  rank: number | null;
}

export interface AwardedBadge {
  key: BadgeKey;
  title: string;
  icon: string;
}

/** 아직 없는 배지만 수여하고, 새로 수여된 배지 목록을 돌려준다 */
export async function awardBadges(userId: string, keys: BadgeKey[]): Promise<AwardedBadge[]> {
  if (keys.length === 0) return [];

  const [{ data: badges, error: badgeErr }, { data: owned, error: ownedErr }] = await Promise.all([
    supabase.from('badges').select('id, key, title, icon').in('key', keys),
    supabase.from('user_badges').select('badge_id').eq('user_id', userId),
  ]);
  if (badgeErr) throw badgeErr;
  if (ownedErr) throw ownedErr;

  const ownedIds = new Set((owned ?? []).map((b) => b.badge_id as string));
  const fresh = (badges ?? []).filter((b) => !ownedIds.has(b.id as string));
  if (fresh.length === 0) return [];

  const { error: insertErr } = await supabase
    .from('user_badges')
    .insert(fresh.map((b) => ({ user_id: userId, badge_id: b.id })));
  if (insertErr) throw insertErr;

  return fresh.map((b) => ({ key: b.key as BadgeKey, title: b.title, icon: b.icon }));
}

/**
 * SM-2 복습 상태 upsert — 레슨·복습에서 푼 문제들의 다음 복습 간격을 갱신한다.
 * 각 문제의 직전 상태를 읽어 sm2Update로 다음 상태를 계산하고 (사용자, 문제) 키로 덮어쓴다.
 * 게임화 수치와 마찬가지로 클라이언트 직접 쓰기 — 서버 검증은 클라우드 전환 시 (RLS 0004 주석).
 */
export async function upsertReviewStates(
  userId: string,
  languagePairId: string,
  history: { exerciseId: string; isCorrect: boolean }[],
  now: number = Date.now(),
): Promise<void> {
  if (history.length === 0) return;
  const ids = history.map((h) => h.exerciseId);

  const { data: prev, error: prevErr } = await supabase
    .from('user_review_state')
    .select('exercise_id, repetitions, ease_factor, interval')
    .eq('user_id', userId)
    .in('exercise_id', ids);
  if (prevErr) throw prevErr;

  const prevMap = new Map(
    (prev ?? []).map((r) => [
      r.exercise_id as string,
      { repetitions: r.repetitions, easeFactor: r.ease_factor, interval: r.interval } as ReviewState,
    ]),
  );

  const rows = history.map((h) => {
    const next = sm2Update(prevMap.get(h.exerciseId) ?? INITIAL_REVIEW_STATE, h.isCorrect);
    return {
      user_id: userId,
      exercise_id: h.exerciseId,
      language_pair_id: languagePairId,
      repetitions: next.repetitions,
      ease_factor: next.easeFactor,
      interval: next.interval,
      due_at: new Date(nextReviewDue(next, now)).toISOString(),
      updated_at: new Date(now).toISOString(),
    };
  });

  const { error } = await supabase
    .from('user_review_state')
    .upsert(rows, { onConflict: 'user_id,exercise_id' });
  if (error) throw error;
}

export interface EnsureLeagueResult {
  entry: LeagueEntryRow;
  /** 직전 주 마감에서 승급했는가 (이번 호출에서 마감이 수행된 경우만 true 가능) */
  promoted: boolean;
}

/**
 * 이번 주 리그 참가 행을 보장한다.
 * 새 주에 처음 진입하면: 직전 주를 마감(순위 확정 → 승급/강등 → 배지)하고
 * 주간 XP를 리셋한 뒤, 빈 자리가 있는 코호트에 참가한다.
 */
export async function ensureLeagueEntry(profile: ProfileDto): Promise<EnsureLeagueResult> {
  const userId = profile.id;
  const thisWeek = weekStartDate(new Date());

  const { data: existing, error: existErr } = await supabase
    .from('league_entries')
    .select('week_start, user_id, tier, cohort_id, weekly_xp, rank')
    .eq('user_id', userId)
    .eq('week_start', thisWeek)
    .maybeSingle();
  if (existErr) throw existErr;
  if (existing) return { entry: existing as LeagueEntryRow, promoted: false };

  // ── 직전 주 마감 ──
  let tier = profile.leagueTier;
  let promoted = false;

  const { data: last, error: lastErr } = await supabase
    .from('league_entries')
    .select('week_start, user_id, tier, cohort_id, weekly_xp, rank')
    .eq('user_id', userId)
    .lt('week_start', thisWeek)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr) throw lastErr;

  if (last && last.rank === null) {
    const { data: cohort, error: cohortErr } = await supabase
      .from('league_entries')
      .select('user_id, weekly_xp')
      .eq('week_start', last.week_start)
      .eq('cohort_id', last.cohort_id)
      .order('weekly_xp', { ascending: false });
    if (cohortErr) throw cohortErr;

    const rank = (cohort ?? []).findIndex((e) => e.user_id === userId) + 1;
    if (rank > 0) {
      const outcome = resolveLeagueOutcome(last.tier as LeagueTier, rank, cohort!.length);
      const { error: rankErr } = await supabase
        .from('league_entries')
        .update({ rank })
        .eq('week_start', last.week_start)
        .eq('user_id', userId);
      if (rankErr) throw rankErr;

      tier = outcome.tier;
      promoted = outcome.change === 'PROMOTE';
      if (promoted) await awardBadges(userId, ['league_promote']);
    }
  }

  // 새 주 시작 — 티어·주간 XP 리셋 반영
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ league_tier: tier, weekly_xp: 0 })
    .eq('id', userId);
  if (profileErr) throw profileErr;

  // ── 코호트 배정: 같은 주·티어에서 빈 자리가 있는 방, 없으면 새 방 ──
  const { data: peers, error: peersErr } = await supabase
    .from('league_entries')
    .select('cohort_id')
    .eq('week_start', thisWeek)
    .eq('tier', tier);
  if (peersErr) throw peersErr;

  const counts = new Map<string, number>();
  for (const p of peers ?? []) {
    counts.set(p.cohort_id, (counts.get(p.cohort_id) ?? 0) + 1);
  }
  const open = [...counts.entries()].find(([, n]) => n < LEAGUE_COHORT_SIZE)?.[0];
  const cohortId = open ?? Crypto.randomUUID();

  const entry: LeagueEntryRow = {
    week_start: thisWeek,
    user_id: userId,
    tier,
    cohort_id: cohortId,
    weekly_xp: 0,
    rank: null,
  };
  const { error: insertErr } = await supabase.from('league_entries').insert(entry);
  if (insertErr) throw insertErr;

  return { entry, promoted };
}
