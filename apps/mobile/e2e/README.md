# e2e 테스트

로컬 Supabase + Expo web으로 브라우저에서 실제 동선을 검증한다.

- **`learning_loop.py`** (67체크) — 가입 → 온보딩 → 레슨(6종 전부 정답 — Shadowing 포함) → 완료(XP·스트릭) → 홈 반영 → 오답 하트 감소 → 리그·프로필·설정 → 언어 추가 페이월 → mock 구독 → 언어 전환(ko↔ja).
- **`review_loop.py`** (9체크) — SM-2 복습: 레슨 완료 → `user_review_state.due_at` 백데이트(psql) → 홈 복습 배너 → `/review` 세션(due 7문제 정답) → 완료(+5 XP) → 홈 반영(총 XP 20·일일 목표 15 유지·배너 사라짐). 복습 due는 첫 정답이 +1일 뒤라 백데이트로 강제한다.

> **Shadowing(SHADOW_SPEAK)**: Playwright는 실제 마이크 입력을 줄 수 없으므로 `page.add_init_script`로 `window.__mockShadowTranscript`에 인식 결과를 주입한다 (`lib/speech-recognition.ts`가 이 값을 읽는다).

## 실행

```bash
# 1. 로컬 Supabase 실행 중이어야 함 (supabase start + 마이그레이션/RLS 0001~0004/시드)
# 2. Expo web 서버
cd apps/mobile && CI=1 npx expo start --web --port 8081

# 3. 다른 터미널에서 (playwright 필요: pip install playwright && playwright install chromium)
python3 apps/mobile/e2e/learning_loop.py
python3 apps/mobile/e2e/review_loop.py   # psql 필요 (due_at 백데이트)
```

매 실행마다 새 계정(e2e-<timestamp>@example.com)을 만들므로 반복 실행 가능.
스크린샷은 /tmp/ted_e2e_*.png · /tmp/ted_review_*.png 에 저장된다.
