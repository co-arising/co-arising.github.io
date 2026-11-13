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
from urllib.parse import parse_qs, quote, urlsplit

# Playwright is optional maintenance tooling. Import/launch failures become BLOCKED.

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


def verify(browser, base, evidence, engine='chromium', extended=False):
    steps, errors, console_errors, contexts = [], [], [], []
    external = set()

    def new_context(**options):
        context = browser.new_context(**options)
        contexts.append(context)
        def record_page(current):
            current.on('pageerror', lambda error: errors.append({'url': current.url, 'error': str(error)}))
            current.on('console', lambda message: console_errors.append({'url': current.url, 'message': message.text}) if message.type == 'error' else None)
        context.on('page', record_page)
        def outside(url):
            parsed = urlsplit(url)
            return parsed.scheme in ('http', 'https') and parsed.netloc != urlsplit(base).netloc
        context.on('request', lambda request: external.add(request.url) if outside(request.url) else None)
        def local_only(route):
            if outside(route.request.url):
                external.add(route.request.url)
                route.abort()
            else:
                route.continue_()
        context.route('**/*', local_only)
        return context

    permissions = {'permissions': ['clipboard-read', 'clipboard-write']} if engine == 'chromium' else {}
    context = new_context(viewport={'width': 1280, 'height': 900}, **permissions)
    if engine == 'webkit':
        # WebKit does not accept Chromium clipboard permissions. Check the exact
        # write payload, but do not misreport this as native OS clipboard acceptance.
        context.add_init_script("window.__copyWrites=[]; Object.defineProperty(navigator, 'clipboard', {value:{writeText:async text=>{window.__copyWrites.push(text);}}});")
    else:
        context.add_init_script("window.__copyWrites=[]; if(navigator.clipboard) {const original=navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText=async text=>{await original(text); window.__copyWrites.push(text);};}")
    page = context.new_page()

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
            for attempt in range(2):
                block.locator('button').click()
                page.wait_for_function("document.querySelector('pre[data-example=\"install-source\"] button').classList.contains('done')")
                page.wait_for_function('window.__copyWrites.length === ' + str(attempt + 1))
                if engine == 'chromium':
                    require(page.evaluate('navigator.clipboard.readText()') == expected, 'copy payload includes controls or repeat differs')
                else:
                    require(page.evaluate('window.__copyWrites.at(-1)') == expected, 'copy write payload differs')
        note('copy', 'first and repeated EN/ZH copies equal code text exactly; ' + ('native clipboard readback' if engine == 'chromium' else 'instrumented writeText only; native WebKit clipboard NOT RUN'))

        denied = new_context(viewport={'width': 1280, 'height': 900})
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

        slow = new_context()
        slow.route('**/assets/data/bank-wealth.graph.sqlite', lambda route: (time.sleep(1.2), route.continue_()))
        slowpage = slow.new_page()
        slowpage.goto(base + '/explorer/#blast', wait_until='domcontentloaded')
        slowpage.locator('[data-preset="census"]').click()
        slowpage.wait_for_function("document.querySelector('#xp-result').querySelectorAll('table').length === 2")
        require(slowpage.locator('[data-preset="census"]').get_attribute('aria-pressed') == 'true', 'boot overwrote newer selection')
        note('slow load', 'manual Census selection during delayed loading superseded initial #blast')
        slow.close()

        broken = new_context()
        broken.route('**/assets/data/bank-wealth.graph.sqlite', lambda route: route.fulfill(status=200, body='wrong bytes'))
        brokenpage = broken.new_page()
        brokenpage.goto(base + '/zh/explorer/#blast')
        brokenpage.wait_for_function("document.querySelector('#xp-status').textContent.includes('SHA-256 mismatch')")
        require(brokenpage.locator('#xp-result table').count() == 0, 'mismatch rendered query results')
        require(brokenpage.locator('#xp-run').is_disabled(), 'mismatch allowed execution')
        note('fingerprint failure', 'modified database bytes failed SHA checking; execution disabled and expected answer labelled unexecuted')
        broken.close()

        plain = new_context(java_script_enabled=False)
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
        if extended:
            verify_extended(new_context, base, evidence, note, require)
        require(not errors, 'page errors: ' + repr(errors))
        require(not external, 'external requests: ' + repr(external))
        note('runtime', 'all contexts observed; no page errors or external network attempts')
        return {'verdict': 'PASS', 'steps': steps, 'pageErrors': errors, 'consoleErrors': console_errors, 'externalRequests': sorted(external)}
    except Exception as error:
        try:
            page.screenshot(path=str(evidence / 'failure.png'), full_page=False)
        except Exception:
            pass  # Preserve the primary failure even when the page/browser has closed.
        return {'verdict': 'FAIL', 'error': str(error), 'steps': steps, 'pageErrors': errors, 'consoleErrors': console_errors, 'externalRequests': sorted(external), 'url': page.url}
    finally:
        for owned in reversed(contexts):
            try:
                owned.close()
            except Exception:
                pass


