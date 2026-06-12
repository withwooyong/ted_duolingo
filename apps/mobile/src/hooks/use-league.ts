import {
  leagueDaysLeft,
  localDateString,
  type BadgeKey,
  type LeagueTier,
} from '@ted/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ensureLeagueEntry } from '@/lib/gamification';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/use-profile';
import { useAuth } from '@/stores/auth';

export interface LeagueStanding {
  userId: string;
  name: string;
  weeklyXp: number;
  isMe: boolean;
}

export interface LeagueData {
  tier: LeagueTier;
  weekStart: string;
  daysLeft: number;
  standings: LeagueStanding[];
}

/**
 * 이번 주 리그 현황 — 참가 행을 보장(필요 시 직전 주 마감)한 뒤
 * 같은 코호트의 순위표를 가져온다.
 */
export function useLeague() {
  const session = useAuth((s) => s.session);
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useQuery<LeagueData>({
    queryKey: ['league', session?.user.id],
    enabled: !!session && !!profile,
    queryFn: async () => {
      const { entry, promoted } = await ensureLeagueEntry(profile!);
      // 마감이 수행됐으면 프로필(티어·주간 XP)과 배지가 바뀌었을 수 있다
      if (promoted || entry.weekly_xp !== profile!.weeklyXp) {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['badges'] });
      }

      const { data: rows, error } = await supabase
        .from('league_entries')
        .select('user_id, weekly_xp, profiles(display_name)')
        .eq('week_start', entry.week_start)
        .eq('cohort_id', entry.cohort_id)
        .order('weekly_xp', { ascending: false });
      if (error) throw error;

      const userId = session!.user.id;
      return {
        tier: entry.tier,
        weekStart: entry.week_start,
        daysLeft: leagueDaysLeft(entry.week_start, localDateString(new Date())),
        standings: (rows ?? []).map((r) => {
          const profileRel = r.profiles as { display_name: string } | { display_name: string }[] | null;
          const name = Array.isArray(profileRel)
            ? profileRel[0]?.display_name
            : profileRel?.display_name;
          return {
            userId: r.user_id as string,
            name: name ?? '익명',
            weeklyXp: r.weekly_xp as number,
            isMe: r.user_id === userId,
          };
        }),
      };
    },
  });
}

export interface BadgeItem {
  key: BadgeKey;
  title: string;
  icon: string;
  condition: string;
  earned: boolean;
}

/** 전체 배지 + 내 획득 여부 (프로필 배지 그리드용) */
export function useBadges() {
  const session = useAuth((s) => s.session);

  return useQuery<BadgeItem[]>({
    queryKey: ['badges', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const [{ data: badges, error: badgeErr }, { data: owned, error: ownedErr }] =
        await Promise.all([
          supabase.from('badges').select('id, key, title, icon, condition'),
          supabase.from('user_badges').select('badge_id').eq('user_id', session!.user.id),
        ]);
      if (badgeErr) throw badgeErr;
      if (ownedErr) throw ownedErr;

      const ownedIds = new Set((owned ?? []).map((b) => b.badge_id as string));
      const ORDER: BadgeKey[] = [
        'first_lesson',
        'streak_3',
        'streak_7',
        'xp_500',
        'perfect_lesson',
        'league_promote',
      ];
      return (badges ?? [])
        .map((b) => ({
          key: b.key as BadgeKey,
          title: b.title as string,
          icon: b.icon as string,
          condition: b.condition as string,
          earned: ownedIds.has(b.id as string),
        }))
        .sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
    },
  });
}

/** 완료한 레슨 수 (중복 제외) — 프로필 통계용 */
export function useLessonsDone() {
  const session = useAuth((s) => s.session);
  return useQuery({
    queryKey: ['lessons-done', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('lesson_id')
        .eq('user_id', session!.user.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.lesson_id as string)).size;
    },
  });
}
