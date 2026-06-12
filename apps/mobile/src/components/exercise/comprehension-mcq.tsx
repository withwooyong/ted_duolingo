import type { ComprehensionMcqPayload } from '@ted/shared';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { shuffled } from './checkers';
import { OptionRow } from './option-row';

interface Props {
  payload: ComprehensionMcqPayload;
  value: string | null;
  onChange: (answer: string) => void;
  disabled?: boolean;
}

/** 독해 객관식 — 지문(대화) 읽고 질문에 답하기 */
export function ComprehensionMcq({ payload, value, onChange, disabled }: Props) {
  const options = useMemo(() => shuffled(payload.options), [payload]);

  return (
    <View>
      <View className="mb-4 rounded-2xl border-2 border-line bg-paper px-4 py-3.5">
        <Text className="text-base leading-7">{payload.passage}</Text>
      </View>
      <Text className="mb-3 text-base font-extrabold">{payload.question}</Text>
      {options.map((opt, i) => (
        <OptionRow
          key={opt}
          index={i}
          label={opt}
          selected={value === opt}
          disabled={disabled}
          onPress={() => onChange(opt)}
        />
      ))}
    </View>
  );
}
