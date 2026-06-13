import { DAILY_GOAL_OPTIONS, LANG_FLAGS } from '@ted/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { useLanguagePairs } from '@/hooks/use-languages';
import { useCompleteOnboarding } from '@/hooks/use-onboarding';

const GOAL_LABELS: Record<number, [string, string]> = {
  10: ['🌱', '가볍게'],
  20: ['🌿', '보통'],
  30: ['🌳', '열심히'],
};

/**
 * 온보딩 — 학습 언어 선택 → 일일 목표 (PLAN.md §4, 3단계 이내)
 * 모국어는 MVP에서 한국어 고정 (D11). 다국어 확장 시 단계 추가.
 */
export default function OnboardingScreen() {
  const [step, setStep] = useState<0 | 1>(0);
  const [pairId, setPairId] = useState<string | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const complete = useCompleteOnboarding();

  const { data: pairs } = useLanguagePairs();

  const finish = async () => {
    if (!pairId || !goal) return;
    try {
      await complete.mutateAsync({ languagePairId: pairId, dailyGoalXp: goal });
      router.replace('/(tabs)');
    } catch {
      Alert.alert('오류', '설정 저장에 실패했어요. 다시 시도해 주세요.');
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      {/* 진행 바 */}
      <View className="h-3.5 overflow-hidden rounded-lg bg-line">
        <View
          className="h-full rounded-lg bg-brand"
          style={{ width: step === 0 ? '50%' : '100%' }}
        />
      </View>

      <Text className="mt-8 text-center text-6xl">🦉</Text>

      {step === 0 ? (
        <>
          <Text className="mt-4 text-center text-xl font-extrabold">
            어떤 언어를 배우고 싶나요?
          </Text>
          <View className="mt-6 gap-2.5">
            {(pairs ?? []).map((p) => (
              <Pressable
                key={p.id}
                className={`flex-row items-center gap-3 rounded-2xl border-2 px-4 py-4 ${
                  pairId === p.id ? 'border-sky bg-sky/10' : 'border-line'
                }`}
                onPress={() => setPairId(p.id)}
                testID={`pair-${p.target_lang}`}
              >
                <Text className="text-2xl">{LANG_FLAGS[p.target_lang] ?? '🌍'}</Text>
                <Text
                  className={`text-lg font-bold ${pairId === p.id ? 'text-sky-dark' : 'text-ink'}`}
                >
                  {p.display_name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            className="mt-8 items-center rounded-2xl bg-brand py-4 active:opacity-80 disabled:opacity-40"
            onPress={() => setStep(1)}
            disabled={!pairId}
            testID="onboarding-next"
          >
            <Text className="text-base font-extrabold uppercase text-white">계속하기</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text className="mt-4 text-center text-xl font-extrabold">하루 목표를 정해주세요</Text>
          <View className="mt-6 gap-2.5">
            {DAILY_GOAL_OPTIONS.map((g) => (
              <Pressable
                key={g}
                className={`flex-row items-center gap-3 rounded-2xl border-2 px-4 py-4 ${
                  goal === g ? 'border-sky bg-sky/10' : 'border-line'
                }`}
                onPress={() => setGoal(g)}
                testID={`goal-${g}`}
              >
                <Text className="text-2xl">{GOAL_LABELS[g][0]}</Text>
                <Text className={`text-lg font-bold ${goal === g ? 'text-sky-dark' : 'text-ink'}`}>
                  {GOAL_LABELS[g][1]} — {g} XP
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            className="mt-8 items-center rounded-2xl bg-brand py-4 active:opacity-80 disabled:opacity-40"
            onPress={finish}
            disabled={!goal || complete.isPending}
            testID="onboarding-finish"
          >
            <Text className="text-base font-extrabold uppercase text-white">
              {complete.isPending ? '저장 중...' : '시작하기'}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
