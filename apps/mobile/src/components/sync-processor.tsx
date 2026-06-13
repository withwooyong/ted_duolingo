/**
 * 오프라인 레슨 큐 드레인(D22) — 온라인이고 대기 항목이 있으면 FIFO로 재실행한다.
 * 렌더 없는 부수효과 컴포넌트로 루트 레이아웃(QueryClientProvider 내부)에 마운트한다.
 *
 * 각 항목 사이에 fresh profile을 다시 받는 이유: completeLessonWrite는 XP·하트·스트릭을
 * read-modify-write 하므로, 직전 항목이 서버에 쓴 값을 다음 항목이 그대로 이어받아야 한다.
 * 멱등성(progressId 중복 skip)은 completeLessonWrite가 보장하므로 중복 트리거에도 안전하다.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useOnline } from '@/hooks/use-online';
import { fetchProfileDto } from '@/hooks/use-profile';
import { completeLessonWrite } from '@/lib/learning-writes';
import { pendingForUser, useSyncQueue } from '@/lib/sync-queue';
import { useAuth } from '@/stores/auth';

const INVALIDATE_KEYS = [
  ['profile'],
  ['skill-tree'],
  ['daily-xp'],
  ['league'],
  ['badges'],
  ['lessons-done'],
  ['review-count'],
] as const;

export function SyncProcessor() {
  const userId = useAuth((s) => s.session?.user.id ?? null);
  const online = useOnline();
  const items = useSyncQueue((s) => s.items);
  const remove = useSyncQueue((s) => s.remove);
  const queryClient = useQueryClient();
  const processingRef = useRef(false);

  useEffect(() => {
    if (!userId || !online || processingRef.current) return;
    const pending = pendingForUser(items, userId);
    if (pending.length === 0) return;

    processingRef.current = true;
    let drainedAny = false;
    (async () => {
      try {
        let profile = await fetchProfileDto(userId);
        for (const item of pending) {
          await completeLessonWrite({
            userId,
            profile,
            input: item.input,
            heartsLost: item.heartsLost,
            completedAt: item.completedAt,
            progressId: item.id,
          });
          remove(item.id);
          drainedAny = true;
          // 다음 항목은 방금 쓴 서버 상태를 이어받아야 한다
          profile = await fetchProfileDto(userId);
        }
      } catch {
        // 실패 항목은 큐에 남겨 다음 트리거(온라인/항목 변동)에 재시도
      } finally {
        processingRef.current = false;
        // 낙관적 캐시를 서버 실제값으로 보정
        if (drainedAny) {
          for (const key of INVALIDATE_KEYS) {
            queryClient.invalidateQueries({ queryKey: [...key] });
          }
        }
      }
    })();
  }, [userId, online, items, remove, queryClient]);

  return null;
}
