"""Ted Duolingo — PWA 오프라인 full reload 복원 e2e (Web/PWA, D23)

dev web(Metro 메모리 서버)에서는 불가능했던 "오프라인에서 page reload 후 앱 셸 복원"을
production 정적 export(`dist/`) + 서비스워커(public/sw.js)로 검증한다.

전제: `cd apps/mobile && pnpm build:web`로 dist/ 생성 + 로컬 Supabase 기동(supabase start).
이 스크립트가 dist/를 SPA-fallback python 서버(별도 포트 3010)로 직접 서빙한다(npx serve 불필요).

핵심 검증: 온라인에서 SW가 셸·번들을 캐시 → set_offline(True) → page.reload() →
navigate는 캐시된 index.html로 fallback, 번들은 cache-first로 복원 → 앱이 빈 화면 없이 부팅.
SW는 Supabase(교차 오리진)·비-GET을 통과시키므로 데이터/쓰기는 persist·sync-queue가 담당.
"""
import os
import sys
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

PORT = 3010
BASE = f'http://localhost:{PORT}'
DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dist')
TS = int(time.time())
EMAIL = f'e2e-pwa-{TS}@example.com'
PASSWORD = 'test1234'
PASS = []
FAIL = []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(('  ✅' if cond else '  ❌') + ' ' + name)


def tid(page, t):
    return page.locator(f'[data-testid="{t}"]')


class SPAHandler(SimpleHTTPRequestHandler):
    """정적 파일은 그대로 서빙하고, 존재하지 않는 클라이언트 라우트(확장자 없는 경로)는
    index.html로 rewrite한다(expo-router SPA). 실 에셋(확장자 있음) 누락은 404 유지."""

    def do_GET(self):
        fs_path = self.translate_path(self.path)
        if not os.path.exists(fs_path) or os.path.isdir(fs_path):
            req_path = self.path.split('?', 1)[0]
            if '.' not in os.path.basename(req_path):
                self.path = '/index.html'
        return super().do_GET()

    def log_message(self, *args):
        pass  # 서버 로그 억제


def serve_dist():
    handler = partial(SPAHandler, directory=DIST)
    httpd = ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def signup_to_home(page):
    """가입 → 온보딩(영어·목표20) → 홈 도달."""
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


def sw_controlled(page):
    return page.evaluate("() => !!navigator.serviceWorker.controller")


if not os.path.isdir(DIST):
    print(f'❌ dist/ 없음: {DIST}\n   먼저 `cd apps/mobile && pnpm build:web` 실행 필요')
    sys.exit(2)

