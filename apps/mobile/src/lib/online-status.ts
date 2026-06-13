import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { Platform } from 'react-native';

/**
 * 네트워크 상태를 TanStack Query onlineManager에 연결(D21).
 * 오프라인 시 쿼리는 자동 일시정지되고 persist 캐시가 표시되며, UI(오프라인 배너)도
 * 같은 onlineManager 신호를 구독해 쿼리 일시정지와 배너 표시가 항상 일치한다.
 *
 * 웹에서는 onlineManager가 기본으로 window online/offline 이벤트를 구독하므로 그대로 둔다
 * (NetInfo web은 window offline 이벤트에 즉시 반응하지 않아 배너가 늦게 뜬다).
 * 다만 onlineManager 기본값은 online:true이고 이벤트 발생 시에만 갱신되므로, PWA가 오프라인
 * 상태로 full reload되면 'offline' 이벤트가 오지 않아 앱이 온라인으로 착각한다(배너 미표시·쿼리
 * 일시정지 안 됨). 그래서 초기 상태를 navigator.onLine으로 한 번 동기화한다.
 * 네이티브에서만 NetInfo를 연결한다 — setEventListener의 cleanup은 onlineManager가 내부 관리한다.
 */
export function initOnlineManager(): void {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      onlineManager.setOnline(navigator.onLine);
    }
    return;
  }
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected);
    }),
  );
}
