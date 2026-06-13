/**
 * 학습 언어 관리 — 목록·전환·추가.
 * Freemium 경계(무료 1개 — FREE_MAX_LEARNING_LANGS) 판정은 화면에서 하고,
 * 여기서는 데이터 조작만 담당한다.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

export interface LanguagePairRow {
  id: string;
  source_lang: string;
  target_lang: string;
  display_name: string;
}

/** 선택 가능한 언어쌍 전체 (모국어 ko 기준 — D11, 다국어 UI 확장 시 nativeLang 반영) */
export function useLanguagePairs() {
  return useQuery({
    queryKey: ['language-pairs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_pairs')
        .select('id, source_lang, target_lang, display_name')
        .eq('source_lang', 'ko')
        .order('target_lang');
      if (error) throw error;
      return data as LanguagePairRow[];
    },
  });
}

/**
 * 학습 언어 선택 — 이미 추가한 언어면 활성 전환, 처음이면 추가 후 활성.
 * 활성 언어쌍은 항상 1개 (스킬 트리 기준).
 */
export function useSelectLanguage() {
  const session = useAuth((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (languagePairId: string) => {
      const userId = session!.user.id;
      const { error: deactivateErr } = await supabase
        .from('user_languages')
        .update({ is_active: false })
        .eq('user_id', userId)
        .neq('language_pair_id', languagePairId);
      if (deactivateErr) throw deactivateErr;

      const { error: upsertErr } = await supabase.from('user_languages').upsert({
        user_id: userId,
        language_pair_id: languagePairId,
        is_active: true,
      });
      if (upsertErr) throw upsertErr;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-languages'] });
      queryClient.invalidateQueries({ queryKey: ['skill-tree'] });
    },
  });
}
