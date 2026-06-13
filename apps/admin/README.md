# Ted Admin — AI 콘텐츠 생성 + 검수 (내부 도구)

콘텐츠 파이프라인(PLAN.md §3.5)의 Admin 단계: **생성(Claude/모의) → 드래프트 → 사람 검수(수정·반려) → 발행**.
발행 전에는 앱에 노출되지 않는다 (드래프트는 `content_drafts` 테이블, 발행 시 skills/lessons/exercises insert).

## 실행

```bash
cp .env.example .env      # 처음 한 번 — DATABASE_URL은 로컬 Supabase 기본값
pnpm admin                # 루트에서 (= pnpm --filter admin dev) → http://localhost:3100
```

- **AI 생성**은 `.env`에 `ANTHROPIC_API_KEY`가 있어야 활성화된다 (모델: `claude-opus-4-8`, 구조화 출력).
- 키가 없으면 **모의 생성**(결정적 오프라인 샘플)만 가능 — 파이프라인·e2e 검증용.
- Prisma 직접 연결(postgres 롤)이라 RLS를 우회한다. **로컬/사설망 전용** — 외부에 노출하지 말 것.

## 검증 규약

발행 버튼은 `@ted/shared`의 `validateDraftSkill` 통과 시에만 활성화된다:
레슨당 문제 5~8개, payload 유형 일치, LISTEN/MCQ 정답은 `options[0]`(셔플은 앱 표시 시점),
FILL 정답은 보기에 포함, ORDER 정답 단어는 단어 목록에 포함(중복 개수까지).

## e2e

```bash
# 로컬 Supabase + admin 서버(3100) 기동 후
python3 e2e/admin_flow.py   # 생성→검증 실패/복구→발행→반려 (15개 체크)
```

실행마다 발행 스킬이 누적된다 — `pnpm db:seed`로 정리(해당 언어쌍 콘텐츠 재생성).
