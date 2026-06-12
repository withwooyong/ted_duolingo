/**
 * 시드 데이터 — 한국어→영어 1단원 (기초 회화)
 *
 * PLAN.md Phase 0: 시드 콘텐츠는 AI가 아닌 수동 제작 (D13).
 * 4스킬 × 1~2레슨, 5종 문제 유형 전부 포함 — End-to-end 검증용.
 *
 * 주의: 실행 시 해당 언어쌍의 기존 콘텐츠(스킬·레슨·문제)를 지우고 다시 만든다.
 * (Cascade로 user_progress도 함께 삭제되므로 운영 DB에서는 사용 금지)
 */
import { PrismaClient, ExerciseType } from '@prisma/client';
import type { ExercisePayload } from '@ted/shared';

const prisma = new PrismaClient();

interface SeedExercise {
  type: ExerciseType;
  prompt: string;
  payload: ExercisePayload;
  explanation: string;
}
interface SeedLesson {
  title: string;
  exercises: SeedExercise[];
}
interface SeedSkill {
  title: string;
  icon: string;
  description: string;
  lessons: SeedLesson[];
}

/* ── 문제 생성 헬퍼 ───────────────────────────────────────── */
const listen = (audioText: string, options: string[], explanation: string): SeedExercise => ({
  type: 'LISTEN_SELECT',
  prompt: '들리는 문장을 선택하세요',
  payload: { type: 'LISTEN_SELECT', audioText, options, answerIndex: 0 },
  explanation,
});
const fill = (
  sentence: (string | null)[],
  options: string[],
  answer: string,
  explanation: string,
): SeedExercise => ({
  type: 'FILL_BLANK',
  prompt: '빈칸에 알맞은 단어를 고르세요',
  payload: { type: 'FILL_BLANK', sentence, options, answer },
  explanation,
});
const match = (pairs: [string, string][], explanation: string): SeedExercise => ({
  type: 'MATCH_PAIRS',
  prompt: '단어와 뜻을 연결하세요',
  payload: { type: 'MATCH_PAIRS', pairs },
  explanation,
});
const order = (
  promptKo: string,
  words: string[],
  answer: string,
  explanation: string,
): SeedExercise => ({
  type: 'ORDER_WORDS',
  prompt: `"${promptKo}"를 영어로 만드세요`,
  payload: { type: 'ORDER_WORDS', words, answer },
  explanation,
});
const mcq = (
  passage: string,
  question: string,
  options: string[],
  explanation: string,
): SeedExercise => ({
  type: 'COMPREHENSION_MCQ',
  prompt: '대화를 읽고 답하세요',
  payload: { type: 'COMPREHENSION_MCQ', passage, question, options, answerIndex: 0 },
  explanation,
});

