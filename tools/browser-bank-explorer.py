#!/usr/bin/env python3
"""Observe the installed real bank Graph/Code snapshot, not routed fixture data."""
import argparse
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
COMMAND = 'knowledge:bank-wealth/bankwealth/command/CreditBalance/ReserveFunds'
GUARD = 'knowledge:bank-wealth/bankwealth/guard/CreditBalance/ReserveFunds/LEDGER_SUFFICIENT'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--evidence', required=True, type=Path)
    args = parser.parse_args()
    args.evidence.mkdir(parents=True, exist_ok=False)
    current = json.loads((ROOT / 'assets/data/explorer/current.json').read_text())
    assert current['state'] == 'available'
    sid = current['snapshot']
    index = json.loads((ROOT / 'assets/data/explorer/snapshots' / sid / 'index.json').read_text())
    byfile = {f['id']: f for f in index['files']}
    command_location = next(loc for loc in index['locations'] if loc['identity'] == COMMAND and loc['precision'] == 'span' and byfile[loc['fileId']]['path'].endswith('CreditBalanceBehaviors.scala'))
    guard_location = next(loc for loc in index['locations'] if loc['identity'] == GUARD and loc['precision'] == 'span')
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    steps = []
    try:
        with sync_playwright() as p:
            for engine in ('chromium', 'webkit'):
                browser = getattr(p, engine).launch()
                context = browser.new_context(viewport={'width': 1440, 'height': 1000})
                errors, external = [], []
                context.on('request', lambda req: external.append(req.url) if not req.url.startswith(base) else None)
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base + '/explorer/?node=aggregate%3ACreditBalance#nodes')
                page.wait_for_selector('#xp-node-anchors [data-xp-location]', state='attached')
                assert 'unavailable' not in page.locator('#xp-node-anchors').inner_text().lower()
                assert sid in page.url
                page.screenshot(path=str(args.evidence / f'{engine}-credit-balance.png'), full_page=True)
                page.locator('#xp-tour').click()
                page.wait_for_selector('#xp-node-anchors .xp-locations summary')
                page.locator('#xp-node-anchors .xp-locations').evaluate('(e) => {e.open = true}')
                page.locator(f'#xp-node-anchors .xp-locations [data-xp-location="{command_location["id"]}"]').click()
                page.wait_for_selector('.xp-source-line.selected')
                assert 'CreditBalanceBehaviors.scala' in page.locator('#xp-code-heading').inner_text()
                selected = page.locator('.xp-source-line.selected').all_inner_texts()
                assert any('ReserveFunds' in s for s in selected)
                page.locator('.xp-source-line.selected .xp-line-number').first.click()
                page.wait_for_function('(id) => document.querySelector("#xp-code-knowledge").textContent.includes(id)', arg=COMMAND)
                page.screenshot(path=str(args.evidence / f'{engine}-reserve-funds-code.png'), full_page=True)
                steps.append({'engine': engine, 'step': 'real command round-trip', 'snapshot': sid, 'file': page.locator('#xp-code-heading').inner_text(), 'line': parse_qs(urlsplit(page.url).query)['line'][0], 'identity': COMMAND})
                page.locator('#xp-code-knowledge a.xp-short-path').filter(has_text='outgoing-funds.structure.yaml').first.click()
                page.wait_for_function('document.querySelector("#xp-code-viewer").textContent.includes("ReserveFunds")')
                assert '/payload/atoms/2/doc/payload' in page.locator('#xp-code-knowledge').inner_text()
                page.goto(base + '/explorer/?view=code&snapshot=' + sid + '&knowledge=' + GUARD.replace(':', '%3A').replace('/', '%2F') + '#code')
                page.wait_for_selector('#xp-code-knowledge [data-xp-location]')
                page.locator(f'#xp-code-knowledge .xp-identity > p [data-xp-location="{guard_location["id"]}"]').click()
                page.wait_for_selector('.xp-source-line.selected')
                guard_text = '\n'.join(page.locator('.xp-source-line.selected').all_inner_texts())
                assert 'LEDGER_SUFFICIENT' in guard_text
                page.locator('.xp-source-line.selected .xp-line-number').first.click()
                page.wait_for_function('(id) => document.querySelector("#xp-code-knowledge").textContent.includes(id)', arg=GUARD)
                page.screenshot(path=str(args.evidence / f'{engine}-ledger-guard.png'), full_page=True)
                steps.append({'engine': engine, 'step': 'real guard round-trip', 'file': page.locator('#xp-code-heading').inner_text(), 'line': parse_qs(urlsplit(page.url).query)['line'][0], 'code': guard_text, 'identity': GUARD})
                page.reload()
                page.wait_for_selector('.xp-source-line.selected')
                page.locator('#language-switch').click()
                page.wait_for_selector('.xp-source-line.selected')
                assert '/zh/explorer/' in page.url and sid in page.url
                page.set_viewport_size({'width': 375, 'height': 850})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                page.screenshot(path=str(args.evidence / f'{engine}-mobile-guard.png'), full_page=True)
                page.locator('#xp-toggle-files').click()
                page.locator('#xp-code-search').fill('build.sbt')
                page.locator('#xp-code-files a').click()
                assert '未公开' in page.locator('#xp-code-message').inner_text()
                assert page.locator('#xp-code-viewer').inner_text() == ''
                assert not errors, errors
                assert not external, external
                steps.append({'engine': engine, 'step': 'real publication boundary and navigation', 'observed': 'Same snapshot after refresh/language, no overflow at 375px; build.sbt withheld rather than modified; no external requests/page errors'})
                context.close()
                browser.close()
        result = {'verdict': 'PASS', 'scope': 'Installed real bank source/anchor snapshot; not runtime acceptance', 'snapshot': sid, 'steps': steps}
        (args.evidence / 'report.json').write_text(json.dumps(result, indent=2, ensure_ascii=False))
        print(json.dumps(result, indent=2, ensure_ascii=False))
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
