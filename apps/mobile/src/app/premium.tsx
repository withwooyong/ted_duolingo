import { PREMIUM_PLANS, type PremiumPlan } from '@ted/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useCancelPremium, usePurchasePremium } from '@/hooks/use-premium';
import { useProfile } from '@/hooks/use-profile';

/** Free vs Premium 비교 (PLAN.md §3.4) */
const COMPARISON = [
  { feature: '하트', free: '5개 · 시간당 충전', premium: '무제한' },
  { feature: '광고', free: '있음', premium: '없음' },
  { feature: '학습 언어', free: '1개', premium: '무제한' },
  { feature: '스트릭 동결', free: '월 1회', premium: '무제한' },
];

/** 페이월 — Free vs Premium 비교 + 구독 (로컬은 mock 결제, 스토어 빌드는 RevenueCat) */
export default function PremiumScreen() {
  const { data: profile } = useProfile();

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-14" contentContainerClassName="pb-10">
      <Text className="text-center text-5xl">⚡</Text>
      <Text className="mt-2 text-center text-2xl font-extrabold">Ted Premium</Text>

      {profile?.isPremium ? <PremiumActive expiresAt={profile.premiumExpiresAt} /> : <Paywall />}

      <Pressable
        className="mt-4 w-full items-center rounded-2xl border-2 border-line py-3 active:opacity-60"
        onPress={() => router.back()}
        testID="premium-close"
      >
        <Text className="text-sm font-bold text-ink-sub">닫기</Text>
      </Pressable>
    </ScrollView>
  );
}

/** 미구독 — 비교 테이블 + 플랜 선택 + 구독 버튼 */
function Paywall() {
  const [planId, setPlanId] = useState<PremiumPlan['id']>('yearly');
  const purchase = usePurchasePremium();
  const plan = PREMIUM_PLANS.find((p) => p.id === planId)!;

  return (
    <View testID="premium-paywall">
      <Text className="mt-1 text-center text-sm font-semibold text-ink-sub">
        하트 걱정 없이, 광고 없이 학습하세요
      </Text>

      {/* 비교 테이블 */}
      <View className="mt-6 overflow-hidden rounded-2xl border-2 border-line">
        <View className="flex-row border-b-2 border-line bg-line/40 px-4 py-2.5">
          <Text className="flex-1 text-xs font-extrabold text-ink-sub"> </Text>
          <Text className="w-28 text-center text-xs font-extrabold text-ink-sub">무료</Text>
          <Text className="w-24 text-center text-xs font-extrabold text-sky-dark">PREMIUM</Text>
        </View>
        {COMPARISON.map((row, i) => (
          <View
            key={row.feature}
            className={`flex-row items-center px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
          >
            <Text className="flex-1 text-sm font-bold">{row.feature}</Text>
            <Text className="w-28 text-center text-xs font-semibold text-ink-sub">{row.free}</Text>
            <Text className="w-24 text-center text-xs font-extrabold text-sky-dark">
              {row.premium}
            </Text>
          </View>
        ))}
      </View>

      {/* 플랜 선택 */}
      <View className="mt-5 flex-row gap-3">
        {PREMIUM_PLANS.map((p) => {
          const active = planId === p.id;
          return (
            <Pressable
              key={p.id}
              className={`flex-1 rounded-2xl border-2 px-4 py-3.5 ${
                active ? 'border-sky bg-sky/10' : 'border-line'
              }`}
              onPress={() => setPlanId(p.id)}
              testID={`plan-${p.id}`}
            >
              <Text className={`text-base font-extrabold ${active ? 'text-sky-dark' : ''}`}>
                {p.label}
              </Text>
              <Text className="mt-1 text-lg font-extrabold">
                ₩{p.priceKrw.toLocaleString('ko-KR')}
              </Text>
              <Text className="mt-0.5 text-[11px] font-semibold text-ink-sub">{p.note}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        className="mt-5 items-center rounded-2xl bg-sky py-4 active:opacity-80 disabled:opacity-40"
        onPress={() => purchase.mutate(plan)}
        disabled={purchase.isPending}
        testID="premium-purchase"
      >
        <Text className="text-base font-extrabold uppercase text-white">
          {purchase.isPending ? '결제 중...' : `${plan.label} 구독 시작하기`}
        </Text>
      </Pressable>
      {purchase.isError && (
        <Text className="mt-2 text-center text-xs font-semibold text-danger">
          결제에 실패했어요. 다시 시도해 주세요.
        </Text>
      )}
      <Text className="mt-3 text-center text-[11px] font-semibold text-ink-sub">
        지금은 모의 결제로 동작해요 — 실결제(RevenueCat/IAP)는 스토어 빌드에서 활성화됩니다
      </Text>
    </View>
  );
}

/** 구독 중 — 상태·만료일 + 해지 */
function PremiumActive({ expiresAt }: { expiresAt: string | null }) {
  const cancel = useCancelPremium();
  const until = expiresAt
    ? new Date(expiresAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <View className="items-center" testID="premium-active">
      <View className="mt-4 rounded-full bg-sky px-4 py-1.5">
        <Text className="text-sm font-extrabold text-white">⚡ PREMIUM 구독 중</Text>
      </View>
      {until && (
        <Text className="mt-3 text-sm font-semibold text-ink-sub" testID="premium-expires">
          {until}까지 이용 가능
        </Text>
      )}

      <View className="mt-6 w-full gap-2.5">
        {['❤️ 무제한 하트', '🚫 광고 없음', '🌍 학습 언어 무제한'].map((benefit) => (
          <View key={benefit} className="rounded-2xl border-2 border-line px-4 py-3">
            <Text className="text-sm font-bold">{benefit}</Text>
          </View>
        ))}
      </View>

      <Pressable
        className="mt-6 w-full items-center rounded-2xl border-2 border-line py-3 active:opacity-60 disabled:opacity-40"
        onPress={() => cancel.mutate()}
        disabled={cancel.isPending}
        testID="premium-cancel"
      >
        <Text className="text-sm font-bold text-danger">
          {cancel.isPending ? '해지 중...' : '구독 해지 (모의)'}
        </Text>
      </Pressable>
    </View>
  );
}
