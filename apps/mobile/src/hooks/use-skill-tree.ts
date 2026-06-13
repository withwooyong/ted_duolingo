import type { ExerciseDto, ExercisePayload, LessonDto, SkillDto } from '@ted/shared';
import { useQuery } from '@tanstack/react-query';

import { useUserLanguages } from '@/hooks/use-onboarding';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

export interface SkillNode extends SkillDto {
  /** 완료한 레슨 수 */
  doneCount: number;
  /** 이전 스킬 미완료로 잠김 */
  locked: boolean;
  /** 다음에 플레이할 레슨 (스킬 완료 시 null) */
  nextLesson: LessonDto | null;
}

export interface SkillTree {
  languagePairId: string;
  /** 활성 언어쌍의 학습어 (예: 'en') */
  targetLang: string;
  displayName: string;
  skills: SkillNode[];
  /** 전체에서 다음에 플레이할 레슨 (이어하기 대상) */
  currentLesson: LessonDto | null;
  totalLessons: number;
  completedLessons: number;
}

interface SkillRow {
  id: string;
  order: number;
  title: string;
  icon: string;
  description: string | null;
  lessons: { id: string; order: number; title: string; xp_reward: number }[];
}

async function fetchSkillTree(userId: string): Promise<SkillTree> {
  // 활성 학습 언어쌍 기준 (없으면 온보딩 대상 — 홈에서 redirect)
  const { data: active, error: activeErr } = await supabase
    .from('user_languages')
    .select('language_pair_id, language_pairs(id, target_lang, display_name)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('added_at', { ascending: false })
    .limit(1)
    .single();
  if (activeErr) throw activeErr;
  const pair = active.language_pairs as unknown as {
    id: string;
    target_lang: string;
    display_name: string;
  };

  const [skillsRes, progressRes] = await Promise.all([
    supabase
      .from('skills')
      .select('id, order, title, icon, description, lessons(id, order, title, xp_reward)')
      .eq('language_pair_id', pair.id)
      .order('order'),
    supabase.from('user_progress').select('lesson_id').eq('user_id', userId),
  ]);
  if (skillsRes.error) throw skillsRes.error;
  if (progressRes.error) throw progressRes.error;

  const completed = new Set(progressRes.data.map((r) => r.lesson_id));

  let prevDone = true; // 첫 스킬은 항상 열림
  let currentLesson: LessonDto | null = null;
  let totalLessons = 0;
  let completedLessons = 0;

  const skills: SkillNode[] = (skillsRes.data as SkillRow[]).map((row) => {
    const lessons: LessonDto[] = [...row.lessons]
      .sort((a, b) => a.order - b.order)
      .map((l) => ({
        id: l.id,
        skillId: row.id,
        order: l.order,
        title: l.title,
        xpReward: l.xp_reward,
      }));
    const doneCount = lessons.filter((l) => completed.has(l.id)).length;
    const locked = !prevDone;
    const nextLesson = locked ? null : (lessons.find((l) => !completed.has(l.id)) ?? null);
    if (!currentLesson && nextLesson) currentLesson = nextLesson;

    totalLessons += lessons.length;
    completedLessons += doneCount;
    prevDone = doneCount >= lessons.length;

    return {
      id: row.id,
      languagePairId: pair.id,
      order: row.order,
      title: row.title,
      icon: row.icon,
      description: row.description,
      lessons,
      doneCount,
      locked,
      nextLesson,
    };
  });

  return {
    languagePairId: pair.id,
    targetLang: pair.target_lang,
    displayName: pair.display_name,
    skills,
    currentLesson,
    totalLessons,
    completedLessons,
  };
}

export function useSkillTree() {
  const session = useAuth((s) => s.session);
  const { data: languages } = useUserLanguages();
  return useQuery({
    queryKey: ['skill-tree', session?.user.id],
    // 활성 언어쌍이 생기기 전(온보딩 전)에는 조회하지 않는다
    enabled: !!session && (languages?.length ?? 0) > 0,
    queryFn: () => fetchSkillTree(session!.user.id),
  });
}

/** 레슨의 문제 목록 */
export function useLessonExercises(lessonId: string | undefined) {
  return useQuery({
    queryKey: ['lesson-exercises', lessonId],
    enabled: !!lessonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, lesson_id, order, type, prompt, options, audio_url, explanation, target_lang')
        .eq('lesson_id', lessonId!)
        .order('order');
      if (error) throw error;
      return data.map((row): ExerciseDto => ({
        id: row.id,
        lessonId: row.lesson_id,
        order: row.order,
        type: row.type as ExerciseDto['type'],
        prompt: row.prompt,
        payload: row.options as ExercisePayload,
        audioUrl: row.audio_url,
        explanation: row.explanation,
        targetLang: row.target_lang,
      }));
    },
  });
}
