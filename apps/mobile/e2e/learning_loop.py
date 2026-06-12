"""Ted Duolingo — 학습 루프 e2e (가입→온보딩→레슨→완료→홈 반영→리그·프로필·설정)"""
import sys
import time

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8081'
EMAIL = f'e2e-{int(time.time())}@example.com'
PASSWORD = 'test1234'
PASS = []
FAIL = []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(('  ✅' if cond else '  ❌') + ' ' + name)


def shot(page, name):
    page.screenshot(path=f'/tmp/ted_e2e_{name}.png', full_page=False)


def tid(page, t):
    return page.locator(f'[data-testid="{t}"]')


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.set_default_timeout(30000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    print('1) 로드 + 인증 화면')
    page.goto(BASE, timeout=180000)
    page.wait_for_load_state('networkidle', timeout=180000)
    page.wait_for_selector('[data-testid="auth-email"]', timeout=120000)
    check('인증 화면 표시', tid(page, 'auth-submit').count() == 1)
    shot(page, '01_auth')

    print('2) 회원가입')
    tid(page, 'auth-toggle').click()  # 회원가입 모드
    tid(page, 'auth-email').fill(EMAIL)
    tid(page, 'auth-password').fill(PASSWORD)
    tid(page, 'auth-submit').click()

    print('3) 온보딩 (신규 가입 → 자동 진입)')
    page.wait_for_selector('[data-testid="pair-en"]', timeout=60000)
    check('온보딩: 언어 선택 표시', True)
    shot(page, '02_onboarding_lang')
    tid(page, 'pair-en').click()
    tid(page, 'onboarding-next').click()
    page.wait_for_selector('[data-testid="goal-20"]')
    tid(page, 'goal-20').click()
    shot(page, '03_onboarding_goal')
    tid(page, 'onboarding-finish').click()

    print('4) 홈 (스킬 트리)')
    page.wait_for_selector('[data-testid="continue-button"]', timeout=60000)
    check('홈: 이어하기 버튼', '첫 인사' in tid(page, 'continue-button').inner_text())
    check('홈: HUD 스트릭 0', '0' in tid(page, 'hud-streak').inner_text())
    check('홈: HUD 하트 5', '5' in tid(page, 'hud-hearts').inner_text())
    check('홈: HUD XP 0', '0' in tid(page, 'hud-xp').inner_text())
    check('홈: 일일 목표 20', '/ 20 XP' in tid(page, 'daily-goal').inner_text())
    check('홈: 스킬 4개', all(tid(page, f'skill-{i}').count() == 1 for i in range(1, 5)))
    shot(page, '04_home')

    print('5) 레슨 시작 → 문제 6개 (전부 정답)')
    tid(page, 'continue-button').click()

    def feedback_continue(expect_correct=True):
        page.wait_for_selector('[data-testid="feedback-title"]')
        title = tid(page, 'feedback-title').inner_text()
        check(f'피드백: {"정답" if expect_correct else "오답"}',
              ('정답' in title) if expect_correct else ('아쉬' in title))
        tid(page, 'feedback-continue').click()

    # 5-1 듣고 고르기: "Hello, nice to meet you."
    page.wait_for_selector('[data-testid="speaker"]')
    shot(page, '05_listen')
    page.get_by_text('Hello, nice to meet you.', exact=True).click()
    tid(page, 'check-button').click()
    feedback_continue()

    # 5-2 빈칸: morning
    page.wait_for_selector('[data-testid="chip-morning"]')
    shot(page, '06_fill')
    tid(page, 'chip-morning').click()
    tid(page, 'check-button').click()
    feedback_continue()

    # 5-3 짝 맞추기: pairIndex끼리 클릭 (자동 제출)
    page.wait_for_selector('[data-testid="match-ko-0"]')
    shot(page, '07_match')
    for i in range(4):
        tid(page, f'match-ko-{i}').click()
        tid(page, f'match-en-{i}').click()
    feedback_continue()

    # 5-4 단어 배열: Nice to meet you
    page.wait_for_selector('[data-testid="bank-word-Nice"]')
    shot(page, '08_order')
    for w in ['Nice', 'to', 'meet', 'you']:
        tid(page, f'bank-word-{w}').click()
    tid(page, 'check-button').click()
    feedback_continue()

    # 5-5 독해: 처음 만나 인사한다
    page.wait_for_selector('text=두 사람은 지금 무엇을 하고 있나요?')
    shot(page, '09_mcq')
    page.get_by_text('처음 만나 인사한다', exact=True).click()
    tid(page, 'check-button').click()
    feedback_continue()

    # 5-6 듣고 고르기: "Good morning!"
    page.wait_for_selector('[data-testid="speaker"]')
    page.get_by_text('Good morning!', exact=True).click()
    tid(page, 'check-button').click()
    feedback_continue()

    print('6) 완료 화면 (퍼펙트 +15 XP + 새 배지)')
    page.wait_for_selector('[data-testid="complete-title"]', timeout=30000)
    page.wait_for_timeout(1600)  # 등장 연출(최대 800ms 지연 + 450ms) 종료 대기
    check('완료: 퍼펙트 문구', '퍼펙트' in tid(page, 'complete-title').inner_text())
    check('완료: +15 XP (10+보너스5)', '+15' in tid(page, 'reward-xp').inner_text())
    new_badges = tid(page, 'new-badges').inner_text()
    check('완료: 첫 레슨 배지', '첫 레슨' in new_badges)
    check('완료: 퍼펙트 레슨 배지', '퍼펙트 레슨' in new_badges)
    shot(page, '10_complete')
    tid(page, 'complete-continue').click()

    print('7) 홈 반영 (XP·스트릭·진행)')
    page.wait_for_selector('[data-testid="continue-button"]', timeout=30000)
    page.wait_for_timeout(1500)  # 쿼리 invalidate 반영
    check('홈: XP 15 반영', '15' in tid(page, 'hud-xp').inner_text())
    check('홈: 스트릭 1', '1' in tid(page, 'hud-streak').inner_text())
    check('홈: 다음 레슨 = 안부 묻기', '안부 묻기' in tid(page, 'continue-button').inner_text())
    check('홈: 일일 목표 15/20', '15 / 20' in tid(page, 'daily-goal').inner_text())
    skill1 = tid(page, 'skill-1').inner_text()
    check('홈: 스킬1 진행 1/2', '1 / 2' in skill1)
    shot(page, '11_home_after')

    print('8) 리그 탭 (주간 랭킹 — 봇 코호트 합류)')
    page.get_by_text('리그', exact=True).click()
    page.wait_for_selector('[data-testid="league-tier"]', timeout=30000)
    check('리그: 브론즈 리그', '브론즈' in tid(page, 'league-tier').inner_text())
    me_row = tid(page, 'league-me')
    check('리그: 내 행 표시', me_row.count() == 1)
    check('리그: 내 주간 XP 15', '15 XP' in me_row.inner_text())
    standings = tid(page, 'league-standings').inner_text()
    # 주의: 봇 코호트(10명)는 e2e 반복 실행으로 차면 새 코호트가 만들어진다 — 인원수 대신 정렬을 검증
    xps = [int(line.split(' XP')[0].split()[-1]) for line in standings.splitlines() if ' XP' in line]
    check('리그: 주간 XP 내림차순 정렬', xps == sorted(xps, reverse=True) and len(xps) >= 1)
    check('리그: 승급 구간 표시', '승급 구간' in standings)
    shot(page, '13_league')

    print('9) 프로필 탭 (통계·배지)')
    page.get_by_text('프로필', exact=True).click()
    page.wait_for_selector('[data-testid="profile-stats"]', timeout=30000)
    stats = tid(page, 'profile-stats').inner_text()
    check('프로필: 스트릭 1일', '1일' in stats)
    check('프로필: 총 XP 15', '15' in stats)
    check('프로필: 현재 리그 브론즈', '브론즈' in stats)
    check('프로필: 첫 레슨 배지 획득', tid(page, 'badge-first_lesson-earned').count() == 1)
    check('프로필: 퍼펙트 배지 획득', tid(page, 'badge-perfect_lesson-earned').count() == 1)
    check('프로필: 7일 스트릭 배지 잠김', tid(page, 'badge-streak_7').count() == 1)
    shot(page, '14_profile')

    print('10) 설정 (일일 목표 변경·리마인더)')
    page.get_by_text('설정', exact=True).click()
    page.wait_for_selector('[data-testid="daily-goal-options"]', timeout=30000)
    check('설정: 리마인더 웹 안내', '웹에서는 지원하지 않아요' in page.content())
    tid(page, 'goal-30').click()
    page.wait_for_timeout(1500)  # 프로필 invalidate 반영
    shot(page, '15_settings')
    page.get_by_text('뒤로', exact=True).click()
    page.get_by_text('홈', exact=True).click()
    page.wait_for_selector('[data-testid="daily-goal"]', timeout=30000)
    check('설정 반영: 일일 목표 15/30', '15 / 30' in tid(page, 'daily-goal').inner_text())

    print('11) 오답 → 하트 감소')
    tid(page, 'continue-button').click()  # 안부 묻기 레슨
    page.wait_for_selector('[data-testid="speaker"]')  # 듣기: How are you?
    page.get_by_text('Who are you?', exact=True).click()  # 일부러 오답
    tid(page, 'check-button').click()
    feedback_continue(expect_correct=False)
    page.wait_for_timeout(1500)
    hearts = tid(page, 'lesson-hearts').inner_text()
    check('오답 후 하트 4', '4' in hearts)
    shot(page, '12_wrong_heart')

    if errors:
        print('\n⚠️ 페이지 JS 에러:')
        for e in errors[:5]:
            print('  ', e[:200])

    browser.close()

print(f'\n결과: {len(PASS)}개 통과, {len(FAIL)}개 실패')
if FAIL:
    print('실패 목록:', FAIL)
    sys.exit(1)
