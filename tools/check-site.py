#!/usr/bin/env python3
"""Check static contracts without executing site JavaScript or contacting services."""

import argparse
from collections import Counter
import hashlib
import json
import re
import sqlite3
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
ROUTES = ("", "why-co-arising", "dsl", "pipeline", "bank-demo", "explorer", "compare", "guide", "status")
PRESETS = {"census", "describe", "blast", "lineage", "orphans", "sagas", "invariants"}
ID_RE = re.compile(r"(?<![\w-])(?:F-\d+|DEF-\d+)(?![\w-])")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class LiteralParser:
    """Only JSON-like JS literals, comments and trailing commas; never eval a body."""
    def __init__(self, text):
        self.text, self.pos = text, 0

    def space(self):
        while True:
            match = re.match(r"(?:\s+|//[^\n]*(?:\n|$)|/\*[\s\S]*?\*/)", self.text[self.pos:])
            if not match:
                return
            self.pos += match.end()

    def take(self, value):
        self.space()
        if self.text.startswith(value, self.pos):
            self.pos += len(value)
            return True
        return False

    def string(self):
        self.space()
        # Decode only standard literal escapes, not expressions or template strings.
        quote = self.text[self.pos:self.pos + 1]
        if quote not in ('"', "'"):
            raise ValueError("expected quoted string")
        match = re.match(r'''(["'])(?:\\.|(?!\1)[^\\\n])*?\1''', self.text[self.pos:])
        if not match:
            raise ValueError("unterminated string")
        self.pos += match.end()
        raw = match[0][1:-1]
        if quote == "'":
            raw = raw.replace('"', '\\"').replace("\\'", "'")
        return json.loads('"' + raw + '"')

    def value(self):
        self.space()
        if self.take('{'):
            result = {}
            while not self.take('}'):
                self.space()
                if self.text[self.pos:self.pos + 1] in ('"', "'"):
                    key = self.string()
                else:
                    match = re.match(r'[A-Za-z_$][\w$]*', self.text[self.pos:])
                    if not match:
                        raise ValueError("expected literal property")
                    key = match[0]
                    self.pos += match.end()
                if key in result or not self.take(':'):
                    raise ValueError("duplicate property or non-literal configuration")
                result[key] = self.value()
                if self.take('}'):
                    return result
                if not self.take(','):
                    raise ValueError("expected comma")
            return result
        if self.take('['):
            result = []
            while not self.take(']'):
                result.append(self.value())
                if self.take(']'):
                    return result
                if not self.take(','):
                    raise ValueError("expected comma")
            return result
        if self.text[self.pos:self.pos + 1] in ('"', "'"):
            return self.string()
        match = re.match(r'(true|false|null|-?\d+(?:\.\d+)?)(?![\w$])', self.text[self.pos:])
        if not match:
            raise ValueError("configuration must contain literals only")
        self.pos += match.end()
        return json.loads(match[0])


def site_configuration(text):
    match = re.search(r'^\s*const\s+SITE\s*=\s*', text, re.M)
    if not match:
        raise ValueError("missing const SITE configuration")
    parser = LiteralParser(text[match.end():])
    config = parser.value()
    if not parser.take(';') or not isinstance(config, dict):
        raise ValueError("malformed SITE configuration")
    groups = config.get('nav')
    if not isinstance(groups, list) or not groups:
        raise ValueError("SITE.nav must be nonempty groups")
    links = []
    for group in groups:
        if not isinstance(group, dict) or not isinstance(group.get('items'), list):
            raise ValueError("malformed SITE.nav group")
        for item in group['items']:
            if not isinstance(item, dict) or any(not isinstance(item.get(k), str) or not item[k].strip() for k in ('href', 'label', 'labelZh')):
                raise ValueError("navigation needs href and both labels")
            links.append(item['href'])
    expected = {'/' + route + '/' for route in ROUTES if route}
    if len(links) != len(expected) or set(links) != expected:
        raise ValueError("SITE.nav has duplicate, missing or unknown routes")
    return config


