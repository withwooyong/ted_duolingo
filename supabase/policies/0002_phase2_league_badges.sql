-- Ted Duolingo — Phase 2 (리그·배지) RLS 정책
-- 적용: prisma db execute --file ../../supabase/policies/0002_phase2_league_badges.sql
-- (0001 적용 이후 실행, 재실행 안전)

-- ─────────────────────────────────────────────
-- 1. 프로필 — 리그 랭킹에 이름·티어를 표시해야 하므로 읽기를 전체 공개로 전환.
--    (Duolingo류 리더보드 특성상 프로필은 준공개 데이터. 쓰기는 여전히 본인만)
-- ─────────────────────────────────────────────
drop policy if exists "profile_read_own" on public.profiles;
drop policy if exists "profile_read_all" on public.profiles;
create policy "profile_read_all" on public.profiles for select to authenticated using (true);

-- ─────────────────────────────────────────────
-- 2. 리그 — 본인 참가 행은 클라이언트가 직접 생성·갱신 (MVP 한정).
--    주간 마감(순위 확정·승급/강등)도 클라이언트가 수행하므로 본인 행 쓰기 허용.
--    Phase 2 후반 Edge Function 이전 시 이 정책을 제거하고 service_role로 일원화한다.
-- ─────────────────────────────────────────────
drop policy if exists "league_insert_own" on public.league_entries;
drop policy if exists "league_update_own" on public.league_entries;
create policy "league_insert_own" on public.league_entries
  for insert to authenticated with check (auth.uid() = user_id);
create policy "league_update_own" on public.league_entries
  for update to authenticated using (auth.uid() = user_id);
