#!/usr/bin/env python3
"""Read-only entry resource inventory and byte budgets; not a load-time benchmark."""
import argparse
import gzip
import importlib.util
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import subprocess
import sys
from urllib.parse import urlsplit, unquote

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('site_checks', ROOT / 'tools/check-site.py')
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)


def git(*args):
    result = subprocess.run(['git', '-C', str(ROOT), *args], capture_output=True, check=True)
    return result.stdout


def local_path(url, source):
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    path = unquote(parsed.path)
    joined = path.lstrip('/') if path.startswith('/') else str(PurePosixPath(source).parent / path)
    joined = posixpath.normpath(joined)
    if joined == '..' or joined.startswith('../'):
        raise ValueError(f'Escaping resource: {url}')
    return joined


def inventory(read, entry):
    pending, seen, assets, missing = [entry], set(), [], []
    while pending:
        name = pending.pop()
        if name in seen:
            continue
        seen.add(name)
        data = read(name)
        if data is None:
            missing.append(name)
            continue
        assets.append({'path': name, 'bytes': len(data), 'gzipBytes': len(gzip.compress(data, mtime=0))})
        urls = []
        if name.endswith('.html'):
            page = site.Page(ROOT / name, data.decode('utf-8'))
            urls.extend(page.resources)
            for script in page.inline_scripts:
                urls.extend(site.js_runtime_references(script))
        elif name.endswith('.css'):
            text = data.decode('utf-8')
            urls.extend(raw.strip(' \'"') for raw in re.findall(r'url\((.*?)\)', text))
            urls.extend(raw[1:-1] for raw in re.findall(r'''@import\s+(["'][^"']+["'])''', text))
        elif name.endswith(('.js', '.mjs')) and not name.startswith('assets/vendor/'):
            urls.extend(site.js_runtime_references(data.decode('utf-8')))
        for url in urls:
            target = local_path(url, name)
            if target:
                pending.append(target)
    return {'assets': sorted(assets, key=lambda a: a['path']), 'missing': sorted(missing),
            'bytes': sum(a['bytes'] for a in assets), 'gzipBytes': sum(a['gzipBytes'] for a in assets)}


def measure(baseline=None):
    cache = {}
    def current(name):
        path = ROOT / name
        return path.read_bytes() if path.is_file() else None
    def previous(name):
        if name not in cache:
            try:
                cache[name] = git('show', f'{baseline}:{name}')
            except subprocess.CalledProcessError:
                cache[name] = None
        return cache[name]
    if baseline:
        if baseline.startswith('-') or not re.fullmatch(r'[\w./~-]+', baseline):
            raise ValueError('Invalid baseline Git ref')
        baseline = git('rev-parse', '--verify', baseline + '^{commit}').decode().strip()
    entries, warnings, errors = {}, [], []
    for prefix in ('', 'zh/'):
        for route in site.ROUTES:
            entry = prefix + (route + '/' if route else '') + 'index.html'
            now = inventory(current, entry)
            entries[entry] = {'current': now}
            if now['missing']:
                errors.append(f'{entry}: missing resources {now["missing"]}')
            if route != 'explorer' and any(a['path'].endswith(('.sqlite', '.wasm', 'bank-workshop.html')) for a in now['assets']):
                errors.append(f'{entry}: reading page depends on a heavy Explorer/workshop asset')
            if baseline:
                old = inventory(previous, entry)
                entries[entry]['baseline'] = old
                if old['missing']:
                    errors.append(f'{entry}: baseline inventory incomplete {old["missing"]}')
                delta = {key: now[key] - old[key] for key in ('bytes', 'gzipBytes')}
                growth = {key: round(100 * delta[key] / old[key], 2) if old[key] else None for key in delta}
                entries[entry].update(delta=delta, growthPercent=growth)
                if any(value is not None and value > 20 for value in growth.values()):
                    warnings.append(f'{entry}: growth exceeds 20%; review and explain the feature/content delta')
    critical = ['assets/css', 'assets/js', 'assets/data', 'assets/vendor', 'index.html', 'zh/index.html', 'explorer/index.html', 'zh/explorer/index.html']
    diffstat = git('diff', '--stat', baseline, '--', *critical).decode() if baseline else None
    return {'baseline': baseline, 'python': sys.version.split()[0],
            'scope': 'Transitive finite literal resource inventory, including on-demand Workers. Raw bytes and deterministic per-file gzip sum; not network transfer, cold/cache availability or timing. Dynamic URLs require browser review.',
            'entries': entries, 'criticalDiffstat': diffstat, 'errors': errors, 'warnings': warnings}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', help='existing Git ref, e.g. 6627b63; uses git show without checkout')
    parser.add_argument('--strict', action='store_true', help='also fail when growth needs an explanation')
    args = parser.parse_args()
    try:
        result = measure(args.baseline)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        result = {'errors': [str(error)], 'warnings': []}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return int(bool(result['errors'] or args.strict and result['warnings']))


if __name__ == '__main__':
    raise SystemExit(main())
