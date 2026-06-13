"""Ted Duolingo — 오프라인 레슨 쓰기 큐 e2e (D22)
가입→온보딩→홈(이어하기 레슨 prefetch 캐시) → 오프라인 전환 → 캐시된 레슨 오프라인 풀이(퍼펙트) →
완료 화면(오프라인 대기 안내) → 홈 낙관 반영(XP·스트릭·스킬진행·동기화 대기 N) →
온라인 복귀 → SyncProcessor 큐 드레인 → reload 후 서버 반영(XP·배지) 확인.
Playwright는 page.context().set_offline()로 네트워크를 끊는다(navigator.onLine=false → onlineManager).
"""
import sys
import time

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8081'
EMAIL = f'e2e-offw-{int(time.time())}@example.com'
PASSWORD = 'test1234'
PASS = []
FAIL = []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(('  ✅' if cond else '  ❌') + ' ' + name)


def shot(page, name):
    page.screenshot(path=f'/tmp/ted_offw_{name}.png', full_page=False)


def tid(page, t):
    return page.locator(f'[data-testid="{t}"]')


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.set_default_timeout(30000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    # SHADOW_SPEAK STT mock — 헤드리스엔 Web Speech가 없어 인식 결과를 주입(오프라인에서도 client-only라 동작)
    page.add_init_script("window.__mockShadowTranscript = 'Nice to meet you';")

    def feedback_continue():
        page.wait_for_selector('[data-testid="feedback-title"]')
        tid(page, 'feedback-continue').click()

    print('1) 가입 → 온보딩 → 홈 (이어하기 레슨 prefetch)')
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
    page.wait_for_selector('[data-testid="continue-button"]', timeout=60000)
    check('홈: 이어하기 = 첫 인사', '첫 인사' in tid(page, 'continue-button').inner_text())
    # prefetch(이어하기 문제 캐시) 완료 대기 — 오프라인 진입 보장
    page.wait_for_timeout(2500)
    shot(page, '01_home')

    print('2) 오프라인 전환 → 배너')
    page.context.set_offline(True)
    page.wait_for_selector('[data-testid="offline-banner"]', timeout=15000)
    check('오프라인 배너 표시', tid(page, 'offline-banner').count() == 1)

    print('3) 오프라인에서 캐시된 레슨 진입 (차단되지 않음)')
    tid(page, 'continue-button').click()
    page.wait_for_selector('[data-testid="exercise-area"]', timeout=15000)
    check('오프라인 레슨 진입 성공 (차단 안 됨)', tid(page, 'offline-blocked').count() == 0)
    check('레슨 화면 진입 (URL /lesson)', '/lesson' in page.url)
    shot(page, '02_offline_lesson')

    print('4) 오프라인 레슨 풀이 — 7문제 전부 정답(퍼펙트)')
    # 4-1 듣고 고르기
    page.wait_for_selector('[data-testid="speaker"]')
    page.get_by_text('Hello, nice to meet you.', exact=True).click()
    tid(page, 'check-button').click()
    feedback_continue()
    # 4-2 빈칸
    page.wait_for_selector('[data-testid="chip-morning"]')
    tid(page, 'chip-morning').click()
    tid(page, 'check-button').click()
    feedback_continue()
    # 4-3 짝 맞추기 (자동 제출)
    page.wait_for_selector('[data-testid="match-ko-0"]')
    for i in range(4):
        tid(page, f'match-ko-{i}').click()
        tid(page, f'match-en-{i}').click()
    feedback_continue()
    # 4-4 단어 배열
    page.wait_for_selector('[data-testid="bank-word-Nice"]')
    for w in ['Nice', 'to', 'meet', 'you']:
        tid(page, f'bank-word-{w}').click()
    tid(page, 'check-button').click()
    feedback_continue()
    # 4-5 독해
    page.wait_for_selector('text=두 사람은 지금 무엇을 하고 있나요?')
    page.get_by_text('처음 만나 인사한다', exact=True).click()
    tid(page, 'check-button').click()
    feedback_continue()
    # 4-6 듣고 고르기
    page.wait_for_selector('[data-testid="speaker"]')
    page.get_by_text('Good morning!', exact=True).click()
    tid(page, 'check-button').click()
    feedback_continue()
    # 4-7 따라 말하기 (STT mock)
    page.wait_for_selector('[data-testid="shadow-mic"]')
    tid(page, 'shadow-mic').click()
    page.wait_for_selector('[data-testid="shadow-result"]')
    tid(page, 'check-button').click()
    feedback_continue()

    print('5) 완료 화면 — 오프라인 대기 안내 + 퍼펙트 +15 XP')
    page.wait_for_selector('[data-testid="complete-title"]', timeout=30000)
    page.wait_for_timeout(1600)
    check('완료: 퍼펙트 문구', '퍼펙트' in tid(page, 'complete-title').inner_text())
    check('완료: +15 XP (10+보너스5)', '+15' in tid(page, 'reward-xp').inner_text())
    check('완료: 오프라인 동기화 대기 안내', tid(page, 'offline-pending-note').count() == 1)
    shot(page, '03_offline_complete')
    tid(page, 'complete-continue').click()

    print('6) 홈 낙관 반영 (아직 오프라인)')
    page.wait_for_selector('[data-testid="continue-button"]', timeout=30000)
    page.wait_for_timeout(800)
    check('홈: 동기화 대기 1개 표시', '1개' in tid(page, 'sync-pending').inner_text())
    check('홈: XP 15 낙관 반영', '15' in tid(page, 'hud-xp').inner_text())
    check('홈: 스트릭 1 낙관 반영', '1' in tid(page, 'hud-streak').inner_text())
    check('홈: 일일 목표 15/20 낙관 반영', '15 / 20' in tid(page, 'daily-goal').inner_text())
    check('홈: 스킬1 진행 1/2 낙관 반영', '1 / 2' in tid(page, 'skill-1').inner_text())
    check('홈: 다음 레슨 = 안부 묻기', '안부 묻기' in tid(page, 'continue-button').inner_text())
    shot(page, '04_home_optimistic')

    print('7) 온라인 복귀 → 큐 드레인 (SyncProcessor)')
    page.context.set_offline(False)
    page.wait_for_selector('[data-testid="offline-banner"]', state='detached', timeout=15000)
    check('온라인 복귀 시 배너 사라짐', tid(page, 'offline-banner').count() == 0)
    # 동기화 완료 = 대기 pill 사라짐 (큐는 서버 쓰기 성공 시에만 제거)
    page.wait_for_selector('[data-testid="sync-pending"]', state='detached', timeout=25000)
    check('동기화 완료: 대기 pill 사라짐 (서버 쓰기 성공)', tid(page, 'sync-pending').count() == 0)
    shot(page, '05_synced')

    print('8) reload 후 서버 반영 확인 (이중 적용 없음)')
    page.goto(BASE)
    page.wait_for_selector('[data-testid="continue-button"]', timeout=60000)
    page.wait_for_timeout(1500)
    check('reload: XP 정확히 15 (이중 적용 아님)', tid(page, 'hud-xp').inner_text().strip().endswith('15'))
    check('reload: 스킬1 진행 1/2 서버 반영', '1 / 2' in tid(page, 'skill-1').inner_text())

    print('9) 프로필 — 동기화가 서버에 수여한 배지 확인 (오프라인 완료는 배지 생략)')
    page.get_by_text('프로필', exact=True).click()
    page.wait_for_selector('[data-testid="profile-stats"]', timeout=30000)
    page.wait_for_selector('[data-testid="badge-first_lesson-earned"]', timeout=30000)
    stats = tid(page, 'profile-stats').inner_text()
    check('프로필: 총 XP 15', '15' in stats)
    check('프로필: 스트릭 1일', '1일' in stats)
    check('프로필: 첫 레슨 배지 (동기화가 서버 수여)',
          tid(page, 'badge-first_lesson-earned').count() == 1)
    check('프로필: 퍼펙트 배지 (동기화가 서버 수여)',
          tid(page, 'badge-perfect_lesson-earned').count() == 1)
    shot(page, '06_profile_synced')

    if errors:
        print('\n⚠️ 페이지 JS 에러:')
        for e in errors[:5]:
            print('  ', e[:200])

    browser.close()

print(f'\n결과: {len(PASS)}개 통과, {len(FAIL)}개 실패')
if FAIL:
    print('실패 목록:', FAIL)
    sys.exit(1)