def verify_extended(new_context, base, evidence, note, require):
    """D protocol assertions. Synchronize on rendered results/status, never timed sleeps."""
    context = new_context(viewport={'width': 1280, 'height': 900})
    page = context.new_page()
    try:
        def ready():
            page.wait_for_function("document.querySelector('#xp-run')?.disabled === false")

        def listed(count):
            page.wait_for_function("n => document.querySelectorAll('#xp-node-list button[data-node]').length === n && document.querySelector('#xp-node-list').getAttribute('aria-busy') !== 'true'", arg=count)

        def detail(node):
            page.wait_for_function("id => document.querySelector('#xp-node-detail')?.getAttribute('aria-busy') === 'false' && document.querySelector('#xp-node-detail .xp-node-id code')?.textContent === id", arg=node)

        def chosen():
            return parse_qs(urlsplit(page.url).query).get('node', [None])[0]

        for prefix in ('/', '/zh/'):
            page.goto(base + prefix + 'explorer/#nodes')
            ready()
            listed(40)
            require('389' in page.locator('#xp-node-count').inner_text(), 'directory total must be the captured 389, not the page size')
            first = page.locator('#xp-node-list button[data-node]').first.get_attribute('data-node')
            page.locator('#xp-node-next').click()
            page.wait_for_function("id => document.querySelector('#xp-node-list button[data-node]')?.dataset.node !== id", arg=first)
            listed(40)
            page.locator('#xp-node-prev').click()
            page.wait_for_function("id => document.querySelector('#xp-node-list button[data-node]')?.dataset.node === id", arg=first)
            listed(40)
            page.locator('#xp-node-kind').select_option('aggregate')
            listed(3)
            require('3' in page.locator('#xp-node-count').inner_text(), 'filtered aggregate count missing')
            page.locator('#xp-node-search').fill('aggregate:CreditBalance')
            listed(1)
            page.locator('#xp-node-list button[data-node]').click()
            selected = 'aggregate:CreditBalance'
            detail(selected)
            require(chosen() == selected and urlsplit(page.url).fragment == 'nodes', 'selected full identity not shared in ?node=#nodes')
            require(set(parse_qs(urlsplit(page.url).query)) == {'node'}, 'filter or SQL state leaked into share URL')
            page.locator('#xp-node-search').fill('no-such-node-e-validation')
            listed(0)
            page.wait_for_function("/0/.test(document.querySelector('#xp-node-count').textContent)")
            require(chosen() == selected, 'empty filter changed selected identity')
            detail(selected)
            require(page.locator('#xp-node-prev').is_disabled() and page.locator('#xp-node-next').is_disabled(), 'empty list pagination is enabled')
            page.locator('#xp-node-reset').click()
            listed(40)
            require(page.locator('#xp-node-search').input_value() == '', 'reset left search text')
            require(page.locator('#xp-node-kind').input_value() == '', 'reset left the kind filter')
            require(chosen() is None, 'explicit reset did not clear selected identity')
            page.locator('#xp-node-search').fill(selected)
            listed(1)
            page.locator('#xp-node-list button[data-node]').click()
            detail(selected)
            adjacent = page.locator('#xp-node-detail button[data-node]').first
            adjacent.wait_for()
            target = adjacent.get_attribute('data-node')
            require(target and target != selected, 'missing real adjacency identity')
            adjacent.click()
            detail(target)
            require(chosen() == target, 'adjacency selection did not update share identity')
            page.go_back()
            detail(selected)
            require(chosen() == selected, 'Back did not restore the selected identity')
            page.go_forward()
            detail(target)
            require(chosen() == target, 'Forward did not restore adjacency identity')
            shared = page.url
            page.reload()
            ready()
            detail(target)
            require(page.url == shared, 'reload rewrote the share contract')
            other_prefix = '/zh/' if prefix == '/' else '/'
            page.locator('#language-switch').click()
            page.wait_for_url(base + other_prefix + 'explorer/?node=' + quote(target, safe='') + '#nodes')
            ready()
            detail(target)
            require(chosen() == target, 'language switch lost node identity')
            # An unknown ID must be an explicit unavailable state, never a guessed node.
            unknown = 'unknown:e-validation-missing'
            page.goto(base + prefix + 'explorer/?node=' + quote(unknown, safe='') + '#nodes')
            ready()
            page.wait_for_function("document.querySelector('#xp-node-detail').getAttribute('aria-busy') === 'false' && /No node with this exact full ID|unknown|not found|unavailable|不存在|未找到|未知|不可用|没有这个完整 ID/i.test(document.querySelector('#xp-node-detail').textContent)")
            require(chosen() == unknown and page.locator('#xp-node-detail .xp-node-id').count() == 0, 'unknown identity silently replaced with a real node')
        note('node directory', 'EN/ZH: 389 total / 40 per page; next/prev, 3 aggregates, search/empty/reset, stable selection, real adjacency, share/reload/history/language and unknown IDs')
        page.screenshot(path=str(evidence / 'extended-node-unknown.png'))

        measurements = []
        for width in (768, 1280):
            page.set_viewport_size({'width': width, 'height': 900})
            for prefix in ('/', '/zh/'):
                for theme in ('auto', 'light', 'dark'):
                    for route in ('', 'guide/', 'dsl/', 'explorer/'):
                        page.goto(base + prefix + route)
                        page.wait_for_selector('#theme-toggle')
                        # Exercise the actual switch, not just a synthetic attribute.
                        for _ in range(3):
                            if page.locator('html').get_attribute('data-theme') == theme:
                                break
                            page.locator('#theme-toggle').click()
                        require(page.locator('html').get_attribute('data-theme') == theme, 'theme cycle failed')
                        box = page.evaluate("""() => ({overflow: document.documentElement.scrollWidth - innerWidth,
                          nav: document.querySelector('#site-nav').getBoundingClientRect().height,
                          offset: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-offset')),
                          links: [...document.querySelectorAll('#site-nav a:not(#language-switch)')].map(a=>a.getAttribute('href'))})""")
                        require(box['overflow'] <= 1, f'overflow at {width}/{theme}/{prefix + route}: {box}')
                        require(box['offset'] >= box['nav'] and box['offset'] <= box['nav'] + 24, f'navigation offset not measured: {box}')
                        expected = {prefix + item for item in ROUTES}
                        require(set(box['links']) == expected and len(box['links']) == 9, 'enhanced navigation lost/duplicated a route')
                        measurements.append({'width': width, 'theme': theme, 'route': prefix + route, **box})
            page.goto(base + '/zh/status/#facts')
            page.wait_for_function("document.querySelector('#facts h2').getBoundingClientRect().top >= document.querySelector('#site-nav').getBoundingClientRect().bottom")
            page.screenshot(path=str(evidence / f'extended-{width}.png'))
        (evidence / 'layout.json').write_text(json.dumps(measurements, ensure_ascii=False, indent=2))
        note('extended layout', '768/1280 × EN/ZH × auto/light/dark: home/guide/dsl/explorer; actual nav height/offset and nine-route counts retained in layout.json')

        page.set_viewport_size({'width': 1280, 'height': 900})
        for route in ('zh/', 'zh/guide/', 'zh/dsl/', 'zh/explorer/'):
            page.goto(base + '/' + route)
            page.wait_for_selector('#theme-toggle')
            page.evaluate("document.documentElement.style.zoom = '2'")
            page.wait_for_function("document.documentElement.scrollWidth <= innerWidth + 1")
            require(page.evaluate("parseFloat(getComputedStyle(document.documentElement).zoom)") == 2, '200% CSS zoom not applied')
        page.screenshot(path=str(evidence / 'extended-zoom-200.png'))
        note('200% layout zoom', 'portable CSS zoom=2 on four Chinese entry pages; native browser-menu zoom remains a manual check')

        motion = new_context(reduced_motion='reduce', viewport={'width': 768, 'height': 900})
        motionpage = motion.new_page()
        motionpage.goto(base + '/zh/why-co-arising/')
        motionpage.wait_for_selector('#dz-count')
        motionpage.locator('#theme-toggle').click()
        require(motionpage.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"), 'reduced-motion emulation failed')
        active = motionpage.evaluate("document.getAnimations().filter(a=>a.playState==='running' && a.effect.getTiming().duration > 100).length")
        require(active == 0, 'nontrivial animation remains active under reduced motion')
        motionpage.screenshot(path=str(evidence / 'extended-reduced-motion.png'))
        note('reduced motion', 'preference observed; no running animation longer than 100 ms after the theme action (not a universal accessibility audit)')

        for mode in ('no-js', 'site-script-failure'):
            plain = new_context(java_script_enabled=mode != 'no-js')
            if mode == 'site-script-failure':
                plain.route('**/assets/js/site.js', lambda route: route.abort())
            fallback = plain.new_page()
            for prefix in ('/', '/zh/'):
                for route in ROUTES:
                    fallback.goto(base + prefix + route)
                    require(fallback.locator('#site-nav a').count() == 9, f'{mode}: static navigation missing')
                    require(fallback.locator('main').is_visible(), f'{mode}: main not visible')
                    skip = fallback.locator('a.skip-link')
                    require(skip.count() == 1 and skip.get_attribute('href') == '#' + fallback.locator('main').get_attribute('id'), f'{mode}: skip link broken')
            fallback.screenshot(path=str(evidence / f'extended-{mode}.png'))
        note('fallbacks', 'all 18 routes keep nine static navigation anchors, visible main and a matching skip link under no-JS and failed site.js')

        failed = new_context()
        failed.route('**/assets/data/**', lambda route: route.abort())
        failedpage = failed.new_page()
        failedpage.goto(base + '/explorer/#blast')
        failedpage.wait_for_function("/unavailable/i.test(document.querySelector('#xp-status').textContent)")
        require(failedpage.locator('#xp-run').is_disabled() and failedpage.locator('#xp-result table').count() == 0, 'cold asset failure presented an executed query')
        require('No query was executed' in failedpage.locator('#xp-status').inner_text(), 'asset failure did not disclose unexecuted status')
        cold = new_context(offline=True)
        try:
            cold.new_page().goto(base + '/explorer/')
            raise AssertionError('cold offline unexpectedly loaded; inspect cache/service-worker contract')
        except AssertionError:
            raise
        except Exception as error:
            note('cold offline', 'navigation failed as expected: ' + type(error).__name__)
        note('network failure boundaries', 'missing graph remains unexecuted; no service worker/offline promise. Routed contexts disable HTTP cache: cached-offline behavior NOT MEASURED, not guaranteed')
    except Exception:
        try:
            page.screenshot(path=str(evidence / 'extended-failure.png'))
        except Exception:
            pass
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', choices=('chromium', 'webkit'), default='chromium')
    parser.add_argument('--extended', action='store_true', help='also check the integrated D directory and E layout/failure matrix')
    args = parser.parse_args()
    evidence = Path(tempfile.mkdtemp(prefix='co-arising-browser-'))
    server, thread, browser = None, None, None
    phase = 'import'
    outcome = {'verdict': 'BLOCKED', 'error': 'Browser prerequisites not checked'}
    try:
        from playwright.sync_api import sync_playwright
        phase = 'server'
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f'http://127.0.0.1:{server.server_port}'
        with sync_playwright() as runtime:
            phase = 'launch'
            browser = getattr(runtime, args.browser).launch(headless=True)
            try:
                phase = 'verification'
                outcome = verify(browser, base, evidence, args.browser, args.extended)
            finally:
                browser.close()
    except Exception as error:
        outcome = {'verdict': 'FAIL' if phase == 'verification' else 'BLOCKED', 'phase': phase, 'error': str(error)}
    finally:
        if server is not None:
            if thread is not None and thread.is_alive():
                server.shutdown()
            server.server_close()
        if thread is not None:
            thread.join(timeout=5)
    outcome.update(browser=args.browser, extended=args.extended)
    (evidence / 'report.json').write_text(json.dumps(outcome, ensure_ascii=False, indent=2))
    print(json.dumps({'evidence': str(evidence), **outcome}, ensure_ascii=False, indent=2))
    return 0 if outcome['verdict'] == 'PASS' else 2 if outcome['verdict'] == 'BLOCKED' else 1


if __name__ == '__main__':
    raise SystemExit(main())
