import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

/** 프리미엄 — Free vs Premium 비교 + 구독 (Phase 3: RevenueCat + IAP) */
export default function PremiumScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text className="text-5xl">⚡</Text>
      <Text className="mt-3 text-xl font-extrabold">Ted Premium</Text>
      <Text className="mt-2 text-center text-ink-sub">
        무제한 하트 · 광고 제거 · 스트릭 동결{'\n'}구독은 Phase 3에서 RevenueCat으로 구현
      </Text>
      <Pressable
        className="mt-8 w-full items-center rounded-2xl border-2 border-line py-3 active:opacity-60"
        onPress={() => router.back()}
      >
        <Text className="text-sm font-bold text-ink-sub">닫기</Text>
      </Pressable>
    </View>
  );
}
