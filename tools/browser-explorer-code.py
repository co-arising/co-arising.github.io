#!/usr/bin/env python3
"""Observe Graph/Code in real browsers, optionally using labeled synthetic snapshot responses."""
import argparse
import base64
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--evidence', required=True)
    parser.add_argument('--fixture', required=True, help='Synthetic browser resources.json, never bank acceptance')
    args = parser.parse_args()
    evidence = Path(args.evidence)
    evidence.mkdir(parents=True, exist_ok=True)
    fixture = json.loads(Path(args.fixture).read_text())
    resources = {path: base64.b64decode(value) for path, value in fixture['resources'].items()}
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    observations = []
    try:
        with sync_playwright() as p:
            for engine in ('chromium', 'webkit'):
                browser = getattr(p, engine).launch()
                errors = []
                context = browser.new_context(viewport={'width': 1440, 'height': 1000})
                context.route('**/assets/data/explorer/current.json', lambda route: route.fulfill(status=200, content_type='application/json', body=json.dumps({'schemaVersion': 'co-arising.explorer-current/v1', 'state': 'unavailable', 'reason': 'matched-project-required'})))
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base + '/explorer/?node=aggregate%3ACreditBalance#nodes')
                page.wait_for_function("document.querySelector('#xp-run').disabled === false")
                page.wait_for_selector('#xp-node-anchors')
                assert 'not published' in page.locator('#xp-snapshot-status').text_content()
                assert page.locator('#xp-node-count').inner_text().startswith('389 matching')
                page.locator('[data-explorer-view="code"]').click()
                assert page.locator('#code').is_visible()
                assert 'not published' in page.locator('#xp-code-message').inner_text()
                page.screenshot(path=str(evidence / f'{engine}-unpublished.png'), full_page=True)
                observations.append({'engine': engine, 'step': 'unpublished real pointer', 'observed': page.locator('#xp-code-message').inner_text()})
                context.close()

                context = browser.new_context(viewport={'width': 1440, 'height': 1000})
                def serve(route):
                    path = route.request.url.removeprefix(base)
                    if path in resources:
                        route.fulfill(status=200, body=resources[path], content_type='application/json' if path.endswith('.json') else 'application/octet-stream')
                    else:
                        route.continue_()
                context.route('**/assets/data/explorer/**', serve)
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base + '/explorer/?node=command%3AReserveFunds#nodes')
                page.wait_for_selector('[data-xp-location]', state='attached')
                page.locator('#xp-node-anchors .xp-identity > p [data-xp-location="location-0"]').click()
                page.wait_for_selector('#xp-line-3.selected')
                assert page.locator('#xp-code-heading').inner_text() == 'CreditBalance.scala'
                assert page.locator('#xp-code-path').text_content() == 'app/CreditBalance.scala'
                assert '余额' in page.locator('#xp-line-3').inner_text()
                assert page.locator('#xp-code-viewer img').count() == 0
                assert 'snapshot=' + fixture['id'] in page.url
                page.locator('#xp-line-3 .xp-line-number').click()
                page.wait_for_function("document.querySelector('#xp-code-knowledge').textContent.includes('LEDGER_SUFFICIENT')")
                assert fixture['identity'] in page.locator('#xp-code-knowledge').text_content()
                assert fixture['guard'] in page.locator('#xp-code-knowledge').text_content()
                page.screenshot(path=str(evidence / f'{engine}-code-reverse.png'), full_page=True)
                observations.append({'engine': engine, 'step': 'synthetic Graph → full Code → clicked line reverse', 'observed': page.locator('#xp-code-message').inner_text(), 'url': page.url})
                page.locator('#xp-code-knowledge a.xp-short-path').filter(has_text='reserve.structure.yaml').first.click()
                page.wait_for_function("document.querySelector('#xp-code-path').textContent === 'truth/reserve.structure.yaml' && document.querySelector('#xp-code-knowledge').textContent.includes('/payload')")
                page.go_back()
                page.wait_for_function("document.querySelector('#xp-code-path').textContent === 'app/CreditBalance.scala'")
                page.reload()
                page.wait_for_selector('#xp-line-3.selected')
                page.locator('#language-switch').click()
                page.wait_for_selector('#xp-line-3.selected')
                assert '/zh/explorer/' in page.url
                assert fixture['identity'] in page.locator('#xp-code-knowledge').text_content()
                page.locator('#xp-code-find').fill('onerror')
                assert '4' in page.locator('#xp-code-find-result').inner_text()
                page.locator('#xp-code-find-result a').click()
                page.wait_for_selector('#xp-line-4.selected')
                assert '候选' in page.locator('#xp-code-knowledge').text_content()
                page.set_viewport_size({'width': 375, 'height': 850})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                page.screenshot(path=str(evidence / f'{engine}-mobile-zh.png'), full_page=True)
                observations.append({'engine': engine, 'step': 'refresh, back, language, find and non-span line', 'observed': 'Same fixed snapshot; candidate-only line; no page overflow at 375px'})
                page.locator('#xp-toggle-files').click()
                page.locator('#xp-code-search').fill('build.sbt')
                page.locator('#xp-code-files a').click()
                assert '未公开' in page.locator('#xp-code-message').inner_text()
                page.goto(base + '/explorer/?snapshot=' + 'f' * 64 + '&view=code#code')
                page.wait_for_function("document.querySelector('#xp-snapshot-status').textContent.includes('unavailable')")
                assert page.locator('#xp-run').is_disabled()
                observations.append({'engine': engine, 'step': 'unknown snapshot probe', 'observed': page.locator('#xp-snapshot-status').text_content()})
                assert not errors, errors
                context.close()

                race = browser.new_context(viewport={'width': 1280, 'height': 900})
                held = []
                def delayed(route):
                    path = route.request.url.removeprefix(base)
                    if path in resources:
                        if '/files/' in path:
                            held.append((route, resources[path]))
                        else:
                            route.fulfill(status=200, body=resources[path], content_type='application/octet-stream')
                    else:
                        route.continue_()
                race.route('**/assets/data/explorer/**', delayed)
                racepage = race.new_page()
                racepage.goto(base + '/explorer/?node=command%3AReserveFunds#nodes')
                racepage.wait_for_selector('#xp-node-anchors .xp-identity > p button[data-xp-location]')
                with racepage.expect_request('**/files/*.txt'):
                    racepage.locator('#xp-node-anchors .xp-identity > p button[data-xp-location]').first.click()
                racepage.locator('#xp-node-list button[data-node="aggregate:CreditBalance"]').click()
                with racepage.expect_response('**/files/*.txt'):
                    for route, body in held:
                        route.fulfill(status=200, body=body, content_type='application/octet-stream')
                racepage.wait_for_function("document.querySelector('#xp-node-detail').getAttribute('aria-busy') === 'false'")
                racepage.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                assert 'view=code' not in racepage.url
                assert 'aggregate%3ACreditBalance' in racepage.url
                observations.append({'engine': engine, 'step': 'slow code jump then change Graph node', 'observed': 'Completed old file request did not navigate away from newly selected aggregate'})
                race.close()

                lifecycle = browser.new_context(viewport={'width': 1280, 'height': 900})
                pending_files = []
                mode = {'value': 'delay'}
                def lifecycle_route(route):
                    path = route.request.url.removeprefix(base)
                    if path not in resources:
                        route.continue_()
                    elif '/files/' in path and mode['value'] == 'delay':
                        pending_files.append((route, resources[path]))
                    elif '/files/' in path and mode['value'] == 'fail':
                        route.fulfill(status=503, body='temporary failure')
                    else:
                        route.fulfill(status=200, body=resources[path], content_type='application/octet-stream')
                lifecycle.route('**/assets/data/explorer/**', lifecycle_route)
                lp = lifecycle.new_page()
                lp.goto(base + '/explorer/?view=code&file=generated-file&line=3#code')
                lp.wait_for_function("document.querySelector('#xp-run').disabled === false")
                assert lp.locator('#xp-code-viewer').get_attribute('aria-busy') == 'true'
                lp.locator('[data-explorer-view="graph"]').click()
                lp.locator('#xp-node-search').fill('slice:ReserveFunds')
                lp.locator('#xp-node-list button[data-node="slice:ReserveFunds"]').click()
                lp.locator('[data-explorer-view="code"]').click()
                lp.locator('#xp-code-search').fill('build.sbt')
                lp.locator('#xp-code-files a').click()
                assert 'slice%3AReserveFunds' in lp.url
                assert lp.locator('#xp-code-viewer').get_attribute('aria-busy') == 'false'
                assert lp.locator('#xp-code-find-result').inner_text() == ''
                for route, body in pending_files:
                    route.fulfill(status=200, body=body, content_type='application/octet-stream')
                mode['value'] = 'fail'
                lp.locator('#xp-code-search').fill('reserve.structure.yaml')
                lp.locator('#xp-code-files a').click()
                lp.wait_for_function("document.querySelector('#xp-code-message').textContent.includes('503')")
                mode['value'] = 'ready'
                lp.locator('#xp-code-files a').click()
                lp.wait_for_function("document.querySelector('#xp-code-viewer').textContent.includes('ReserveFunds')")
                assert 'slice%3AReserveFunds' in lp.url
                observations.append({'engine': engine, 'step': 'pending file independence, current file-tree context, busy reset and retry', 'observed': 'Graph loaded before delayed source; file link retained new slice; withheld selection cleared busy; same-file retry recovered from 503'})
                lifecycle.close()

                broken = browser.new_context(viewport={'width': 1280, 'height': 900})
                def tamper(route):
                    path = route.request.url.removeprefix(base)
                    if path in resources:
                        body = b'tampered source' if '/files/' in path and path.endswith('.txt') else resources[path]
                        route.fulfill(status=200, body=body, content_type='application/octet-stream')
                    else:
                        route.continue_()
                broken.route('**/assets/data/explorer/**', tamper)
                badpage = broken.new_page()
                badpage.goto(base + '/explorer/?snapshot=' + fixture['id'] + '&view=code&file=generated-file&line=3#code')
                badpage.wait_for_function("document.querySelector('#xp-code-message').textContent.includes('byte/hash mismatch')")
                assert badpage.locator('#xp-code-viewer').inner_text() == ''
                assert badpage.locator('#xp-code-knowledge').text_content() == ''
                observations.append({'engine': engine, 'step': 'modified code byte probe', 'observed': badpage.locator('#xp-code-message').inner_text()})
                badpage.screenshot(path=str(evidence / f'{engine}-tampered.png'), full_page=True)
                broken.close()
                browser.close()
        (evidence / 'observations.json').write_text(json.dumps({'scope': 'UI observation with labeled synthetic mapping, NOT bank snapshot acceptance', 'observations': observations}, indent=2, ensure_ascii=False))
        print(json.dumps({'passed': True, 'scope': 'synthetic browser contract only', 'evidence': str(evidence), 'observations': observations}, ensure_ascii=False, indent=2))
    except Exception:
        if 'page' in locals():
            try:
                page.screenshot(path=str(evidence / 'failure.png'), full_page=True)
                (evidence / 'failure.html').write_text(page.content())
            except Exception:
                pass
        raise
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
