import type { FillBlankPayload } from '@ted/shared';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { shuffled } from './checkers';

interface Props {
  payload: FillBlankPayload;
  value: string | null;
  onChange: (answer: string) => void;
  disabled?: boolean;
}

/** 빈칸 채우기 — 칩 선택으로 빈칸 채움 */
export function FillBlank({ payload, value, onChange, disabled }: Props) {
  const options = useMemo(() => shuffled(payload.options), [payload]);

  return (
    <View>
      <Text className="mb-8 text-xl font-bold leading-9">
        {payload.sentence.map((part, i) =>
          part === null ? (
            <Text
              key={i}
              className={`font-extrabold underline ${value ? 'text-sky-dark' : 'text-ink-sub'}`}
            >
              {value ?? '  ____  '}
            </Text>
          ) : (
            <Text key={i}>{part}</Text>
          ),
        )}
      </Text>
      <View className="flex-row flex-wrap gap-2.5">
        {options.map((opt) => (
          <Pressable
            key={opt}
            className={`rounded-2xl border-2 px-4 py-2.5 ${
              value === opt ? 'border-sky bg-sky/10' : 'border-line bg-white'
            }`}
            onPress={() => onChange(opt)}
            disabled={disabled}
            testID={`chip-${opt}`}
          >
            <Text
              className={`text-base font-bold ${value === opt ? 'text-sky-dark' : 'text-ink'}`}
            >
              {opt}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
