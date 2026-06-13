/**
 * PWA 서비스워커 등록(Web/PWA, 오프라인 full reload 복원).
 * 렌더 없는 부수효과 컴포넌트로 루트 레이아웃에 마운트한다(SyncProcessor와 동일 패턴).
 *
 * production export(`pnpm build:web` 산출물 서빙)에서만 등록한다 — dev(Metro 메모리 서버)는
 * 캐시할 해시 번들이 디스크에 없어 SW가 오작동하기 때문(CLAUDE.md 함정). public/sw.js는
 * export 시 dist/sw.js(오리진 루트)로 복사되어 루트 스코프로 등록된다.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';

export function SwRegister() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 등록 실패는 치명적이지 않다 — 앱은 SW 없이도 온라인에서 정상 동작한다
    });
  }, []);

  return null;
}
