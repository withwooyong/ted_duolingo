"""Ted Duolingo — SM-2 복습 루프 e2e (가입→온보딩→레슨→due 백데이트→복습 배너→복습 세션→완료→홈 반영)

복습 대상(due)은 SM-2상 첫 정답이면 +1일 뒤라 레슨 직후엔 비어 있다.
실제 복습 UI를 구동하기 위해 레슨 완료 후 user_review_state.due_at을 과거로 당긴다(psql).
학습 루프 본 시나리오(learning_loop.py)의 '총 XP 15' 단언을 깨지 않도록 별도 파일로 둔다.
"""
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8081'
DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
EMAIL = f'e2e-review-{int(time.time())}@example.com'
PASSWORD = 'test1234'
PASS = []
FAIL = []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(('  ✅' if cond else '  ❌') + ' ' + name)


def shot(page, name):
    page.screenshot(path=f'/tmp/ted_review_{name}.png', full_page=False)


def tid(page, t):
    return page.locator(f'[data-testid="{t}"]')


def backdate_reviews():
    """이 로컬 e2e DB의 모든 복습 상태를 due로 만든다 (어제로 당김)."""
    subprocess.run(
        ['psql', DB_URL, '-c',
         "update public.user_review_state set due_at = now() - interval '1 day';"],
        check=True, capture_output=True, text=True,
    )


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.set_default_timeout(30000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    print('1) 가입 + 온보딩(영어)')
    page.goto(BASE, timeout=180000)
    page.wait_for_load_state('networkidle', timeout=180000)
    page.wait_for_selector('[data-testid="auth-email"]', timeout=120000)
    tid(page, 'auth-toggle').click()
    tid(page, 'auth-email').fill(EMAIL)
    tid(page, 'auth-password').fill(PASSWORD)
    tid(page, 'auth-submit').click()
    page.wait_for_selector('[data-testid="pair-en"]', timeout=60000)
    tid(page, 'pair-en').click()
    tid(page, 'onboarding-next').click()
    page.wait_for_selector('[data-testid="goal-20"]')
    tid(page, 'goal-20').click()
    tid(page, 'onboarding-finish').click()

    print('2) 첫 영어 레슨 (6문제 전부 정답)')
    page.wait_for_selector('[data-testid="continue-button"]', timeout=60000)
    tid(page, 'continue-button').click()

    def feedback_continue():
        page.wait_for_selector('[data-testid="feedback-continue"]')
        tid(page, 'feedback-continue').click()

    page.wait_for_selector('[data-testid="speaker"]')
    page.get_by_text('Hello, nice to meet you.', exact=True).click()
    tid(page, 'check-button').click(); feedback_continue()

    page.wait_for_selector('[data-testid="chip-morning"]')
    tid(page, 'chip-morning').click()
    tid(page, 'check-button').click(); feedback_continue()

    page.wait_for_selector('[data-testid="match-ko-0"]')
    for i in range(4):
        tid(page, f'match-ko-{i}').click()
        tid(page, f'match-en-{i}').click()
    feedback_continue()

    page.wait_for_selector('[data-testid="bank-word-Nice"]')
    for w in ['Nice', 'to', 'meet', 'you']:
        tid(page, f'bank-word-{w}').click()
    tid(page, 'check-button').click(); feedback_continue()

    page.wait_for_selector('text=두 사람은 지금 무엇을 하고 있나요?')
    page.get_by_text('처음 만나 인사한다', exact=True).click()
    tid(page, 'check-button').click(); feedback_continue()

    page.wait_for_selector('[data-testid="speaker"]')
    page.get_by_text('Good morning!', exact=True).click()
    tid(page, 'check-button').click(); feedback_continue()

    print('3) 레슨 완료 → 홈')
    page.wait_for_selector('[data-testid="complete-title"]', timeout=30000)
    page.wait_for_timeout(1600)
    tid(page, 'complete-continue').click()
    page.wait_for_selector('[data-testid="continue-button"]', timeout=30000)
    page.wait_for_timeout(1000)
    check('레슨 직후: 복습 배너 없음 (due 아님)', tid(page, 'review-banner').count() == 0)
    check('홈: 총 XP 15', '15' in tid(page, 'hud-xp').inner_text())

    print('4) due_at 백데이트(어제) → 홈 재진입 시 복습 배너')
    backdate_reviews()
    page.goto(BASE)
    page.wait_for_selector('[data-testid="review-banner"]', timeout=30000)
    banner = tid(page, 'review-banner').inner_text()
    check('복습 배너 표시', tid(page, 'review-banner').count() == 1)
    check('복습 배너: 6개', '6개' in banner)
    shot(page, '01_home_banner')

    print('5) 복습 세션 진입 → 6문제 (순서 무관 정답 처리)')
    tid(page, 'review-banner').click()
    page.wait_for_selector('[data-testid="review-area"]', timeout=30000)

    def answer_current():
        """현재 표시된 복습 문제를 유형에 맞춰 정답 처리."""
        page.wait_for_selector('[data-testid="review-area"]')
        page.wait_for_timeout(150)
        # MATCH_PAIRS: 자동 제출 (확인 버튼 없음)
        if tid(page, 'match-ko-0').count() == 1:
            for i in range(4):
                tid(page, f'match-ko-{i}').click()
                tid(page, f'match-en-{i}').click()
            feedback_continue()
            return
        # LISTEN_SELECT: 두 듣기 문제 중 보이는 정답 클릭
        if tid(page, 'speaker').count() >= 1:
            for label in ['Hello, nice to meet you.', 'Good morning!']:
                loc = page.get_by_text(label, exact=True)
                if loc.count() >= 1:
                    loc.first.click()
                    break
        elif tid(page, 'chip-morning').count() == 1:  # FILL_BLANK
            tid(page, 'chip-morning').click()
        elif tid(page, 'bank-word-Nice').count() == 1:  # ORDER_WORDS
            for w in ['Nice', 'to', 'meet', 'you']:
                tid(page, f'bank-word-{w}').click()
        else:  # COMPREHENSION_MCQ
            page.get_by_text('처음 만나 인사한다', exact=True).click()
        tid(page, 'review-check-button').click()
        feedback_continue()

    for _ in range(6):
        if tid(page, 'review-done').count() == 1:
            break
        answer_current()

    print('6) 복습 완료 화면')
    page.wait_for_selector('[data-testid="review-done"]', timeout=30000)
    check('복습 완료: 6/6 정답', '6 / 6' in tid(page, 'review-score').inner_text())
    check('복습 완료: +5 XP', '+5' in tid(page, 'review-xp').inner_text())
    shot(page, '02_review_done')
    tid(page, 'review-done-home').click()

    print('7) 홈 반영 (복습 XP 총합 +5, 배너 사라짐)')
    page.wait_for_selector('[data-testid="continue-button"]', timeout=30000)
    page.wait_for_timeout(1500)
    check('홈: 총 XP 20 (레슨15 + 복습5)', '20' in tid(page, 'hud-xp').inner_text())
    check('홈: 일일 목표 15/20 (복습은 일일 목표 제외)',
          '15 / 20' in tid(page, 'daily-goal').inner_text())
    check('홈: 복습 배너 사라짐 (전부 정답 → 다음 간격으로)',
          tid(page, 'review-banner').count() == 0)
    shot(page, '03_home_after')

    if errors:
        print('\n⚠️ 페이지 JS 에러:')
        for e in errors[:5]:
            print('  ', e[:200])

    browser.close()

print(f'\n결과: {len(PASS)}개 통과, {len(FAIL)}개 실패')
if FAIL:
    print('실패 목록:', FAIL)
    sys.exit(1)
