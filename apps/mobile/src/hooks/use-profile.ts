import type { ProfileDto } from '@ted/shared';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

/** profiles 테이블 행 (snake_case) → ProfileDto 매핑 */
interface ProfileRow {
  id: string;
  display_name: string;
  native_lang: string;
  xp: number;
  hearts: number;
  hearts_updated_at: string;
  streak: number;
  longest_streak: number;
  league_tier: ProfileDto['leagueTier'];
  weekly_xp: number;
  daily_goal_xp: number;
  is_premium: boolean;
  last_study_date: string | null;
}

function toDto(row: ProfileRow): ProfileDto {
  return {
    id: row.id,
    displayName: row.display_name,
    nativeLang: row.native_lang,
    xp: row.xp,
    hearts: row.hearts,
    heartsUpdatedAt: row.hearts_updated_at,
    streak: row.streak,
    longestStreak: row.longest_streak,
    leagueTier: row.league_tier,
    weeklyXp: row.weekly_xp,
    dailyGoalXp: row.daily_goal_xp,
    isPremium: row.is_premium,
    lastStudyDate: row.last_study_date,
  };
}

export function useProfile() {
  const session = useAuth((s) => s.session);
  return useQuery({
    queryKey: ['profile', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, display_name, native_lang, xp, hearts, hearts_updated_at, streak, longest_streak, league_tier, weekly_xp, daily_goal_xp, is_premium, last_study_date',
        )
        .eq('id', session!.user.id)
        .single();
      if (error) throw error;
      return toDto(data as ProfileRow);
    },
  });
}
