import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#ffffff' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        {/* 레슨 중 스와이프로 이탈 방지 (하트·진행 보호) */}
        <Stack.Screen name="lesson/[id]/index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="lesson/[id]/complete" options={{ gestureEnabled: false }} />
        <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" />
      </Stack>
    </QueryClientProvider>
  );
}
