import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

/**
 * 온보딩 — 모국어 → 학습 언어 → 일일 목표 3단계 (Phase 1에서 구현)
 * 흐름은 프로토타입(prototype/index.html) 기준.
 */
export default function OnboardingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text className="text-6xl">🦉</Text>
      <Text className="mt-4 text-xl font-extrabold">온보딩</Text>
      <Text className="mt-2 text-center text-ink-sub">
        모국어 → 학습 언어 → 일일 목표{'\n'}Phase 1에서 구현
      </Text>
      <Pressable
        className="mt-8 w-full items-center rounded-2xl bg-brand py-4 active:opacity-80"
        onPress={() => router.replace('/(tabs)')}
      >
        <Text className="text-base font-extrabold uppercase text-white">시작하기</Text>
      </Pressable>
    </View>
  );
}
