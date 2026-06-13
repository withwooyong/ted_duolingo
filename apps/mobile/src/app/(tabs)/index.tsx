import { LANG_FLAGS, LANG_LABELS } from '@ted/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { useDailyXp, useHearts } from '@/hooks/use-game';
import { useOnline } from '@/hooks/use-online';
import { useUserLanguages } from '@/hooks/use-onboarding';
import { useProfile } from '@/hooks/use-profile';
import {
  fetchReviewSession,
  reviewSnapshotKey,
  useDueReviewCount,
  useReviewSnapshot,
} from '@/hooks/use-review';
import {
  fetchLessonExercises,
  lessonExercisesKey,
  useSkillTree,
  type SkillNode,
} from '@/hooks/use-skill-tree';
import { useSyncQueue } from '@/lib/sync-queue';

/** 홈 — 스킬 트리 (프로토타입 prototype/index.html 디자인 기준) */
export default function HomeScreen() {
  const { data: profile } = useProfile();
  const { hearts } = useHearts();
  const { data: dailyXp } = useDailyXp();
  const { data: languages, isLoading: langLoading } = useUserLanguages();
  const { data: tree, isLoading: treeLoading } = useSkillTree();
  const { data: dueReviews } = useDueReviewCount();
  const { data: reviewSnapshot } = useReviewSnapshot();
  const online = useOnline();
  const queryClient = useQueryClient();
  const userId = profile?.id ?? null;
  const pendingCount = useSyncQueue((s) =>
    userId
      ? s.items.filter((i) => i.userId === userId).length +
        s.reviews.filter((i) => i.userId === userId).length
      : 0,
  );
  const [showOfflineBlock, setShowOfflineBlock] = useState(false);

  // 오프라인 due 카운트 — 온라인은 live(review-count), 오프라인은 동결 스냅샷 길이(D24)
  const snapshotDue = reviewSnapshot?.exercises.length ?? 0;
  const effectiveDue = online === false ? snapshotDue : (dueReviews ?? 0);

  // 오프라인 대비 — 온라인일 때 "이어하기" 레슨 문제(D22)와 복습 due 세션 스냅샷(D24)을 미리 캐시
  const currentLessonId = tree?.currentLesson?.id;
  useEffect(() => {
    if (!online || !currentLessonId) return;
    void queryClient.prefetchQuery({
      queryKey: lessonExercisesKey(currentLessonId),
      queryFn: () => fetchLessonExercises(currentLessonId),
    });
  }, [online, currentLessonId, queryClient]);

  useEffect(() => {
    if (!online || !userId) return;
    void queryClient.prefetchQuery({
      queryKey: reviewSnapshotKey(userId),
      queryFn: () => fetchReviewSession(userId),
    });
  }, [online, userId, queryClient]);

  // 학습 언어 미등록 → 온보딩 (PLAN.md §4)
  if (!langLoading && languages && languages.length === 0) {
    return <Redirect href="/onboarding" />;
  }

  // 오프라인 레슨은 문제가 캐시된 레슨만 가능(쓰기는 큐로 적재, D22). 미캐시 레슨은 진입 차단 안내.
  const startLesson = (lessonId: string) => {
    if (!online && !queryClient.getQueryData(lessonExercisesKey(lessonId))) {
      setShowOfflineBlock(true);
      return;
    }
    if (hearts !== null && hearts <= 0) {
      Alert.alert('하트가 없어요 💔', '하트는 시간당 1개씩 충전됩니다.\nPremium은 하트 무제한!', [
        { text: '기다리기', style: 'cancel' },
        { text: '⚡ Premium 보기', onPress: () => router.push('/premium') },
      ]);
      return;
    }
    router.push(`/lesson/${lessonId}`);
  };

  // 복습은 오프라인이면 동결 스냅샷이 있을 때만 진입 가능(D24). 스냅샷이 비면 차단 안내.
  const startReview = () => {
    if (!online && snapshotDue === 0) {
      setShowOfflineBlock(true);
      return;
    }
    router.push('/review');
  };

  const goalXp = profile?.dailyGoalXp ?? 20;
  const todayXp = dailyXp ?? 0;

  return (
    <ScrollView className="flex-1 bg-white">
      {/* HUD */}
      <View className="flex-row items-center justify-between border-b-2 border-line px-5 py-4">
        <Pressable onPress={() => router.push('/languages')} hitSlop={8} testID="hud-lang">
          <Text className="text-base font-extrabold">
            {LANG_FLAGS[tree?.targetLang ?? ''] ?? '🌍'}
          </Text>
        </Pressable>
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

      {/* 오프라인 진입 차단 안내 — 미캐시 레슨/복습만 해당(캐시된 레슨은 오프라인 풀이 가능, D22) */}
      {showOfflineBlock && !online && (
        <Pressable
          className="mx-5 mt-3 rounded-2xl border-2 border-danger bg-danger/10 px-4 py-3 active:opacity-80"
          onPress={() => setShowOfflineBlock(false)}
          testID="offline-blocked"
        >
          <Text className="text-center text-sm font-extrabold text-danger">
            오프라인에선 준비된 레슨·복습만 풀 수 있어요. 연결 후 다시 시도하세요.
          </Text>
        </Pressable>
      )}

      {/* 동기화 대기 — 오프라인에서 끝낸 레슨이 연결되면 자동 저장된다(D22) */}
      {pendingCount > 0 && (
        <View
          className="mx-5 mt-3 rounded-2xl border-2 border-ink/20 bg-ink/5 px-4 py-2.5"
          testID="sync-pending"
        >
          <Text className="text-center text-sm font-extrabold text-ink-sub">
            📡 동기화 대기 {pendingCount}개 — 연결되면 저장돼요
          </Text>
        </View>
      )}

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

      {/* 복습 배너 — due 문제가 있을 때만 (SM-2 간격 반복). 오프라인은 동결 스냅샷 기준(D24) */}
      {effectiveDue > 0 && (
        <Pressable
          className="mx-5 mt-3 flex-row items-center justify-between rounded-2xl border-2 border-grape bg-grape/10 px-4 py-3 active:opacity-80"
          onPress={startReview}
          testID="review-banner"
        >
          <Text className="text-sm font-extrabold text-grape">🔄 복습할 문제 {effectiveDue}개</Text>
          <Text className="text-sm font-extrabold text-grape">복습하기 ▶</Text>
        </Pressable>
      )}

      {/* 단원 배너 */}
      <View className="mx-5 mt-4 rounded-2xl bg-brand p-4">
        <Text className="text-xs font-bold text-white/80">1단원</Text>
        <Text className="mt-1 text-lg font-extrabold text-white" testID="unit-banner">
          기초 회화 — {LANG_LABELS[tree?.targetLang ?? ''] ?? '...'}
        </Text>
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
                } else if (effectiveDue > 0) {
                  startReview();
                } else {
                  Alert.alert('✓ 완료한 스킬', '복습할 문제는 간격을 두고 다시 나와요. 곧 복습으로 만나요!');
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
