#!/usr/bin/env python3
"""Measure the real Code workbench and drive reading controls in two browsers."""
import argparse
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--evidence', required=True, type=Path)
    args = parser.parse_args()
    args.evidence.mkdir(parents=True, exist_ok=False)
    current = json.loads((ROOT / 'assets/data/explorer/current.json').read_text())
    index = json.loads((ROOT / 'assets/data/explorer/snapshots' / current['snapshot'] / 'index.json').read_text())
    author = next(f for f in index['files'] if f['path'].endswith('aggregates/credit-balance/aggregate.yaml'))
    rules = next(f for f in index['files'] if f['path'].endswith('domain/invariant/CreditBalanceRules.scala'))
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    observations = []
    try:
        with sync_playwright() as p:
            for engine in ('chromium', 'webkit'):
                browser = getattr(p, engine).launch()
                for width, height in [(2000, 1250), (1900, 900), (1440, 900), (1280, 800), (1024, 600), (375, 850)]:
                    context = browser.new_context(viewport={'width': width, 'height': height})
                    page = context.new_page()
                    errors, source_requests = [], []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('request', lambda req: source_requests.append(req.url) if '/files/' in req.url else None)
                    file = author if width >= 1440 else rules
                    line = 9 if file == author else 33
                    prefix = '/zh/' if width != 1280 else '/'
                    query = urlencode({'snapshot': current['snapshot'], 'view': 'code', 'file': file['id'], 'line': line})
                    page.goto(base + prefix + 'explorer/?' + query + '#code')
                    page.wait_for_selector(f'#xp-line-{line}.selected')
                    assert page.locator('#xp-code-heading').inner_text() == Path(file['path']).name
                    assert page.locator('#xp-code-path').text_content() == file['path']
                    notice = page.locator('#xp-code-quality-notice')
                    assert notice.is_visible() and notice.get_attribute('role') == 'note'
                    assert ('仍在升级' if prefix == '/zh/' else 'still evolving') in notice.inner_text()
                    assert notice.evaluate('e => !e.closest("details")'), 'quality notice must not be hidden in evidence details'
                    page.locator('#xp-file-details summary').click()
                    assert file['path'] in page.locator('#xp-file-evidence').inner_text()
                    assert '/assets/data/explorer/snapshots/' + current['snapshot'] in page.locator('#xp-file-evidence').inner_text()
                    page.locator('#xp-file-details summary').click()
                    measure = page.locator('#xp-code-viewer').evaluate("e => {const r=e.getBoundingClientRect(),s=getComputedStyle(e.querySelector('code')); return {width:r.width,height:r.height,font:s.fontSize,lineHeight:s.lineHeight,bodyWidth:document.documentElement.scrollWidth,bodyHeight:document.documentElement.scrollHeight,scrollY};}")
                    assert measure['font'] == '14px' and measure['lineHeight'] == '24px', measure
                    assert measure['bodyWidth'] <= width + 1 and measure['bodyHeight'] <= height + 1, measure
                    if width >= 1900:
                        assert measure['width'] >= 1200 and measure['width'] / width >= .65, measure
                    if width == 1440:
                        assert measure['width'] >= 700, measure
                    if height == 900:
                        assert measure['height'] >= 600, measure
                    if width >= 900:
                        assert page.locator('#xp-files-panel').is_visible()
                        resizer = page.locator('#xp-files-resizer')
                        assert resizer.is_visible() and resizer.get_attribute('role') == 'separator'
                        before_resize = page.url
                        requests_before_resize = len(source_requests)
                        bounds = resizer.bounding_box()
                        page.mouse.move(bounds['x'] + 6, bounds['y'] + 80)
                        page.mouse.down()
                        page.mouse.move(bounds['x'] + 126, bounds['y'] + 80, steps=8)
                        page.mouse.up()
                        assert resizer.get_attribute('aria-valuenow') == '390'
                        assert abs(page.locator('#xp-files-panel').bounding_box()['width'] - 390) <= 1
                        page.locator('#xp-focus').click()
                        assert resizer.is_hidden()
                        page.locator('#xp-focus').click()
                        assert resizer.get_attribute('aria-valuenow') == '390'
                        resizer.focus()
                        page.keyboard.press('ArrowLeft')
                        assert resizer.get_attribute('aria-valuenow') == '380'
                        page.keyboard.press('End')
                        assert page.locator('#xp-code-viewer').bounding_box()['width'] >= 480
                        page.keyboard.press('Home')
                        assert resizer.get_attribute('aria-valuenow') == '220'
                        page.keyboard.press('Enter')
                        assert resizer.get_attribute('aria-valuenow') == '270'
                        assert page.url == before_resize and len(source_requests) == requests_before_resize
                        assert page.locator(f'#xp-line-{line}.selected').is_visible()
                    else:
                        assert page.locator('#xp-files-panel').is_hidden()
                        assert page.locator('#xp-files-resizer').is_hidden()
                        page.locator('#xp-toggle-files').click()
                        assert page.locator('#xp-files-resizer').is_hidden()
                    selected = page.locator('#xp-code-files a[aria-current="true"]')
                    assert selected.count() == 1 and selected.get_attribute('data-file-id') == file['id']
                    assert selected.is_visible()
                    assert selected.locator('.xp-tree-label').evaluate('e => getComputedStyle(e).whiteSpace') == 'nowrap'
                    page.locator('#xp-code-search').fill('does-not-match-current')
                    assert page.locator('#xp-reveal-file').is_visible()
                    page.locator('#xp-reveal-file').click()
                    assert page.locator('#xp-code-search').input_value() == ''
                    assert page.locator('#xp-code-files a[aria-current="true"]').count() == 1
                    if width < 900:
                        page.keyboard.press('Escape')
                        assert page.locator('#xp-files-panel').is_hidden()
                        assert page.locator('#xp-toggle-files').evaluate('e => e === document.activeElement')
                    before = page.url
                    requests_before = len(source_requests)
                    scroll_before = page.locator('#xp-code-viewer').evaluate('e => e.scrollTop')
                    page.locator('#xp-focus').click()
                    assert notice.is_visible(), 'focus reading must retain the sample quality warning'
                    assert page.locator('#xp-files-panel').is_hidden() and page.locator('#xp-knowledge-panel').is_hidden()
                    assert page.locator('#xp-code-viewer').bounding_box()['width'] > width - 70
                    assert page.url == before and len(source_requests) == requests_before
                    assert abs(page.locator('#xp-code-viewer').evaluate('e => e.scrollTop') - scroll_before) <= 1
                    page.locator('#xp-focus').click()
                    if width < 1440:
                        page.locator('#xp-toggle-knowledge').click()
                        assert page.locator('#xp-knowledge-panel').is_visible()
                        page.keyboard.press('Escape')
                        assert page.locator('#xp-knowledge-panel').is_hidden()
                        assert page.locator('#xp-toggle-knowledge').evaluate('e => e === document.activeElement')
                        page.locator('#xp-toggle-knowledge').click()
                        page.locator('#xp-code-find').focus()
                        assert page.locator('#xp-knowledge-panel').is_hidden(), 'drawer covered escaped keyboard focus'
                    page.screenshot(path=str(args.evidence / f'{engine}-{width}-{height}-light.png'))
                    page.locator('html').evaluate("e => e.setAttribute('data-theme','dark')")
                    assert notice.is_visible()
                    page.screenshot(path=str(args.evidence / f'{engine}-{width}-{height}-dark.png'))
                    page.locator('[data-explorer-view="graph"]').click()
                    assert page.locator('#nodes').is_visible()
                    assert page.locator('main.wrap').bounding_box()['width'] <= 1120
                    page.go_back()
                    page.wait_for_selector(f'#xp-line-{line}.selected')
                    assert page.locator('#xp-code-files a[aria-current="true"]').count() == 1
                    assert not errors, errors
                    observations.append({'engine': engine, 'viewport': [width, height], 'file': file['path'], **measure, 'controls': 'focus/restore, filter/reveal, responsive panels, Escape/focus, history passed'})
                    context.close()
                browser.close()
        report = {'verdict': 'PASS', 'snapshot': current['snapshot'], 'scope': 'Real bank code reading layout and controls; no data regeneration', 'measurements': observations}
        (args.evidence / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
        print(json.dumps(report, indent=2, ensure_ascii=False))
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
