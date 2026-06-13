import { consumeHeart, refillHearts } from '@ted/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useSyncExternalStore } from 'react';

import { useProfile } from '@/hooks/use-profile';
import {
  completeLessonWrite,
  type CompleteLessonInput,
  type CompleteLessonOutput,
} from '@/lib/learning-writes';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

export type { CompleteLessonInput, CompleteLessonOutput };

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

/**
 * 레슨 완료 처리(온라인 즉시 경로) — 쓰기 로직은 completeLessonWrite가 단일 소스.
 * 오프라인은 입력을 큐잉했다가 복귀 시 같은 함수를 재실행한다(lib/sync-queue·SyncProcessor, D22).
 */
export function useCompleteLesson() {
  const session = useAuth((s) => s.session);
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CompleteLessonInput) => {
      if (!session || !profile) throw new Error('로그인이 필요해요');
      // 온라인 즉시 완료 — 하트는 오답마다 useLoseHeart가 실시간 차감했으므로 heartsLost=0
      return completeLessonWrite({
        userId: session.user.id,
        profile,
        input,
        heartsLost: 0,
        completedAt: Date.now(),
        progressId: Crypto.randomUUID(),
      });
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