class Page(HTMLParser):
    def __init__(self, path, text=None):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.ids, self.duplicates = set(), set()
        self.links, self.resources, self.inline_scripts = [], [], []
        self.references = set()
        self.fact_markers, self.examples = Counter(), Counter()
        self.sections, self.nav_links, self.map_links, self.skip_links = [], [], [], []
        self.table_ids = {'facts': set(), 'ledger': set()}
        self.census_cells, self.section_links, self.example_code = [], {}, {}
        self.lang, self.page_id, self.canonical = None, None, None
        self.alternates, self.stack, self.elements = {}, [], []
        self.problems = []
        self.feed(path.read_text(encoding='utf-8') if text is None else text)
        self.close()

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if len(attrs) != len(attributes):
            self.problems.append('duplicate HTML attribute')
        ancestors = [entry[1].get('id') for entry in self.stack]
        section = next((a.get('id', '') for t, a in reversed(self.stack) if t == 'section'), '')
        if 'id' in attrs:
            value = attrs['id']
            if not value or value in self.ids:
                self.duplicates.add(value)
            self.ids.add(value)
            self.references.update(ID_RE.findall(value or ''))
            if tag == 'tr' or any(t == 'tr' for t, _ in self.stack):
                if any(t == 'table' for t, _ in self.stack):
                    for name in self.table_ids:
                        if name in ancestors:
                            self.table_ids[name].add(value)
        self.elements.append((tag, attrs))
        if tag == 'td' and 'F-10' in ancestors:
            cell = []
            self.census_cells.append(cell)
            attrs['_census'] = cell
        if tag == 'code':
            example = next((a.get('data-example') for t, a in reversed(self.stack) if t == 'pre'), None)
            if example:
                code = []
                self.example_code.setdefault(example, []).append(code)
                attrs['_example_code'] = code
        if tag == 'section':
            self.sections.append(attrs.get('id'))
            if not attrs.get('id'):
                self.problems.append('section missing stable ID')
        if tag == 'html':
            self.lang = attrs.get('lang')
        if tag == 'body':
            self.page_id = attrs.get('data-page')
        if tag == 'a':
            href = attrs.get('href', '')
            if href:
                self.links.append(href)
                self.section_links.setdefault(section, []).append(href)
            record = {'href': href, 'text': '', 'label': attrs.get('aria-label', '')}
            attrs['_anchor'] = record
            if 'site-nav' in ancestors:
                self.nav_links.append(record)
            if 'map' in ancestors:
                self.map_links.append(record)
            if 'skip-link' in attrs.get('class', '').split():
                self.skip_links.append(record)
        if tag == 'link':
            rel = attrs.get('rel', '').split()
            if 'alternate' in rel:
                lang = attrs.get('hreflang')
                if lang in self.alternates:
                    self.problems.append('duplicate hreflang')
                self.alternates[lang] = attrs.get('href')
            if 'canonical' in rel:
                if self.canonical is not None:
                    self.problems.append('duplicate canonical')
                self.canonical = attrs.get('href')
            if set(rel) & {'stylesheet', 'icon', 'preload', 'modulepreload', 'prefetch'}:
                self.resources.append(attrs.get('href', ''))
        if tag in ('script', 'img', 'iframe', 'source', 'video', 'audio', 'embed', 'track', 'input') and attrs.get('src'):
            self.resources.append(attrs['src'])
        if attrs.get('poster'):
            self.resources.append(attrs['poster'])
        if attrs.get('srcset'):
            self.resources.extend(part.strip().split()[0] for part in attrs['srcset'].split(',') if part.strip())
        for key in ('data-fact', 'title', 'href'):
            self.references.update(ID_RE.findall(attrs.get(key, '')))
        if 'data-fact' in attrs:
            facts = tuple(sorted(ID_RE.findall(attrs['data-fact'])))
            if not facts or re.sub(r'(?:F-\d+|[\s,])+', '', attrs['data-fact']):
                self.problems.append('malformed data-fact')
            self.fact_markers[(section, facts)] += 1
        if 'data-example' in attrs:
            self.examples[(section, attrs['data-example'])] += 1
        if tag not in VOID:
            self.stack.append((tag, attrs))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        if self.stack and self.stack[-1][0] == 'script':
            if self.stack[-1][1].get('type', '') not in ('application/json', 'application/ld+json'):
                self.inline_scripts.append(data)
            return
        if any(t == 'style' for t, _ in self.stack):
            return
        self.references.update(ID_RE.findall(data))
        badge = any('badge' in attrs.get('class', '').split() for _, attrs in self.stack)
        for _, attrs in self.stack:
            if '_anchor' in attrs:
                attrs['_anchor']['text'] += data
            if '_census' in attrs and not badge:
                attrs['_census'].append(data)
            if '_example_code' in attrs:
                attrs['_example_code'].append(data)


