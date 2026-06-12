-- Ted Duolingo — RLS 정책 및 트리거
-- Prisma는 테이블 스키마만 관리하므로, RLS·트리거는 이 SQL로 관리한다.
-- 적용: prisma migrate 이후 Supabase SQL Editor 또는 `supabase db push`로 실행.

-- ─────────────────────────────────────────────
-- 1. 가입 트리거: auth.users 생성 시 profiles 자동 생성
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, native_lang)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'native_lang', 'ko')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- 2. RLS 활성화
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.language_pairs enable row level security;
alter table public.skills enable row level security;
alter table public.lessons enable row level security;
alter table public.exercises enable row level security;
alter table public.badges enable row level security;
alter table public.user_languages enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_exercise_history enable row level security;
alter table public.user_badges enable row level security;
alter table public.league_entries enable row level security;

-- ─────────────────────────────────────────────
-- 3. 콘텐츠 테이블 — 로그인 사용자 누구나 읽기 (쓰기는 service_role만)
-- ─────────────────────────────────────────────
create policy "content_read" on public.language_pairs for select to authenticated using (true);
create policy "content_read" on public.skills for select to authenticated using (true);
create policy "content_read" on public.lessons for select to authenticated using (true);
create policy "content_read" on public.exercises for select to authenticated using (true);
create policy "content_read" on public.badges for select to authenticated using (true);

-- ─────────────────────────────────────────────
-- 4. 사용자 데이터 — 본인 행만 접근
--    주의: xp·hearts 등 게임화 수치의 서버 측 검증은 Phase 2에서
--    Edge Function으로 이전 예정 (클라이언트 직접 update는 MVP 한정)
-- ─────────────────────────────────────────────
create policy "profile_read_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profile_update_own" on public.profiles for update to authenticated using (auth.uid() = id);

create policy "user_languages_own" on public.user_languages for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_progress_read_own" on public.user_progress for select to authenticated using (auth.uid() = user_id);
create policy "user_progress_insert_own" on public.user_progress for insert to authenticated with check (auth.uid() = user_id);

create policy "user_history_read_own" on public.user_exercise_history for select to authenticated using (auth.uid() = user_id);
create policy "user_history_insert_own" on public.user_exercise_history for insert to authenticated with check (auth.uid() = user_id);

create policy "user_badges_read_own" on public.user_badges for select to authenticated using (auth.uid() = user_id);
create policy "user_badges_insert_own" on public.user_badges for insert to authenticated with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 5. 리그 — 같은 주 참가자끼리 순위 공개, 쓰기는 service_role(스케줄러)만
-- ─────────────────────────────────────────────
create policy "league_read" on public.league_entries for select to authenticated using (true);
