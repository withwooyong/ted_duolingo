import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  /** 최초 getSession() 완료 전 true — 이 동안은 스플래시 유지 */
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  signOut: async () => {
    await supabase.auth.signOut();
  },
}));

/** 루트 레이아웃에서 1회 호출 — 구독 해제 함수를 반환 */
export function initAuthListener(): () => void {
  supabase.auth.getSession().then(({ data }) => {
    useAuth.setState({ session: data.session, isLoading: false });
  });
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.setState({ session, isLoading: false });
  });
  return () => data.subscription.unsubscribe();
}