def registry_ids(text, prefix):
    rows = re.findall(r'^\s*\|\s*(' + prefix + r'-\d+)\s*\|', text, re.M)
    if not rows or len(rows) != len(set(rows)):
        raise ValueError(f'{prefix} registry is empty or has duplicate rows')
    return set(rows)


def atom_census(value):
    header = re.fullmatch(r'\s*(\d+)\s+(?:YAML atoms|个 YAML 原子)\s*[:：]\s*(.+?)\s*', value)
    if not header:
        raise ValueError('F-10 census header or enumeration is malformed')
    parts = re.split(r'\s*[,·]\s*', header[2])
    counts = []
    labels = set()
    for part in parts:
        match = re.fullmatch(r'(\d+)\s+([^\d,:：;；·]+)', part)
        if not match or not match[2].strip() or match[2].strip() in labels:
            raise ValueError('F-10 census item is malformed or duplicated')
        counts.append(int(match[1]))
        labels.add(match[2].strip())
    total = int(header[1])
    if sum(counts) != total:
        raise ValueError(f'F-10 census sum {sum(counts)} differs from total {total}')
    return total, counts


def bank_entry_findings(page, bank_url):
    route = page.path.parent.name
    if route == 'bank-demo':
        links = [href for href in page.section_links.get('run', []) if urlsplit(href).netloc]
        if links != [bank_url]:
            return ['bank source link differs from SITE.urls.bank or is missing/duplicated']
    if route == 'guide':
        blocks = page.example_code.get('bank-convenience', [])
        clones = re.findall(r'^\s*git clone\s+(\S+)\s*$', ''.join(blocks[0]), re.M) if len(blocks) == 1 else []
        if [url.removesuffix('.git') for url in clones] != [bank_url]:
            return ['bank clone target differs from SITE.urls.bank or is missing/duplicated']
    return []


def site_file(url, source, root=ROOT):
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    path = unquote(parsed.path)
    result = root / path.lstrip('/') if path.startswith('/') else source.parent / path
    if path.endswith('/'):
        result /= 'index.html'
    return result.resolve()


# Finite static URL patterns only. Repository/documentation href strings are not loads.
JS_STRING = r'''(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)'''
JS_LEXEME = re.compile(JS_STRING + r'|[A-Za-z_$][\w$]*|=>|[^\s]')
JS_REGEX = re.compile(r'/((?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n])+)/[a-z]*')


def js_tokens(text):
    tokens, pos = [], 0
    while pos < len(text):
        ignored = re.match(r'\s+|//[^\n]*|/\*[\s\S]*?\*/', text[pos:])
        if ignored:
            pos += ignored.end()
            continue
        # Regex bodies can contain quotes and //; do not mistake them for strings
        # or comments and lose the subsequent real fetch/Worker declarations.
        if text[pos] == '/' and (not tokens or tokens[-1] in ('(', '=', ':', ',', '[', '!', '&&', '||', 'return', '=>')):
            regex = JS_REGEX.match(text, pos)
            if regex:
                tokens.append('<regexp>')
                pos = regex.end()
                continue
        match = JS_LEXEME.match(text, pos)
        if not match:
            pos += 1
            continue
        tokens.append(match[0])
        pos = match.end()
    return tokens


def js_runtime_references(text):
    tokens = js_tokens(text)
    constants = {}
    def literal(token):
        if token[:1] == '`' and token[-1:] == '`':
            return token[1:-1] if '${' not in token else None
        if token[:1] in ('"', "'"):
            try:
                return LiteralParser(token).string()
            except (ValueError, IndexError):
                return None
        return constants.get(token)
    for i in range(len(tokens) - 3):
        if tokens[i] in ('const', 'let', 'var') and tokens[i + 2] == '=':
            value = literal(tokens[i + 3])
            if value is not None:
                constants[tokens[i + 1]] = value
    urls = []
    for i, token in enumerate(tokens[:-1]):
        if token in ('fetch', 'fetchBytes', 'Worker', 'SharedWorker', 'importScripts', 'import') and tokens[i + 1] == '(':
            depth = 1
            for current in tokens[i + 2:]:
                if current == '(':
                    depth += 1
                elif current == ')':
                    depth -= 1
                    if not depth:
                        break
                if depth == 1 and current == ',' and token != 'importScripts':
                    break  # options are not resource URLs
                value = literal(current)
                if value is not None and (depth == 1 or token in ('Worker', 'SharedWorker')):
                    urls.append(value)
        elif token == 'from' or token == 'import' and tokens[i + 1][:1] in ('"', "'"):
            value = literal(tokens[i + 1])
            if value is not None:
                urls.append(value)
        elif token == 'src' and tokens[i + 1] == '=' and i + 2 < len(tokens):
            value = literal(tokens[i + 2])
            if value is not None:
                urls.append(value)
    return sorted(set(urls))


