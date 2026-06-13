/**
 * 복습 완료의 서버 쓰기 로직 — 온라인 훅(useCompleteReview)과 오프라인 동기화 큐가 공유하는 단일 소스(D24).
 *
 * 레슨(learning-writes.ts)과 같은 "의도 재실행" 철학: 완료된 절대값이 아니라 복습 입력(history·정오답 수)을
 * 큐잉했다가, 복귀 시 이 함수를 서버 최신 상태(fresh profile)에 대고 다시 실행한다. SM-2 갱신(upsertReviewStates)과
 * XP 가산은 read-modify-write라 재실행이 충돌을 흡수한다. 단, read-modify-write는 이중 실행 시 이중 적용되므로
 * user_review_session 행을 멱등 가드(sessionId)로 둬서 같은 세션의 재실행을 통째로 건너뛴다(레슨 user_progress 대칭).
 */
import { reviewXp, type ProfileDto } from '@ted/shared';

import { upsertReviewStates } from '@/lib/gamification';
import { supabase } from '@/lib/supabase';

export interface CompleteReviewInput {
  pairId: string;
  /** 문제별 정오답 (SM-2 갱신용) */
  history: { exerciseId: string; isCorrect: boolean }[];
  correct: number;
  total: number;
}

export interface CompleteReviewOutput {
  xpEarned: number;
}

export interface CompleteReviewWriteArgs {
  userId: string;
  /** XP 가산 기준 프로필 — 온라인은 캐시, 동기화 재실행은 서버 fresh */
  profile: ProfileDto;
  input: CompleteReviewInput;
  /** 완료 시각(epoch ms) — 스냅샷 동결 시점. SM-2 due 계산을 학습 시점 기준으로 */
  completedAt: number;
  /** 복습 세션 id — 큐 재시도 멱등성(SM-2 이중 전진·XP 이중 가산 방지). 온라인은 새 UUID */
  sessionId: string;
}

/**
 * 복습 완료 처리 — 멱등 가드 + SM-2 상태 갱신 + 프로필 총 XP 가산.
 * 복습은 하트 무소모·주간 리그/일일 목표 제외(총합 XP에만 반영, D19).
 * 게임화 수치의 서버 측 검증은 클라우드 전환 시 Edge Function으로 이전 (CLAUDE.md 참조).
 */
export async function completeReviewWrite(args: CompleteReviewWriteArgs): Promise<CompleteReviewOutput> {
  const { userId, profile, input, completedAt, sessionId } = args;
  const { pairId, history, correct, total } = input;

  // 멱등성: 같은 sessionId가 이미 기록됐으면(큐 재시도) 전부 건너뛴다.
  const { data: existing, error: existErr } = await supabase
    .from('user_review_session')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();
  if (existErr) throw existErr;
  if (existing) return { xpEarned: 0 };

  const xpEarned = reviewXp(correct, total);

  // 가드 행을 먼저 기록 — 이후 SM-2·XP가 실패해 재시도되면 이 행 존재로 통째 skip(이중 적용 방지).
  // (레슨 user_progress와 동일하게, 부분 실패 시 후속 쓰기 손실 < 이중 적용 우선 — D22 한계와 동일)
  const { error: sessionErr } = await supabase.from('user_review_session').insert({
    id: sessionId,
    user_id: userId,
    completed_at: new Date(completedAt).toISOString(),
    xp_earned: xpEarned,
  });
  if (sessionErr) throw sessionErr;

  // SM-2 상태 갱신 — 서버 최신 상태를 읽어 재계산(due는 학습 시점 completedAt 기준)
  await upsertReviewStates(userId, pairId, history, completedAt);

  // 총 XP 가산 (정답 비율 비례) — read-modify-write, fresh profile 기준
  if (xpEarned > 0) {
    const { error: xpErr } = await supabase
      .from('profiles')
      .update({ xp: profile.xp + xpEarned })
      .eq('id', userId);
    if (xpErr) throw xpErr;
  }

  return { xpEarned };
}
