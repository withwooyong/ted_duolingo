"""Ted Admin — 콘텐츠 생성·검수·발행 e2e (모의 생성 → 검증 실패/복구 → 발행 → 반려)

사전 조건: 로컬 Supabase 기동 + `pnpm --filter admin start` (포트 3100).
주의: 실행마다 발행된 스킬이 누적된다 — `pnpm db:seed`로 정리.
"""
import json
import sys
import time

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3100'
TOPIC = f'쇼핑테스트-{int(time.time())}'
PASS = []
FAIL = []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(('  ✅' if cond else '  ❌') + ' ' + name)


def tid(page, t):
    return page.locator(f'[data-testid="{t}"]')


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1100, 'height': 900})
    page.set_default_timeout(15000)

    print('1) 목록 → 생성 폼')
    page.goto(BASE)
    check('목록 화면 로드', tid(page, 'nav-new').count() == 1)
    tid(page, 'nav-new').click()
    page.wait_for_selector('[data-testid="gen-topic"]')
    check('모의 생성 기본 선택 (키 없음)', tid(page, 'gen-mode-mock').is_checked())

    print('2) 모의 생성 (ko→en, 주제 입력)')
    tid(page, 'gen-pair').select_option(label='한국어 → 영어')
    tid(page, 'gen-topic').fill(TOPIC)
    tid(page, 'gen-submit').click()
    page.wait_for_selector('[data-testid="skill-preview"]')
    draft_url = page.url
    check('드래프트 생성 → 검수 화면', '/drafts/' in draft_url)
    check('검증 통과 표시', tid(page, 'validation-ok').count() == 1)
    check('검수 대기 상태', tid(page, 'status-PENDING').count() == 1)
    preview = tid(page, 'skill-preview').inner_text()
    check('5종 문제 유형 포함', all(t in preview for t in
          ['LISTEN_SELECT', 'FILL_BLANK', 'MATCH_PAIRS', 'ORDER_WORDS', 'COMPREHENSION_MCQ']))

    print('3) JSON 수정 — 문제 4개로 줄이면 검증 실패·발행 차단')
    original = tid(page, 'payload-json').input_value()
    broken = json.loads(original)
    broken['lessons'][0]['exercises'] = broken['lessons'][0]['exercises'][:4]
    tid(page, 'payload-json').fill(json.dumps(broken, ensure_ascii=False))
    tid(page, 'save-button').click()
    page.wait_for_selector('[data-testid="validation-errors"]')
    check('검증 실패: 문제 수 오류', '문제 수 4개' in tid(page, 'validation-errors').inner_text())
    check('발행 버튼 비활성', tid(page, 'approve-button').is_disabled())

    print('4) 원복 → 검증 통과 → 승인·발행')
    tid(page, 'payload-json').fill(original)
    tid(page, 'save-button').click()
    page.wait_for_selector('[data-testid="validation-ok"]')
    tid(page, 'approve-button').click()
    page.wait_for_selector('[data-testid="published-note"]')
    check('발행 완료 (스킬 ID 표시)', '스킬 ID' in tid(page, 'published-note').inner_text())
    check('발행됨 상태', tid(page, 'status-PUBLISHED').count() == 1)
    check('발행 후 수정 UI 숨김', tid(page, 'save-button').count() == 0)

    print('5) 목록에 발행 상태 반영')
    page.goto(BASE)
    page.wait_for_selector('[data-testid="status-PUBLISHED"]')
    check('목록: 발행됨 배지', tid(page, 'status-PUBLISHED').count() >= 1)

    print('6) 반려 흐름 (ko→ja 드래프트)')
    tid(page, 'nav-new').click()
    page.wait_for_selector('[data-testid="gen-topic"]')
    tid(page, 'gen-pair').select_option(label='한국어 → 일본어')
    tid(page, 'gen-topic').fill(TOPIC + '-반려')
    tid(page, 'gen-submit').click()
    page.wait_for_selector('[data-testid="skill-preview"]')
    tid(page, 'reject-note').fill('표현이 어색해요')
    tid(page, 'reject-button').click()
    page.wait_for_selector('[data-testid="status-REJECTED"]')
    check('반려 상태 전환', tid(page, 'status-REJECTED').count() == 1)
    check('반려 사유 표시', '표현이 어색해요' in page.content())
    check('반려 후에도 수정 가능', tid(page, 'save-button').count() == 1)

    browser.close()

print(f'\n결과: {len(PASS)}개 통과, {len(FAIL)}개 실패')
if FAIL:
    print('실패 목록:', FAIL)
    sys.exit(1)
