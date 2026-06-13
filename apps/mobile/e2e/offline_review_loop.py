"""Ted Duolingo — 오프라인 복습 쓰기 큐 e2e (D24)

가입→온보딩→레슨 완료(온라인, 복습 상태 생성)→due 백데이트(psql)→홈 재진입(복습 스냅샷 prefetch)
→ 오프라인 전환 → 복습 배너(동결 스냅샷 기준) 유지 → 오프라인 복습 풀이(7문제 퍼펙트)
→ 완료 화면(오프라인 대기 안내) → 홈 낙관 반영(총 XP +5·동기화 대기 1·배너 사라짐)
→ 온라인 복귀 → SyncProcessor 큐 드레인 → reload 후 서버 반영(XP 20·user_review_session 1행·due 전진) 확인.

Playwright는 page.context().set_offline()로 네트워크를 끊는다(navigator.onLine=false → onlineManager).
복습 due는 첫 정답이면 +1일이라 레슨 직후엔 비어 있어, review_loop처럼 due_at을 과거로 당긴다(psql).
"""
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8081'
DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
EMAIL = f'e2e-offrev-{int(time.time())}@example.com'
PASSWORD = 'test1234'
PASS = []
FAIL = []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(('  ✅' if cond else '  ❌') + ' ' + name)


def shot(page, name):
    page.screenshot(path=f'/tmp/ted_offrev_{name}.png', full_page=False)


def tid(page, t):
    return page.locator(f'[data-testid="{t}"]')


def psql(sql):
    return subprocess.run(
        ['psql', DB_URL, '-tAc', sql], check=True, capture_output=True, text=True,
    ).stdout.strip()


