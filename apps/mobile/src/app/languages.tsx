import { FREE_MAX_LEARNING_LANGS, LANG_FLAGS } from '@ted/shared';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useLanguagePairs, useSelectLanguage } from '@/hooks/use-languages';
import { useUserLanguages } from '@/hooks/use-onboarding';
import { useProfile } from '@/hooks/use-profile';

/** 학습 언어 — 전환·추가 (무료는 1개, 추가는 Premium — PLAN.md §3.4) */
export default function LanguagesScreen() {
  const { data: profile } = useProfile();
  const { data: pairs, isLoading } = useLanguagePairs();
  const { data: myLangs } = useUserLanguages();
  const select = useSelectLanguage();

  const mine = new Map((myLangs ?? []).map((l) => [l.language_pair_id, l.is_active]));

  const onSelect = (pairId: string) => {
    const alreadyAdded = mine.has(pairId);
    // Freemium 경계 — 새 언어 추가는 무료 한도(1개) 초과 시 페이월로
    if (!alreadyAdded && !profile?.isPremium && mine.size >= FREE_MAX_LEARNING_LANGS) {
      router.push('/premium');
      return;
    }
    select.mutate(pairId, { onSuccess: () => router.back() });
  };

  return (
    <View className="flex-1 bg-white px-6 pt-14">
      <Text className="text-2xl font-extrabold">학습 언어</Text>
      <Text className="mt-1 text-sm font-semibold text-ink-sub">
        {profile?.isPremium
          ? '배우고 싶은 언어를 자유롭게 골라보세요'
          : `무료 플랜은 ${FREE_MAX_LEARNING_LANGS}개 언어를 학습할 수 있어요`}
      </Text>

      {isLoading ? (
        <ActivityIndicator className="mt-10" />
      ) : (
        <View className="mt-6 gap-2.5">
          {(pairs ?? []).map((p) => {
            const added = mine.has(p.id);
            const active = mine.get(p.id) === true;
            const gated = !added && !profile?.isPremium && mine.size >= FREE_MAX_LEARNING_LANGS;
            return (
              <Pressable
                key={p.id}
                className={`flex-row items-center gap-3 rounded-2xl border-2 px-4 py-4 active:opacity-70 ${
                  active ? 'border-sky bg-sky/10' : 'border-line'
                }`}
                onPress={() => onSelect(p.id)}
                disabled={select.isPending || active}
                testID={`lang-${p.target_lang}`}
              >
                <Text className="text-2xl">{LANG_FLAGS[p.target_lang] ?? '🌍'}</Text>
                <View className="flex-1">
                  <Text className={`text-lg font-bold ${active ? 'text-sky-dark' : 'text-ink'}`}>
                    {p.display_name}
                  </Text>
                  {gated && (
                    <Text className="text-[11px] font-semibold text-ink-sub">
                      ⚡ Premium에서 추가 가능
                    </Text>
                  )}
                </View>
                {active && (
                  <Text className="text-xs font-extrabold text-sky-dark" testID={`lang-active-${p.target_lang}`}>
                    학습 중 ✓
                  </Text>
                )}
                {gated && <Text className="text-base">🔒</Text>}
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        className="mt-8 w-full items-center rounded-2xl border-2 border-line py-3 active:opacity-60"
        onPress={() => router.back()}
        testID="languages-close"
      >
        <Text className="text-sm font-bold text-ink-sub">닫기</Text>
      </Pressable>
    </View>
  );
}
