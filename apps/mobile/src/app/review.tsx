import type { ExerciseDto, ProfileDto } from '@ted/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { checkAnswer, correctAnswerText } from '@/components/exercise/checkers';
import { ComprehensionMcq } from '@/components/exercise/comprehension-mcq';
import { FeedbackSheet } from '@/components/exercise/feedback-sheet';
import { FillBlank } from '@/components/exercise/fill-blank';
import { ListenSelect } from '@/components/exercise/listen-select';
import { MatchPairs } from '@/components/exercise/match-pairs';
import { OrderWords } from '@/components/exercise/order-words';
import { ShadowSpeak } from '@/components/exercise/shadow-speak';
import { useOnline } from '@/hooks/use-online';
import {
  reviewSnapshotKey,
  reviewXp,
  useCompleteReview,
  useReviewSession,
  useReviewSnapshot,
  type ReviewSession,
} from '@/hooks/use-review';
import { useSyncQueue } from '@/lib/sync-queue';
import { useAuth } from '@/stores/auth';

const TYPE_LABELS: Record<ExerciseDto['type'], string> = {
  LISTEN_SELECT: '듣고 고르기',
  FILL_BLANK: '빈칸 채우기',
  MATCH_PAIRS: '짝 맞추기',
  ORDER_WORDS: '단어 배열',
  COMPREHENSION_MCQ: '독해',
  SHADOW_SPEAK: '따라 말하기',
};

interface PlayState {
  index: number;
  correct: number;
  history: { exerciseId: string; isCorrect: boolean }[];
  phase: 'answering' | 'feedback' | 'done';
  lastCorrect: boolean;
  xpEarned: number;
  /** 완료 화면용 — 세션 refetch로 길이가 바뀌어도 고정 */
  total: number;
  /** 오프라인 완료 — 동기화 대기 안내 표시 (D24) */
  pending: boolean;
}

const INITIAL: PlayState = {
  index: 0,
  correct: 0,
  history: [],
  phase: 'answering',
  lastCorrect: false,
  xpEarned: 0,
  total: 0,
  pending: false,
};

/**
 * 복습 세션 — due 문제를 SM-2 순으로 풀고 완료 시 간격을 갱신 (PLAN.md §8 Phase 4).
 * 오프라인(D24)은 동결 스냅샷을 재생하고, 완료 입력을 sync-queue에 적재했다가 복귀 시 동기화한다.
 */
