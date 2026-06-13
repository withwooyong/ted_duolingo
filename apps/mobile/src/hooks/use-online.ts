import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/**
 * 현재 온라인 여부 (D21). onlineManager를 단일 진실 원천으로 구독해
 * 쿼리 일시정지와 동일한 신호를 UI가 공유한다. use-game.ts의 useNow()와 같은
 * useSyncExternalStore 패턴 — 렌더 중 불순 호출 없이 React Compiler 규칙을 지킨다.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true, // SSR/서버 스냅샷: 온라인 가정
  );
}
