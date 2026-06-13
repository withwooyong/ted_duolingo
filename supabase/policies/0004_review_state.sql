-- Ted Duolingo — SM-2 복습 상태 RLS (Phase 4)
-- user_review_state: 본인 행만 읽기·쓰기. 게임화 수치(xp 등)와 마찬가지로
-- 클라이언트 직접 update는 MVP 한정 — 서버 측 검증은 클라우드 전환 시 Edge Function으로 이전.

alter table public.user_review_state enable row level security;

create policy "user_review_read_own" on public.user_review_state
  for select to authenticated using (auth.uid() = user_id);
create policy "user_review_insert_own" on public.user_review_state
  for insert to authenticated with check (auth.uid() = user_id);
create policy "user_review_update_own" on public.user_review_state
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
