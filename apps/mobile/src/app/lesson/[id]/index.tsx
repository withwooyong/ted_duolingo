import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

/**
 * 레슨 플레이 — 5종 문제 유형 (Phase 1에서 구현)
 * 문제 유형 컴포넌트: LISTEN_SELECT / FILL_BLANK / MATCH_PAIRS / ORDER_WORDS / COMPREHENSION_MCQ
 */
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className="flex-1 bg-white px-5 pt-16">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text className="text-xl text-ink-sub">✕</Text>
        </Pressable>
        <View className="h-4 flex-1 overflow-hidden rounded-lg bg-line">
          <View className="h-full w-1/3 rounded-lg bg-brand" />
        </View>
        <Text className="font-extrabold text-danger">❤️ 5</Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <Text className="text-ink-sub">레슨 {id} — 문제 유형 5종, Phase 1에서 구현</Text>
      </View>

      <View className="border-t-2 border-line py-4">
        <Pressable
          className="items-center rounded-2xl bg-brand py-4 active:opacity-80"
          onPress={() => router.replace(`/lesson/${id}/complete`)}
        >
          <Text className="text-base font-extrabold uppercase text-white">확인</Text>
        </Pressable>
      </View>
    </View>
  );
}
