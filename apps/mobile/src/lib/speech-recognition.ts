/**
 * STT 추상화 — 발음 따라하기(SHADOW_SPEAK) 채점용 음성 인식.
 *
 * - 웹: Web Speech API(`SpeechRecognition`/`webkitSpeechRecognition`) 실연동.
 * - 네이티브: STT 네이티브 모듈은 EAS 커스텀 빌드가 필요(클라우드 전환 항목, HANDOFF 참조).
 *   현재 Expo Go에는 없으므로 `createShadowRecognizer`가 null을 돌려주고,
 *   컴포넌트는 "들어보고 직접 확인" fallback으로 진행한다.
 *   EAS 빌드 시 아래 네이티브 분기에 `@react-native-voice/voice`(또는
 *   `expo-speech-recognition`)를 연결하면 동일 인터페이스로 동작한다.
 *
 * e2e(웹)는 `window.__mockShadowTranscript`에 문자열을 넣어 인식 결과를 주입한다
 * (Playwright는 실제 마이크 입력을 줄 수 없으므로).
 */
import { Platform } from 'react-native';

/** 인식 세션 핸들 — 컴포넌트가 start/stop으로 제어 */
export interface ShadowRecognizer {
  start: () => void;
  stop: () => void;
}

export interface RecognitionHandlers {
  /** 최종 인식 결과(transcript) 전달 */
  onResult: (transcript: string) => void;
  /** 인식 실패 — 사용자에게 표시할 사유 */
  onError: (message: string) => void;
}

/* Web Speech API 최소 타입 (lib.dom에 없을 수 있어 직접 선언) */
interface SpeechRecognitionResultLike {
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  results: { 0: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechWindow {
  __mockShadowTranscript?: string;
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

function speechWindow(): SpeechWindow | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return window as unknown as SpeechWindow;
}

/** 현재 플랫폼에서 STT가 가능한가 (웹 Web Speech API 또는 e2e mock) */
export function isSttSupported(): boolean {
  const w = speechWindow();
  if (!w) return false;
  return (
    typeof w.__mockShadowTranscript === 'string' ||
    !!(w.SpeechRecognition ?? w.webkitSpeechRecognition)
  );
}

/**
 * 인식 세션 생성. STT를 못 쓰는 환경(네이티브 Expo Go / 미지원 브라우저)이면 null.
 * @param locale BCP-47 로케일 (예: 'en-US') — SPEECH_LOCALES에서 가져온다
 */
export function createShadowRecognizer(
  locale: string,
  handlers: RecognitionHandlers,
): ShadowRecognizer | null {
  const w = speechWindow();
  if (!w) return null; // 네이티브 EAS 슬롯

  // e2e: 주입된 transcript를 실제 인식처럼 약간의 지연 후 반환
  if (typeof w.__mockShadowTranscript === 'string') {
    const transcript = w.__mockShadowTranscript;
    let timer: ReturnType<typeof setTimeout> | undefined;
    return {
      start: () => {
        timer = setTimeout(() => handlers.onResult(transcript), 150);
      },
      stop: () => {
        if (timer) clearTimeout(timer);
      },
    };
  }

  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = locale;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => handlers.onResult(e.results[0][0].transcript ?? '');
  rec.onerror = (e) => handlers.onError(e.error ?? 'recognition-error');
  return {
    start: () => rec.start(),
    stop: () => rec.stop(),
  };
}
