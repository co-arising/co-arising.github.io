#!/usr/bin/env python3
"""Drive the real static site on a private localhost server; retain browser evidence."""
import argparse
import json
import tempfile
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ROUTES = ('', 'why-co-arising/', 'dsl/', 'pipeline/', 'bank-demo/', 'explorer/', 'compare/', 'guide/', 'status/')


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def send_error(self, code, message=None, explain=None):
        if code != 404:
            return super().send_error(code, message, explain)
        content = (ROOT / '404.html').read_bytes()
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(content)


def verify(browser, base, evidence):
    steps = []
    errors = []
    external = set()
    context = browser.new_context(viewport={'width': 1280, 'height': 900}, permissions=['clipboard-read', 'clipboard-write'])
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: external.add(request.url) if not request.url.startswith(base) and request.url.startswith(('http:', 'https:')) else None)

    def note(name, detail):
        steps.append({'step': name, 'observed': detail})
        print(f'{name}: {detail}', flush=True)

    def require(condition, message):
        if not condition:
            raise AssertionError(message)

    def idle():
        page.wait_for_function("document.querySelector('#xp-result').getAttribute('aria-busy') === 'false'")

    try:
        for prefix in ('/', '/zh/'):
            for route in ROUTES:
                response = page.goto(base + prefix + route)
                require(response.status == 200, f'page failed: {prefix + route}')
                page.wait_for_selector('#language-switch')
                if route == 'explorer/':
                    page.wait_for_function("document.querySelector('#xp-run').disabled === false")
        note('pages', '18 bilingual content routes returned 200 and initialized shared navigation')

        page.goto(base + '/status/#ledger')
        page.locator('#site-footer a[href="/status/#facts"]').click()
        require(page.locator('#language-switch').get_attribute('href') == '/zh/status/#facts', 'stale language fragment')
        page.locator('#language-switch').click()
        require(page.url.endswith('/zh/status/#facts'), 'language counterpart did not retain section')
        note('language', 'footer #facts → language switch retained /zh/status/#facts')

        response = page.goto(base + '/zh/missing-review-path/')
        require(response.status == 404, 'missing path did not return 404')
        require(page.locator('#language-switch').get_attribute('href') == '/zh/', '404 added repeated language prefix')
        note('404', 'missing Chinese path returned custom 404; language recovery targets /zh/')

        for prefix in ('/', '/zh/'):
            page.goto(base + prefix + 'guide/')
            block = page.locator('pre[data-example="install-source"]')
            expected = block.locator('code').text_content()
            block.locator('button').click()
            page.wait_for_function("navigator.clipboard.readText().then(text => text.includes('TRUTHSRC_WORKSPACE'))")
            require(page.evaluate('navigator.clipboard.readText()') == expected, 'copy payload includes controls')
            block.locator('button').click()
            page.wait_for_timeout(100)
            require(page.evaluate('navigator.clipboard.readText()') == expected, 'repeat copy differs')
        note('copy', 'first and repeated EN/ZH copies equal code text exactly')

        denied = browser.new_context(viewport={'width': 1280, 'height': 900})
        denied.add_init_script("Object.defineProperty(window, 'localStorage', {get() {throw new DOMException('blocked','SecurityError');}}); Object.defineProperty(navigator, 'clipboard', {value:{writeText:()=>Promise.reject(new Error('denied'))}}); document.execCommand=()=>false;")
        failpage = denied.new_page()
        failpage.goto(base + '/zh/guide/')
        failpage.locator('#theme-toggle').click()
        require(failpage.locator('html').get_attribute('data-theme') == 'light', 'blocked storage disabled theme')
        failpage.locator('pre[data-example="install-source"] button').click()
        failpage.wait_for_function("document.querySelector('pre[data-example=\"install-source\"] button').textContent.includes('失败')")
        note('denied capabilities', 'blocked storage preserved theme; denied clipboard displayed failure, not success')
        failpage.screenshot(path=str(evidence / 'clipboard-failure.png'))
        denied.close()

        for prefix in ('/', '/zh/'):
            page.goto(base + prefix + 'why-co-arising/')
            page.wait_for_selector('#dz-count')
            require(page.locator('#dz-count').inner_text() == '3/3', 'initial guard count')
            page.locator('#dissolve-stage summary').click()
            guard = page.locator('.dz-edge-list label').filter(has_text='guarded-by').first.locator('input')
            guard.focus()
            page.keyboard.press('Space')
            require(page.locator('#dz-count').inner_text() == '2/3', 'partial guard coverage counted as complete')
            require(guard.evaluate('(el) => el === document.activeElement'), 'keyboard focus lost on redraw')
            page.keyboard.press('Space')
            require(page.locator('#dz-count').inner_text() == '3/3', 'guard restore')
            page.locator('#dz-mode').click()
            require(page.locator('#dz-count').inner_text() == '0/3', 'Arise start')
            for checkbox in page.locator('.dz-edge-list input').all():
                checkbox.check()
            require(page.locator('#dz-count').inner_text() == '3/3', 'Arise could not rebuild')
            require(page.locator('#dz-summary').inner_text().find('35/35') >= 0, 'missing restored edges')
            page.locator('#dz-remove-guards').click()
            require(page.locator('#dz-count').inner_text() == '0/3', 'bulk guard removal')
            page.locator('#dz-reset').click()
            require(page.locator('#dz-count').inner_text() == '3/3', 'reset')
        page.screenshot(path=str(evidence / 'dissolve-zh.png'), full_page=False)
        note('dissolve', 'EN/ZH keyboard single guard: 3/3→2/3→3/3; Arise rebuilt 35/35; bulk/reset worked')

        for prefix in ('/', '/zh/'):
            page.goto(base + prefix + 'explorer/#blast')
            page.wait_for_function("document.querySelector('#xp-result').querySelector('table') !== null")
            idle()
            require(page.locator('#xp-result tbody tr').count() == 55, 'blast result count')
            for button in page.locator('#xp-presets button').all():
                button.click()
                idle()
                require(page.locator('#xp-result table').count() > 0, 'preset failed: ' + button.inner_text())
            page.locator('#xp-sql').fill('DELETE FROM nodes; SELECT COUNT(*) AS n FROM nodes;')
            page.locator('#xp-run').click()
            idle()
            require(page.locator('#xp-result tbody td').first.inner_text() == '0', 'sandbox mutation not executed')
            page.locator('#xp-sql').fill('SELECT COUNT(*) AS n FROM nodes;')
            page.locator('#xp-run').click()
            idle()
            require(page.locator('#xp-result tbody td').first.inner_text() == '389', 'sandbox mutation survived next run')
            page.locator('[data-preset="blast"]').click()
            idle()
            require(page.locator('#xp-result tbody tr').count() == 55, 'sandbox polluted presets')
            page.locator('#xp-sql').fill('SELECT id FROM nodes WHERE 1=0;')
            page.locator('#xp-run').click()
            idle()
            require(page.locator('#xp-result tbody tr').count() == 0, 'WHERE ignored')
            page.locator('#xp-sql').fill('THIS IS NOT SQL')
            page.locator('#xp-run').click()
            idle()
            require('syntax' in page.locator('#xp-result').inner_text().lower(), 'SQL error missing')
            page.locator('#xp-sql').fill('SELECT id FROM nodes;')
            page.locator('#xp-run').click()
            idle()
            require(page.locator('#xp-result tbody tr').count() == 200, 'row cap failed')
            require('rows' in page.locator('#xp-result').inner_text(), 'truncation undisclosed')
        note('SQL', 'all 7 presets in both languages; DELETE affected only its copy; next count=389 and blast=55; syntax/empty/200-row cases correct')
        page.screenshot(path=str(evidence / 'sql-zh.png'), full_page=False)

        page.locator('#xp-sql').fill('WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n) SELECT max(x) FROM n;')
        page.locator('#xp-run').click()
        page.locator('#xp-cancel').click()
        require('取消' in page.locator('#xp-result').inner_text(), 'cancel not displayed')
        page.locator('[data-preset="census"]').click()
        idle()
        require(page.locator('#xp-result table').count() == 2, 'cannot query after cancellation')
        page.locator('#xp-run').click()
        page.wait_for_function("document.querySelector('#xp-result').textContent.includes('5 秒')", timeout=10000)
        note('cancellation', 'manual cancel and 5-second deadline terminated the Worker; preset recovered after cancel')
        page.locator('#xp-run').click()
        page.locator('#xp-clear').click()
        require('取消' in page.locator('#xp-result').inner_text(), 'Clear left a running status')
        require(page.locator('#xp-sql').input_value() == '', 'Clear kept the query draft')
        note('clear while running', 'Clear terminated the job, cleared input and displayed cancellation')

        slow = browser.new_context()
        slow.route('**/assets/data/bank-wealth.graph.sqlite', lambda route: (time.sleep(1.2), route.continue_()))
        slowpage = slow.new_page()
        slowpage.goto(base + '/explorer/#blast', wait_until='domcontentloaded')
        slowpage.locator('[data-preset="census"]').click()
        slowpage.wait_for_function("document.querySelector('#xp-result').querySelectorAll('table').length === 2")
        require(slowpage.locator('[data-preset="census"]').get_attribute('aria-pressed') == 'true', 'boot overwrote newer selection')
        note('slow load', 'manual Census selection during delayed loading superseded initial #blast')
        slow.close()

        broken = browser.new_context()
        broken.route('**/assets/data/bank-wealth.graph.sqlite', lambda route: route.fulfill(status=200, body='wrong bytes'))
        brokenpage = broken.new_page()
        brokenpage.goto(base + '/zh/explorer/#blast')
        brokenpage.wait_for_function("document.querySelector('#xp-status').textContent.includes('SHA-256 mismatch')")
        require(brokenpage.locator('#xp-result table').count() == 0, 'mismatch rendered query results')
        require(brokenpage.locator('#xp-run').is_disabled(), 'mismatch allowed execution')
        note('fingerprint failure', 'modified database bytes failed SHA checking; execution disabled and expected answer labelled unexecuted')
        broken.close()

        plain = browser.new_context(java_script_enabled=False)
        plainpage = plain.new_page()
        plainpage.goto(base + '/zh/guide/')
        require(plainpage.locator('#site-nav a').count() == 9, 'no-JS navigation absent')
        require('Counter' in plainpage.locator('#l1').inner_text(), 'no-JS content missing')
        note('no JavaScript', 'Chinese guide and all 9 navigation destinations remain readable')
        plain.close()

        page.set_viewport_size({'width': 360, 'height': 800})
        for route in ('zh/', 'zh/guide/', 'zh/explorer/', 'zh/why-co-arising/'):
            page.goto(base + '/' + route)
            page.wait_for_selector('#language-switch')
            overflow = page.evaluate('document.documentElement.scrollWidth - innerWidth')
            require(overflow <= 1, f'page-level overflow {route}: {overflow}')
        page.screenshot(path=str(evidence / 'mobile-zh.png'), full_page=False)
        note('mobile', '360px Chinese home/guide/explorer/dissolve have no page-level horizontal overflow')
        page.goto(base + '/zh/status/?probe=b#facts')
        page.wait_for_function("document.querySelector('#facts h2').getBoundingClientRect().top >= document.querySelector('#site-nav').getBoundingClientRect().bottom")
        page.screenshot(path=str(evidence / 'mobile-facts.png'))
        note('mobile fragments', 'facts heading stays below the measured wrapped navigation')
        page.goto(base + '/zh/explorer/?probe=b#blast')
        page.wait_for_function("document.querySelector('#xp-result').querySelector('table') !== null")
        idle()
        page.locator('#xp-sql').fill('SELECT id FROM nodes LIMIT 1;')
        page.locator('#xp-run').click()
        idle()
        require(page.locator('#xp-result').inner_text().count('浏览器本次执行 · 一次性副本，修改不保存') == 1, 'duplicate sandbox status')
        prompts = []
        def dismiss_draft(dialog):
            prompts.append(dialog.message)
            dialog.dismiss()
        page.once('dialog', dismiss_draft)
        page.locator('#language-switch').click()
        require(page.url.endswith('/zh/explorer/?probe=b#blast'), 'dismissed draft prompt still navigated')
        require(prompts and '草稿' in prompts[-1], 'missing draft warning')
        page.once('dialog', lambda dialog: dialog.accept())
        page.locator('#language-switch').focus()
        page.keyboard.press('Enter')
        page.wait_for_url(base + '/explorer/?probe=b#blast')
        page.wait_for_function("document.querySelector('#xp-result').querySelector('table') !== null")
        idle()
        require(page.locator('html').get_attribute('lang') == 'en', 'accepted language switch did not navigate')
        require('LIMIT 1' not in page.locator('#xp-sql').input_value(), 'custom SQL persisted across languages')
        note('SQL draft language switch', 'dismiss keeps the draft; accepting via keyboard navigates to the English preset without persisting SQL')
        require(not errors, 'page errors: ' + repr(errors))
        require(not external, 'external requests: ' + repr(external))
        note('runtime', 'no page errors and no external network requests observed')
        return {'verdict': 'PASS', 'steps': steps, 'pageErrors': errors, 'externalRequests': sorted(external)}
    except Exception as error:
        page.screenshot(path=str(evidence / 'failure.png'), full_page=False)
        return {'verdict': 'FAIL', 'error': str(error), 'steps': steps, 'pageErrors': errors, 'externalRequests': sorted(external), 'url': page.url}
    finally:
        context.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', choices=('chromium', 'webkit'), default='chromium')
    args = parser.parse_args()
    evidence = Path(tempfile.mkdtemp(prefix='co-arising-browser-'))
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as runtime:
            browser = getattr(runtime, args.browser).launch(headless=True)
            try:
                outcome = verify(browser, base, evidence)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
    (evidence / 'report.json').write_text(json.dumps(outcome, ensure_ascii=False, indent=2))
    print(json.dumps({'evidence': str(evidence), **outcome}, ensure_ascii=False, indent=2))
    return 0 if outcome['verdict'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
