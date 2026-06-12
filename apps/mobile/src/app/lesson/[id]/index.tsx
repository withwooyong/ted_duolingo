import type { ExerciseDto } from '@ted/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { checkAnswer, correctAnswerText } from '@/components/exercise/checkers';
import { ComprehensionMcq } from '@/components/exercise/comprehension-mcq';
import { FeedbackSheet } from '@/components/exercise/feedback-sheet';
import { FillBlank } from '@/components/exercise/fill-blank';
import { ListenSelect } from '@/components/exercise/listen-select';
import { MatchPairs } from '@/components/exercise/match-pairs';
import { OrderWords } from '@/components/exercise/order-words';
import { useCompleteLesson, useHearts, useLoseHeart } from '@/hooks/use-game';
import { useLessonExercises, useSkillTree } from '@/hooks/use-skill-tree';

const TYPE_LABELS: Record<ExerciseDto['type'], string> = {
  LISTEN_SELECT: '듣고 고르기',
  FILL_BLANK: '빈칸 채우기',
  MATCH_PAIRS: '짝 맞추기',
  ORDER_WORDS: '단어 배열',
  COMPREHENSION_MCQ: '독해',
};

interface PlayState {
  index: number;
  correct: number;
  mistakes: string[];
  history: { exerciseId: string; isCorrect: boolean }[];
  /** answering → feedback(채점 후) */
  phase: 'answering' | 'feedback';
  lastCorrect: boolean;
}

const INITIAL: PlayState = {
  index: 0,
  correct: 0,
  mistakes: [],
  history: [],
  phase: 'answering',
  lastCorrect: false,
};

/** 레슨 플레이 — 문제 진행 → 즉시 피드백 → 완료 (PLAN.md §4) */
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: exercises, isLoading, error } = useLessonExercises(id);
  const { data: tree } = useSkillTree();
  const { hearts } = useHearts();
  const loseHeart = useLoseHeart();
  const completeLesson = useCompleteLesson();

  const [play, setPlay] = useState<PlayState>(INITIAL);
  const [answer, setAnswer] = useState<string | null>(null);

  if (isLoading || !exercises) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        {error ? (
          <Text className="text-danger">레슨을 불러오지 못했어요</Text>
        ) : (
          <ActivityIndicator />
        )}
      </View>
    );
  }

  const exercise = exercises[play.index];
  const total = exercises.length;
  const xpReward =
    tree?.skills.flatMap((s) => s.lessons).find((l) => l.id === id)?.xpReward ?? 10;

  const quit = () => {
    Alert.alert('레슨 그만두기', '진행 상황은 저장되지 않아요.', [
      { text: '계속 학습', style: 'cancel' },
      { text: '그만두기', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const submit = (forcedCorrect?: boolean) => {
    const isCorrect = forcedCorrect ?? (answer !== null && checkAnswer(exercise.payload, answer));
    if (!isCorrect) loseHeart.mutate();
    setPlay((p) => ({
      ...p,
      phase: 'feedback',
      lastCorrect: isCorrect,
      correct: p.correct + (isCorrect ? 1 : 0),
      mistakes: isCorrect ? p.mistakes : [...p.mistakes, exercise.id],
      history: [...p.history, { exerciseId: exercise.id, isCorrect }],
    }));
  };

  const next = async () => {
    // 하트 소진 → 레슨 중단 (PLAN.md §3.3 — 0이면 대기 또는 프리미엄)
    if (!play.lastCorrect && hearts !== null && hearts <= 0) {
      Alert.alert('하트를 모두 사용했어요 💔', '하트는 시간당 1개씩 충전됩니다.', [
        { text: '홈으로', onPress: () => router.back() },
      ]);
      return;
    }
    if (play.index + 1 < total) {
      setAnswer(null);
      setPlay((p) => ({ ...p, index: p.index + 1, phase: 'answering' }));
      return;
    }
    // 레슨 완료 → 저장 후 완료 화면
    try {
      const result = await completeLesson.mutateAsync({
        result: {
          lessonId: id!,
          score: play.correct,
          total,
          xpEarned: 0, // 서버 저장 값은 훅에서 lessonXp로 계산
          mistakes: play.mistakes,
        },
        history: play.history,
        xpReward,
      });
      router.replace({
        pathname: '/lesson/[id]/complete',
        params: {
          id: id!,
          xp: String(result.xpEarned),
          correct: String(play.correct),
          total: String(total),
          streak: String(result.streak),
          badges: JSON.stringify(
            result.newBadges.map((b) => ({ icon: b.icon, title: b.title })),
          ),
        },
      });
    } catch {
      Alert.alert('저장 실패', '진행 저장에 실패했어요. 네트워크를 확인해 주세요.');
    }
  };

  return (
    <View className="flex-1 bg-white pt-16">
      {/* 상단: 나가기 · 진행 바 · 하트 */}
      <View className="flex-row items-center gap-3 px-5">
        <Pressable onPress={quit} hitSlop={12} testID="lesson-quit">
          <Text className="text-xl text-ink-sub">✕</Text>
        </Pressable>
        <View className="h-4 flex-1 overflow-hidden rounded-lg bg-line">
          <View
            className="h-full rounded-lg bg-brand"
            style={{ width: `${(play.index / total) * 100}%` }}
            testID="lesson-progress"
          />
        </View>
        <Text className="font-extrabold text-danger" testID="lesson-hearts">
          ❤️ {hearts === null ? '∞' : hearts}
        </Text>
      </View>

      {/* 문제 영역 */}
      <ScrollView className="flex-1 px-5 pt-5" testID="exercise-area">
        <Text className="mb-1.5 text-xs font-extrabold uppercase text-grape">
          {TYPE_LABELS[exercise.type]} · {play.index + 1}/{total}
        </Text>
        <Text className="mb-5 text-xl font-extrabold leading-7">{exercise.prompt}</Text>

        {exercise.payload.type === 'LISTEN_SELECT' && (
          <ListenSelect
            payload={exercise.payload}
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
          <MatchPairs
            key={exercise.id}
            payload={exercise.payload}
            onComplete={() => submit(true)}
          />
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
              testID="check-button"
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
