import { describe, expect, it } from 'vitest';

import { validateDraftSkill, type DraftExercise, type DraftSkill } from './draft';

const listen = (over: Partial<DraftExercise['payload']> = {}): DraftExercise => ({
  type: 'LISTEN_SELECT',
  prompt: '들리는 문장을 선택하세요',
  payload: {
    type: 'LISTEN_SELECT',
    audioText: 'Hello.',
    options: ['Hello.', 'Bye.', 'Hi.'],
    answerIndex: 0,
    ...over,
  } as DraftExercise['payload'],
  explanation: '인사예요.',
});

const fill = (): DraftExercise => ({
  type: 'FILL_BLANK',
  prompt: '빈칸을 채우세요',
  payload: { type: 'FILL_BLANK', sentence: ['Good ', null, '!'], options: ['morning', 'night'], answer: 'morning' },
  explanation: '아침 인사예요.',
});

const match = (): DraftExercise => ({
  type: 'MATCH_PAIRS',
  prompt: '짝을 맞추세요',
  payload: { type: 'MATCH_PAIRS', pairs: [['안녕', 'hello'], ['고마워', 'thanks']] },
  explanation: '기본 표현이에요.',
});

const order = (): DraftExercise => ({
  type: 'ORDER_WORDS',
  prompt: '"만나서 반가워"를 영어로 만드세요',
  payload: { type: 'ORDER_WORDS', words: ['Nice', 'to', 'meet', 'you', 'go'], answer: 'Nice to meet you' },
  explanation: '첫 인사예요.',
});

const mcq = (): DraftExercise => ({
  type: 'COMPREHENSION_MCQ',
  prompt: '읽고 답하세요',
  payload: {
    type: 'COMPREHENSION_MCQ',
    passage: 'A: Hello!\nB: Hi!',
    question: '둘은 무엇을 하나요?',
    options: ['인사한다', '주문한다'],
    answerIndex: 0,
  },
  explanation: '인사 장면이에요.',
});

const validSkill = (): DraftSkill => ({
  title: '쇼핑',
  icon: '🛍️',
  description: '쇼핑 표현',
  lessons: [{ title: '가격 묻기', exercises: [listen(), fill(), match(), order(), mcq()] }],
});

describe('validateDraftSkill', () => {
  it('유효한 드래프트는 오류 없음', () => {
    expect(validateDraftSkill(validSkill())).toEqual([]);
  });

  it('레슨 없음·빈 제목 검출', () => {
    expect(validateDraftSkill({ ...validSkill(), lessons: [] })).toContainEqual(
      expect.stringContaining('레슨이 1개 이상'),
    );
    expect(validateDraftSkill({ ...validSkill(), title: ' ' })).toContainEqual(
      expect.stringContaining('스킬 제목'),
    );
  });

  it('문제 수 5~8개 강제', () => {
    const s = validSkill();
    s.lessons[0].exercises = [listen(), fill(), match(), order()]; // 4개
    expect(validateDraftSkill(s).some((e) => e.includes('문제 수 4개'))).toBe(true);
  });

  it('LISTEN/MCQ 정답은 options[0] 규약 강제', () => {
    const s = validSkill();
    s.lessons[0].exercises[0] = listen({ answerIndex: 1 } as never);
    expect(validateDraftSkill(s).some((e) => e.includes('answerIndex=0'))).toBe(true);
  });

  it('payload 유형 불일치 검출', () => {
    const s = validSkill();
    s.lessons[0].exercises[0] = { ...listen(), type: 'FILL_BLANK' };
    expect(validateDraftSkill(s).some((e) => e.includes('payload 유형'))).toBe(true);
  });

  it('FILL_BLANK 정답이 보기에 없으면 오류', () => {
    const s = validSkill();
    const f = fill();
    (f.payload as { answer: string }).answer = 'evening';
    s.lessons[0].exercises[1] = f;
    expect(validateDraftSkill(s).some((e) => e.includes('정답이 보기에 없어요'))).toBe(true);
  });

  it('ORDER_WORDS 정답 단어가 목록에 없으면 오류 (중복 개수 포함)', () => {
    const s = validSkill();
    const o = order();
    (o.payload as { answer: string }).answer = 'Nice to meet you you';
    s.lessons[0].exercises[3] = o;
    expect(validateDraftSkill(s).some((e) => e.includes('단어 목록에 없어요'))).toBe(true);
  });
});
