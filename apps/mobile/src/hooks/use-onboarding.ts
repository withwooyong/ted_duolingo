import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

/** 학습 중인 언어쌍 목록 — 비어 있으면 온보딩 필요 */
export function useUserLanguages() {
  const session = useAuth((s) => s.session);
  return useQuery({
    queryKey: ['user-languages', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_languages')
        .select('language_pair_id, is_active')
        .eq('user_id', session!.user.id);
      if (error) throw error;
      return data;
    },
  });
}

export interface OnboardingInput {
  /** 학습 언어쌍 (예: ko→en의 language_pairs.id) */
  languagePairId: string;
  dailyGoalXp: number;
}

/** 온보딩 완료 — 학습 언어 등록 + 일일 목표 설정 */
export function useCompleteOnboarding() {
  const session = useAuth((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ languagePairId, dailyGoalXp }: OnboardingInput) => {
      const userId = session!.user.id;
      const { error: langErr } = await supabase.from('user_languages').upsert({
        user_id: userId,
        language_pair_id: languagePairId,
        is_active: true,
      });
      if (langErr) throw langErr;
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ daily_goal_xp: dailyGoalXp })
        .eq('id', userId);
      if (profileErr) throw profileErr;
    },
    onSuccess: (_data, { languagePairId }) => {
      // 홈 진입 시 캐시된 빈 배열로 온보딩에 되돌아가는 race 방지 — 즉시 캐시 반영
      queryClient.setQueryData(
        ['user-languages', session?.user.id],
        [{ language_pair_id: languagePairId, is_active: true }],
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-languages'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // 스킬 트리는 활성 언어쌍에 의존 — 온보딩 직후 재조회
      queryClient.invalidateQueries({ queryKey: ['skill-tree'] });
    },
  });
}
