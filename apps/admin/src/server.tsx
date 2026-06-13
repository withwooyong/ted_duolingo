/**
 * Ted Duolingo Admin — AI 콘텐츠 생성 + 검수 워크플로 (PLAN.md §3.5, D13)
 *
 * 생성(Claude 또는 모의) → 드래프트(PENDING) → 검수(수정·반려) → 발행(스킬/레슨/문제 insert).
 * 내부 도구: Prisma 직접 연결로 RLS를 우회하므로 로컬/사설망에서만 띄운다.
 */
import { serve } from '@hono/node-server';
import { validateDraftSkill, type DraftSkill } from '@ted/shared';
import { Hono } from 'hono';

import { prisma } from './db.js';
import { aiAvailable, GENERATION_MODEL, generateSkillAI, generateSkillMock } from './generate.js';
import { Layout, PairLabel, SkillPreview, StatusBadge } from './views.jsx';

const app = new Hono();

/* ── 목록 ── */
app.get('/', async (c) => {
  const drafts = await prisma.contentDraft.findMany({ orderBy: { createdAt: 'desc' } });
  const pairs = await prisma.languagePair.findMany();
  const pairById = new Map(pairs.map((p) => [p.id, p]));
  return c.html(
    <Layout title="드래프트">
      <h2>콘텐츠 드래프트 {drafts.length}개</h2>
      {drafts.length === 0 && (
        <div class="card muted" data-testid="empty-list">
          아직 드래프트가 없어요. 오른쪽 위 ＋ 콘텐츠 생성으로 시작하세요.
        </div>
      )}
      {drafts.map((d) => {
        const pair = pairById.get(d.languagePairId);
        return (
          <a href={`/drafts/${d.id}`} style="text-decoration:none;color:inherit" data-testid={`draft-${d.id}`}>
            <div class="card row">
              <StatusBadge status={d.status} />
              <b>{d.topic}</b>
              {pair && <PairLabel pair={pair} />}
              <span class="muted">
                {d.model} · {d.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
              </span>
            </div>
          </a>
        );
      })}
    </Layout>,
  );
});

/* ── 생성 폼 ── */
app.get('/new', async (c) => {
  const pairs = await prisma.languagePair.findMany({ orderBy: { targetLang: 'asc' } });
  return c.html(
    <Layout title="콘텐츠 생성">
      <h2>콘텐츠 생성</h2>
      <form method="post" action="/generate" class="card">
        <label>언어쌍</label>
        <select name="languagePairId" data-testid="gen-pair">
          {pairs.map((p) => (
            <option value={p.id}>{p.displayName}</option>
          ))}
        </select>
        <label>주제</label>
        <input type="text" name="topic" placeholder="예: 쇼핑, 날씨, 병원" required data-testid="gen-topic" />
        <label>레슨 수</label>
        <input type="number" name="lessonCount" value="1" min="1" max="3" data-testid="gen-lessons" />
        <label>생성 방식</label>
        <div class="row">
          <label style="margin:0;text-transform:none">
            <input type="radio" name="mode" value="ai" checked={aiAvailable()} disabled={!aiAvailable()} data-testid="gen-mode-ai" />{' '}
            AI 생성 ({GENERATION_MODEL}){!aiAvailable() && ' — ANTHROPIC_API_KEY 필요'}
          </label>
          <label style="margin:0;text-transform:none">
            <input type="radio" name="mode" value="mock" checked={!aiAvailable()} data-testid="gen-mode-mock" /> 모의
            생성 (오프라인 샘플)
          </label>
        </div>
        <div style="margin-top:18px">
          <button class="btn green" type="submit" data-testid="gen-submit">
            생성하기
          </button>
        </div>
      </form>
      <p class="muted">
        생성된 콘텐츠는 드래프트로 저장되며, 검수·승인 전에는 앱에 노출되지 않아요 (D4: AI 반자동 + 사람 검수).
      </p>
    </Layout>,
  );
});

app.post('/generate', async (c) => {
  const body = await c.req.parseBody();
  const languagePairId = String(body.languagePairId ?? '');
  const topic = String(body.topic ?? '').trim();
  const lessonCount = Math.min(3, Math.max(1, Number(body.lessonCount ?? 1)));
  const mode = String(body.mode ?? 'mock');

  const pair = await prisma.languagePair.findUnique({ where: { id: languagePairId } });
  if (!pair || !topic) return c.text('언어쌍과 주제를 확인해 주세요', 400);

  const params = { sourceLang: pair.sourceLang, targetLang: pair.targetLang, topic, lessonCount };
  let skill: DraftSkill;
  let model: string;
  try {
    if (mode === 'ai' && aiAvailable()) {
      skill = await generateSkillAI(params);
      model = GENERATION_MODEL;
    } else {
      skill = generateSkillMock(params);
      model = 'mock';
    }
  } catch (e) {
    return c.html(
      <Layout title="생성 실패">
        <div class="error">생성에 실패했어요: {e instanceof Error ? e.message : String(e)}</div>
        <a class="btn gray" href="/new">
          다시 시도
        </a>
      </Layout>,
      500,
    );
  }

  const draft = await prisma.contentDraft.create({
    data: { languagePairId, topic, payload: skill as object, model },
  });
  return c.redirect(`/drafts/${draft.id}`);
});

/* ── 검수 ── */
app.get('/drafts/:id', async (c) => {
  const draft = await prisma.contentDraft.findUnique({ where: { id: c.req.param('id') } });
  if (!draft) return c.text('드래프트를 찾을 수 없어요', 404);
  const pair = await prisma.languagePair.findUnique({ where: { id: draft.languagePairId } });
  const skill = draft.payload as unknown as DraftSkill;
  const errors = validateDraftSkill(skill);
  const editable = draft.status === 'PENDING' || draft.status === 'REJECTED';

  return c.html(
    <Layout title={`검수 — ${draft.topic}`}>
      <div class="row">
        <StatusBadge status={draft.status} />
        <b style="font-size:18px">{draft.topic}</b>
        {pair && <PairLabel pair={pair} />}
        <span class="muted">생성: {draft.model}</span>
      </div>
      {draft.status === 'PUBLISHED' && (
        <div class="ok" data-testid="published-note">
          발행 완료 — 스킬 ID: {draft.publishedSkillId}
        </div>
      )}
      {draft.status === 'REJECTED' && draft.reviewNote && (
        <div class="error">반려 사유: {draft.reviewNote}</div>
      )}

      {errors.length > 0 ? (
        <div data-testid="validation-errors">
          {errors.map((e) => (
            <div class="error">{e}</div>
          ))}
        </div>
      ) : (
        <div class="ok" data-testid="validation-ok">
          검증 통과 — 발행할 수 있어요
        </div>
      )}

      <SkillPreview skill={skill} />

      {editable && (
        <>
          <h2>수정 (JSON)</h2>
          <form method="post" action={`/drafts/${draft.id}/save`}>
            <textarea class="json" name="payload" data-testid="payload-json">
              {JSON.stringify(skill, null, 2)}
            </textarea>
            <div style="margin-top:10px">
              <button class="btn" type="submit" data-testid="save-button">
                저장
              </button>
            </div>
          </form>

          <h2>검수 결정</h2>
          <div class="row">
            <form method="post" action={`/drafts/${draft.id}/approve`}>
              <button class="btn green" type="submit" disabled={errors.length > 0} data-testid="approve-button">
                승인 · 발행
              </button>
            </form>
            <form method="post" action={`/drafts/${draft.id}/reject`} class="row">
              <input type="text" name="note" placeholder="반려 사유" data-testid="reject-note" />
              <button class="btn red" type="submit" data-testid="reject-button">
                반려
              </button>
            </form>
          </div>
        </>
      )}
    </Layout>,
  );
});

app.post('/drafts/:id/save', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  let skill: DraftSkill;
  try {
    skill = JSON.parse(String(body.payload ?? ''));
  } catch {
    return c.html(
      <Layout title="저장 실패">
        <div class="error">JSON 파싱에 실패했어요 — 문법을 확인해 주세요.</div>
        <a class="btn gray" href={`/drafts/${id}`}>
          돌아가기
        </a>
      </Layout>,
      400,
    );
  }
  await prisma.contentDraft.update({ where: { id }, data: { payload: skill as object } });
  return c.redirect(`/drafts/${id}`);
});

