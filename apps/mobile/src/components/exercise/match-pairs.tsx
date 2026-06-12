import type { MatchPairsPayload } from '@ted/shared';
import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { shuffled } from './checkers';

interface Props {
  payload: MatchPairsPayload;
  /** 모든 쌍 매칭 완료 시 호출 (자동 제출 — 확인 버튼 없음) */
  onComplete: () => void;
}

interface Card {
  key: string;
  text: string;
  pairIndex: number;
}

/** 짝 맞추기 — 두 카드 탭으로 매칭, 오답은 흔들림 표시 후 해제 */
export function MatchPairs({ payload, onComplete }: Props) {
  const cards = useMemo<Card[]>(
    () =>
      shuffled(
        payload.pairs.flatMap(([ko, en], pairIndex) => [
          { key: `ko-${pairIndex}`, text: ko, pairIndex },
          { key: `en-${pairIndex}`, text: en, pairIndex },
        ]),
      ),
    [payload],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<Set<string>>(new Set());
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tap = (card: Card) => {
    if (matched.has(card.pairIndex)) return;
    if (picked === card.key) {
      setPicked(null);
      return;
    }
    if (!picked) {
      setPicked(card.key);
      return;
    }
    const prev = cards.find((c) => c.key === picked)!;
    setPicked(null);
    if (prev.pairIndex === card.pairIndex) {
      const next = new Set(matched);
      next.add(card.pairIndex);
      setMatched(next);
      if (next.size === payload.pairs.length) setTimeout(onComplete, 350);
    } else {
      setWrongPair(new Set([prev.key, card.key]));
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setWrongPair(new Set()), 400);
    }
  };

  return (
    <View className="flex-row flex-wrap justify-between">
      {cards.map((card) => {
        const isMatched = matched.has(card.pairIndex);
        const isPicked = picked === card.key;
        const isWrong = wrongPair.has(card.key);
        return (
          <Pressable
            key={card.key}
            className={`mb-2.5 w-[48%] rounded-2xl border-2 px-2 py-4 ${
              isMatched
                ? 'border-brand bg-brand-light opacity-60'
                : isWrong
                  ? 'border-danger bg-danger-light'
                  : isPicked
                    ? 'border-sky bg-sky/10'
                    : 'border-line bg-white'
            }`}
            onPress={() => tap(card)}
            disabled={isMatched}
            testID={`match-${card.key}`}
          >
            <Text
              className={`text-center text-base font-bold ${
                isMatched ? 'text-brand-dark' : isPicked ? 'text-sky-dark' : 'text-ink'
              }`}
            >
              {card.text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
