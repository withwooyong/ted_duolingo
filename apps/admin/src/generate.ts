/**
 * 콘텐츠 생성 — Claude API(구조화 출력) 또는 모의 생성(오프라인).
 * 생성 결과는 @ted/shared의 DraftSkill 형태이며, 발행 전 validateDraftSkill 검증을 거친다.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import {
  LANG_LABELS,
  LESSON_MAX_EXERCISES,
  LESSON_MIN_EXERCISES,
  type DraftSkill,
} from '@ted/shared';
import { z } from 'zod';

export const GENERATION_MODEL = 'claude-opus-4-8';

export const aiAvailable = () => !!process.env.ANTHROPIC_API_KEY;

export interface GenerateParams {
  sourceLang: string;
  targetLang: string;
  topic: string;
  lessonCount: number;
}

/* ── 구조화 출력 스키마 (DraftSkill과 1:1) ── */
const ListenSelect = z.object({
  type: z.literal('LISTEN_SELECT'),
  audioText: z.string(),
  options: z.array(z.string()),
  answerIndex: z.literal(0),
});
const FillBlank = z.object({
  type: z.literal('FILL_BLANK'),
  sentence: z.array(z.union([z.string(), z.null()])),
  options: z.array(z.string()),
  answer: z.string(),
});
const MatchPairs = z.object({
  type: z.literal('MATCH_PAIRS'),
  pairs: z.array(z.tuple([z.string(), z.string()])),
});
const OrderWords = z.object({
  type: z.literal('ORDER_WORDS'),
  words: z.array(z.string()),
  answer: z.string(),
});
const ComprehensionMcq = z.object({
  type: z.literal('COMPREHENSION_MCQ'),
  passage: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  answerIndex: z.literal(0),
});

const DraftExerciseSchema = z.object({
  type: z.enum(['LISTEN_SELECT', 'FILL_BLANK', 'MATCH_PAIRS', 'ORDER_WORDS', 'COMPREHENSION_MCQ']),
  prompt: z.string(),
  payload: z.discriminatedUnion('type', [
    ListenSelect,
    FillBlank,
    MatchPairs,
    OrderWords,
    ComprehensionMcq,
  ]),
  explanation: z.string(),
});

const DraftSkillSchema = z.object({
  title: z.string(),
  icon: z.string(),
  description: z.string(),
  lessons: z.array(
    z.object({
      title: z.string(),
      exercises: z.array(DraftExerciseSchema),
    }),
  ),
});

function systemPrompt(p: GenerateParams): string {
  const source = LANG_LABELS[p.sourceLang] ?? p.sourceLang;
  const target = LANG_LABELS[p.targetLang] ?? p.targetLang;
  return `당신은 ${source} 사용자를 위한 ${target} 학습 콘텐츠 제작 전문가다. Duolingo 스타일의 초보자용 스킬 1개를 만든다.

규칙:
- 스킬은 레슨 ${p.lessonCount}개, 레슨마다 문제 ${LESSON_MIN_EXERCISES}~${LESSON_MAX_EXERCISES}개
- 5종 문제 유형(LISTEN_SELECT, FILL_BLANK, MATCH_PAIRS, ORDER_WORDS, COMPREHENSION_MCQ)을 레슨마다 최소 1번씩 사용
- LISTEN_SELECT·COMPREHENSION_MCQ의 정답은 반드시 options[0] (answerIndex=0). 보기 섞기는 앱이 한다
- FILL_BLANK: sentence 배열에서 빈칸은 null 1개, answer는 options에 포함
- ORDER_WORDS: words에 정답 단어 전부 + 함정 단어 1~2개, answer는 단어를 공백으로 연결. prompt는 '"<${source} 문장>"를 ${target}로 만드세요' 형식
- MATCH_PAIRS: [${source} 단어, ${target} 단어] 4쌍
- prompt·explanation·MCQ의 질문/보기는 ${source}로, 학습 문장·단어는 ${target}로 쓴다
- explanation은 정답 문장과 한 줄 해설 (존댓말 '~요'체)
- icon은 주제에 맞는 이모지 1개
- 난이도는 완전 초보 기준, 문장은 짧고 실용적으로`;
}

/** Claude로 스킬 드래프트 생성 (구조화 출력 — 스키마 불일치 시 parsed_output이 null) */
export async function generateSkillAI(p: GenerateParams): Promise<DraftSkill> {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: GENERATION_MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: systemPrompt(p),
    messages: [
      {
        role: 'user',
        content: `주제: "${p.topic}" — 위 규칙대로 스킬 1개를 생성해 주세요.`,
      },
    ],
    output_config: { format: zodOutputFormat(DraftSkillSchema) },
  });
  if (!response.parsed_output) {
    throw new Error('생성 결과가 스키마와 맞지 않아요. 다시 시도해 주세요.');
  }
  return response.parsed_output as DraftSkill;
}