app.post('/drafts/:id/approve', async (c) => {
  const id = c.req.param('id');
  const draft = await prisma.contentDraft.findUnique({ where: { id } });
  if (!draft || draft.status === 'PUBLISHED') return c.redirect(`/drafts/${id}`);
  const pair = await prisma.languagePair.findUnique({ where: { id: draft.languagePairId } });
  if (!pair) return c.text('언어쌍이 없어요', 400);

  const skill = draft.payload as unknown as DraftSkill;
  const errors = validateDraftSkill(skill);
  if (errors.length > 0) return c.redirect(`/drafts/${id}`); // 화면에서 이미 비활성 — 서버도 재검증

  // 발행 — 스킬 트리 맨 뒤에 추가 (order = max + 1)
  const maxOrder = await prisma.skill.aggregate({
    where: { languagePairId: pair.id },
    _max: { order: true },
  });
  const published = await prisma.$transaction(async (tx) => {
    const created = await tx.skill.create({
      data: {
        languagePairId: pair.id,
        order: (maxOrder._max.order ?? 0) + 1,
        title: skill.title,
        icon: skill.icon,
        description: skill.description,
        lessons: {
          create: skill.lessons.map((lesson, li) => ({
            order: li + 1,
            title: lesson.title,
            xpReward: 10,
            exercises: {
              create: lesson.exercises.map((ex, ei) => ({
                order: ei + 1,
                type: ex.type,
                prompt: ex.prompt,
                options: ex.payload as object,
                explanation: ex.explanation,
                sourceLang: pair.sourceLang,
                targetLang: pair.targetLang,
              })),
            },
          })),
        },
      },
    });
    await tx.contentDraft.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedSkillId: created.id, reviewNote: null },
    });
    return created;
  });
  console.log(`발행 완료: skill=${published.id} (${skill.title})`);
  return c.redirect(`/drafts/${id}`);
});

app.post('/drafts/:id/reject', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  await prisma.contentDraft.update({
    where: { id },
    data: { status: 'REJECTED', reviewNote: String(body.note ?? '') || null },
  });
  return c.redirect(`/drafts/${id}`);
});

const port = Number(process.env.PORT ?? 3100);
serve({ fetch: app.fetch, port }, () => {
  console.log(`🦉 Ted Admin: http://localhost:${port} (AI 생성: ${aiAvailable() ? '활성' : '비활성 — 모의 생성만'})`);
});
