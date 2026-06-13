import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, type Query } from '@tanstack/react-query';

/**
 * 오프라인 읽기 캐시(D21) — QueryClient를 모듈로 분리해 persist 설정을 한곳에 모은다.
 * gcTime을 24h로 늘려야 persist 복원 대상이 된다(기본 5분이면 앱을 잠깐만 닫아도 빈 화면).
 */
const DAY = 1000 * 60 * 60 * 24;

export const CACHE_MAX_AGE = DAY;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: CACHE_MAX_AGE,
      staleTime: 1000 * 60 * 5, // 5분 — 온라인 복귀 시 refetchOnReconnect로 곧 갱신
      refetchOnReconnect: true,
      // networkMode 기본('online') 유지 — 오프라인에선 쿼리 일시정지 후 캐시 표시
    },
  },
});

/** persister storage 키 prefix — 사용자별 캐시를 물리적으로 분리한다(키에 userId 포함). */
const CACHE_KEY_PREFIX = 'ted-rq-cache:';

/**
 * 캐시 데이터 "모양" 버전. SkillTree·Profile 등 캐시되는 DTO 구조가 바뀌면 올린다.
 * 올리면 PersistQueryClientProvider가 구버전 dehydrated 캐시를 전부 폐기해 stale shape 크래시를 막는다.
 */
export const CACHE_BUSTER = 'v1';

/** 사용자별 AsyncStorage persister 생성 (storage 키에 userId를 넣어 사용자 간 캐시 격리). */
export function makePersister(userId: string) {
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: CACHE_KEY_PREFIX + userId,
    throttleTime: 1000,
  });
}

/** 직전 사용자의 persist 캐시를 AsyncStorage에서 제거 (로그아웃·사용자 전환 시). */
export async function removePersistedCache(userId: string): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY_PREFIX + userId);
}

/**
 * persist 대상 선별. 시각·주간 마감 의존 수치는 stale 캐시가 "자신 있게 틀린 값"을 보여줄 수 있어 제외하고,
 * 콘텐츠 스냅샷(스킬트리·레슨·문제·프로필 등)만 영속한다.
 */
const EXCLUDED_QUERY_ROOTS = new Set([
  'review-session', // 매번 새로 조회(gcTime:0) — 진행 중 세션을 stale 복원하면 안 됨
  'league', // 주간 마감·승급 로직과 얽혀 오래된 순위가 오해를 부름
  'review-count', // due_at <= now 시각 의존 — 캐시가 금세 부정확
]);

export function shouldDehydrateQuery(query: Query): boolean {
  if (query.gcTime === 0) return false;
  const root = query.queryKey[0];
  return typeof root === 'string' ? !EXCLUDED_QUERY_ROOTS.has(root) : true;
}