/* ── 1단원: 기초 회화 (ko→en) ─────────────────────────────── */
/* listen/mcq의 정답은 항상 options[0] — 저장 직전에 섞지 않고 앱에서 표시 시 섞는다 */
const UNIT_1: SeedSkill[] = [
  {
    title: '인사하기',
    icon: '👋',
    description: '만남과 헤어짐의 기본 인사',
    lessons: [
      {
        title: '첫 인사',
        exercises: [
          listen(
            'Hello, nice to meet you.',
            ['Hello, nice to meet you.', 'Hello, see you tomorrow.', 'Help me, nice to meet you.', 'Hello, nice to eat with you.'],
            '"Hello, nice to meet you." — 안녕하세요, 만나서 반가워요.',
          ),
          fill(
            ['Good ', null, ', how are you?'],
            ['morning', 'name', 'goodbye', 'please'],
            'morning',
            '"Good morning" — 아침 인사예요. (저녁은 Good evening)',
          ),
          match(
            [['안녕', 'hello'], ['잘 가', 'goodbye'], ['고마워', 'thank you'], ['미안해', 'sorry']],
            '기본 인사 표현 4가지를 모두 맞췄어요!',
          ),
          order(
            '만나서 반가워요',
            ['Nice', 'to', 'meet', 'you', 'go', 'eat'],
            'Nice to meet you',
            'Nice to meet you — 처음 만났을 때 쓰는 인사예요.',
          ),
          mcq(
            'A: Hello, my name is Tom.\nB: Hi Tom, I\'m Mina.',
            '두 사람은 지금 무엇을 하고 있나요?',
            ['처음 만나 인사한다', '음식을 주문한다', '길을 묻는다', '작별 인사를 한다'],
            '"my name is ~"로 서로 이름을 소개하는 첫 만남 장면이에요.',
          ),
          listen(
            'Good morning!',
            ['Good morning!', 'Good night!', 'Goodbye!', 'Good luck!'],
            '"Good morning!" — 좋은 아침이에요!',
          ),
        ],
      },
      {
        title: '안부 묻기',
        exercises: [
          listen(
            'How are you?',
            ['How are you?', 'How old are you?', 'Who are you?', 'Where are you?'],
            '"How are you?" — 잘 지내요? (안부 인사)',
          ),
          fill(
            ["I'm fine, ", null, ' you.'],
            ['thank', 'please', 'sorry', 'hello'],
            'thank',
            '"I\'m fine, thank you." — 잘 지내요, 고마워요.',
          ),
          match(
            [['좋아요', 'good'], ['피곤해요', 'tired'], ['행복해요', 'happy'], ['슬퍼요', 'sad']],
            '기분을 나타내는 단어 4가지예요.',
          ),
          order(
            '저는 잘 지내요',
            ['I', 'am', 'doing', 'well', 'not', 'bad'],
            'I am doing well',
            'I am doing well — 잘 지내고 있어요.',
          ),
          mcq(
            'A: How are you today?\nB: Not so good. I\'m tired.',
            'B의 상태는 어떤가요?',
            ['피곤하다', '행복하다', '배고프다', '바쁘다'],
            '"I\'m tired" = 피곤해요.',
          ),
          fill(
            ['See you ', null, '!'],
            ['tomorrow', 'yesterday', 'banana', 'slowly'],
            'tomorrow',
            '"See you tomorrow!" — 내일 봐요!',
          ),
        ],
      },
    ],
  },
  {
    title: '음식 주문',
    icon: '🍔',
    description: '카페·식당에서 주문하기',
    lessons: [
      {
        title: '주문하기',
        exercises: [
          fill(
            ['I ', null, ' like a coffee, please.'],
            ['would', 'will', 'want', 'do'],
            'would',
            '"would like"는 "~을 원하다"의 공손한 표현이에요.',
          ),
          match(
            [['사과', 'apple'], ['물', 'water'], ['빵', 'bread'], ['우유', 'milk']],
            '기초 음식 단어 4개예요.',
          ),
          order(
            '나는 사과를 먹어요',
            ['I', 'eat', 'an', 'apple', 'banana', 'drink'],
            'I eat an apple',
            '주어(I) + 동사(eat) + 목적어(an apple) 순서예요.',
          ),
          mcq(
            'A: What would you like?\nB: I\'d like a sandwich and water, please.',
            'B가 주문한 것은 무엇인가요?',
            ['샌드위치와 물', '커피와 빵', '사과와 우유', '샌드위치와 커피'],
            '"a sandwich and water" = 샌드위치와 물이에요.',
          ),
          listen(
            'How much is it?',
            ['How much is it?', 'How old is it?', 'What time is it?', 'Where is it?'],
            '"How much is it?" — 얼마예요? (가격을 물을 때)',
          ),
          listen(
            'Can I have a menu, please?',
            ['Can I have a menu, please?', 'Can I have money, please?', 'Can I move a menu, please?', 'Can I have a melon, please?'],
            '"Can I have a menu, please?" — 메뉴판 좀 주시겠어요?',
          ),
        ],
      },
    ],
  },
  {
    title: '여행',
    icon: '✈️',
    description: '길 묻기와 이동',
    lessons: [
      {
        title: '길 묻기',
        exercises: [
          listen(
            'Where is the station?',
            ['Where is the station?', 'Where is the stadium?', 'What is the station?', 'Where was the station?'],
            '"Where is the station?" — 역이 어디예요?',
          ),
          fill(
            ['Turn ', null, ' at the corner.'],
            ['left', 'blue', 'eat', 'water'],
            'left',
            '"Turn left" — 왼쪽으로 도세요. (오른쪽은 turn right)',
          ),
          match(
            [['역', 'station'], ['공항', 'airport'], ['호텔', 'hotel'], ['버스', 'bus']],
            '여행 필수 장소 단어 4개예요.',
          ),
          order(
            '화장실이 어디에 있나요',
            ['Where', 'is', 'the', 'bathroom', 'station', 'go'],
            'Where is the bathroom',
            'Where is ~? — ~이 어디에 있나요?',
          ),
          mcq(
            'A: Excuse me, where is the museum?\nB: Go straight and turn right.',
            '박물관에 가려면 어떻게 해야 하나요?',
            ['직진 후 우회전', '직진 후 좌회전', '버스를 탄다', '길을 건넌다'],
            '"Go straight and turn right" = 직진 후 오른쪽으로.',
          ),
        ],
      },
    ],
  },
  {
    title: '가족',
    icon: '👨‍👩‍👧',
    description: '가족 소개하기',
    lessons: [
      {
        title: '가족 소개',
        exercises: [
          listen(
            'This is my mother.',
            ['This is my mother.', 'This is my brother.', 'That is my mother.', 'This was my mother.'],
            '"This is my mother." — 이분은 제 어머니예요.',
          ),
          match(
            [['엄마', 'mother'], ['아빠', 'father'], ['언니', 'sister'], ['남동생', 'brother']],
            '가족 호칭 4가지예요.',
          ),
          fill(
            ['I have two ', null, '.'],
            ['brothers', 'waters', 'mornings', 'lefts'],
            'brothers',
            '"I have two brothers." — 남자 형제가 두 명 있어요. (둘 이상이면 -s)',
          ),
          order(
            '이분은 제 아버지예요',
            ['This', 'is', 'my', 'father', 'mother', 'a'],
            'This is my father',
            'This is my ~ — 사람을 소개할 때 쓰는 표현이에요.',
          ),
          mcq(
            'A: Do you have any siblings?\nB: Yes, I have one sister.',
            'B의 형제자매는 누구인가요?',
            ['여자 형제 1명', '남자 형제 1명', '없다', '여자 형제 2명'],
            '"one sister" = 여자 형제 한 명이에요.',
          ),
        ],
      },
    ],
  },
];

