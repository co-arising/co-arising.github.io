#!/usr/bin/env python3
"""Observe real article reading through browser clicks; retain temporary evidence."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import argparse
import json
import tempfile
import traceback

ROOT = Path(__file__).resolve().parents[1]
SLUGS = ('ai-coding-evolution-20261116', 'co-arising-implications-20261116')


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def verify(browser, base, evidence):
    observations, errors = [], []
    for width in (1280, 390):
        context = browser.new_context(viewport={'width': width, 'height': 900}, accept_downloads=True)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        try:
            page.goto(base + '/zh/')
            page.locator('#insights a.btn').click()
            page.wait_for_url(base + '/zh/articles/')
            page.evaluate('document.fonts.ready')
            assert page.locator('.article-card').count() == 2
            page.screenshot(path=str(evidence / f'index-{width}.png'), full_page=True)
            page.locator('.article-card h3 a').first.click()
            page.wait_for_url(base + '/zh/articles/' + SLUGS[0] + '/')
            for slug in SLUGS:
                page.goto(base + '/zh/articles/' + slug + '/')
                page.evaluate('document.fonts.ready')
                for theme in ('light', 'dark'):
                    for _ in range(3):
                        if page.locator('html').get_attribute('data-theme') == theme:
                            break
                        page.locator('#theme-toggle').click()
                    assert page.locator('html').get_attribute('data-theme') == theme
                    page.screenshot(path=str(evidence / f'{slug}-{width}-{theme}.png'))
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'page-level overflow'
                toc = page.locator('.article-toc')
                if not toc.evaluate('element => element.open'):
                    toc.locator('summary').click()
                page.locator('.article-toc a[href="#section-3"]').click()
                page.wait_for_timeout(900)
                heading_top = page.locator('#section-3').evaluate('element => element.getBoundingClientRect().top')
                nav_bottom = page.locator('#site-nav').evaluate('element => element.getBoundingClientRect().bottom')
                assert nav_bottom - 2 <= heading_top < 900, 'TOC target hidden by navigation'
                assert page.locator('.article-toc a[aria-current]').get_attribute('href') == '#section-3'
                assert '0%' != page.locator('#reading-position').text_content().split('·')[-1].strip()
                observations.append({'width': width, 'slug': slug, 'headingTop': heading_top,
                                     'navBottom': nav_bottom, 'progress': page.locator('#reading-position').text_content()})
                page.screenshot(path=str(evidence / f'{slug}-{width}-reading.png'))
                page.goto(base + '/zh/articles/' + slug + '/#section-2')
                page.reload()
                page.wait_for_function("() => { const top=document.querySelector('#section-2').getBoundingClientRect().top; return top >= document.querySelector('#site-nav').getBoundingClientRect().bottom - 2 && top < innerHeight; }")
                assert page.locator('#section-2').is_visible()
                with page.expect_download() as download:
                    page.locator('.article-actions a[download]').click()
                downloaded = Path(download.value.path()).read_bytes()
                assert downloaded == (ROOT / 'content/articles' / f'{slug}.md').read_bytes(), 'source download bytes differ'
                observations.append({'probe': 'deep-link reload and exact source download', 'width': width, 'slug': slug, 'bytes': len(downloaded)})
                for region in page.locator('.article-table, pre.code').all():
                    region.scroll_into_view_if_needed()
                    dimensions = region.evaluate('e => ({width:e.clientWidth,scroll:e.scrollWidth,overflow:getComputedStyle(e).overflowX})')
                    assert dimensions['overflow'] in ('auto', 'scroll'), dimensions
                    if width == 390 and dimensions['scroll'] > dimensions['width']:
                        region.evaluate('e => e.scrollLeft = e.scrollWidth')
                        assert region.evaluate('e => e.scrollLeft > 0'), 'wide content not scrollable'
                if slug == SLUGS[1]:
                    code = page.locator('pre.code code').first.inner_text()
                    assert '① 反向访谈' in code and '④ 独立子智能体' in code, 'workflow diagram missing'
                    page.locator('pre.code').first.scroll_into_view_if_needed()
                    page.screenshot(path=str(evidence / f'diagram-{width}.png'))
                page.locator('.article-related h3 a').click()
                other = SLUGS[1] if slug == SLUGS[0] else SLUGS[0]
                page.wait_for_url(base + '/zh/articles/' + other + '/')
                page.locator('#language-switch').click()
                page.wait_for_url(base + '/articles/')
                assert 'No English translations' in page.locator('main').inner_text()
                page.locator('#language-switch').click()
                page.wait_for_url(base + '/zh/articles/')
        finally:
            context.close()
    context = browser.new_context(java_script_enabled=False, viewport={'width': 390, 'height': 900})
    try:
        page = context.new_page()
        page.goto(base + '/zh/articles/' + SLUGS[1] + '/')
        page.locator('.article-toc a[href="#section-8"]').click()
        assert page.locator('#article-body').is_visible() and page.url.endswith('#section-8')
        assert page.locator('.article-toc').evaluate('e => e.open')
        observations.append({'probe': 'no JavaScript', 'bodyVisible': True, 'tocOpen': True, 'deepLink': '#section-8'})
        page.screenshot(path=str(evidence / 'no-js.png'))
    finally:
        context.close()
    assert not errors, errors
    return observations


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', choices=('chromium', 'webkit'), default='chromium')
    args = parser.parse_args()
    evidence = Path(tempfile.mkdtemp(prefix='co-arising-articles-'))
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    report = {'verdict': 'BLOCKED', 'browser': args.browser}
    phase = 'launch'
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as runtime:
            browser = getattr(runtime, args.browser).launch(headless=True)
            try:
                phase = 'verification'
                observations = verify(browser, f'http://127.0.0.1:{server.server_port}', evidence)
                report.update(verdict='PASS', observations=observations)
            finally:
                browser.close()
    except Exception as error:
        report.update(verdict='FAIL' if phase == 'verification' else 'BLOCKED', phase=phase, error=str(error), traceback=traceback.format_exc())
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    report['screenshots'] = sorted(path.name for path in evidence.glob('*.png'))
    (evidence / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({'evidence': str(evidence), **report}, ensure_ascii=False, indent=2))
    return 0 if report['verdict'] == 'PASS' else 2 if report['verdict'] == 'BLOCKED' else 1


if __name__ == '__main__':
    raise SystemExit(main())
