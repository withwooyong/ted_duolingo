/**
 * 오프라인 레슨 쓰기 큐(D22) — 오프라인에서 끝낸 레슨 입력을 영속 보관했다가
 * 온라인 복귀 시 SyncProcessor가 completeLessonWrite로 재실행한다.
 *
 * 절대값이 아닌 "의도(입력)"를 큐잉하므로 복귀 시 서버 최신 상태에 대고 재실행해도 충돌이 없다.
 * AsyncStorage에 영속(앱 재기동에도 보존), 항목마다 userId를 태깅해 사용자별로 필터한다
 * (읽기 캐시처럼 키 분리 대신 태깅 — 처리 주체가 항상 현재 로그인 사용자 한 명이라 단순).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CompleteLessonInput } from '@/lib/learning-writes';

export interface QueuedLesson {
  /** progressId — user_progress 행 id이자 재시도 멱등 키 */
  id: string;
  userId: string;
  input: CompleteLessonInput;
  /** 오프라인 중 잃은 하트 수(동기화 시 일괄 차감) */
  heartsLost: number;
  /** 완료 시각(epoch ms) — 스트릭·due·일일 XP를 학습 시점 기준으로 계산 */
  completedAt: number;
  queuedAt: number;
}

interface SyncQueueState {
  items: QueuedLesson[];
  enqueue: (item: QueuedLesson) => void;
  remove: (id: string) => void;
  /** 로그아웃·사용자 전환 시 해당 사용자 항목 제거 */
  clearForUser: (userId: string) => void;
}

export const useSyncQueue = create<SyncQueueState>()(
  persist(
    (set) => ({
      items: [],
      enqueue: (item) => set((s) => ({ items: [...s.items, item] })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clearForUser: (userId) =>
        set((s) => ({ items: s.items.filter((i) => i.userId !== userId) })),
    }),
    {
      name: 'ted-sync-queue',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** 현재 사용자의 대기 레슨 (FIFO — queuedAt 오름차순) */
export function pendingForUser(items: QueuedLesson[], userId: string): QueuedLesson[] {
  return items
    .filter((i) => i.userId === userId)
    .sort((a, b) => a.queuedAt - b.queuedAt);
}
