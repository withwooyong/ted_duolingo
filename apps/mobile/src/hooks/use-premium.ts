/**
 * 구독 결제 — 로컬/Expo Go에서는 mock 결제(즉시 성공)로 동작한다.
 * 클라우드 전환 + EAS 빌드 시 mutationFn 내부를 RevenueCat 호출로 교체하고,
 * is_premium 갱신은 RevenueCat 웹훅 → Edge Function으로 이전한다 (PLAN.md Phase 3).
 */
import { premiumExpiryDate, type PremiumPlan } from '@ted/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

/** 플랜 구독 (mock) — 결제 성공으로 간주하고 프로필에 만료일과 함께 기록 */
export function usePurchasePremium() {
  const session = useAuth((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: PremiumPlan) => {
      const expiresAt = premiumExpiryDate(new Date(), plan.months);
      const { error } = await supabase
        .from('profiles')
        .update({ is_premium: true, premium_expires_at: expiresAt.toISOString() })
        .eq('id', session!.user.id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });
}

/** 구독 해지 (mock) — 실서비스에서는 스토어 구독 관리로 안내, 만료일까지 유지가 원칙 */
export function useCancelPremium() {
  const session = useAuth((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_premium: false, premium_expires_at: null })
        .eq('id', session!.user.id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });
}
