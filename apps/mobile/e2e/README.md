# e2e 테스트 (학습 루프)

로컬 Supabase + Expo web으로 전체 학습 루프를 브라우저에서 검증한다.
가입 → 온보딩 → 레슨 플레이(5종 문제 전부 정답) → 완료(XP·스트릭) → 홈 반영 → 오답 시 하트 감소.

## 실행

```bash
# 1. 로컬 Supabase 실행 중이어야 함 (supabase start + 마이그레이션/시드)
# 2. Expo web 서버
cd apps/mobile && CI=1 npx expo start --web --port 8081

# 3. 다른 터미널에서 (playwright 필요: pip install playwright && playwright install chromium)
python3 apps/mobile/e2e/learning_loop.py
```

매 실행마다 새 계정(e2e-<timestamp>@example.com)을 만들므로 반복 실행 가능.
스크린샷은 /tmp/ted_e2e_*.png 에 저장된다.
