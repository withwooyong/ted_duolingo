import { Text, View } from 'react-native';

/** 리그 — 주간 XP 랭킹 (Phase 2에서 구현) */
export default function LeagueScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text className="text-5xl">🥉</Text>
      <Text className="mt-3 text-xl font-extrabold">브론즈 리그</Text>
      <Text className="mt-2 text-center text-ink-sub">
        주간 리그 랭킹 — Phase 2에서 구현
      </Text>
    </View>
  );
}