httpd = serve_dist()
print(f'SPA 서버 기동: {BASE} (dist/ 서빙)')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.set_default_timeout(30000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    print('1) 정적 셸 자원 서빙 확인 (sw.js·manifest.json·아이콘)')
    sw_resp = page.request.get(f'{BASE}/sw.js')
    mani_resp = page.request.get(f'{BASE}/manifest.json')
    icon_resp = page.request.get(f'{BASE}/icon-192.png')
    check('/sw.js 200 + JS MIME', sw_resp.status == 200 and 'javascript' in (sw_resp.headers.get('content-type', '')))
    check('/manifest.json 200', mani_resp.status == 200 and 'Ted Duolingo' in mani_resp.text())
    check('/icon-192.png 200', icon_resp.status == 200)

    print('2) 가입 → 홈 (셸·번들 캐시 워밍)')
    signup_to_home(page)
    check('홈: 스킬 4개', all(tid(page, f'skill-{i}').count() == 1 for i in range(1, 5)))

    print('3) 서비스워커 등록·활성화 (production-only 등록이 작동)')
    page.wait_for_function("() => !!navigator.serviceWorker.controller", timeout=20000)
    check('SW가 페이지를 control (controller non-null)', sw_controlled(page))

    print('4) 온라인 reload 1회 → SW 경유로 번들 cache-first 적재')
    # 첫 로드 시점엔 SW가 아직 control 전이라 번들 요청이 SW를 안 거칠 수 있다.
    # control 확보 후 1회 reload하면 번들·셸이 확실히 SW 캐시에 적재된다.
    page.reload()
    page.wait_for_selector('[data-testid="skill-1"]', timeout=60000)
    check('온라인 reload 후 홈 정상', tid(page, 'skill-1').count() == 1)
    # 프로필도 한 번 방문해 클라이언트 라우트 셸 캐시 워밍
    page.get_by_text('프로필', exact=True).click()
    page.wait_for_selector('[data-testid="profile-stats"]', timeout=15000)
    page.get_by_text('홈', exact=True).click()
    page.wait_for_selector('[data-testid="skill-1"]', timeout=15000)
    # persist 쓰로틀(1s) 플러시 대기 — 이 시간 안에 오프라인 reload하면 캐시가 비어 복원 실패한다.
    # 실사용에선 온라인 체류가 길어 무관하지만, 테스트는 명시적으로 플러시를 기다린다.
    page.wait_for_timeout(2000)
    cache_written = any(k.startswith('ted-rq-cache:') for k in page.evaluate("() => Object.keys(localStorage)"))
    check('온라인 중 persist 캐시 기록됨(오프라인 복원 전제)', cache_written)

    print('5) ★ 오프라인 full reload → 앱 셸 복원 (dev web에서 불가능했던 핵심)')
    page.context.set_offline(True)
    page.wait_for_selector('[data-testid="offline-banner"]', timeout=15000)
    page.reload()  # navigate=networkFirst 실패 → 캐시된 index.html, 번들=cache-first 복원
    page.wait_for_selector('[data-testid="skill-1"]', timeout=30000)
    check('오프라인 reload 후 앱 부팅 (skill-1 렌더)', tid(page, 'skill-1').count() == 1)
    check('오프라인 reload 후 스킬 트리 4개 복원 (persist 데이터)',
          all(tid(page, f'skill-{i}').count() == 1 for i in range(1, 5)))
    # 오프라인 상태로 로드돼도 배너가 떠야 한다(initOnlineManager가 navigator.onLine으로 초기 동기화)
    banner_ok = tid(page, 'offline-banner').count() == 1
    if not banner_ok:
        try:
            page.wait_for_selector('[data-testid="offline-banner"]', timeout=5000)
            banner_ok = True
        except Exception:
            banner_ok = False
    check('오프라인 reload 후에도 오프라인 배너 표시(초기 상태 동기화)', banner_ok)
    page.screenshot(path='/tmp/ted_pwa_offline_reload.png')

    print('6) 오프라인 상태에서 클라이언트 라우트 이동 (SPA 셸 복원)')
    page.get_by_text('프로필', exact=True).click()
    page.wait_for_selector('[data-testid="profile-stats"]', timeout=15000)
    check('오프라인 reload 후 프로필 탭 이동 동작', tid(page, 'profile-stats').count() == 1)

    print('7) 온라인 복귀 → reload → 정상 동작')
    page.context.set_offline(False)
    page.wait_for_selector('[data-testid="offline-banner"]', state='detached', timeout=15000)
    check('온라인 복귀 후 배너 사라짐', tid(page, 'offline-banner').count() == 0)
    page.goto(BASE)  # 홈 root로 reload — 온라인이라 서버에서 최신 셸·데이터 fetch
    page.wait_for_selector('[data-testid="skill-1"]', timeout=60000)
    check('온라인 복귀 후 reload 정상 (홈 부팅)', tid(page, 'skill-1').count() == 1)

    if errors:
        print('\n⚠️ 페이지 JS 에러:')
        for e in errors[:5]:
            print('  ', e[:200])

    browser.close()

httpd.shutdown()
print(f'\n결과: {len(PASS)}개 통과, {len(FAIL)}개 실패')
if FAIL:
    print('실패 목록:', FAIL)
    sys.exit(1)
