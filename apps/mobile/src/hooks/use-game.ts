import {
  consumeHeart,
  earnedBadgeKeys,
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
import {
  awardBadges,
  ensureLeagueEntry,
  upsertReviewStates,
  type AwardedBadge,
} from '@/lib/gamification';
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
  /** 이번 완료로 새로 획득한 배지 */
  newBadges: AwardedBadge[];
}

/**
 * 레슨 완료 처리 — 진행 저장 + 문제 이력 + 프로필(XP·스트릭) + 리그 주간 XP + 배지.
 * 게임화 수치의 서버 측 검증은 Phase 2 후반 Edge Function으로 이전 (CLAUDE.md 참조).
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

      // 이번 주 리그 참가 보장 — 새 주면 직전 주 마감(주간 XP 리셋)이 먼저 일어나므로
      // 주간 XP는 profile이 아닌 리그 행 기준으로 누적한다
      const { entry } = await ensureLeagueEntry(profile);
      const weeklyXp = entry.weekly_xp + xpEarned;

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

        // SM-2 복습 상태 갱신 — 언어쌍은 레슨→스킬에서 조회 (복습 화면의 활성 언어쌍 필터용)
        const { data: lessonRow, error: lessonErr } = await supabase
          .from('lessons')
          .select('skills(language_pair_id)')
          .eq('id', result.lessonId)
          .single();
        if (lessonErr) throw lessonErr;
        const pairId = (lessonRow.skills as unknown as { language_pair_id: string })
          .language_pair_id;
        await upsertReviewStates(userId, pairId, history);
      }

      const today = localDateString(new Date());
      const streak = nextStreak(profile.lastStudyDate, today, profile.streak);
      const totalXp = profile.xp + xpEarned;
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          xp: totalXp,
          weekly_xp: weeklyXp,
          streak,
          longest_streak: Math.max(profile.longestStreak, streak),
          last_study_date: today,
        })
        .eq('id', userId);
      if (profileErr) throw profileErr;

      const { error: leagueErr } = await supabase
        .from('league_entries')
        .update({ weekly_xp: weeklyXp })
        .eq('week_start', entry.week_start)
        .eq('user_id', userId);
      if (leagueErr) throw leagueErr;

      // 배지 판정 — 달성 키 전체를 구하고, 이미 보유한 배지는 awardBadges가 거른다
      const { count } = await supabase
        .from('user_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      const earned = earnedBadgeKeys({
        lessonsCompleted: count ?? 1,
        streak,
        totalXp,
        perfectLesson: result.total > 0 && result.score === result.total,
        leaguePromoted: false, // 승급 배지는 주간 마감(ensureLeagueEntry)에서 수여
      });
      const newBadges = await awardBadges(userId, earned);

      return { xpEarned, streak, newBadges } satisfies CompleteLessonOutput;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['skill-tree'] });
      queryClient.invalidateQueries({ queryKey: ['daily-xp'] });
      queryClient.invalidateQueries({ queryKey: ['league'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      queryClient.invalidateQueries({ queryKey: ['lessons-done'] });
      queryClient.invalidateQueries({ queryKey: ['review-count'] });
    },
  });
}
