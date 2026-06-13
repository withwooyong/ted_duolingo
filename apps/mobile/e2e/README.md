# e2e 테스트

로컬 Supabase + Expo web으로 브라우저에서 실제 동선을 검증한다.

- **`learning_loop.py`** (67체크) — 가입 → 온보딩 → 레슨(6종 전부 정답 — Shadowing 포함) → 완료(XP·스트릭) → 홈 반영 → 오답 하트 감소 → 리그·프로필·설정 → 언어 추가 페이월 → mock 구독 → 언어 전환(ko↔ja).
- **`review_loop.py`** (9체크) — SM-2 복습: 레슨 완료 → `user_review_state.due_at` 백데이트(psql) → 홈 복습 배너 → `/review` 세션(due 7문제 정답) → 완료(+5 XP) → 홈 반영(총 XP 20·일일 목표 15 유지·배너 사라짐). 복습 due는 첫 정답이 +1일 뒤라 백데이트로 강제한다.
- **`offline_loop.py`** (15체크) — 오프라인 읽기 캐시(D21): 가입→홈(캐시 워밍) → persist 캐시 키가 userId 스코프·내용에 `skill-tree` 포함·`league` 제외 → `set_offline(True)` 배너 표시 → SPA 탭 이동으로 캐시 열람(빈 화면/무한 로딩 아님) → **캐시된(prefetch된) 레슨은 오프라인 진입 가능**(D22가 D21 차단을 큐잉으로 대체) → `set_offline(False)` 배너 사라짐 → A 로그아웃 시 캐시 제거→B 가입 시 다른 캐시 키.
- **`offline_write_loop.py`** (21체크) — 오프라인 쓰기 큐(D22): 가입→홈(이어하기 레슨 prefetch) → `set_offline(True)` → **오프라인 캐시 레슨 풀이(퍼펙트)** → 완료 화면(오프라인 동기화 대기 안내) → 홈 **낙관 반영**(XP 15·스트릭 1·스킬 진행 1/2·"동기화 대기 1개") → `set_offline(False)` → **SyncProcessor 큐 드레인**(대기 pill 사라짐) → reload 후 **서버 반영 확인**(XP 정확히 15 — 이중 적용 없음, 동기화가 서버에 수여한 첫 레슨·퍼펙트 배지).

> **Shadowing(SHADOW_SPEAK)**: Playwright는 실제 마이크 입력을 줄 수 없으므로 `page.add_init_script`로 `window.__mockShadowTranscript`에 인식 결과를 주입한다 (`lib/speech-recognition.ts`가 이 값을 읽는다).
>
> **오프라인(offline_loop)**: `page.context().set_offline()`로 네트워크를 끊는다. dev web은 서비스워커가 없어 **오프라인 full reload(번들 재요청)가 불가**하므로 reload 대신 SPA 내 탭 이동으로 캐시 열람을 검증한다(실제 오프라인 복원은 네이티브 임베드 번들 / PWA SW에서). `lib/online-status.ts`를 수정했다면 Metro를 `--clear`로 재기동해야 반영된다(CI 모드는 워치 안 함).

## 실행

```bash
# 1. 로컬 Supabase 실행 중이어야 함 (supabase start + 마이그레이션/RLS 0001~0004/시드)
# 2. Expo web 서버
cd apps/mobile && CI=1 npx expo start --web --port 8081

# 3. 다른 터미널에서 (playwright 필요: pip install playwright && playwright install chromium)
python3 apps/mobile/e2e/learning_loop.py
python3 apps/mobile/e2e/review_loop.py    # psql 필요 (due_at 백데이트)
python3 apps/mobile/e2e/offline_loop.py   # 오프라인 읽기 캐시
python3 apps/mobile/e2e/offline_write_loop.py  # 오프라인 쓰기 큐
```

매 실행마다 새 계정(e2e-<timestamp>@example.com)을 만들므로 반복 실행 가능.
스크린샷은 /tmp/ted_e2e_*.png · /tmp/ted_review_*.png 에 저장된다.
