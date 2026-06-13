import { SPEECH_LOCALES, type ListenSelectPayload } from '@ted/shared';
import * as Speech from 'expo-speech';
import { useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { shuffled } from './checkers';
import { OptionRow } from './option-row';

interface Props {
  payload: ListenSelectPayload;
  /** 학습어 코드 (TTS 로케일 선택 — 예: 'en' → en-US) */
  targetLang: string;
  value: string | null;
  onChange: (answer: string) => void;
  disabled?: boolean;
}

/** 듣고 고르기 — TTS로 문장 재생 후 들은 문장 선택 */
export function ListenSelect({ payload, targetLang, value, onChange, disabled }: Props) {
  const options = useMemo(() => shuffled(payload.options), [payload]);

  const speak = () => {
    Speech.stop();
    Speech.speak(payload.audioText, {
      language: SPEECH_LOCALES[targetLang] ?? 'en-US',
      rate: 0.9,
    });
  };

  useEffect(() => {
    const timer = setTimeout(speak, 400);
    return () => {
      clearTimeout(timer);
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  return (
    <View>
      <Pressable
        className="mb-6 h-20 w-20 items-center justify-center self-center rounded-3xl bg-sky active:opacity-80"
        onPress={speak}
        testID="speaker"
      >
        <Text className="text-4xl">🔊</Text>
      </Pressable>
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
