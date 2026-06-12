/**
 * 레슨 완료 컨페티 연출 — Reanimated 기반 (네이티브·웹 공통).
 * Lottie 디자이너 에셋 확보 시 lottie-react-native로 교체 예정 (PLAN.md Phase 2).
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const EMOJIS = ['🎉', '🎊', '⭐', '✨', '💛', '💙'];
const FALL_DISTANCE = 480;

/** index 기반 고정 의사 난수 (렌더 중 Math.random 금지 — React Compiler 규칙) */
function seedOf(index: number): number {
  return ((index * 9301 + 49297) % 233280) / 233280;
}

function ConfettiPiece({ index }: { index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 70,
      withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }),
    );
  }, [index, progress]);

  const seed = seedOf(index);
  const drift = (seed - 0.5) * 120;
  const spin = 540 * (seed > 0.5 ? 1 : -1);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateY: progress.value * FALL_DISTANCE },
      { translateX: drift * progress.value },
      { rotate: `${spin * progress.value}deg` },
    ],
  }));

  return (
    <Animated.Text
      style={[styles.piece, { left: `${4 + seed * 88}%`, fontSize: 18 + seed * 10 }, animatedStyle]}
    >
      {EMOJIS[index % EMOJIS.length]}
    </Animated.Text>
  );
}

/** 화면 상단에서 떨어지는 컨페티 (터치 통과) */
export function Confetti({ count = 14 }: { count?: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, i) => (
        <ConfettiPiece key={i} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: -24 },
});
