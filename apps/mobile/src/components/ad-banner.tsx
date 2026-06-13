import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useProfile } from '@/hooks/use-profile';

/**
 * 무료 사용자 광고 배너 (PLAN.md §3.4 — Premium은 광고 제거).
 * 로컬/Expo Go에서는 placeholder로 동작 — 실광고(AdMob)는 네이티브 빌드 시 교체.
 */
export function AdBanner() {
  const { data: profile } = useProfile();
  if (!profile || profile.isPremium) return null;

  return (
    <Pressable
      className="mt-8 w-full flex-row items-center gap-3 rounded-2xl border-2 border-line bg-line/30 px-4 py-3 active:opacity-70"
      onPress={() => router.push('/premium')}
      testID="ad-banner"
    >
      <View className="rounded bg-ink-sub px-1.5 py-0.5">
        <Text className="text-[10px] font-extrabold text-white">AD</Text>
      </View>
      <View className="flex-1">
        <Text className="text-xs font-bold text-ink-sub">광고가 표시되는 자리예요</Text>
        <Text className="text-[11px] font-semibold text-sky-dark">
          ⚡ Premium으로 광고 없이 학습하기
        </Text>
      </View>
    </Pressable>
  );
}
