/**
 * 레슨 완료의 서버 쓰기 로직 — 훅(useCompleteLesson)과 오프라인 동기화 큐가 공유하는 단일 소스(D22).
 *
 * 충돌 해결은 "의도 재실행": 완료된 절대값이 아니라 레슨 입력(result·history)을 큐잉했다가,
 * 복귀 시 이 함수를 서버 최신 상태(fresh profile)에 대고 다시 실행한다. XP 가산·스트릭 재계산·
 * SM-2·리그는 모두 read-modify-write라 재실행이 자연히 충돌을 흡수한다. 시각 의존 값(스트릭·due·
 * 일일 XP·하트 충전)은 completedAt(학습 시점)을 기준으로 계산해 재실행 시점과 무관하게 정확하다.
 */
import {
  consumeHeart,
  earnedBadgeKeys,
  lessonXp,
  localDateString,
  nextStreak,
  type LessonResult,
  type ProfileDto,
} from '@ted/shared';
import * as Crypto from 'expo-crypto';

import { awardBadges, ensureLeagueEntry, upsertReviewStates, type AwardedBadge } from '@/lib/gamification';
import { supabase } from '@/lib/supabase';

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

export interface CompleteLessonWriteArgs {
  userId: string;
  /** 쓰기 기준 프로필 — 온라인은 캐시, 동기화 재실행은 서버 fresh */
  profile: ProfileDto;
  input: CompleteLessonInput;
  /**
   * 오프라인 중 잃은 하트 수(동기화 경로). 온라인 즉시 완료는 0 —
   * 오답마다 useLoseHeart가 이미 실시간 차감했기 때문(이중 차감 방지).
   */
  heartsLost: number;
  /** 완료 시각(epoch ms) — 스트릭·due·일일 XP·하트 충전을 학습 시점 기준으로 */
  completedAt: number;
  /** user_progress 행 id — 큐 재시도 멱등성(중복 적용 방지). 온라인은 새 UUID */
  progressId: string;
}

/**
 * 레슨 완료 처리 — 진행 저장 + 문제 이력 + SM-2 + 프로필(XP·스트릭·하트) + 리그 주간 XP + 배지.
 * 게임화 수치의 서버 측 검증은 클라우드 전환 시 Edge Function으로 이전 (CLAUDE.md 참조).
 */
export async function completeLessonWrite(args: CompleteLessonWriteArgs): Promise<CompleteLessonOutput> {
  const { userId, profile, input, heartsLost, completedAt, progressId } = args;
  const { result, history, xpReward } = input;

  // 멱등성: 같은 progressId가 이미 적용됐으면(큐 재시도) 전부 건너뛴다.
  // (진행 삽입 후 후속 쓰기 전에 중단된 극히 드문 경우만 일부 손실 — 오프라인 동기화 한계로 문서화)
  const { data: existing, error: existErr } = await supabase
    .from('user_progress')
    .select('id')
    .eq('id', progressId)
    .maybeSingle();
  if (existErr) throw existErr;
  if (existing) return { xpEarned: 0, streak: profile.streak, newBadges: [] };

  const xpEarned = lessonXp(xpReward, result.score, result.total);

  // 이번 주 리그 참가 보장 — 주간 XP는 profile이 아닌 리그 행 기준으로 누적
  const { entry } = await ensureLeagueEntry(profile);
  const weeklyXp = entry.weekly_xp + xpEarned;

  const { error: progressErr } = await supabase.from('user_progress').insert({
    id: progressId,
    user_id: userId,
    lesson_id: result.lessonId,
    score: result.score,
    total: result.total,
    xp_earned: xpEarned,
    mistakes: result.mistakes,
    completed_at: new Date(completedAt).toISOString(),
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

    // SM-2 복습 상태 갱신 — 언어쌍은 레슨→스킬에서 조회 (복습 화면 활성 언어쌍 필터용)
    const { data: lessonRow, error: lessonErr } = await supabase
      .from('lessons')
      .select('skills(language_pair_id)')
      .eq('id', result.lessonId)
      .single();
    if (lessonErr) throw lessonErr;
    const pairId = (lessonRow.skills as unknown as { language_pair_id: string }).language_pair_id;
    await upsertReviewStates(userId, pairId, history, completedAt);
  }

  const today = localDateString(new Date(completedAt));
  const streak = nextStreak(profile.lastStudyDate, today, profile.streak);
  const totalXp = profile.xp + xpEarned;

  // 하트: 오프라인 동기화만 누적 차감(프리미엄 제외). 충전·차감은 학습 시점(completedAt) 기준.
  const heartsPatch: { hearts: number; hearts_updated_at: string } | Record<string, never> =
    heartsLost > 0 && !profile.isPremium
      ? (() => {
          let hs = { hearts: profile.hearts, updatedAt: Date.parse(profile.heartsUpdatedAt) };
          for (let i = 0; i < heartsLost; i++) hs = consumeHeart(hs, completedAt);
          return { hearts: hs.hearts, hearts_updated_at: new Date(hs.updatedAt).toISOString() };
        })()
      : {};

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({
      xp: totalXp,
      weekly_xp: weeklyXp,
      streak,
      longest_streak: Math.max(profile.longestStreak, streak),
      last_study_date: today,
      ...heartsPatch,
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

  return { xpEarned, streak, newBadges };
}
