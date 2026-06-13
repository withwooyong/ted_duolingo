/** Admin 화면 — Hono JSX SSR (내부 도구, prototype/index.html 팔레트 차용) */
import { LANG_FLAGS, type DraftExercise, type DraftSkill } from '@ted/shared';
import type { Child } from 'hono/jsx';

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: '검수 대기', color: '#ff9600' },
  REJECTED: { label: '반려', color: '#ff4b4b' },
  PUBLISHED: { label: '발행됨', color: '#58cc02' },
};

const CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Apple SD Gothic Neo', sans-serif; margin: 0; background: #f7f7f7; color: #3c3c3c; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 24px 20px 60px; }
  header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  h1 { font-size: 22px; margin: 0; } h1 a { color: inherit; text-decoration: none; }
  h2 { font-size: 16px; margin: 24px 0 8px; }
  .card { background: #fff; border: 2px solid #e5e5e5; border-radius: 16px; padding: 16px; margin-bottom: 12px; }
  .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; color: #fff; font-size: 12px; font-weight: 800; }
  .btn { display: inline-block; border: 0; border-radius: 12px; padding: 10px 18px; font-size: 14px; font-weight: 800; cursor: pointer; text-decoration: none; color: #fff; background: #1cb0f6; }
  .btn.green { background: #58cc02; } .btn.red { background: #ff4b4b; } .btn.gray { background: #afafaf; }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  input[type=text], input[type=number], select, textarea { width: 100%; border: 2px solid #e5e5e5; border-radius: 12px; padding: 10px 12px; font-size: 14px; font-family: inherit; }
  textarea.json { font-family: ui-monospace, monospace; font-size: 12px; min-height: 320px; }
  label { display: block; font-size: 12px; font-weight: 800; color: #777; margin: 14px 0 6px; text-transform: uppercase; }
  .muted { color: #999; font-size: 12px; }
  .error { background: #fff0f0; border: 2px solid #ff4b4b; border-radius: 12px; padding: 10px 14px; color: #c00; font-size: 13px; margin: 6px 0; }
  .ok { background: #f0fff0; border: 2px solid #58cc02; border-radius: 12px; padding: 10px 14px; color: #2e7d00; font-size: 13px; margin: 6px 0; }
  .exercise { border-top: 1px solid #eee; padding: 10px 0; font-size: 14px; }
  .exercise .type { font-size: 11px; font-weight: 800; color: #ce82ff; text-transform: uppercase; }
  .answer { color: #2e7d00; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; } td, th { text-align: left; padding: 6px 4px; font-size: 14px; }
`;

export function Layout({ title, children }: { title: string; children?: Child }) {
  return (
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} · Ted Admin</title>
        <style>{CSS}</style>
      </head>
      <body>
        <div class="wrap">
          <header>
            <h1>
              <a href="/">🦉 Ted Admin</a>
            </h1>
            <a class="btn" href="/new" data-testid="nav-new">
              ＋ 콘텐츠 생성
            </a>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: '#777' };
  return (
    <span class="badge" style={`background:${s.color}`} data-testid={`status-${status}`}>
      {s.label}
    </span>
  );
}

/** 문제 1개 요약 — 검수자가 정답·보기를 한눈에 보도록 */
export function ExerciseSummary({ ex }: { ex: DraftExercise }) {
  const p = ex.payload;
  return (
    <div class="exercise">
      <div class="type">{ex.type}</div>
      <div>{ex.prompt}</div>
      {p.type === 'LISTEN_SELECT' && (
        <div>
          🔊 <b>{p.audioText}</b> · 보기:{' '}
          {p.options.map((o, i) => (
            <span class={i === p.answerIndex ? 'answer' : ''}>{i > 0 ? ' / ' : ''}{o}</span>
          ))}
        </div>
      )}
      {p.type === 'FILL_BLANK' && (
        <div>
          {p.sentence.map((part) => (part === null ? '〔　〕' : part))} · 보기:{' '}
          {p.options.map((o, i) => (
            <span class={o === p.answer ? 'answer' : ''}>{i > 0 ? ' / ' : ''}{o}</span>
          ))}
        </div>
      )}
      {p.type === 'MATCH_PAIRS' && (
        <div>{p.pairs.map(([a, b], i) => `${i > 0 ? ' · ' : ''}${a}=${b}`)}</div>
      )}
      {p.type === 'ORDER_WORDS' && (
        <div>
          단어: {p.words.join(' / ')} → <span class="answer">{p.answer}</span>
        </div>
      )}
      {p.type === 'COMPREHENSION_MCQ' && (
        <div>
          <div class="muted" style="white-space:pre-line">{p.passage}</div>
          {p.question} · 보기:{' '}
          {p.options.map((o, i) => (
            <span class={i === p.answerIndex ? 'answer' : ''}>{i > 0 ? ' / ' : ''}{o}</span>
          ))}
        </div>
      )}
      <div class="muted">해설: {ex.explanation}</div>
    </div>
  );
}

export function SkillPreview({ skill }: { skill: DraftSkill }) {
  return (
    <div data-testid="skill-preview">
      <div class="row">
        <span style="font-size:28px">{skill.icon}</span>
        <b style="font-size:18px">{skill.title}</b>
        <span class="muted">{skill.description}</span>
      </div>
      {skill.lessons.map((lesson, li) => (
        <div class="card">
          <b>
            레슨 {li + 1}. {lesson.title}
          </b>{' '}
          <span class="muted">문제 {lesson.exercises.length}개</span>
          {lesson.exercises.map((ex) => (
            <ExerciseSummary ex={ex} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PairLabel({
  pair,
}: {
  pair: { sourceLang: string; targetLang: string; displayName: string };
}) {
  return (
    <span>
      {LANG_FLAGS[pair.sourceLang] ?? ''} {pair.displayName} {LANG_FLAGS[pair.targetLang] ?? ''}
    </span>
  );
}
