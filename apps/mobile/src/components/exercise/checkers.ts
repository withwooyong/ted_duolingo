import { SHADOW_PASS_RATIO, scoreShadowing, type ExercisePayload } from '@ted/shared';

/**
 * 답안 채점 — 모든 유형의 답안을 문자열로 통일.
 * LISTEN_SELECT/COMPREHENSION_MCQ: 선택한 보기 텍스트
 * FILL_BLANK: 선택한 단어
 * ORDER_WORDS: 공백으로 join한 문장
 * SHADOW_SPEAK: STT 인식 결과(transcript) — 단어 포함률이 임계 이상이면 정답
 * MATCH_PAIRS: 컴포넌트가 완료 시 자동 제출 (항상 정답)
 */
export function checkAnswer(payload: ExercisePayload, answer: string): boolean {
  switch (payload.type) {
    case 'LISTEN_SELECT':
      return answer === payload.options[payload.answerIndex];
    case 'COMPREHENSION_MCQ':
      return answer === payload.options[payload.answerIndex];
    case 'FILL_BLANK':
      return answer === payload.answer;
    case 'ORDER_WORDS':
      return answer === payload.answer;
    case 'SHADOW_SPEAK':
      return scoreShadowing(payload.text, answer) >= SHADOW_PASS_RATIO;
    case 'MATCH_PAIRS':
      return true;
  }
}

/** 정답 텍스트 (오답 피드백 표시용) */
export function correctAnswerText(payload: ExercisePayload): string | null {
  switch (payload.type) {
    case 'LISTEN_SELECT':
    case 'COMPREHENSION_MCQ':
      return payload.options[payload.answerIndex];
    case 'FILL_BLANK':
      return payload.answer;
    case 'ORDER_WORDS':
      return payload.answer;
    case 'SHADOW_SPEAK':
      return payload.text;
    case 'MATCH_PAIRS':
      return null;
  }
}

/** Fisher-Yates 셔플 (원본 보존) — 보기 순서는 표시 시점에 섞는다 */
export function shuffled<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
