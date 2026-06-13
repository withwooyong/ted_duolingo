import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { initAuthListener, useAuth } from '@/stores/auth';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { session, isLoading } = useAuth();

  useEffect(() => initAuthListener(), []);

  // 세션 복원 전에는 스플래시 유지 (깜빡임 방지)
  if (isLoading) return null;

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}
