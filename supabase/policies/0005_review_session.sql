-- Ted Duolingo — 복습 세션 완료 기록 RLS (Phase 4, D24)
-- user_review_session: 오프라인 복습 쓰기 큐의 멱등 가드. 본인 행만 읽기·쓰기.
-- 레슨의 user_progress와 동일하게 클라이언트 직접 insert는 MVP 한정 —
-- 게임화 수치 서버 검증은 클라우드 전환 시 Edge Function으로 이전.

alter table public.user_review_session enable row level security;

create policy "user_review_session_read_own" on public.user_review_session
  for select to authenticated using (auth.uid() = user_id);
create policy "user_review_session_insert_own" on public.user_review_session
  for insert to authenticated with check (auth.uid() = user_id);
