import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

/** 레슨 완료 — XP·정확도·스트릭 + 축하 연출 (Phase 1~2에서 Lottie 적용) */
export default function LessonCompleteScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text className="text-7xl">🎉</Text>
      <Text className="mt-4 text-2xl font-extrabold text-gold">레슨 완료!</Text>
      <Text className="mt-2 text-ink-sub">XP·정확도·스트릭 카드 — Phase 1에서 구현</Text>
      <Pressable
        className="mt-10 w-full items-center rounded-2xl bg-brand py-4 active:opacity-80"
        onPress={() => router.dismissTo('/(tabs)')}
      >
        <Text className="text-base font-extrabold uppercase text-white">계속하기</Text>
      </Pressable>
    </View>
  );
}
