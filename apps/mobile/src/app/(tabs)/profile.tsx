import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useProfile } from '@/hooks/use-profile';
import { useAuth } from '@/stores/auth';

/** 프로필 — 통계·배지·구독 (Phase 1~3에서 구현) */
export default function ProfileScreen() {
  const { data: profile } = useProfile();
  const signOut = useAuth((s) => s.signOut);

  return (
    <View className="flex-1 bg-white px-5 pt-16">
      <View className="flex-row items-center gap-4 border-b-2 border-line pb-5">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-light">
          <Text className="text-3xl">🧑‍🎓</Text>
        </View>
        <View>
          <Text className="text-xl font-extrabold" testID="profile-name">
            {profile?.displayName ?? '...'}
          </Text>
          <Text className="text-sm font-semibold text-ink-sub">🇰🇷 → 🇺🇸</Text>
        </View>
      </View>

      <Text className="py-8 text-center text-ink-sub">
        통계·배지 — Phase 1~2에서 구현
      </Text>

      <Link href="/premium" asChild>
        <Pressable className="items-center rounded-2xl bg-sky py-4 active:opacity-80">
          <Text className="text-base font-extrabold text-white">⚡ Premium 업그레이드</Text>
        </Pressable>
      </Link>
      <Link href="/settings" asChild>
        <Pressable className="mt-3 items-center rounded-2xl border-2 border-line py-3 active:opacity-60">
          <Text className="text-sm font-bold text-ink-sub">설정</Text>
        </Pressable>
      </Link>
      <Pressable
        className="mt-3 items-center rounded-2xl border-2 border-line py-3 active:opacity-60"
        onPress={signOut}
        testID="sign-out"
      >
        <Text className="text-sm font-bold text-danger">로그아웃</Text>
      </Pressable>
    </View>
  );
}