/* ── 배지 (PLAN.md §3.3) ─────────────────────────────────── */
const BADGES = [
  { key: 'first_lesson', title: '첫 레슨', icon: '🚀', condition: '첫 레슨 완료' },
  { key: 'streak_3', title: '3일 스트릭', icon: '🔥', condition: '3일 연속 학습' },
  { key: 'streak_7', title: '7일 스트릭', icon: '🌋', condition: '7일 연속 학습' },
  { key: 'xp_500', title: '500 XP', icon: '⭐', condition: '누적 500 XP 달성' },
  { key: 'perfect_lesson', title: '퍼펙트 레슨', icon: '💯', condition: '오답 없이 레슨 완료' },
  { key: 'league_promote', title: '리그 승급', icon: '🏆', condition: '상위 리그로 승급' },
];

async function main() {
  console.log('🌱 시드 시작 — ko→en 기초 회화');

  // 배지 (key 기준 idempotent)
  for (const b of BADGES) {
    await prisma.badge.upsert({ where: { key: b.key }, create: b, update: b });
  }
  console.log(`  배지 ${BADGES.length}개 upsert 완료`);

  // 언어쌍
  const pair = await prisma.languagePair.upsert({
    where: { sourceLang_targetLang: { sourceLang: 'ko', targetLang: 'en' } },
    create: { sourceLang: 'ko', targetLang: 'en', displayName: '한국어 → 영어' },
    update: {},
  });

  // 기존 콘텐츠 삭제 후 재생성 (개발용 — Cascade로 진행 기록도 삭제됨)
  const removed = await prisma.skill.deleteMany({ where: { languagePairId: pair.id } });
  if (removed.count > 0) console.log(`  기존 스킬 ${removed.count}개 삭제 (재생성)`);

  let lessonCount = 0;
  let exerciseCount = 0;
  for (const [si, skill] of UNIT_1.entries()) {
    await prisma.skill.create({
      data: {
        languagePairId: pair.id,
        order: si + 1,
        title: skill.title,
        icon: skill.icon,
        description: skill.description,
        lessons: {
          create: skill.lessons.map((lesson, li) => {
            lessonCount++;
            exerciseCount += lesson.exercises.length;
            return {
              order: li + 1,
              title: lesson.title,
              xpReward: 10,
              exercises: {
                create: lesson.exercises.map((ex, ei) => ({
                  order: ei + 1,
                  type: ex.type,
                  prompt: ex.prompt,
                  options: ex.payload as object,
                  explanation: ex.explanation,
                  sourceLang: 'ko',
                  targetLang: 'en',
                })),
              },
            };
          }),
        },
      },
    });
  }

  console.log(`  스킬 ${UNIT_1.length}개 / 레슨 ${lessonCount}개 / 문제 ${exerciseCount}개 생성 완료`);
  console.log('✅ 시드 완료');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