def public_path_findings(text):
    return bool(re.search(r'/Users/|/private/tmp/|\.rounds/|-----BEGIN .*PRIVATE KEY-----', text))


def check_site(root=ROOT):
    root = Path(root).resolve()
    errors, warnings, pages = [], [], {}
    facts_text = (root / 'SITE-FACTS.md').read_text()
    facts = registry_ids(facts_text, 'F')
    deferred = registry_ids((root / 'LEDGER.md').read_text(), 'DEF')
    census, bank_url = None, None
    try:
        row = next(line for line in facts_text.splitlines() if re.match(r'^\s*\|\s*F-10\s*\|', line))
        cells = re.split(r'(?<!\\)\|', row)
        census = atom_census(cells[3])
    except (StopIteration, IndexError, ValueError) as error:
        errors.append(f'SITE-FACTS.md: F-10 census: {error}')
    try:
        config = site_configuration((root / 'assets/js/site.js').read_text())
        bank_url = config.get('urls', {}).get('bank')
        if not isinstance(bank_url, str) or not bank_url.startswith('https://'):
            bank_url = None
            raise ValueError('SITE.urls.bank must be an HTTPS repository URL')
    except ValueError as error:
        errors.append(f'assets/js/site.js: {error}')
    for route in ROUTES:
        pair = []
        for prefix, lang in (('', 'en'), ('zh', 'zh-CN')):
            path = root / prefix / route / 'index.html'
            if not path.is_file():
                errors.append(f'Missing page: {path.relative_to(root)}')
                continue
            page = Page(path)
            pages[path.resolve()] = page
            pair.append(page)
            label = path.relative_to(root)
            if page.page_id is not None and page.page_id != (route or 'home'):
                errors.append(f'{label}: unknown or incorrect data-page')
            if page.lang != lang:
                errors.append(f'{label}: expected lang={lang}')
            en = '/' + (route + '/' if route else '')
            expected = {'en': 'https://co-arising.github.io' + en,
                        'zh-CN': 'https://co-arising.github.io/zh' + en,
                        'x-default': 'https://co-arising.github.io' + en}
            if page.alternates != expected:
                errors.append(f'{label}: incorrect hreflang counterparts')
            if page.canonical is None:
                warnings.append(f'{label}: no self canonical')
            elif page.canonical != expected[lang]:
                errors.append(f'{label}: incorrect canonical')
        if len(pair) == 2:
            for name in ('ids', 'sections', 'examples', 'fact_markers'):
                if getattr(pair[0], name) != getattr(pair[1], name):
                    errors.append(f'{route or "/"}: EN/ZH {name} differ')
            # Compare all referenced identities as well as explicit data-fact occurrences.
            if pair[0].references != pair[1].references:
                errors.append(f'{route or "/"}: EN/ZH F/DEF references differ')
            def map_targets(page):
                return [re.sub(r'^/zh(?=/)', '', a['href']) for a in page.map_links]
            if map_targets(pair[0]) != map_targets(pair[1]):
                errors.append(f'{route or "/"}: EN/ZH map destinations differ')
    missing = root / '404.html'
    pages[missing.resolve()] = Page(missing)
    if pages[missing.resolve()].page_id != 'not-found':
        errors.append('404.html: missing not-found page identity')

    def resource(url, path):
        label = path.relative_to(root)
        parsed = urlsplit(url)
        if parsed.scheme not in ('', 'data', 'blob') or parsed.netloc:
            errors.append(f'{label}: external runtime resource: {url}')
            return
        target = site_file(url, path, root)
        if target and (not target.is_relative_to(root) or not target.is_file()):
            errors.append(f'{label}: missing or escaping runtime resource: {url}')

    for path, page in pages.items():
        label = str(path.relative_to(root))
        errors.extend(f'{label}: {problem}' for problem in page.problems)
        if page.duplicates:
            errors.append(f'{label}: duplicate IDs {sorted(page.duplicates)}')
        if page.references - facts - deferred:
            errors.append(f'{label}: unregistered F/DEF references {sorted(page.references - facts - deferred)}')
        expected_nav = {('/zh' if page.lang == 'zh-CN' else '') + '/' + (r + '/' if r else '') for r in ROUTES}
        actual_nav = [a['href'] for a in page.nav_links]
        if set(actual_nav) != expected_nav or len(actual_nav) != len(expected_nav):
            errors.append(f'{label}: static navigation must link all nine known routes once')
        if any(not (a['text'].strip() or a['label'].strip()) for a in page.nav_links + page.map_links):
            errors.append(f'{label}: navigation/map link missing accessible label')
        mains = [a.get('id') for t, a in page.elements if t == 'main']
        if len(mains) != 1 or not mains[0] or not any(a['href'] == '#' + mains[0] and a['text'].strip() for a in page.skip_links):
            errors.append(f'{label}: static main/skip-link contract missing')
        for url in page.links + page.resources:
            target = site_file(url, path, root)
            if target and not target.is_relative_to(root):
                errors.append(f'{label}: link escapes site: {url}')
            elif target and not target.is_file():
                errors.append(f'{label}: missing target: {url}')
            parsed = urlsplit(url)
            fragment = unquote(parsed.fragment)
            target_page = None if parsed.scheme or parsed.netloc else pages.get(target or path)
            if fragment and target_page:
                dynamic = target_page.path.parent.name == 'explorer' and fragment in PRESETS
                if not dynamic and fragment not in target_page.ids:
                    errors.append(f'{label}: missing anchor: {url}')
        for url in page.resources:
            resource(url, path)
        for script in page.inline_scripts:
            for url in js_runtime_references(script):
                resource(url, path)
        if bank_url:
            errors.extend(f'{label}: {problem}' for problem in bank_entry_findings(page, bank_url))
        if page.path.parent.name == 'status':
            try:
                if len(page.census_cells) != 4:
                    raise ValueError('F-10 census requires four data cells')
                displayed = atom_census(''.join(page.census_cells[1]))
                if census is not None and displayed != census:
                    raise ValueError('F-10 census quantities differ from SITE-FACTS')
            except ValueError as error:
                errors.append(f'{label}: {error}')
            for section, registered, prefix in (('facts', facts, 'F-'), ('ledger', deferred, 'DEF-')):
                actual = {v for v in page.table_ids[section] if v.startswith(prefix)}
                if actual != registered:
                    errors.append(f'{label}: {section} table IDs differ from registry: missing={sorted(registered - actual)}, extra={sorted(actual - registered)}')
    for path in (root / 'assets/css').glob('*.css'):
        text = path.read_text()
        for raw in re.findall(r'url\((.*?)\)', text):
            resource(raw.strip(' \'"'), path)
        for raw in re.findall(r'''@import\s+(["'][^"']+["'])''', text):
            resource(raw[1:-1], path)
    for path in (root / 'assets/js').glob('*.js'):
        for url in js_runtime_references(path.read_text()):
            resource(url, path)
    meta = json.loads((root / 'assets/data/bank-wealth.graph.meta.json').read_text())
    database = root / 'assets/data/bank-wealth.graph.sqlite'
    actual_hash = hashlib.sha256(database.read_bytes()).hexdigest()
    if actual_hash != meta.get('sha256', '').removeprefix('sha256:'):
        errors.append('Graph SQLite SHA-256 differs from metadata')
    with sqlite3.connect(database.as_uri() + '?mode=ro&immutable=1', uri=True) as db:
        counts = {table: db.execute(f'SELECT count(*) FROM {table}').fetchone()[0] for table in ('nodes', 'edges')}
    for table, key in (('nodes', 'nodeCount'), ('edges', 'edgeCount')):
        if meta.get(key) != counts[table]:
            errors.append(f'Graph {table} count differs from metadata')
    # Deliberately public prose only: test fixtures may contain negative private-path examples.
    public_text = [*pages, *root.glob('docs/*.md'), root / 'SITE-FACTS.md', root / 'LEDGER.md', root / 'README.md', root / 'tools/checks.md']
    for path in public_text:
        if public_path_findings(path.read_text()):
            errors.append(f'{path.relative_to(root)}: private path or key material in public text')
    return {'pages': len(pages), 'facts': len(facts), 'ledger_items': len(deferred), 'graph': counts,
            'scope': 'Static structure/references/bytes; not prose semantics, compiler validation or browser execution.',
            'errors': errors, 'warnings': warnings}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--strict', action='store_true', help='also fail on missing canonical metadata')
    args = parser.parse_args()
    try:
        result = check_site()
    except (OSError, ValueError, sqlite3.Error) as error:
        result = {'errors': [str(error)], 'warnings': []}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if result['errors'] or args.strict and result['warnings'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
