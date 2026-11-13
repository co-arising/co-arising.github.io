#!/usr/bin/env python3
"""Check the static site without building it or contacting another service."""

import argparse
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


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.ids = set()
        self.duplicates = set()
        self.links = []
        self.resources = []
        self.facts = set()
        self.lang = None
        self.alternates = {}
        self.canonical = None
        self.feed(path.read_text())

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if "id" in attrs:
            value = attrs["id"]
            if value in self.ids:
                self.duplicates.add(value)
            self.ids.add(value)
        if tag == "html":
            self.lang = attrs.get("lang")
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag == "link":
            if attrs.get("rel") == "alternate":
                self.alternates[attrs.get("hreflang")] = attrs.get("href")
            if attrs.get("rel") == "canonical":
                self.canonical = attrs.get("href")
            if attrs.get("rel") in ("stylesheet", "icon", "preload", "modulepreload"):
                self.resources.append(attrs.get("href", ""))
        if tag in ("script", "img", "iframe", "source", "video", "audio") and attrs.get("src"):
            self.resources.append(attrs["src"])
        for key in ("data-fact", "title"):
            self.facts.update(re.findall(r"F-\d+", attrs.get(key, "")))


def site_file(url, source):
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    path = unquote(parsed.path)
    result = ROOT / path.lstrip("/") if path.startswith("/") else source.parent / path
    if path.endswith("/"):
        result = result / "index.html"
    return result.resolve()


def check_site():
    errors = []
    warnings = []
    pages = {}
    facts_text = (ROOT / "SITE-FACTS.md").read_text()
    ledger_text = (ROOT / "LEDGER.md").read_text()
    facts = set(re.findall(r"^\| (F-\d+) \|", facts_text, re.M))
    deferred = set(re.findall(r"^\| (DEF-\d+) \|", ledger_text, re.M))
    for route in ROUTES:
        pair = []
        for prefix, lang in (("", "en"), ("zh", "zh-CN")):
            path = ROOT / prefix / route / "index.html"
            if not path.is_file():
                errors.append(f"Missing page: {path.relative_to(ROOT)}")
                continue
            page = Page(path)
            pages[path.resolve()] = page
            pair.append(page)
            if page.lang != lang:
                errors.append(f"{path.relative_to(ROOT)}: expected lang={lang}")
            en = "/" + (route + "/" if route else "")
            expected = {"en": "https://co-arising.github.io" + en,
                        "zh-CN": "https://co-arising.github.io/zh" + en,
                        "x-default": "https://co-arising.github.io" + en}
            if page.alternates != expected:
                errors.append(f"{path.relative_to(ROOT)}: incorrect hreflang counterparts")
            canonical = expected[lang]
            if page.canonical is None:
                warnings.append(f"{path.relative_to(ROOT)}: no self canonical")
            elif page.canonical != canonical:
                errors.append(f"{path.relative_to(ROOT)}: incorrect canonical")
        if len(pair) == 2 and pair[0].ids != pair[1].ids:
            errors.append(f"{route or '/'}: EN/ZH IDs differ: {sorted(pair[0].ids ^ pair[1].ids)}")
    pages[(ROOT / "404.html").resolve()] = Page(ROOT / "404.html")
    for path, page in pages.items():
        label = str(path.relative_to(ROOT))
        if page.duplicates:
            errors.append(f"{label}: duplicate IDs {sorted(page.duplicates)}")
        if page.facts - facts:
            errors.append(f"{label}: unregistered facts {sorted(page.facts - facts)}")
        for url in page.links + page.resources:
            target = site_file(url, path)
            if target and not target.is_relative_to(ROOT):
                errors.append(f"{label}: link escapes site: {url}")
            elif target and not target.is_file():
                errors.append(f"{label}: missing target: {url}")
            parsed = urlsplit(url)
            fragment = unquote(parsed.fragment)
            target_page = None if parsed.scheme or parsed.netloc else pages.get(target or path)
            if fragment and target_page:
                dynamic = target_page.path.parent.name == "explorer" and fragment in PRESETS
                if not dynamic and fragment not in target_page.ids:
                    errors.append(f"{label}: missing anchor: {url}")
        for resource in page.resources:
            if urlsplit(resource).scheme not in ("", "data", "blob") or resource.startswith("//"):
                errors.append(f"{label}: external runtime resource: {resource}")
        if page.path.parent.name == "status":
            if deferred - page.ids:
                errors.append(f"{label}: missing ledger anchors {sorted(deferred - page.ids)}")
    for path in (ROOT / "assets/css").glob("*.css"):
        for raw in re.findall(r"url\((.*?)\)", path.read_text()):
            url = raw.strip(" '\"")
            if urlsplit(url).scheme not in ("", "data") or url.startswith("//"):
                errors.append(f"{path.relative_to(ROOT)}: external CSS resource")
            else:
                target = site_file(url, path)
                if target and not target.is_file():
                    errors.append(f"{path.relative_to(ROOT)}: missing CSS resource {url}")
    meta = json.loads((ROOT / "assets/data/bank-wealth.graph.meta.json").read_text())
    database = ROOT / "assets/data/bank-wealth.graph.sqlite"
    actual_hash = hashlib.sha256(database.read_bytes()).hexdigest()
    declared_hash = meta.get("sha256", "").removeprefix("sha256:")
    if actual_hash != declared_hash:
        errors.append("Graph SQLite SHA-256 differs from metadata")
    with sqlite3.connect(database.as_uri() + "?mode=ro&immutable=1", uri=True) as db:
        counts = {table: db.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
                  for table in ("nodes", "edges")}
    for table, key in (("nodes", "nodeCount"), ("edges", "edgeCount")):
        if meta.get(key) != counts[table]:
            errors.append(f"Graph {table} count differs from metadata")
    public_text = [*pages.keys(), *ROOT.glob("docs/*.md"), ROOT / "SITE-FACTS.md", ROOT / "LEDGER.md"]
    for path in public_text:
        if re.search(r"/Users/|/private/tmp/|\.rounds/|-----BEGIN .*PRIVATE KEY-----", path.read_text()):
            errors.append(f"{path.relative_to(ROOT)}: private path or key material in public text")
    return {"pages": len(pages), "facts": len(facts), "ledger_items": len(deferred),
            "graph": counts, "errors": errors, "warnings": warnings}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--strict", action="store_true", help="also fail on missing canonical metadata")
    args = parser.parse_args()
    result = check_site()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if result["errors"] or args.strict and result["warnings"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