def backdate_reviews(email):
    """이 사용자의 복습 상태를 due로 만든다 (어제로 당김). profiles.id = auth.users.id."""
    psql(
        "update public.user_review_state s set due_at = now() - interval '1 day' "
        f"from auth.users u where s.user_id = u.id and u.email = '{email}';"
    )


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.set_default_timeout(30000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    # SHADOW_SPEAK STT mock — 헤드리스엔 Web Speech가 없어 인식 결과를 주입(오프라인에서도 client-only라 동작)
    page.add_init_script("window.__mockShadowTranscript = 'Nice to meet you';")

    def feedback_continue():
        page.wait_for_selector('[data-testid="feedback-continue"]')
        tid(page, 'feedback-continue').click()

    print('1) 가입 → 온보딩 → 홈')
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

    print('2) 첫 레슨 온라인 완료(7문제 퍼펙트) — 복습 상태 생성')
    page.wait_for_selector('[data-testid="continue-button"]', timeout=60000)
    tid(page, 'continue-button').click()

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

    page.wait_for_selector('[data-testid="shadow-mic"]')
    tid(page, 'shadow-mic').click()
    page.wait_for_selector('[data-testid="shadow-result"]')
    tid(page, 'check-button').click(); feedback_continue()

    page.wait_for_selector('[data-testid="complete-title"]', timeout=30000)
    page.wait_for_timeout(1600)
    tid(page, 'complete-continue').click()
    page.wait_for_selector('[data-testid="continue-button"]', timeout=30000)
    page.wait_for_timeout(1000)
    check('레슨 완료: 홈 총 XP 15', '15' in tid(page, 'hud-xp').inner_text())

    print('3) due_at 백데이트 → 홈 재진입 → 복습 스냅샷 prefetch')
    backdate_reviews(EMAIL)
    page.goto(BASE)
    page.wait_for_selector('[data-testid="review-banner"]', timeout=30000)
    check('온라인: 복습 배너 7개', '7개' in tid(page, 'review-banner').inner_text())
    # 동결 스냅샷 prefetch 완료 + persist 플러시(throttle 1s) 대기 — 오프라인 진입 보장
    page.wait_for_timeout(2500)
    shot(page, '01_home_online')

    print('4) 오프라인 전환 → 배너·스냅샷 유지')
    page.context.set_offline(True)
    page.wait_for_selector('[data-testid="offline-banner"]', timeout=15000)
    check('오프라인 배너 표시', tid(page, 'offline-banner').count() == 1)
    check('오프라인: 복습 배너 유지(동결 스냅샷)', tid(page, 'review-banner').count() == 1)
    check('오프라인: 복습 배너 7개', '7개' in tid(page, 'review-banner').inner_text())

    print('5) 오프라인 복습 진입 (차단되지 않음)')
    tid(page, 'review-banner').click()
    page.wait_for_selector('[data-testid="review-area"]', timeout=15000)
    check('오프라인 복습 진입 성공 (차단 안 됨)', tid(page, 'review-offline').count() == 0)
    check('복습 화면 진입 (URL /review)', '/review' in page.url)
    shot(page, '02_offline_review')

    print('6) 오프라인 복습 7문제 전부 정답')

    def answer_current():
        page.wait_for_selector('[data-testid="review-area"]')
        page.wait_for_timeout(150)
        if tid(page, 'match-ko-0').count() == 1:
            for i in range(4):
                tid(page, f'match-ko-{i}').click()
                tid(page, f'match-en-{i}').click()
            feedback_continue()
            return
        if tid(page, 'shadow-mic').count() == 1:
            tid(page, 'shadow-mic').click()
            page.wait_for_selector('[data-testid="shadow-result"]')
            tid(page, 'review-check-button').click()
            feedback_continue()
            return
        if tid(page, 'speaker').count() >= 1:
            for label in ['Hello, nice to meet you.', 'Good morning!']:
                loc = page.get_by_text(label, exact=True)
                if loc.count() >= 1:
                    loc.first.click()
                    break
        elif tid(page, 'chip-morning').count() == 1:
            tid(page, 'chip-morning').click()
        elif tid(page, 'bank-word-Nice').count() == 1:
            for w in ['Nice', 'to', 'meet', 'you']:
                tid(page, f'bank-word-{w}').click()
        else:
            page.get_by_text('처음 만나 인사한다', exact=True).click()
        tid(page, 'review-check-button').click()
        feedback_continue()

    for _ in range(7):
        if tid(page, 'review-done').count() == 1:
            break
        answer_current()

    print('7) 복습 완료 화면 (오프라인 대기 안내)')
    page.wait_for_selector('[data-testid="review-done"]', timeout=30000)
    check('복습 완료: 7/7 정답', '7 / 7' in tid(page, 'review-score').inner_text())
    check('복습 완료: +5 XP', '+5' in tid(page, 'review-xp').inner_text())
    check('오프라인 대기 안내 표시', tid(page, 'review-pending-note').count() == 1)
    shot(page, '03_review_done')
    tid(page, 'review-done-home').click()

    print('8) 홈 낙관 반영 (총 XP 20·동기화 대기 1·배너 사라짐)')
    page.wait_for_selector('[data-testid="continue-button"]', timeout=30000)
    page.wait_for_timeout(800)
    check('홈: 총 XP 20 (레슨15 + 복습5 낙관)', '20' in tid(page, 'hud-xp').inner_text())
    check('홈: 동기화 대기 1개', tid(page, 'sync-pending').count() == 1
          and '1개' in tid(page, 'sync-pending').inner_text())
    check('홈: 복습 배너 사라짐 (스냅샷 소진)', tid(page, 'review-banner').count() == 0)
    check('홈: 일일 목표 15/20 (복습은 일일 목표 제외)',
          '15 / 20' in tid(page, 'daily-goal').inner_text())
    shot(page, '04_home_offline_after')

    print('9) 온라인 복귀 → 큐 드레인 → reload 후 서버 반영')
    page.context.set_offline(False)
    page.wait_for_timeout(3500)  # SyncProcessor 드레인 대기
    page.goto(BASE)
    page.wait_for_selector('[data-testid="continue-button"]', timeout=30000)
    page.wait_for_timeout(1500)
    check('복귀 후: 총 XP 20 (이중 적용 없음)', '20' in tid(page, 'hud-xp').inner_text())
    check('복귀 후: 동기화 대기 사라짐', tid(page, 'sync-pending').count() == 0)
    check('복귀 후: 복습 배너 사라짐 (서버 due 전진)', tid(page, 'review-banner').count() == 0)
    shot(page, '05_home_synced')

    print('10) DB 검증 — user_review_session 1행 + due 전진')
    sess_count = psql(
        "select count(*) from public.user_review_session s "
        f"join auth.users u on u.id = s.user_id where u.email = '{EMAIL}';"
    )
    check('user_review_session 1행 기록', sess_count == '1')
    due_future = psql(
        "select count(*) from public.user_review_state s "
        f"join auth.users u on u.id = s.user_id where u.email = '{EMAIL}' "
        "and s.due_at > now();"
    )
    check('복습 due 전부 미래로 전진(7행)', due_future == '7')
    server_xp = psql(
        "select pr.xp from public.profiles pr "
        f"join auth.users u on u.id = pr.id where u.email = '{EMAIL}';"
    )
    check('서버 프로필 XP 20', server_xp == '20')

    if errors:
        print('\n⚠️ 페이지 JS 에러:')
        for e in errors[:5]:
            print('  ', e[:200])

    browser.close()

print(f'\n결과: {len(PASS)}개 통과, {len(FAIL)}개 실패')
if FAIL:
    print('실패 목록:', FAIL)
    sys.exit(1)
