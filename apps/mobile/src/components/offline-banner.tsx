import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnline } from '@/hooks/use-online';

/**
 * 오프라인 안내 배너 (D21) — 네트워크가 끊기면 화면 최상단에 표시.
 * Reanimated entering/exiting 프리셋은 Expo web에서 동작하지 않으므로(complete.tsx 참조)
 * 무애니메이션 조건부 렌더로 둔다.
 */
export function OfflineBanner() {
  const online = useOnline();
  const insets = useSafeAreaInsets();

  if (online) return null;

  return (
    <View
      className="bg-ink px-4 pb-2"
      style={{ paddingTop: insets.top + 8 }}
      testID="offline-banner"
    >
      <Text className="text-center text-sm font-extrabold text-white">
        📡 오프라인 — 저장된 콘텐츠를 볼 수 있어요
      </Text>
    </View>
  );
}
