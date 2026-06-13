"""Ted Duolingo — 오프라인 읽기 캐시 e2e (D21)
가입→온보딩→홈(캐시 워밍) → 오프라인 전환(배너) → reload 후 캐시 열람 →
학습/복습 진입 차단 → 온라인 복귀(배너 사라짐) → 사용자별 캐시 분리(A 로그아웃→B).
Playwright는 page.context().set_offline()로 네트워크를 끊는다(navigator.onLine=false → NetInfo→onlineManager).
"""
import sys
import time

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8081'
TS = int(time.time())
EMAIL_A = f'e2e-off-a-{TS}@example.com'
EMAIL_B = f'e2e-off-b-{TS}@example.com'
PASSWORD = 'test1234'
PASS = []
FAIL = []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(('  ✅' if cond else '  ❌') + ' ' + name)


def shot(page, name):
    page.screenshot(path=f'/tmp/ted_offline_{name}.png', full_page=False)


def tid(page, t):
    return page.locator(f'[data-testid="{t}"]')


def signup_to_home(page, email):
    """가입 → 온보딩(영어·목표20) → 홈 도달. 홈에서 skill-tree·profile이 캐시에 영속된다."""
    page.goto(BASE, timeout=180000)
    page.wait_for_load_state('networkidle', timeout=180000)
    page.wait_for_selector('[data-testid="auth-email"]', timeout=120000)
    tid(page, 'auth-toggle').click()  # 회원가입 모드
    tid(page, 'auth-email').fill(email)
    tid(page, 'auth-password').fill(PASSWORD)
    tid(page, 'auth-submit').click()
    page.wait_for_selector('[data-testid="pair-en"]', timeout=60000)
    tid(page, 'pair-en').click()
    tid(page, 'onboarding-next').click()
    page.wait_for_selector('[data-testid="goal-20"]')
    tid(page, 'goal-20').click()
    tid(page, 'onboarding-finish').click()
    page.wait_for_selector('[data-testid="continue-button"]', timeout=60000)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.set_default_timeout(30000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    print('1) 사용자 A 가입 → 홈 (캐시 워밍)')
    signup_to_home(page, EMAIL_A)
    check('홈: 스킬 4개', all(tid(page, f'skill-{i}').count() == 1 for i in range(1, 5)))
    check('홈: HUD 스트릭', tid(page, 'hud-streak').count() == 1)
    shot(page, '01_home_online')

    print('2) persist 캐시 키가 userId 스코프인지 + 캐시 내용에 skill-tree 영속 확인')
    # persist 기록을 기다린다(throttleTime 1s). 영속된 캐시에 skill-tree 쿼리가 들어 있으면
    # 네이티브/PWA에서 오프라인 reload 시 그대로 복원된다(아래 4)에서 SPA 내 열람으로 보강 검증).
    page.wait_for_timeout(1500)
    keys = page.evaluate("() => Object.keys(window.localStorage)")
    cache_keys = [k for k in keys if k.startswith('ted-rq-cache:')]
    check('localStorage에 ted-rq-cache:<userId> 키 존재', len(cache_keys) == 1)
    check('캐시 키가 userId(UUID 형태)로 스코프됨',
          len(cache_keys) == 1 and len(cache_keys[0].split(':', 1)[1]) >= 30)
    user_a_key = cache_keys[0] if cache_keys else None
    cache_val = page.evaluate("(k) => window.localStorage.getItem(k)", user_a_key) if user_a_key else ''
    check('영속 캐시에 skill-tree 포함 (오프라인 복원 가능)', 'skill-tree' in (cache_val or ''))
    check('영속 캐시에서 league는 제외됨 (휘발성 — shouldDehydrateQuery)',
          '"league"' not in (cache_val or ''))

    print('3) 오프라인 전환 → 배너 표시')
    page.context.set_offline(True)
    page.wait_for_selector('[data-testid="offline-banner"]', timeout=15000)
    check('오프라인 배너 표시', tid(page, 'offline-banner').count() == 1)
    shot(page, '02_offline_banner')

    print('4) 오프라인 SPA 탭 이동 → 캐시 콘텐츠 유지 (빈 화면/무한 로딩 아님)')
    # dev web은 서비스워커가 없어 오프라인 full reload(번들 재요청)가 불가하므로,
    # SPA 내 라우팅으로 캐시 열람을 검증한다(네이티브는 reload=앱 재기동+임베드 번들이라 정상).
    page.get_by_text('프로필', exact=True).click()
    page.wait_for_selector('[data-testid="profile-stats"]', timeout=15000)
    check('오프라인 프로필 탭: 캐시로 표시(빈 화면 아님)', tid(page, 'profile-stats').count() == 1)
    page.get_by_text('홈', exact=True).click()
    page.wait_for_selector('[data-testid="skill-1"]', timeout=15000)
    check('오프라인 홈: 캐시된 스킬 트리 열람', tid(page, 'skill-1').count() == 1)
    check('오프라인 홈: 단원 배너(캐시) 표시', tid(page, 'unit-banner').count() == 1)
    shot(page, '03_offline_cached_home')

    print('5) 오프라인 학습 시작 차단')
    tid(page, 'continue-button').click()
    page.wait_for_selector('[data-testid="offline-blocked"]', timeout=10000)
    check('오프라인 차단 안내 표시', tid(page, 'offline-blocked').count() == 1)
    check('레슨으로 전이되지 않음 (URL 유지)', '/lesson' not in page.url)
    shot(page, '04_offline_blocked')

    print('6) 온라인 복귀 → 배너 사라짐')
    page.context.set_offline(False)
    page.wait_for_selector('[data-testid="offline-banner"]', state='detached', timeout=15000)
    check('온라인 복귀 시 배너 사라짐', tid(page, 'offline-banner').count() == 0)
    shot(page, '05_online_again')

    print('7) 사용자 캐시 분리: A 로그아웃 → B 가입 → 오프라인 시 A 데이터 비노출')
    page.get_by_text('프로필', exact=True).click()
    page.wait_for_selector('[data-testid="sign-out"]', timeout=30000)
    tid(page, 'sign-out').click()
    page.wait_for_selector('[data-testid="auth-email"]', timeout=30000)
    check('로그아웃 시 A persist 캐시 제거됨',
          user_a_key not in page.evaluate("() => Object.keys(window.localStorage)"))

    signup_to_home(page, EMAIL_B)
    keys_b = page.evaluate("() => Object.keys(window.localStorage)")
    b_cache = [k for k in keys_b if k.startswith('ted-rq-cache:')]
    check('B의 캐시 키는 A와 다름', len(b_cache) == 1 and b_cache[0] != user_a_key)
    shot(page, '06_userB_home')

    if errors:
        print('\n⚠️ 페이지 JS 에러:')
        for e in errors[:5]:
            print('  ', e[:200])

    browser.close()

print(f'\n결과: {len(PASS)}개 통과, {len(FAIL)}개 실패')
if FAIL:
    print('실패 목록:', FAIL)
    sys.exit(1)
