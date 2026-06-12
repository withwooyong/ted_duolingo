import {
  LEAGUE_DEMOTE_COUNT,
  LEAGUE_PROMOTE_COUNT,
  LEAGUE_TIER_ICONS,
  LEAGUE_TIER_LABELS,
  LEAGUE_TIERS,
} from '@ted/shared';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { useLeague, type LeagueStanding } from '@/hooks/use-league';

const AVATARS = ['🦊', '🐻', '🐰', '🐯', '🐱', '🐸', '🐼', '🐨', '🦁', '🐹'];

/** userId 기반 고정 아바타 (본인은 🧑‍🎓) */
function avatarFor(userId: string): string {
  let hash = 0;
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATARS[hash % AVATARS.length];
}

/** 리그 — 주간 XP 랭킹 (prototype/index.html 디자인 기준) */
export default function LeagueScreen() {
  const { data: league, isLoading, error } = useLeague();

  if (isLoading || !league) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        {error ? (
          <Text className="text-danger">리그 정보를 불러오지 못했어요</Text>
        ) : (
          <ActivityIndicator />
        )}
      </View>
    );
  }

  const tierIndex = LEAGUE_TIERS.indexOf(league.tier);
  const nextTier = LEAGUE_TIERS[tierIndex + 1];
  const shields = LEAGUE_TIERS.map((t, i) => (i <= tierIndex ? LEAGUE_TIER_ICONS[t] : '🛡️')).join(
    '',
  );
  const total = league.standings.length;

  return (
    <ScrollView className="flex-1 bg-white">
      {/* 헤더 — 티어 방패·이름·승급 안내·남은 기간 */}
      <View className="items-center border-b-2 border-line px-5 pb-3 pt-16">
        <Text className="text-3xl tracking-widest">{shields}</Text>
        <Text className="mt-2 text-xl font-extrabold text-orange-700" testID="league-tier">
          {LEAGUE_TIER_LABELS[league.tier]} 리그
        </Text>
        <Text className="mt-1 text-sm font-semibold text-ink-sub">
          {nextTier
            ? `상위 ${LEAGUE_PROMOTE_COUNT}명은 ${LEAGUE_TIER_LABELS[nextTier]} 리그로 승급!`
            : '최고 리그예요!'}{' '}
          · {league.daysLeft}일 남음
        </Text>
      </View>

      {/* 순위표 */}
      <View className="px-4 pb-10 pt-2" testID="league-standings">
        {league.standings.map((row, i) => (
          <View key={row.userId}>
            {i === 0 && nextTier && (
              <Text className="px-2 py-2 text-xs font-extrabold text-brand-dark">
                ▲ 승급 구간
              </Text>
            )}
            {total > LEAGUE_PROMOTE_COUNT &&
              i === Math.max(LEAGUE_PROMOTE_COUNT, total - LEAGUE_DEMOTE_COUNT) &&
              tierIndex > 0 && (
                <Text className="px-2 py-2 text-xs font-extrabold text-danger">▼ 강등 구간</Text>
              )}
            <RankRow row={row} rank={i + 1} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function RankRow({ row, rank }: { row: LeagueStanding; rank: number }) {
  return (
    <View
      className={`flex-row items-center gap-3 rounded-2xl px-3 py-2.5 ${
        row.isMe ? 'bg-brand-light/30 border-2 border-brand' : ''
      }`}
      testID={row.isMe ? 'league-me' : undefined}
    >
      <Text className="w-6 text-center text-base font-extrabold text-ink-sub">{rank}</Text>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-line/60">
        <Text className="text-xl">{row.isMe ? '🧑‍🎓' : avatarFor(row.userId)}</Text>
      </View>
      <Text className="flex-1 text-base font-bold" numberOfLines={1}>
        {row.name}
        {row.isMe ? ' (나)' : ''}
      </Text>
      <Text className="text-sm font-extrabold text-gold">{row.weeklyXp} XP</Text>
    </View>
  );
}
