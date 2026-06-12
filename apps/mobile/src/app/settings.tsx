import { DAILY_GOAL_OPTIONS } from '@ted/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';

import { useProfile } from '@/hooks/use-profile';
import {
  disableReminder,
  enableReminder,
  isReminderEnabled,
  REMINDER_HOUR,
  reminderSupported,
} from '@/lib/reminder';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

/** 설정 — 일일 목표·스트릭 알림 (언어 전환·구독 관리는 Phase 3) */
export default function SettingsScreen() {
  const session = useAuth((s) => s.session);
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [reminderOn, setReminderOn] = useState(false);
  useEffect(() => {
    isReminderEnabled().then(setReminderOn);
  }, []);

  const setGoal = useMutation({
    mutationFn: async (goal: number) => {
      const { error } = await supabase
        .from('profiles')
        .update({ daily_goal_xp: goal })
        .eq('id', session!.user.id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });

  const toggleReminder = async (on: boolean) => {
    if (on) {
      const ok = await enableReminder();
      setReminderOn(ok);
      if (!ok) {
        Alert.alert('알림을 켤 수 없어요', '시스템 설정에서 알림 권한을 허용해 주세요.');
      }
    } else {
      await disableReminder();
      setReminderOn(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-5 pt-16">
      <Text className="text-2xl font-extrabold">설정</Text>

      {/* 일일 목표 */}
      <Text className="mt-7 text-xs font-extrabold uppercase text-ink-sub">일일 목표</Text>
      <View className="mt-2 flex-row gap-2.5" testID="daily-goal-options">
        {DAILY_GOAL_OPTIONS.map((goal) => {
          const active = profile?.dailyGoalXp === goal;
          return (
            <Pressable
              key={goal}
              className={`flex-1 items-center rounded-2xl border-2 py-3 active:opacity-70 ${
                active ? 'border-brand bg-brand-light/30' : 'border-line'
              }`}
              onPress={() => setGoal.mutate(goal)}
              testID={`goal-${goal}`}
            >
              <Text className={`text-base font-extrabold ${active ? 'text-brand-dark' : ''}`}>
                {goal} XP
              </Text>
              <Text className="text-xs font-semibold text-ink-sub">
                {goal === 10 ? '가볍게' : goal === 20 ? '보통' : '진지하게'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 스트릭 알림 */}
      <Text className="mt-7 text-xs font-extrabold uppercase text-ink-sub">알림</Text>
      <View className="mt-2 flex-row items-center justify-between rounded-2xl border-2 border-line px-4 py-3.5">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold">스트릭 리마인더</Text>
          <Text className="mt-0.5 text-xs font-semibold text-ink-sub">
            {reminderSupported
              ? `매일 ${REMINDER_HOUR}:00에 학습 알림을 받아요`
              : '웹에서는 지원하지 않아요 (모바일 앱 전용)'}
          </Text>
        </View>
        <Switch
          value={reminderOn}
          onValueChange={toggleReminder}
          disabled={!reminderSupported}
          testID="reminder-switch"
        />
      </View>

      <Pressable
        className="mt-10 w-full items-center rounded-2xl border-2 border-line py-3 active:opacity-60"
        onPress={() => router.back()}
      >
        <Text className="text-sm font-bold text-ink-sub">뒤로</Text>
      </Pressable>
    </View>
  );
}
