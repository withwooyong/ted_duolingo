import { LANG_FLAGS, LEAGUE_TIER_ICONS, LEAGUE_TIER_LABELS } from '@ted/shared';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useBadges, useLessonsDone, type BadgeItem } from '@/hooks/use-league';
import { useProfile } from '@/hooks/use-profile';
import { useSkillTree } from '@/hooks/use-skill-tree';
import { useAuth } from '@/stores/auth';

/** 프로필 — 통계·배지·구독 (prototype/index.html 디자인 기준) */
export default function ProfileScreen() {
  const { data: profile } = useProfile();
  const { data: tree } = useSkillTree();
  const { data: badges } = useBadges();
  const { data: lessonsDone } = useLessonsDone();
  const signOut = useAuth((s) => s.signOut);

  const tier = profile?.leagueTier ?? 'BRONZE';

  return (
    <ScrollView className="flex-1 bg-white px-5 pt-16">
      {/* 헤더 */}
      <View className="flex-row items-center gap-4 border-b-2 border-line pb-5">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-light">
          <Text className="text-3xl">🧑‍🎓</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xl font-extrabold" testID="profile-name">
            {profile?.displayName ?? '...'}
          </Text>
          <Text className="text-sm font-semibold text-ink-sub">
            {LANG_FLAGS[profile?.nativeLang ?? 'ko']} → {LANG_FLAGS[tree?.targetLang ?? ''] ?? '🌍'}
          </Text>
        </View>
        {profile?.isPremium && (
          <View className="rounded-full bg-sky px-3 py-1" testID="premium-badge">
            <Text className="text-xs font-extrabold text-white">⚡ PREMIUM</Text>
          </View>
        )}
      </View>

      {/* 통계 */}
      <Text className="mt-5 text-xs font-extrabold uppercase text-ink-sub">통계</Text>
      <View className="mt-2 flex-row flex-wrap gap-3" testID="profile-stats">
        <StatCard icon="🔥" value={`${profile?.streak ?? 0}일`} label="현재 스트릭" />
        <StatCard icon="⭐" value={String(profile?.xp ?? 0)} label="총 XP" />
        <StatCard icon="📚" value={String(lessonsDone ?? 0)} label="완료한 레슨" />
        <StatCard
          icon={LEAGUE_TIER_ICONS[tier]}
          value={LEAGUE_TIER_LABELS[tier]}
          label="현재 리그"
        />
      </View>

      {/* 배지 */}
      <Text className="mt-6 text-xs font-extrabold uppercase text-ink-sub">배지</Text>
      <View className="mt-2 flex-row flex-wrap gap-2.5" testID="badge-grid">
        {(badges ?? []).map((b) => (
          <BadgeCard key={b.key} badge={b} />
        ))}
      </View>

      {/* 액션 */}
      <View className="mt-8 pb-12">
        <Link href="/premium" asChild>
          <Pressable className="items-center rounded-2xl bg-sky py-4 active:opacity-80" testID="profile-premium">
            <Text className="text-base font-extrabold text-white">
              {profile?.isPremium ? '⚡ Premium 구독 관리' : '⚡ Premium 업그레이드'}
            </Text>
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
    </ScrollView>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View className="w-[47%] flex-row items-center gap-2.5 rounded-2xl border-2 border-line px-3 py-3">
      <Text className="text-2xl">{icon}</Text>
      <View className="flex-1">
        <Text className="text-base font-extrabold" numberOfLines={1}>
          {value}
        </Text>
        <Text className="text-xs font-semibold text-ink-sub">{label}</Text>
      </View>
    </View>
  );
}

function BadgeCard({ badge }: { badge: BadgeItem }) {
  return (
    <View
      className={`w-[31%] items-center rounded-2xl border-2 border-line px-1.5 py-3 ${
        badge.earned ? '' : 'opacity-40'
      }`}
      testID={`badge-${badge.key}${badge.earned ? '-earned' : ''}`}
    >
      <Text className="text-3xl">{badge.earned ? badge.icon : '🔒'}</Text>
      <Text className="mt-1.5 text-center text-xs font-extrabold" numberOfLines={1}>
        {badge.title}
      </Text>
      <Text className="mt-0.5 text-center text-[10px] font-semibold text-ink-sub" numberOfLines={2}>
        {badge.condition}
      </Text>
    </View>
  );
}
