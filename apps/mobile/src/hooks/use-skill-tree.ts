import type { ExerciseDto, ExercisePayload, LessonDto, SkillDto } from '@ted/shared';
import { useQuery } from '@tanstack/react-query';

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
  // MVP 언어쌍 ko→en (D11) — 다국어 확장 시 user_languages 기반으로 변경
  const { data: pair, error: pairErr } = await supabase
    .from('language_pairs')
    .select('id')
    .eq('source_lang', 'ko')
    .eq('target_lang', 'en')
    .single();
  if (pairErr) throw pairErr;

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

  return { languagePairId: pair.id, skills, currentLesson, totalLessons, completedLessons };
}

export function useSkillTree() {
  const session = useAuth((s) => s.session);
  return useQuery({
    queryKey: ['skill-tree', session?.user.id],
    enabled: !!session,
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
        .select('id, lesson_id, order, type, prompt, options, audio_url, explanation')
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
      }));
    },
  });
}
