import {
  SHADOW_PASS_RATIO,
  SPEECH_LOCALES,
  scoreShadowing,
  type ShadowSpeakPayload,
} from '@ted/shared';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  createShadowRecognizer,
  isSttSupported,
  type ShadowRecognizer,
} from '@/lib/speech-recognition';

interface Props {
  payload: ShadowSpeakPayload;
  /** 학습어 코드 (TTS·STT 로케일 — 예: 'en' → en-US) */
  targetLang: string;
  value: string | null;
  onChange: (transcript: string) => void;
  disabled?: boolean;
}

/**
 * Web Speech API 에러 코드를 사용자용 안내 문구로 변환.
 * 코드는 SpeechRecognitionErrorEvent.error (https://wicg.github.io/speech-api/).
 */
function sttErrorMessage(reason: string): string {
  switch (reason) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '마이크 권한이 막혀 있어요. 주소창의 마이크 아이콘에서 허용해 주세요.';
    case 'network':
      return '음성 인식 서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.';
    case 'audio-capture':
      return '마이크를 찾을 수 없어요. 입력 장치를 확인해 주세요.';
    case 'no-speech':
      return '말소리가 안 들렸어요. 버튼을 누르고 또렷하게 말해 주세요.';
    case 'aborted':
      return '음성 인식이 중단됐어요. 다시 시도해 주세요.';
    default:
      return '잘 안 들렸어요. 다시 시도해 주세요.';
  }
}

/**
 * 발음 따라하기 — 문장을 TTS로 들려주고, 사용자가 따라 말하면 STT로 채점한다.
 * STT 미지원 환경(네이티브 Expo Go 등)에서는 "직접 확인" fallback으로 진행 (lib/speech-recognition 참조).
 */
export function ShadowSpeak({ payload, targetLang, value, onChange, disabled }: Props) {
  const locale = SPEECH_LOCALES[targetLang] ?? 'en-US';
  const supported = isSttSupported();

  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<ShadowRecognizer | null>(null);

  const speak = () => {
    Speech.stop();
    Speech.speak(payload.text, { language: locale, rate: 0.9 });
  };

  // 마운트 시 참조 문장을 한 번 재생 (문제별 key로 remount되므로 상태는 자동 초기화).
  useEffect(() => {
    const timer = setTimeout(speak, 400);
    return () => {
      clearTimeout(timer);
      Speech.stop();
      recRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listen = () => {
    setError(null);
    Speech.stop();
    const rec = createShadowRecognizer(locale, {
      onResult: (transcript) => {
        setListening(false);
        onChange(transcript);
      },
      onError: (reason) => {
        setListening(false);
        setError(sttErrorMessage(reason));
      },
    });
    if (!rec) {
      setError('이 환경에서는 음성 인식을 쓸 수 없어요.');
      return;
    }
    recRef.current = rec;
    setListening(true);
    // start()는 미허용·이미 시작됨 등에서 동기적으로 throw할 수 있다.
    try {
      rec.start();
    } catch {
      setListening(false);
      setError(sttErrorMessage('not-allowed'));
    }
  };

  const score = value !== null ? scoreShadowing(payload.text, value) : null;
  const passed = score !== null && score >= SHADOW_PASS_RATIO;

  return (
    <View>
      {/* 따라 말할 문장 + TTS 재생 */}
      <Pressable
        className="mb-2 flex-row items-center justify-center gap-3 rounded-3xl bg-sky/15 px-5 py-6 active:opacity-80"
        onPress={speak}
        testID="shadow-speaker"
      >
        <Text className="text-3xl">🔊</Text>
        <Text className="flex-1 text-2xl font-extrabold leading-8">{payload.text}</Text>
      </Pressable>
      {payload.meaning ? (
        <Text className="mb-6 text-center text-base text-ink-sub">{payload.meaning}</Text>
      ) : (
        <View className="mb-6" />
      )}

      {/* 녹음 버튼 (STT 지원 시) 또는 직접 확인 fallback */}
      {supported ? (
        <Pressable
          className={`mx-auto h-24 w-24 items-center justify-center rounded-full active:opacity-80 ${
            listening ? 'bg-danger' : 'bg-brand'
          } disabled:opacity-40`}
          onPress={listen}
          disabled={disabled || listening}
          testID="shadow-mic"
        >
          <Text className="text-4xl">{listening ? '👂' : '🎤'}</Text>
        </Pressable>
      ) : (
        <View className="items-center">
          <Pressable
            className="rounded-2xl border-2 border-line bg-white px-6 py-4 active:opacity-80 disabled:opacity-40"
            onPress={() => onChange(payload.text)}
            disabled={disabled}
            testID="shadow-confirm"
          >
            <Text className="text-base font-extrabold">🗣️ 따라 말했어요</Text>
          </Pressable>
          <Text className="mt-3 px-6 text-center text-sm text-ink-sub">
            음성 인식은 앱 빌드에서 지원돼요. 지금은 직접 확인으로 진행합니다.
          </Text>
        </View>
      )}

      <Text className="mt-4 text-center text-sm text-ink-sub">
        {listening ? '듣고 있어요…' : '버튼을 누르고 위 문장을 따라 말하세요'}
      </Text>

      {/* 인식 결과 + 점수 */}
      {value !== null && (
        <View className="mt-5 rounded-2xl border-2 border-line p-4" testID="shadow-result">
          <Text className="mb-1 text-xs font-extrabold uppercase text-grape">인식 결과</Text>
          <Text className="mb-2 text-base font-bold">{value || '(인식된 말이 없어요)'}</Text>
          <Text className={`text-sm font-extrabold ${passed ? 'text-brand' : 'text-danger'}`}>
            일치율 {Math.round((score ?? 0) * 100)}% {passed ? '· 좋아요!' : '· 다시 한 번!'}
          </Text>
        </View>
      )}

      {error && <Text className="mt-4 text-center text-sm text-danger">{error}</Text>}
    </View>
  );
}
