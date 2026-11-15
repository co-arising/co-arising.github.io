#!/usr/bin/env python3
"""Read-only release gate over public payloads, including downloaded HTML and SQLite JSON."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = re.compile(r'/Users/[^\s"<>]+|/home/[^\s"<>]+|/private/tmp/|-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----')


def inspect(root=ROOT):
    root = Path(root).resolve()
    errors, checked, snapshot_states = [], [], []
    if (root / 'manifest.json').is_file():
        paths = sorted({*root.glob('*.json'), *root.glob('*.sqlite'), *root.glob('files/*.txt')})
    else:
        paths = sorted({*root.glob('downloads/**/*.html'), *root.glob('downloads/**/*.json'),
                        *root.glob('assets/data/**/*.json'), *root.glob('assets/data/**/*.sqlite'),
                        *root.glob('assets/data/explorer/**/*.txt')})
    if not paths:
        errors.append('No public payloads found; not a site or snapshot candidate')
    def scan(text, label):
        if PRIVATE.search(text):
            errors.append(f'{label}: private path or key material (value withheld from report)')
    def local(base, descriptor):
        raw = descriptor.get('path', '')
        if not raw or raw.startswith('/') or any(p in ('', '.', '..') for p in raw.split('/')) or re.search(r'[\\%:#?]', raw):
            raise ValueError('invalid resource path')
        target = base / raw
        if target.is_symlink() or not target.resolve().is_relative_to(base.resolve()):
            raise ValueError('escaping/symlink resource')
        data = target.read_bytes()
        if len(data) != descriptor.get('bytes') or hashlib.sha256(data).hexdigest() != descriptor.get('sha256'):
            raise ValueError('resource byte/hash mismatch')
        return target, data
    for path in paths:
        label = str(path.relative_to(root))
        checked.append(label)
        if path.is_symlink():
            errors.append(f'{label}: symlink payload')
            continue
        try:
            if path.suffix == '.sqlite':
                with sqlite3.connect(path.as_uri() + '?mode=ro&immutable=1', uri=True) as db:
                    for table in ('meta', 'nodes', 'edges'):
                        for row in db.execute('SELECT * FROM ' + table):
                            for value in row:
                                if isinstance(value, str):
                                    scan(value, label + ':' + table)
                continue
            text = path.read_text(encoding='utf-8')
            scan(text, label)
            if path.suffix != '.json':
                continue
            value = json.loads(text)
            # Parse escaped JSON strings as well as scanning their wire spelling.
            def scan_json(item):
                if isinstance(item, str):
                    scan(item, label)
                elif isinstance(item, dict):
                    for key, child in item.items():
                        scan(key, label)
                        scan_json(child)
                elif isinstance(item, list):
                    for child in item:
                        scan_json(child)
            scan_json(value)
            if not isinstance(value, dict):
                continue
            schema = value.get('schemaVersion')
            if schema == 'co-arising.explorer-current/v1':
                state = value.get('state')
                snapshot_states.append({'path': label, 'state': state})
                if state == 'available':
                    target, data = local(path.parent, value['manifest'])
                    manifest = json.loads(data)
                    if manifest.get('id') != value.get('snapshot'):
                        raise ValueError('current pointer snapshot mismatch')
                elif state != 'unavailable':
                    raise ValueError('unknown current pointer state')
            elif schema == 'co-arising.explorer-snapshot/v1':
                graph, _ = local(path.parent, value['graph'])
                _, data = local(path.parent, value['index'])
                index = json.loads(data)
                if index.get('snapshot') != value.get('id'):
                    raise ValueError('index snapshot mismatch')
                for file in index['files']:
                    if file['state'] == 'published':
                        _, data = local(path.parent, file['resource'])
                        if hashlib.sha256(data).hexdigest() != file['sha256'] or len(data) != file['bytes']:
                            raise ValueError('file fingerprint mismatch')
                    elif file.get('resource'):
                        raise ValueError('withheld file contains public resource')
        except (ValueError, KeyError, TypeError, OSError, sqlite3.Error) as error:
            errors.append(f'{label}: {type(error).__name__}: {error}')
    return {'scope': 'Public payload path/key scan and snapshot resource hashes; not secret-free certification or project verification',
            'checked': checked, 'snapshots': snapshot_states, 'errors': sorted(set(errors))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    args = parser.parse_args()
    result = inspect(args.root)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return int(bool(result['errors']))


if __name__ == '__main__':
    raise SystemExit(main())
