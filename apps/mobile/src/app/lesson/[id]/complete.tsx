import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AdBanner } from '@/components/ad-banner';
import { Confetti } from '@/components/confetti';

interface EarnedBadgeParam {
  icon: string;
  title: string;
}

/** 레슨 완료 — 컨페티 연출 + XP·정확도·스트릭 카드 + 새 배지 */
export default function LessonCompleteScreen() {
  const { xp, correct, total, streak, badges, pending } = useLocalSearchParams<{
    xp: string;
    correct: string;
    total: string;
    streak: string;
    /** JSON: {icon,title}[] — 이번 완료로 새로 획득한 배지 */
    badges?: string;
    /** '1'이면 오프라인 완료 — 연결 시 동기화 대기 (D22) */
    pending?: string;
  }>();
  const accuracy = Math.round((Number(correct) / Math.max(1, Number(total))) * 100);
  const perfect = correct === total;

  let newBadges: EarnedBadgeParam[] = [];
  try {
    newBadges = badges ? (JSON.parse(badges) as EarnedBadgeParam[]) : [];
  } catch {
    // 파라미터 파싱 실패는 연출 생략으로 충분
  }

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Confetti />

      <Reveal delay={0} effect="pop">
        <Text className="text-7xl">🎉</Text>
      </Reveal>
      <Reveal delay={200}>
        <Text className="mt-4 text-2xl font-extrabold text-gold" testID="complete-title">
          {perfect ? '퍼펙트! 레슨 완료!' : '레슨 완료!'}
        </Text>
      </Reveal>

      <View className="mt-8 flex-row gap-3">
        <RewardCard delay={350} label="획득 XP" value={`+${xp}`} color="gold" testID="reward-xp" />
        <RewardCard delay={500} label="정확도" value={`${accuracy}%`} color="brand" />
        <RewardCard delay={650} label="스트릭" value={`🔥 ${streak}`} color="orange" />
      </View>

      {newBadges.length > 0 && (
        <Reveal delay={800} className="w-full">
          <View
            className="mt-8 w-full items-center rounded-2xl border-2 border-gold bg-gold/10 px-4 py-3"
            testID="new-badges"
          >
            <Text className="text-xs font-extrabold uppercase text-gold">새 배지 획득!</Text>
            <View className="mt-1.5 flex-row flex-wrap justify-center gap-3">
              {newBadges.map((b) => (
                <Text key={b.title} className="text-sm font-extrabold">
                  {b.icon} {b.title}
                </Text>
              ))}
            </View>
          </View>
        </Reveal>
      )}

      {pending === '1' && (
        <Reveal delay={850} className="w-full">
          <View
            className="mt-6 w-full items-center rounded-2xl border-2 border-ink/20 bg-ink/5 px-4 py-3"
            testID="offline-pending-note"
          >
            <Text className="text-center text-sm font-extrabold text-ink-sub">
              📡 오프라인에서 완료했어요. 연결되면 자동으로 저장돼요.
            </Text>
          </View>
        </Reveal>
      )}

      {/* 무료 사용자 광고 자리 (Premium은 미표시) — PLAN.md §3.4 */}
      <Reveal delay={900} className="w-full">
        <AdBanner />
      </Reveal>

      <Pressable
        className="mt-8 w-full items-center rounded-2xl bg-brand py-4 active:opacity-80"
        onPress={() => router.dismissTo('/(tabs)')}
        testID="complete-continue"
      >
        <Text className="text-base font-extrabold uppercase text-white">계속하기</Text>
      </Pressable>
    </View>
  );
}

/**
 * 등장 연출 — shared value 직접 구동.
 * (Reanimated entering 프리셋은 웹에서 동작하지 않아 사용하지 않는다)
 */
function Reveal({
  delay,
  effect = 'rise',
  className,
  children,
}: {
  delay: number;
  /** rise: 아래에서 떠오름, pop: 작게 시작해 커짐 */
  effect?: 'rise' | 'pop';
  className?: string;
  children: ReactNode;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.5)) }),
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value),
    transform:
      effect === 'pop'
        ? [{ scale: 0.3 + progress.value * 0.7 }]
        : [{ translateY: (1 - progress.value) * 16 }],
  }));

  return (
    <Animated.View style={animatedStyle} className={className}>
      {children}
    </Animated.View>
  );
}

const CARD_COLORS = {
  gold: { border: 'border-gold', bg: 'bg-gold', text: 'text-gold' },
  brand: { border: 'border-brand', bg: 'bg-brand', text: 'text-brand-dark' },
  orange: { border: 'border-orange-400', bg: 'bg-orange-400', text: 'text-orange-400' },
} as const;

function RewardCard({
  delay,
  label,
  value,
  color,
  testID,
}: {
  delay: number;
  label: string;
  value: string;
  color: keyof typeof CARD_COLORS;
  testID?: string;
}) {
  const c = CARD_COLORS[color];
  return (
    <Reveal delay={delay}>
      <View className={`w-28 overflow-hidden rounded-2xl border-2 ${c.border}`}>
        <Text className={`${c.bg} py-1.5 text-center text-xs font-extrabold uppercase text-white`}>
          {label}
        </Text>
        <Text className={`py-3 text-center text-xl font-extrabold ${c.text}`} testID={testID}>
          {value}
        </Text>
      </View>
    </Reveal>
  );
}
