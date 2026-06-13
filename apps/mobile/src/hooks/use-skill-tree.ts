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

/** 스킬(레슨 정렬 완료) — 파생 전 단순 형태 */
interface RawSkill {
  id: string;
  order: number;
  title: string;
  icon: string;
  description: string | null;
  lessons: LessonDto[];
}

interface PairMeta {
  id: string;
  targetLang: string;
  displayName: string;
}

/**
 * 완료 레슨 집합으로부터 스킬 트리의 파생 상태(doneCount·locked·nextLesson·currentLesson·합계)를 계산.
 * fetchSkillTree(서버 조회)와 markLessonComplete(오프라인 낙관적 갱신)가 공유하는 단일 소스.
 */
function deriveTree(rawSkills: RawSkill[], completed: Set<string>, pair: PairMeta): SkillTree {
  let prevDone = true; // 첫 스킬은 항상 열림
  let currentLesson: LessonDto | null = null;
  let totalLessons = 0;
  let completedLessons = 0;

  const skills: SkillNode[] = rawSkills.map((row) => {
    const lessons = row.lessons;
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
    targetLang: pair.targetLang,
    displayName: pair.displayName,
    skills,
    currentLesson,
    totalLessons,
    completedLessons,
  };
}

/**
 * 오프라인 레슨 완료의 낙관적 캐시 갱신용 — 캐시된 트리에 한 레슨을 완료 처리한 새 트리를 만든다.
 * 캐시엔 파생 트리만 있으므로 완료 집합을 (스킬별 doneCount = 정렬상 앞쪽 N개 완료)로 복원해 합친다.
 * 진행이 순서대로 잠금 해제되므로 이 근사는 정확하며, 온라인 복귀 시 invalidate가 서버값으로 보정한다.
 */
export function markLessonComplete(tree: SkillTree, lessonId: string): SkillTree {
  const completed = new Set<string>();
  for (const skill of tree.skills) {
    const sorted = [...skill.lessons].sort((a, b) => a.order - b.order);
    for (let i = 0; i < skill.doneCount; i++) completed.add(sorted[i].id);
  }
  completed.add(lessonId);

  const rawSkills: RawSkill[] = tree.skills.map((s) => ({
    id: s.id,
    order: s.order,
    title: s.title,
    icon: s.icon,
    description: s.description,
    lessons: s.lessons,
  }));
  return deriveTree(rawSkills, completed, {
    id: tree.languagePairId,
    targetLang: tree.targetLang,
    displayName: tree.displayName,
  });
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

  const rawSkills: RawSkill[] = (skillsRes.data as SkillRow[]).map((row) => ({
    id: row.id,
    order: row.order,
    title: row.title,
    icon: row.icon,
    description: row.description,
    lessons: [...row.lessons]
      .sort((a, b) => a.order - b.order)
      .map((l) => ({
        id: l.id,
        skillId: row.id,
        order: l.order,
        title: l.title,
        xpReward: l.xp_reward,
      })),
  }));

  return deriveTree(rawSkills, completed, {
    id: pair.id,
    targetLang: pair.target_lang,
    displayName: pair.display_name,
  });
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

/** 레슨 문제 목록 키 — useLessonExercises와 prefetch(오프라인 대비)가 공유 */
export const lessonExercisesKey = (lessonId: string) => ['lesson-exercises', lessonId] as const;

/** 레슨의 문제 목록 조회 (훅·prefetch 공용) */
export async function fetchLessonExercises(lessonId: string): Promise<ExerciseDto[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, lesson_id, order, type, prompt, options, audio_url, explanation, target_lang')
    .eq('lesson_id', lessonId)
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
}

/** 레슨의 문제 목록 */
export function useLessonExercises(lessonId: string | undefined) {
  return useQuery({
    queryKey: ['lesson-exercises', lessonId],
    enabled: !!lessonId,
    queryFn: () => fetchLessonExercises(lessonId!),
  });
}
