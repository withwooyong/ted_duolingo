import { Pressable, Text } from 'react-native';

interface Props {
  index: number;
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** 객관식 보기 행 — LISTEN_SELECT/COMPREHENSION_MCQ 공용 */
export function OptionRow({ index, label, selected, disabled, onPress }: Props) {
  return (
    <Pressable
      className={`mb-2.5 flex-row items-center gap-3 rounded-2xl border-2 px-4 py-3.5 ${
        selected ? 'border-sky bg-sky/10' : 'border-line bg-white'
      }`}
      onPress={onPress}
      disabled={disabled}
      testID={`option-${index}`}
    >
      <Text
        className={`h-7 w-7 rounded-lg border-2 text-center text-sm font-extrabold leading-6 ${
          selected ? 'border-sky text-sky' : 'border-line text-ink-sub'
        }`}
      >
        {index + 1}
      </Text>
      <Text
        className={`flex-1 text-base font-semibold ${selected ? 'text-sky-dark' : 'text-ink'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
