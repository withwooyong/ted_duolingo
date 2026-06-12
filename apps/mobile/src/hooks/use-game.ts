import {
  consumeHeart,
  lessonXp,
  localDateString,
  nextStreak,
  refillHearts,
  type LessonResult,
} from '@ted/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useSyncExternalStore } from 'react';

import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

// 렌더 중 Date.now() 호출은 불순(React Compiler 규칙) — 1분 단위 시계 스토어로 구독
let cachedNow = Date.now();
const subscribeNow = (onChange: () => void) => {
  const timer = setInterval(() => {
    cachedNow = Date.now();
    onChange();
  }, 60_000);
  return () => clearInterval(timer);
};
const getNow = () => cachedNow;

/** 분 단위로 갱신되는 현재 시각 (하트 충전 표시용) */
function useNow(): number {
  return useSyncExternalStore(subscribeNow, getNow, getNow);
}

/** 시간 충전이 반영된 현재 하트 수 (프리미엄은 null = 무제한) */
export function useHearts(): { hearts: number | null; isLoading: boolean } {
  const { data: profile, isLoading } = useProfile();
  const now = useNow();
  if (!profile) return { hearts: null, isLoading };
  if (profile.isPremium) return { hearts: null, isLoading: false };
  const { hearts } = refillHearts(
    { hearts: profile.hearts, updatedAt: Date.parse(profile.heartsUpdatedAt) },
    now,
  );
  return { hearts, isLoading: false };
}

/** 오답 시 하트 1개 소모 (프리미엄은 no-op) */
export function useLoseHeart() {
  const session = useAuth((s) => s.session);
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!profile || profile.isPremium) return;
      const now = Date.now();
      const next = consumeHeart(
        { hearts: profile.hearts, updatedAt: Date.parse(profile.heartsUpdatedAt) },
        now,
      );
      const { error } = await supabase
        .from('profiles')
        .update({
          hearts: next.hearts,
          hearts_updated_at: new Date(next.updatedAt).toISOString(),
        })
        .eq('id', session!.user.id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });
}

/** 오늘 획득한 XP (일일 목표 진행용) — user_progress 합산 */
export function useDailyXp() {
  const session = useAuth((s) => s.session);
  return useQuery({
    queryKey: ['daily-xp', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('user_progress')
        .select('xp_earned')
        .eq('user_id', session!.user.id)
        .gte('completed_at', start.toISOString());
      if (error) throw error;
      return data.reduce((sum, r) => sum + r.xp_earned, 0);
    },
  });
}

export interface CompleteLessonInput {
  result: LessonResult;
  /** 문제별 정오답 (SM-2용 이력) */
  history: { exerciseId: string; isCorrect: boolean }[];
  xpReward: number;
}

export interface CompleteLessonOutput {
  xpEarned: number;
  streak: number;
}

/**
 * 레슨 완료 처리 — 진행 저장 + 문제 이력 + 프로필(XP·스트릭) 갱신.
 * 게임화 수치의 서버 측 검증은 Phase 2에서 Edge Function으로 이전 (CLAUDE.md 참조).
 */
export function useCompleteLesson() {
  const session = useAuth((s) => s.session);
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ result, history, xpReward }: CompleteLessonInput) => {
      if (!session || !profile) throw new Error('로그인이 필요해요');
      const userId = session.user.id;
      const xpEarned = lessonXp(xpReward, result.score, result.total);

      const { error: progressErr } = await supabase.from('user_progress').insert({
        id: Crypto.randomUUID(),
        user_id: userId,
        lesson_id: result.lessonId,
        score: result.score,
        total: result.total,
        xp_earned: xpEarned,
        mistakes: result.mistakes,
      });
      if (progressErr) throw progressErr;

      if (history.length > 0) {
        const { error: historyErr } = await supabase.from('user_exercise_history').insert(
          history.map((h) => ({
            id: Crypto.randomUUID(),
            user_id: userId,
            exercise_id: h.exerciseId,
            is_correct: h.isCorrect,
          })),
        );
        if (historyErr) throw historyErr;
      }

      const today = localDateString(new Date());
      const streak = nextStreak(profile.lastStudyDate, today, profile.streak);
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          xp: profile.xp + xpEarned,
          weekly_xp: profile.weeklyXp + xpEarned,
          streak,
          longest_streak: Math.max(profile.longestStreak, streak),
          last_study_date: today,
        })
        .eq('id', userId);
      if (profileErr) throw profileErr;

      return { xpEarned, streak } satisfies CompleteLessonOutput;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['skill-tree'] });
      queryClient.invalidateQueries({ queryKey: ['daily-xp'] });
    },
  });
}
