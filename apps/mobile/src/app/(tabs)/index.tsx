import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

/**
 * 홈 — 스킬 트리 (Phase 1에서 실제 UI 구현)
 * 프로토타입(prototype/index.html)의 홈 화면이 디자인 기준.
 */
export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between border-b-2 border-line px-5 py-4">
        <Text className="text-base font-extrabold">🇺🇸</Text>
        <Text className="text-base font-extrabold text-orange-500">🔥 0</Text>
        <Text className="text-base font-extrabold text-danger">❤️ 5</Text>
        <Text className="text-base font-extrabold text-gold">⭐ 0</Text>
      </View>

      <View className="mx-5 mt-4 rounded-2xl bg-brand p-4">
        <Text className="text-xs font-bold text-white/80">1단원</Text>
        <Text className="mt-1 text-lg font-extrabold text-white">기초 회화 — 영어</Text>
      </View>

      <View className="items-center py-10">
        <Text className="text-ink-sub">스킬 트리 — Phase 1에서 구현</Text>
      </View>

      <View className="px-5 pb-6">
        <Link href="/lesson/dev-lesson-1" asChild>
          <Pressable className="items-center rounded-2xl bg-brand py-4 active:opacity-80">
            <Text className="text-base font-extrabold uppercase text-white">이어하기 ▶</Text>
          </Pressable>
        </Link>
      </View>

      <View className="px-5 pb-10">
        <Link href="/onboarding" asChild>
          <Pressable className="items-center rounded-2xl border-2 border-line py-3 active:opacity-60">
            <Text className="text-sm font-bold text-sky">온보딩 보기 (dev)</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}
