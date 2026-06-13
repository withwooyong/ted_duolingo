-- Phase 3 — 콘텐츠 드래프트 (Admin 전용)
-- content_drafts는 Admin이 Prisma 직접 연결(postgres 롤, RLS 우회)로만 접근한다.
-- 정책 없이 RLS만 활성화해 anon/authenticated의 PostgREST 접근을 전부 차단한다.
alter table public.content_drafts enable row level security;
