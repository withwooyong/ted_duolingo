/**
 * SM-2 간격 반복 복습 (PLAN.md §8 Phase 4).
 * due(복습 예정) 문제를 활성 언어쌍 기준으로 모아 세션을 구성하고, 결과로 SM-2 상태를 갱신한다.
 * 복습은 하트를 소모하지 않으며(부담 없는 연습), XP는 총합(profile.xp)에만 반영 — 주간 리그·일일 목표 제외.
 */
import {
  REVIEW_BATCH_SIZE,
  REVIEW_XP,
  type ExerciseDto,
  type ExercisePayload,
} from '@ted/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserLanguages } from '@/hooks/use-onboarding';
import { useProfile } from '@/hooks/use-profile';
import { upsertReviewStates } from '@/lib/gamification';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

/** 활성 학습 언어쌍 id (없으면 null) */
async function activePairId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_languages')
    .select('language_pair_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('added_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.language_pair_id ?? null;
}

/** 복습 대상(due) 문제 수 — 활성 언어쌍 기준 (홈 복습 배너용) */
export function useDueReviewCount() {
  const session = useAuth((s) => s.session);
  const { data: languages } = useUserLanguages();
  return useQuery({
    queryKey: ['review-count', session?.user.id],
    enabled: !!session && (languages?.length ?? 0) > 0,
    queryFn: async () => {
      const userId = session!.user.id;
      const pairId = await activePairId(userId);
      if (!pairId) return 0;
      const { count, error } = await supabase
        .from('user_review_state')
        .select('exercise_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('language_pair_id', pairId)
        .lte('due_at', new Date().toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export interface ReviewSession {
  pairId: string | null;
  exercises: ExerciseDto[];
}

/** 복습 세션 문제 — due 순으로 최대 REVIEW_BATCH_SIZE개 (활성 언어쌍) */
export function useReviewSession() {
  const session = useAuth((s) => s.session);
  return useQuery({
    queryKey: ['review-session', session?.user.id],
    enabled: !!session,
    // 매 진입 시 최신 due를 다시 모은다 (완료 후 재진입 대비)
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<ReviewSession> => {
      const userId = session!.user.id;
      const pairId = await activePairId(userId);
      if (!pairId) return { pairId: null, exercises: [] };

      const { data, error } = await supabase
        .from('user_review_state')
        .select(
          'due_at, exercises!inner(id, lesson_id, order, type, prompt, options, audio_url, explanation, target_lang)',
        )
        .eq('user_id', userId)
        .eq('language_pair_id', pairId)
        .lte('due_at', new Date().toISOString())
        .order('due_at', { ascending: true })
        .limit(REVIEW_BATCH_SIZE);
      if (error) throw error;

      const exercises = (data ?? []).map((row): ExerciseDto => {
        const e = row.exercises as unknown as {
          id: string;
          lesson_id: string;
          order: number;
          type: string;
          prompt: string;
          options: unknown;
          audio_url: string | null;
          explanation: string | null;
          target_lang: string;
        };
        return {
          id: e.id,
          lessonId: e.lesson_id,
          order: e.order,
          type: e.type as ExerciseDto['type'],
          prompt: e.prompt,
          payload: e.options as ExercisePayload,
          audioUrl: e.audio_url,
          explanation: e.explanation,
          targetLang: e.target_lang,
        };
      });
      return { pairId, exercises };
    },
  });
}

export interface CompleteReviewInput {
  pairId: string;
  history: { exerciseId: string; isCorrect: boolean }[];
  correct: number;
  total: number;
}

/** 복습 완료 — SM-2 상태 갱신 + 복습 XP(정답 비율 비례, 총 XP에만 반영) */
export function useCompleteReview() {
  const session = useAuth((s) => s.session);
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pairId, history, correct, total }: CompleteReviewInput) => {
      if (!session || !profile) throw new Error('로그인이 필요해요');
      const userId = session.user.id;

      await upsertReviewStates(userId, pairId, history);

      const xpEarned = total > 0 ? Math.round((REVIEW_XP * correct) / total) : 0;
      if (xpEarned > 0) {
        const { error } = await supabase
          .from('profiles')
          .update({ xp: profile.xp + xpEarned })
          .eq('id', userId);
        if (error) throw error;
      }
      return { xpEarned };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['review-count'] });
      // 'review-session'은 일부러 무효화하지 않는다 — 완료 화면 표시 중 빈 세션으로
      // refetch되면 완료 화면이 사라진다. 다음 진입 시 staleTime/gcTime 0으로 새로 가져온다.
    },
  });
}