/* ── 모의 생성 (오프라인 — API 키 없이 파이프라인 검증용) ── */
interface MockStrings {
  greeting: string;
  greetingWrong: string[];
  fillSentence: [string, null, string];
  fillOptions: string[];
  fillAnswer: string;
  pairs: [string, string][];
  orderWords: string[];
  orderAnswer: string;
  orderKo: string;
  passage: string;
  mcqOptions: string[];
}

const MOCK_STRINGS: Record<string, MockStrings> = {
  en: {
    greeting: 'How much is this?',
    greetingWrong: ['How old is this?', 'What time is it?', 'Where is this?'],
    fillSentence: ['I want to ', null, ' this.'],
    fillOptions: ['buy', 'eat', 'sleep', 'rain'],
    fillAnswer: 'buy',
    pairs: [
      ['가게', 'store'],
      ['가격', 'price'],
      ['돈', 'money'],
      ['카드', 'card'],
    ],
    orderWords: ['Can', 'I', 'try', 'this', 'on', 'sleep'],
    orderAnswer: 'Can I try this on',
    orderKo: '이거 입어봐도 되나요',
    passage: 'A: How much is this shirt?\nB: It is ten dollars.',
    mcqOptions: ['10달러', '20달러', '공짜', '5달러'],
  },
  ja: {
    greeting: 'これはいくらですか。',
    greetingWrong: ['これはなんですか。', 'これはどこですか。', 'それはいつですか。'],
    fillSentence: ['これ', null, 'ください。'],
    fillOptions: ['を', 'が', 'は', 'に'],
    fillAnswer: 'を',
    pairs: [
      ['가게', 'みせ'],
      ['가격', 'ねだん'],
      ['돈', 'おかね'],
      ['카드', 'カード'],
    ],
    orderWords: ['これ', 'を', 'ください', 'たべます'],
    orderAnswer: 'これ を ください',
    orderKo: '이것을 주세요',
    passage: 'A: このシャツはいくらですか。\nB: せんえんです。',
    mcqOptions: ['1,000엔', '100엔', '공짜', '1만 엔'],
  },
};

/** 모의 드래프트 — 결정적 샘플 (validateDraftSkill을 통과하는 형태) */
export function generateSkillMock(p: GenerateParams): DraftSkill {
  const s = MOCK_STRINGS[p.targetLang] ?? MOCK_STRINGS.en;
  const target = LANG_LABELS[p.targetLang] ?? p.targetLang;
  const lesson = (n: number) => ({
    title: `${p.topic} ${n}`,
    exercises: [
      {
        type: 'LISTEN_SELECT' as const,
        prompt: '들리는 문장을 선택하세요',
        payload: {
          type: 'LISTEN_SELECT' as const,
          audioText: s.greeting,
          options: [s.greeting, ...s.greetingWrong],
          answerIndex: 0,
        },
        explanation: `"${s.greeting}" — 모의 생성 예시 문장이에요.`,
      },
      {
        type: 'FILL_BLANK' as const,
        prompt: '빈칸에 알맞은 말을 고르세요',
        payload: {
          type: 'FILL_BLANK' as const,
          sentence: [...s.fillSentence],
          options: [...s.fillOptions],
          answer: s.fillAnswer,
        },
        explanation: `정답은 "${s.fillAnswer}" — 모의 생성 예시예요.`,
      },
      {
        type: 'MATCH_PAIRS' as const,
        prompt: '단어와 뜻을 연결하세요',
        payload: { type: 'MATCH_PAIRS' as const, pairs: s.pairs.map((x) => [...x] as [string, string]) },
        explanation: `${p.topic} 관련 기초 단어예요.`,
      },
      {
        type: 'ORDER_WORDS' as const,
        prompt: `"${s.orderKo}"를 ${target}로 만드세요`,
        payload: { type: 'ORDER_WORDS' as const, words: [...s.orderWords], answer: s.orderAnswer },
        explanation: `"${s.orderAnswer}" — 모의 생성 예시예요.`,
      },
      {
        type: 'COMPREHENSION_MCQ' as const,
        prompt: '대화를 읽고 답하세요',
        payload: {
          type: 'COMPREHENSION_MCQ' as const,
          passage: s.passage,
          question: '가격은 얼마인가요?',
          options: [...s.mcqOptions],
          answerIndex: 0,
        },
        explanation: '대화 속 가격 표현을 찾는 문제예요.',
      },
    ],
  });
  return {
    title: p.topic,
    icon: '📝',
    description: `${p.topic} 관련 기초 표현 (모의 생성)`,
    lessons: Array.from({ length: p.lessonCount }, (_, i) => lesson(i + 1)),
  };
}
