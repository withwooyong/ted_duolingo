import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { useEffect, useMemo } from 'react';

import { OfflineBanner } from '@/components/offline-banner';
import { SyncProcessor } from '@/components/sync-processor';
import { initOnlineManager } from '@/lib/online-status';
import {
  CACHE_BUSTER,
  CACHE_MAX_AGE,
  makePersister,
  queryClient,
  removePersistedCache,
  shouldDehydrateQuery,
} from '@/lib/query-client';
import { initAuthListener, useAuth } from '@/stores/auth';

export default function RootLayout() {
  const { session, isLoading } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => initAuthListener(), []);
  useEffect(() => initOnlineManager(), []);

  // 로그아웃·사용자 전환 시 메모리 캐시 비우고 직전 사용자 persist 캐시 제거(다음 사용자에게 노출 방지).
  // userId가 바뀌면 아래 PersistQueryClientProvider도 key로 리마운트되어 새 persister로 복원한다.
  useEffect(() => {
    return () => {
      queryClient.clear();
      if (userId) void removePersistedCache(userId);
    };
  }, [userId]);

  const persister = useMemo(() => (userId ? makePersister(userId) : null), [userId]);

  // 세션 복원 전에는 스플래시 유지 (깜빡임 방지) — userId 확정 후에만 persister 선택 가능
  if (isLoading) return null;

  const stack = (
    <>
      <OfflineBanner />
      <SyncProcessor />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#ffffff' },
        }}
      >
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          {/* 레슨 중 스와이프로 이탈 방지 (하트·진행 보호) */}
          <Stack.Screen name="lesson/[id]/index" options={{ gestureEnabled: false }} />
          <Stack.Screen name="lesson/[id]/complete" options={{ gestureEnabled: false }} />
          <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
          <Stack.Screen name="languages" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="auth" />
        </Stack.Protected>
      </Stack>
    </>
  );

  // 로그인 전(persister 없음)에는 persist 없이 평범한 캐시로 동작
  if (!persister) {
    return <QueryClientProvider client={queryClient}>{stack}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      key={userId}
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE,
        buster: CACHE_BUSTER,
        dehydrateOptions: { shouldDehydrateQuery },
      }}
    >
      {stack}
    </PersistQueryClientProvider>
  );
}
