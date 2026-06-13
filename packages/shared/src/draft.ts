/**
 * 콘텐츠 드래프트 — AI 생성 + 사람 검수 워크플로의 데이터 형태와 검증 (PLAN.md §3.5).
 * ContentDraft.payload(JSON)가 이 DraftSkill 형태이며, 발행 전 validateDraftSkill을 통과해야 한다.
 */
import { LESSON_MAX_EXERCISES, LESSON_MIN_EXERCISES } from './constants';
import type { ExercisePayload, ExerciseType } from './types';

export interface DraftExercise {
  type: ExerciseType;
  prompt: string;
  payload: ExercisePayload;
  explanation: string;
}

export interface DraftLesson {
  title: string;
  exercises: DraftExercise[];
}

export interface DraftSkill {
  title: string;
  /** 이모지 1개 */
  icon: string;
  description: string;
  lessons: DraftLesson[];
}

/**
 * 드래프트 스킬 검증 — 발행 가능하면 빈 배열, 아니면 오류 메시지 목록.
 * 시드와 같은 규약을 강제한다: LISTEN/MCQ 정답은 options[0] (보기 셔플은 앱 표시 시점).
 */
export function validateDraftSkill(skill: DraftSkill): string[] {
  const errors: string[] = [];

  if (!skill.title?.trim()) errors.push('스킬 제목이 비어 있어요');
  if (!skill.icon?.trim()) errors.push('스킬 아이콘(이모지)이 비어 있어요');
  if (!skill.lessons?.length) {
    errors.push('레슨이 1개 이상 필요해요');
    return errors;
  }

  skill.lessons.forEach((lesson, li) => {
    const where = `레슨 ${li + 1}(${lesson.title || '제목 없음'})`;
    if (!lesson.title?.trim()) errors.push(`${where}: 제목이 비어 있어요`);
    const count = lesson.exercises?.length ?? 0;
    if (count < LESSON_MIN_EXERCISES || count > LESSON_MAX_EXERCISES) {
      errors.push(
        `${where}: 문제 수 ${count}개 — ${LESSON_MIN_EXERCISES}~${LESSON_MAX_EXERCISES}개여야 해요`,
      );
    }
    lesson.exercises?.forEach((ex, ei) => {
      errors.push(...validateExercise(ex, `${where} 문제 ${ei + 1}`));
    });
  });

  return errors;
}

function validateExercise(ex: DraftExercise, where: string): string[] {
  const errors: string[] = [];
  if (!ex.prompt?.trim()) errors.push(`${where}: 지시문이 비어 있어요`);
  if (!ex.payload || ex.payload.type !== ex.type) {
    errors.push(`${where}: payload 유형이 문제 유형(${ex.type})과 달라요`);
    return errors;
  }

  const p = ex.payload;
  switch (p.type) {
    case 'LISTEN_SELECT':
      if (!p.audioText?.trim()) errors.push(`${where}: audioText가 비어 있어요`);
      if ((p.options?.length ?? 0) < 2) errors.push(`${where}: 보기가 2개 이상 필요해요`);
      if (p.answerIndex !== 0) errors.push(`${where}: 정답은 options[0]이어야 해요 (answerIndex=0)`);
      break;
    case 'FILL_BLANK': {
      if (!p.sentence?.some((part) => part === null))
        errors.push(`${where}: 문장에 빈칸(null)이 없어요`);
      if ((p.options?.length ?? 0) < 2) errors.push(`${where}: 보기가 2개 이상 필요해요`);
      if (!p.options?.includes(p.answer)) errors.push(`${where}: 정답이 보기에 없어요`);
      break;
    }
    case 'MATCH_PAIRS':
      if ((p.pairs?.length ?? 0) < 2) errors.push(`${where}: 짝이 2쌍 이상 필요해요`);
      if (p.pairs?.some((pair) => pair.length !== 2 || !pair[0]?.trim() || !pair[1]?.trim()))
        errors.push(`${where}: 빈 짝이 있어요`);
      break;
    case 'ORDER_WORDS': {
      const answerWords = p.answer?.split(' ') ?? [];
      if (answerWords.length < 2) errors.push(`${where}: 정답이 2단어 이상이어야 해요`);
      const bank = [...(p.words ?? [])];
      const missing = answerWords.filter((w) => {
        const idx = bank.indexOf(w);
        if (idx === -1) return true;
        bank.splice(idx, 1); // 중복 단어는 개수까지 맞아야 한다
        return false;
      });
      if (missing.length > 0)
        errors.push(`${where}: 정답 단어가 단어 목록에 없어요 (${missing.join(', ')})`);
      break;
    }
    case 'COMPREHENSION_MCQ':
      if (!p.passage?.trim()) errors.push(`${where}: 지문이 비어 있어요`);
      if (!p.question?.trim()) errors.push(`${where}: 질문이 비어 있어요`);
      if ((p.options?.length ?? 0) < 2) errors.push(`${where}: 보기가 2개 이상 필요해요`);
      if (p.answerIndex !== 0) errors.push(`${where}: 정답은 options[0]이어야 해요 (answerIndex=0)`);
      break;
    case 'SHADOW_SPEAK':
      if (!p.text?.trim()) errors.push(`${where}: 따라 말할 문장(text)이 비어 있어요`);
      break;
  }
  return errors;
}
