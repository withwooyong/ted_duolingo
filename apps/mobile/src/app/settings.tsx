import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

/** 설정 — 언어 추가/전환, 알림, 계정, 구독 관리 (Phase 1+) */
export default function SettingsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text className="text-xl font-extrabold">설정</Text>
      <Text className="mt-2 text-center text-ink-sub">
        언어 추가/전환 · 알림 · 계정 · 구독 관리{'\n'}Phase 1+에서 구현
      </Text>
      <Pressable
        className="mt-8 w-full items-center rounded-2xl border-2 border-line py-3 active:opacity-60"
        onPress={() => router.back()}
      >
        <Text className="text-sm font-bold text-ink-sub">뒤로</Text>
      </Pressable>
    </View>
  );
}
