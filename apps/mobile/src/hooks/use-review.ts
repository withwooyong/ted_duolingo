/**
 * SM-2 간격 반복 복습 (PLAN.md §8 Phase 4).
 * due(복습 예정) 문제를 활성 언어쌍 기준으로 모아 세션을 구성하고, 결과로 SM-2 상태를 갱신한다.
 * 복습은 하트를 소모하지 않으며(부담 없는 연습), XP는 총합(profile.xp)에만 반영 — 주간 리그·일일 목표 제외.
 *
 * 오프라인(D24): 온라인일 때 due 세션을 '스냅샷'으로 동결·영속(review-snapshot)했다가, 오프라인에서
 * 이 스냅샷을 재생한다. 완료 입력은 sync-queue에 적재했다가 복귀 시 completeReviewWrite로 재실행한다.
 */
import {
  REVIEW_BATCH_SIZE,
  reviewXp,
  type ExerciseDto,
  type ExercisePayload,
} from '@ted/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';

import { useUserLanguages } from '@/hooks/use-onboarding';
import { useProfile } from '@/hooks/use-profile';
import { completeReviewWrite } from '@/lib/review-writes';
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

/** due 문제를 SM-2 순으로 최대 REVIEW_BATCH_SIZE개 모은다 (live 세션·스냅샷 prefetch 공용) */
export async function fetchReviewSession(userId: string): Promise<ReviewSession> {
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
}

/** 복습 세션 문제 — due 순으로 최대 REVIEW_BATCH_SIZE개 (활성 언어쌍, 온라인 live) */
export function useReviewSession() {
  const session = useAuth((s) => s.session);
  return useQuery({
    queryKey: ['review-session', session?.user.id],
    enabled: !!session,
    // 매 진입 시 최신 due를 다시 모은다 (완료 후 재진입 대비)
    staleTime: 0,
    gcTime: 0,
    queryFn: () => fetchReviewSession(session!.user.id),
  });
}

/** review-snapshot 쿼리 키 — 오프라인 복습용 동결 세션 (영속 대상, D24) */
export function reviewSnapshotKey(userId: string) {
  return ['review-snapshot', userId] as const;
}

/**
 * 오프라인 복습용 due 세션 스냅샷 — 온라인일 때만 갱신(동결)하고 영속(persist)한다.
 * live review-session(gcTime:0, persist 제외)과 분리해, 온라인 정확성은 그대로 두고 오프라인 재생만 담당한다.
 */
export function useReviewSnapshot() {
  const session = useAuth((s) => s.session);
  return useQuery({
    queryKey: reviewSnapshotKey(session?.user.id ?? ''),
    enabled: !!session,
    // staleTime 0 — 온라인이면 진입/복귀마다 최신 due로 다시 동결한다. '동결'은 오프라인(paused)일 때
    // 자연히 일어나므로(refetch 불가), persist된 stale-empty 캐시가 굳는 것을 막아야 한다.
    // gcTime은 기본(24h) 유지 — persist 복원 대상이 되도록.
    staleTime: 0,
    queryFn: () => fetchReviewSession(session!.user.id),
  });
}

export interface CompleteReviewInput {
  pairId: string;
  history: { exerciseId: string; isCorrect: boolean }[];
  correct: number;
  total: number;
}

/** 복습 완료(온라인) — completeReviewWrite 단일 소스 호출. 오프라인은 review.tsx가 큐잉(D24). */
export function useCompleteReview() {
  const session = useAuth((s) => s.session);
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CompleteReviewInput) => {
      if (!session || !profile) throw new Error('로그인이 필요해요');
      return completeReviewWrite({
        userId: session.user.id,
        profile,
        input,
        completedAt: Date.now(),
        sessionId: Crypto.randomUUID(),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['review-count'] });
      // 동결 스냅샷도 갱신 — 방금 푼 문제가 빠진 최신 due로 다시 동결(오프라인 재생이 stale 안 되게)
      queryClient.invalidateQueries({ queryKey: ['review-snapshot'] });
      // 'review-session'은 일부러 무효화하지 않는다 — 완료 화면 표시 중 빈 세션으로
      // refetch되면 완료 화면이 사라진다. 다음 진입 시 staleTime/gcTime 0으로 새로 가져온다.
    },
  });
}

/** 복습 XP 미리보기(낙관 반영·완료 표시용) — 서버 계산과 동일한 순수 함수 */
export { reviewXp };
