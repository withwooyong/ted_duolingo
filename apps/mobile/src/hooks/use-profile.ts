import { isPremiumActive, type ProfileDto } from '@ted/shared';
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
  premium_expires_at: string | null;
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
    // 만료가 지난 구독은 조회 시점에 비활성으로 취급 (mock 구독 — 서버 웹훅 없음)
    isPremium: isPremiumActive(row.is_premium, row.premium_expires_at, Date.now()),
    premiumExpiresAt: row.premium_expires_at,
    lastStudyDate: row.last_study_date,
  };
}

const PROFILE_COLUMNS =
  'id, display_name, native_lang, xp, hearts, hearts_updated_at, streak, longest_streak, league_tier, weekly_xp, daily_goal_xp, is_premium, premium_expires_at, last_study_date';

/** profiles 행을 서버에서 직접 조회 (훅 밖 — 오프라인 큐 재실행이 최신 상태를 받기 위함) */
export async function fetchProfileDto(userId: string): Promise<ProfileDto> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .single();
  if (error) throw error;
  return toDto(data as ProfileRow);
}

export function useProfile() {
  const session = useAuth((s) => s.session);
  return useQuery({
    queryKey: ['profile', session?.user.id],
    enabled: !!session,
    queryFn: () => fetchProfileDto(session!.user.id),
  });
}
