import type { OrderWordsPayload } from '@ted/shared';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { shuffled } from './checkers';

interface Props {
  payload: OrderWordsPayload;
  onChange: (answer: string | null) => void;
  disabled?: boolean;
}

/** 단어 배열 — 단어 칩을 탭해 문장 구성, 다시 탭하면 되돌림 */
export function OrderWords({ payload, onChange, disabled }: Props) {
  // 같은 단어 중복 대비 인덱스 키 사용
  const bank = useMemo(
    () => shuffled(payload.words.map((word, i) => ({ word, key: i }))),
    [payload],
  );
  const [chosen, setChosen] = useState<{ word: string; key: number }[]>([]);
  const usedKeys = useMemo(() => new Set(chosen.map((c) => c.key)), [chosen]);

  const update = (next: { word: string; key: number }[]) => {
    setChosen(next);
    onChange(next.length > 0 ? next.map((c) => c.word).join(' ') : null);
  };

  return (
    <View>
      <View className="mb-8 min-h-[56px] flex-row flex-wrap gap-2 border-b-2 border-t-2 border-line py-2.5">
        {chosen.map((c, i) => (
          <Pressable
            key={c.key}
            className="rounded-2xl border-2 border-line bg-white px-4 py-2"
            onPress={() => update(chosen.filter((_, idx) => idx !== i))}
            disabled={disabled}
            testID={`answer-word-${c.word}`}
          >
            <Text className="text-base font-bold">{c.word}</Text>
          </Pressable>
        ))}
      </View>
      <View className="flex-row flex-wrap justify-center gap-2.5">
        {bank.map((c) => (
          <Pressable
            key={c.key}
            className={`rounded-2xl border-2 border-line bg-white px-4 py-2.5 ${
              usedKeys.has(c.key) ? 'opacity-0' : ''
            }`}
            onPress={() => update([...chosen, c])}
            disabled={disabled || usedKeys.has(c.key)}
            testID={`bank-word-${c.word}`}
          >
            <Text className="text-base font-bold">{c.word}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
