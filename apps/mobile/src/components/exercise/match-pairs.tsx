import type { MatchPairsPayload } from '@ted/shared';
import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { shuffled } from './checkers';

interface Props {
  payload: MatchPairsPayload;
  /** 모든 쌍 매칭 완료 시 호출 (자동 제출 — 확인 버튼 없음) */
  onComplete: () => void;
}

type Side = 'ko' | 'en';

interface Card {
  key: string;
  text: string;
  pairIndex: number;
  side: Side;
}

/**
 * 짝 맞추기 — 왼쪽(한국어)·오른쪽(영어) 두 열에서 각 한 장씩 골라 매칭.
 * 같은 열의 다른 카드를 누르면 오답이 아니라 선택만 옮겨가고,
 * 서로 다른 열을 골랐을 때만 정/오답을 판정한다. 오답은 흔들림 표시 후 해제.
 */
export function MatchPairs({ payload, onComplete }: Props) {
  // 열별로 독립 셔플 — 같은 행에 정답이 나란히 놓이지 않게 한다.
  const { koCards, enCards } = useMemo(() => {
    const ko = payload.pairs.map<Card>(([text], pairIndex) => ({
      key: `ko-${pairIndex}`,
      text,
      pairIndex,
      side: 'ko',
    }));
    const en = payload.pairs.map<Card>(([, text], pairIndex) => ({
      key: `en-${pairIndex}`,
      text,
      pairIndex,
      side: 'en',
    }));
    return { koCards: shuffled(ko), enCards: shuffled(en) };
  }, [payload]);

  const [picked, setPicked] = useState<Card | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<Set<string>>(new Set());
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tap = (card: Card) => {
    if (matched.has(card.pairIndex)) return;
    // 같은 카드 재탭 → 선택 해제
    if (picked?.key === card.key) {
      setPicked(null);
      return;
    }
    // 첫 선택이거나 같은 열을 다시 고르면 선택만 이동 (오답 아님)
    if (!picked || picked.side === card.side) {
      setPicked(card);
      return;
    }
    // 서로 다른 열 → 매칭 판정
    setPicked(null);
    if (picked.pairIndex === card.pairIndex) {
      const next = new Set(matched);
      next.add(card.pairIndex);
      setMatched(next);
      if (next.size === payload.pairs.length) setTimeout(onComplete, 350);
    } else {
      setWrongPair(new Set([picked.key, card.key]));
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setWrongPair(new Set()), 400);
    }
  };

  const renderColumn = (cards: Card[]) => (
    <View className="w-[48%]">
      {cards.map((card) => {
        const isMatched = matched.has(card.pairIndex);
        const isPicked = picked?.key === card.key;
        const isWrong = wrongPair.has(card.key);
        return (
          <Pressable
            key={card.key}
            className={`mb-2.5 rounded-2xl border-2 px-2 py-4 ${
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

  return (
    <View className="flex-row justify-between">
      {renderColumn(koCards)}
      {renderColumn(enCards)}
    </View>
  );
}
