import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

/** 레슨 완료 — XP·정확도·스트릭 카드 (Lottie 연출은 Phase 2) */
export default function LessonCompleteScreen() {
  const { xp, correct, total, streak } = useLocalSearchParams<{
    xp: string;
    correct: string;
    total: string;
    streak: string;
  }>();
  const accuracy = Math.round((Number(correct) / Math.max(1, Number(total))) * 100);
  const perfect = correct === total;

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text className="text-7xl">🎉</Text>
      <Text className="mt-4 text-2xl font-extrabold text-gold" testID="complete-title">
        {perfect ? '퍼펙트! 레슨 완료!' : '레슨 완료!'}
      </Text>

      <View className="mt-8 flex-row gap-3">
        <View className="w-28 overflow-hidden rounded-2xl border-2 border-gold">
          <Text className="bg-gold py-1.5 text-center text-xs font-extrabold uppercase text-white">
            획득 XP
          </Text>
          <Text className="py-3 text-center text-xl font-extrabold text-gold" testID="reward-xp">
            +{xp}
          </Text>
        </View>
        <View className="w-28 overflow-hidden rounded-2xl border-2 border-brand">
          <Text className="bg-brand py-1.5 text-center text-xs font-extrabold uppercase text-white">
            정확도
          </Text>
          <Text className="py-3 text-center text-xl font-extrabold text-brand-dark">
            {accuracy}%
          </Text>
        </View>
        <View className="w-28 overflow-hidden rounded-2xl border-2 border-orange-400">
          <Text className="bg-orange-400 py-1.5 text-center text-xs font-extrabold uppercase text-white">
            스트릭
          </Text>
          <Text className="py-3 text-center text-xl font-extrabold text-orange-400">
            🔥 {streak}
          </Text>
        </View>
      </View>

      <Pressable
        className="mt-12 w-full items-center rounded-2xl bg-brand py-4 active:opacity-80"
        onPress={() => router.dismissTo('/(tabs)')}
        testID="complete-continue"
      >
        <Text className="text-base font-extrabold uppercase text-white">계속하기</Text>
      </Pressable>
    </View>
  );
}