export default function ReviewScreen() {
  const online = useOnline();
  const live = useReviewSession();
  const { data: snapshot } = useReviewSnapshot();
  const completeReview = useCompleteReview();
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.session?.user.id ?? null);
  const enqueueReview = useSyncQueue((s) => s.enqueueReview);

  const [play, setPlay] = useState<PlayState>(INITIAL);
  const [answer, setAnswer] = useState<string | null>(null);

  // 데이터 소스 — 오프라인은 동결 스냅샷, 온라인은 live 세션
  const session: ReviewSession | undefined = online === false ? snapshot : live.data;
  const isLoading = online === false ? false : live.isLoading;
  const loadError = online === false ? null : live.error;

  // 완료 화면 — 세션이 비워지는 refetch·오프라인 스냅샷 소진보다 우선 검사
  if (play.phase === 'done') {
    const perfect = play.correct === play.total;
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white px-8" testID="review-done">
        <Text className="text-6xl">{perfect ? '🎉' : '✅'}</Text>
        <Text className="text-2xl font-extrabold">복습 완료!</Text>
        <Text className="text-base font-bold text-ink-sub" testID="review-score">
          {play.correct} / {play.total} 정답
        </Text>
        <Text className="text-lg font-extrabold text-gold" testID="review-xp">
          +{play.xpEarned} XP
        </Text>
        {play.pending && (
          <Text className="text-center text-sm font-bold text-ink-sub" testID="review-pending-note">
            📡 오프라인 완료 — 연결되면 자동 저장돼요
          </Text>
        )}
        <Pressable
          className="mt-4 rounded-2xl bg-brand px-8 py-4 active:opacity-80"
          onPress={() => router.back()}
          testID="review-done-home"
        >
          <Text className="text-base font-extrabold uppercase text-white">홈으로</Text>
        </Pressable>
      </View>
    );
  }

  // 오프라인 2차 방어(D24) — 동결 스냅샷이 없으면(미캐시) 복습 불가. 딥링크 직접 진입 대비.
  if (online === false && (!snapshot || snapshot.exercises.length === 0)) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white px-8" testID="review-offline">
        <Text className="text-5xl">📡</Text>
        <Text className="text-center text-base font-extrabold text-ink-sub">
          오프라인에선 준비된 복습만 풀 수 있어요. 연결 후 다시 시도하세요.
        </Text>
        <Pressable
          className="mt-4 rounded-2xl bg-brand px-8 py-4 active:opacity-80"
          onPress={() => router.back()}
          testID="review-offline-home"
        >
          <Text className="text-base font-extrabold uppercase text-white">홈으로</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading || !session) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        {loadError ? (
          <Text className="text-danger">복습을 불러오지 못했어요</Text>
        ) : (
          <ActivityIndicator />
        )}
      </View>
    );
  }

  const exercises = session.exercises;
  const total = exercises.length;

  // 복습할 문제가 없음 (간격 반복으로 아직 due가 아님)
  if (total === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-white px-8">
        <Text className="text-5xl">🌱</Text>
        <Text className="text-center text-lg font-extrabold">복습할 문제가 없어요</Text>
        <Text className="text-center text-sm font-bold text-ink-sub">
          푼 문제는 간격을 두고 다시 복습으로 나와요.{'\n'}레슨을 더 진행해 보세요!
        </Text>
        <Pressable
          className="mt-2 rounded-2xl bg-brand px-6 py-3 active:opacity-80"
          onPress={() => router.back()}
          testID="review-empty-back"
        >
          <Text className="text-base font-extrabold text-white">홈으로</Text>
        </Pressable>
      </View>
    );
  }

  const exercise = exercises[play.index];

  const quit = () => {
    Alert.alert('복습 그만두기', '지금까지의 결과는 저장되지 않아요.', [
      { text: '계속 복습', style: 'cancel' },
      { text: '그만두기', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const submit = (forcedCorrect?: boolean) => {
    const isCorrect = forcedCorrect ?? (answer !== null && checkAnswer(exercise.payload, answer));
    setPlay((p) => ({
      ...p,
      phase: 'feedback',
      lastCorrect: isCorrect,
      correct: p.correct + (isCorrect ? 1 : 0),
      history: [...p.history, { exerciseId: exercise.id, isCorrect }],
    }));
  };

  // 오프라인 완료(D24) — 입력을 큐에 적재 + 낙관적 반영(총 XP·스냅샷 소진·배너 숨김) 후 완료 화면.
  // 실제 SM-2 갱신·XP 서버 반영은 복귀 시 SyncProcessor가 completeReviewWrite로 재실행한다.
  const completeOffline = () => {
    if (!userId || !session.pairId) {
      Alert.alert('저장 실패', '로그인 정보를 찾을 수 없어요.');
      return;
    }
    const completedAt = Date.now();
    const xpEarned = reviewXp(play.correct, total);
    enqueueReview({
      id: Crypto.randomUUID(),
      userId,
      input: { pairId: session.pairId, history: play.history, correct: play.correct, total },
      completedAt,
      queuedAt: completedAt,
    });

    // 낙관적 캐시 — 총 XP 가산(복습은 일일·주간 제외), 스냅샷 소진(재진입 시 빈 세션), 배너 숨김.
    queryClient.setQueryData<ProfileDto>(['profile', userId], (old) =>
      old ? { ...old, xp: old.xp + xpEarned } : old,
    );
    queryClient.setQueryData<ReviewSession>(reviewSnapshotKey(userId), {
      pairId: session.pairId,
      exercises: [],
    });
    queryClient.setQueryData<number>(['review-count', userId], 0);

    setPlay((p) => ({ ...p, phase: 'done', xpEarned, total, pending: true }));
  };

  const next = async () => {
    if (play.index + 1 < total) {
      setAnswer(null);
      setPlay((p) => ({ ...p, index: p.index + 1, phase: 'answering' }));
      return;
    }
    // 마지막 문제 → 오프라인이면 큐잉, 온라인이면 즉시 SM-2 갱신 + XP 저장
    if (online === false) {
      completeOffline();
      return;
    }
    try {
      const result = await completeReview.mutateAsync({
        pairId: session.pairId!,
        history: play.history,
        correct: play.correct,
        total,
      });
      setPlay((p) => ({ ...p, phase: 'done', xpEarned: result.xpEarned, total }));
    } catch {
      Alert.alert('저장 실패', '복습 결과 저장에 실패했어요. 네트워크를 확인해 주세요.');
    }
  };

  return (
    <View className="flex-1 bg-white pt-16">
      {/* 상단: 나가기 · 진행 바 · 복습 배지 */}
      <View className="flex-row items-center gap-3 px-5">
        <Pressable onPress={quit} hitSlop={12} testID="review-quit">
          <Text className="text-xl text-ink-sub">✕</Text>
        </Pressable>
        <View className="h-4 flex-1 overflow-hidden rounded-lg bg-line">
          <View
            className="h-full rounded-lg bg-grape"
            style={{ width: `${(play.index / total) * 100}%` }}
            testID="review-progress"
          />
        </View>
        <Text className="font-extrabold text-grape">🔄</Text>
      </View>

      {/* 문제 영역 */}
      <ScrollView className="flex-1 px-5 pt-5" testID="review-area">
        <Text className="mb-1.5 text-xs font-extrabold uppercase text-grape">
          복습 · {TYPE_LABELS[exercise.type]} · {play.index + 1}/{total}
        </Text>
        <Text className="mb-5 text-xl font-extrabold leading-7">{exercise.prompt}</Text>

        {exercise.payload.type === 'LISTEN_SELECT' && (
          <ListenSelect
            payload={exercise.payload}
            targetLang={exercise.targetLang}
            value={answer}
            onChange={setAnswer}
            disabled={play.phase === 'feedback'}
          />
        )}
        {exercise.payload.type === 'FILL_BLANK' && (
          <FillBlank
            payload={exercise.payload}
            value={answer}
            onChange={setAnswer}
            disabled={play.phase === 'feedback'}
          />
        )}
        {exercise.payload.type === 'MATCH_PAIRS' && (
          <MatchPairs key={exercise.id} payload={exercise.payload} onComplete={() => submit(true)} />
        )}
        {exercise.payload.type === 'ORDER_WORDS' && (
          <OrderWords
            key={exercise.id}
            payload={exercise.payload}
            onChange={setAnswer}
            disabled={play.phase === 'feedback'}
          />
        )}
        {exercise.payload.type === 'COMPREHENSION_MCQ' && (
          <ComprehensionMcq
            payload={exercise.payload}
            value={answer}
            onChange={setAnswer}
            disabled={play.phase === 'feedback'}
          />
        )}
        {exercise.payload.type === 'SHADOW_SPEAK' && (
          <ShadowSpeak
            key={exercise.id}
            payload={exercise.payload}
            targetLang={exercise.targetLang}
            value={answer}
            onChange={setAnswer}
            disabled={play.phase === 'feedback'}
          />
        )}
        <View className="h-6" />
      </ScrollView>

      {/* 하단: 확인 버튼 또는 피드백 시트 */}
      {play.phase === 'answering' ? (
        exercise.payload.type !== 'MATCH_PAIRS' && (
          <View className="border-t-2 border-line px-5 pb-8 pt-4">
            <Pressable
              className="items-center rounded-2xl bg-brand py-4 active:opacity-80 disabled:opacity-40"
              onPress={() => submit()}
              disabled={answer === null}
              testID="review-check-button"
            >
              <Text className="text-base font-extrabold uppercase text-white">확인</Text>
            </Pressable>
          </View>
        )
      ) : (
        <FeedbackSheet
          correct={play.lastCorrect}
          correctAnswer={play.lastCorrect ? null : correctAnswerText(exercise.payload)}
          explanation={exercise.explanation}
          onContinue={next}
        />
      )}
    </View>
  );
}
