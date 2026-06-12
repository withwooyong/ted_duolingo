/**
 * 스트릭 리마인더 — 매일 저녁 로컬 알림 (PLAN.md Phase 2 "스트릭 알림").
 * 네이티브 전용: Expo web은 로컬 예약 알림을 지원하지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const STORAGE_KEY = 'streak-reminder-enabled';
export const REMINDER_HOUR = 20;

export const reminderSupported = Platform.OS !== 'web';

export async function isReminderEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(STORAGE_KEY)) === '1';
}

/** 알림 권한을 받고 매일 REMINDER_HOUR시에 스트릭 리마인더를 예약한다. 성공 여부 반환. */
export async function enableReminder(): Promise<boolean> {
  if (!reminderSupported) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔥 스트릭을 지켜요!',
      body: '오늘 레슨 하나만 완료하면 스트릭이 이어져요.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: 0,
    },
  });
  await AsyncStorage.setItem(STORAGE_KEY, '1');
  return true;
}

export async function disableReminder(): Promise<void> {
  if (reminderSupported) {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  await AsyncStorage.setItem(STORAGE_KEY, '0');
}
