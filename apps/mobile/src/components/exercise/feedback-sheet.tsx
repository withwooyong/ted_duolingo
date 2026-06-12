import { Pressable, Text, View } from 'react-native';

interface Props {
  correct: boolean;
  /** 오답 시 정답 텍스트 */
  correctAnswer: string | null;
  explanation: string | null;
  onContinue: () => void;
}

/** 정답/오답 피드백 시트 — 화면 하단 고정 */
export function FeedbackSheet({ correct, correctAnswer, explanation, onContinue }: Props) {
  return (
    <View
      className={`rounded-t-3xl px-5 pb-8 pt-5 ${correct ? 'bg-brand-light' : 'bg-danger-light'}`}
      testID="feedback-sheet"
    >
      <Text
        className={`text-xl font-extrabold ${correct ? 'text-brand-dark' : 'text-danger-dark'}`}
        testID="feedback-title"
      >
        {correct ? '✅ 정답입니다!' : '❌ 아쉬워요!'}
      </Text>
      {!correct && correctAnswer && (
        <Text className="mt-2 text-base font-bold text-danger-dark">정답: {correctAnswer}</Text>
      )}
      {explanation && (
        <Text
          className={`mt-2 text-base font-semibold leading-6 ${
            correct ? 'text-brand-dark' : 'text-danger-dark'
          }`}
        >
          {explanation}
        </Text>
      )}
      <Pressable
        className={`mt-4 items-center rounded-2xl py-4 active:opacity-80 ${
          correct ? 'bg-brand' : 'bg-danger'
        }`}
        onPress={onContinue}
        testID="feedback-continue"
      >
        <Text className="text-base font-extrabold uppercase text-white">계속하기</Text>
      </Pressable>
    </View>
  );
}
