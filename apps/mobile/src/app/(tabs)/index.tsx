import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { useDailyXp, useHearts } from '@/hooks/use-game';
import { useUserLanguages } from '@/hooks/use-onboarding';
import { useProfile } from '@/hooks/use-profile';
import { useSkillTree, type SkillNode } from '@/hooks/use-skill-tree';

/** 홈 — 스킬 트리 (프로토타입 prototype/index.html 디자인 기준) */
export default function HomeScreen() {
  const { data: profile } = useProfile();
  const { hearts } = useHearts();
  const { data: dailyXp } = useDailyXp();
  const { data: languages, isLoading: langLoading } = useUserLanguages();
  const { data: tree, isLoading: treeLoading } = useSkillTree();

  // 학습 언어 미등록 → 온보딩 (PLAN.md §4)
  if (!langLoading && languages && languages.length === 0) {
    return <Redirect href="/onboarding" />;
  }

  const startLesson = (lessonId: string) => {
    if (hearts !== null && hearts <= 0) {
      Alert.alert('하트가 없어요 💔', '하트는 시간당 1개씩 충전됩니다.\nPremium은 하트 무제한!', [
        { text: '기다리기', style: 'cancel' },
        { text: '⚡ Premium 보기', onPress: () => router.push('/premium') },
      ]);
      return;
    }
    router.push(`/lesson/${lessonId}`);
  };

  const goalXp = profile?.dailyGoalXp ?? 20;
  const todayXp = dailyXp ?? 0;

  return (
    <ScrollView className="flex-1 bg-white">
      {/* HUD */}
      <View className="flex-row items-center justify-between border-b-2 border-line px-5 py-4">
        <Text className="text-base font-extrabold">🇺🇸</Text>
        <Text className="text-base font-extrabold text-orange-500" testID="hud-streak">
          🔥 {profile?.streak ?? '–'}
        </Text>
        <Text className="text-base font-extrabold text-danger" testID="hud-hearts">
          ❤️ {hearts === null ? '∞' : hearts}
        </Text>
        <Text className="text-base font-extrabold text-gold" testID="hud-xp">
          ⭐ {profile?.xp ?? '–'}
        </Text>
      </View>

      {/* 일일 목표 */}
      <View className="px-5 pt-3">
        <View className="flex-row justify-between">
          <Text className="text-xs font-bold text-ink-sub">오늘의 목표</Text>
          <Text className="text-xs font-bold text-ink-sub" testID="daily-goal">
            {todayXp} / {goalXp} XP {todayXp >= goalXp ? '🎯' : ''}
          </Text>
        </View>
        <View className="mt-1.5 h-3 overflow-hidden rounded-lg bg-line">
          <View
            className="h-full rounded-lg bg-gold"
            style={{ width: `${Math.min(100, (todayXp / goalXp) * 100)}%` }}
          />
        </View>
      </View>

      {/* 단원 배너 */}
      <View className="mx-5 mt-4 rounded-2xl bg-brand p-4">
        <Text className="text-xs font-bold text-white/80">1단원</Text>
        <Text className="mt-1 text-lg font-extrabold text-white">기초 회화 — 영어</Text>
      </View>

      {/* 스킬 트리 */}
      {treeLoading || !tree ? (
        <ActivityIndicator className="py-16" />
      ) : (
        <View className="items-center pb-4 pt-6">
          {tree.skills.map((skill, i) => (
            <SkillNodeView
              key={skill.id}
              skill={skill}
              isFirst={i === 0}
              isCurrent={skill.nextLesson?.id === tree.currentLesson?.id && !!skill.nextLesson}
              onPress={() => {
                if (skill.locked) {
                  Alert.alert('🔒 잠긴 스킬', '이전 스킬을 먼저 완료하세요.');
                } else if (skill.nextLesson) {
                  startLesson(skill.nextLesson.id);
                } else {
                  Alert.alert('✓ 완료한 스킬', '복습 기능은 곧 추가돼요!');
                }
              }}
            />
          ))}
        </View>
      )}

      {/* 이어하기 */}
      {tree?.currentLesson && (
        <View className="px-5 pb-10">
          <Pressable
            className="items-center rounded-2xl bg-brand py-4 active:opacity-80"
            onPress={() => startLesson(tree.currentLesson!.id)}
            testID="continue-button"
          >
            <Text className="text-base font-extrabold uppercase text-white">
              이어하기 ▶ {tree.currentLesson.title}
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function SkillNodeView({
  skill,
  isFirst,
  isCurrent,
  onPress,
}: {
  skill: SkillNode;
  isFirst: boolean;
  isCurrent: boolean;
  onPress: () => void;
}) {
  const done = skill.doneCount >= skill.lessons.length;
  return (
    <View className="items-center">
      {!isFirst && <View className="my-2 h-7 w-1.5 rounded bg-line" />}
      <Pressable className="items-center active:opacity-80" onPress={onPress} testID={`skill-${skill.order}`}>
        {isCurrent && (
          <View className="mb-1 rounded-xl border-2 border-line bg-white px-3 py-1">
            <Text className="text-xs font-extrabold text-brand">시작!</Text>
          </View>
        )}
        <View
          className={`h-20 w-20 items-center justify-center rounded-full ${
            done ? 'bg-gold' : skill.locked ? 'bg-line' : 'bg-brand'
          } ${isCurrent ? 'border-4 border-brand-light' : ''}`}
        >
          <Text className="text-3xl">{skill.locked ? '🔒' : skill.icon}</Text>
        </View>
        <Text className={`mt-2 text-sm font-extrabold ${skill.locked ? 'text-ink-sub' : ''}`}>
          {skill.title}
        </Text>
        <Text className="text-xs font-bold text-ink-sub">
          {done ? '완료 ✓' : `${skill.doneCount} / ${skill.lessons.length}`}
        </Text>
      </Pressable>
    </View>
  );
}
