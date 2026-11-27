"""Article publishing contract tests: stdlib unittest plus maintenance Markdown.

Run: python3 -m unittest discover -s tools/tests -p test_articles.py
"""

from collections import Counter
import contextlib
import copy
import hashlib
import html
from html.parser import HTMLParser
import importlib.util
import io
from itertools import chain
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

import markdown

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("build_articles", ROOT / "tools/build-articles.py")
build = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(build)
HASHES = {
    "ai-coding-evolution-20261116.md": "16a41c0909b15fc6737d70fd7571b486a9d351b9986708dc853f31024ba1f0da",
    "co-arising-implications-20261116.md": "c0a4ee7ce15480139662ef2e341a331d5868b02f20b38adad450d1067187e823",
    "lauren-tan-trust-pyramid-20261118.md": "0b68c0a2034492c61a2f8be0423f7675134d60dbd82ad4490c716aa76edc3495",
    "ai-engineer-code-2026-50-talks-20261119.md": "ee3039e90869d20c57c3de2297ddaafac9526e7968bae09f3218fd170ed6f70e",
    "ai-coding-evolution-20261116.en.md": "43815570068d5ab19e85ecc77e19c7ad3b551dec98c49c237ad4064fd3acab2f",
    "co-arising-implications-20261116.en.md": "7034a819d39fbd94c9acafa9ff700fc8b69bd60503b519815aba181852890967",
    "lauren-tan-trust-pyramid-20261118.en.md": "ec5bbcf7aa91ba2ee7ff5a5bedb59920e77f668b2511f674615fb7c2ca74be60",
    "ai-engineer-code-2026-50-talks-20261119.en.md": "53902d6ed8e00602a98a2035e833db580b82d10963c6d8e6429b600dd8146e3d",
    "aws-kiro-smt-spec-analyzer-20261119.md": "bc509b54c4cb042cce2ec4aa1c3e0bbe7a7f70e9b58727074d729bc29db6ab86",
    "aws-kiro-smt-spec-analyzer-20261119.en.md": "b58a15c73e0895a588eaaa84e3649df094b5b912230a070a91b302771ab0b5f2",
    "co-arising-ears-spec-20261123.md": "f18d1151bcae40b924699169a9a9d0c6e0f03dd87fdabe0c289b7eee2ec87cfd",
    "co-arising-ears-spec-20261123.en.md": "98118f3333285cc54a8667a06a4e1cd023a2f25435d9b81e702a21e09a42fa51",
    "bank-wealth-quickstart-architecture-extensibility-20261125.md": "fa58d25f7a356b4f8fa1f9f7aa2e3f7ea4d28add8fb7cf99d42f2c3dffacf22c",
    "bank-wealth-quickstart-architecture-extensibility-20261125.en.md": "65bec908a3f97b30d2e074d4b4fbce76552f11db7043e5ebc76f76730119fd7d",
    "metarch-truthsrc-extending-code-generator-20261126.md": "521dc2d34e4862d8a68ccc0c00b840eafbd630cb966b0428097d71c4dcf5d362",
    "metarch-truthsrc-extending-code-generator-20261126.en.md": "5e26eddfdf65297b7d03db15395329fd97b40b031ed9c0d5cbeb646a393edfc1",
    "co-arising-v2-ears-native-architecture-20261126.md": "2e7a115ce0f1d1fa1730e0c5821078ab8632dcce34dfd8a8723a7f44829ee9b1",
    "co-arising-v2-ears-native-architecture-20261126.en.md": "0a892cb127974bd1586be972b059d2693ca7268ecb075cba2a5c81f5cc897099",
    "co-arising-v2-ga-prd-to-running-guide-20261126.md": "f0b72ea865999ecaf9daa0a95276634de41bbad65711638cb1abeb278cfb3d85",
    "co-arising-v2-ga-prd-to-running-guide-20261126.en.md": "aafd9b469cd2448f99d889f9e07824f2b425b16ccaa5584833cfe91527c084cf",
    "co-arising-v2-deterministic-playbook-20261126.md": "452566e71f8e6f4f7e1a11711edaca678a21daed72c350ea7fd3b4909e1345ec",
    "co-arising-v2-deterministic-playbook-20261126.en.md": "60c76b697569c51603a399e70967368702556294e7febe156fa23aaa900c0a11",
    "play-cqrs-artifact-type-map-20261127.md": "30a5dad8d7ac43f814a085f3608ef975f6ef7020721a648f73bf5b2e67b7c638",
    "play-cqrs-artifact-type-map-20261127.en.md": "d5d424b3bf150bbfac9613ce9b3c47797f0fa16ec552f0fd19cb71c49c15b6f6",
    "metarch-truthsrc-architecture-minefield-map-20261127.md": "e9ed2922b32ab940607d38a52f13d94ae2c29c2401a231c4dfe5401b03006b08",
    "metarch-truthsrc-architecture-minefield-map-20261127.en.md": "8396c6565e7bfe2cf259da957518b28740b852f5171ad62b8adc4641fd33558c",
}


def locale_variants(item):
    """Yield (locale, metadata, source text) for the Chinese original and, when
    the manifest item carries the EN trio, its English translation."""
    variants = [("zh", item, (build.CONTENT / item["source"]).read_text(encoding="utf-8"))]
    if "source_en" in item:
        meta = build.localized(item, "en")
        variants.append(("en", meta, (build.CONTENT / meta["source"]).read_text(encoding="utf-8")))
    return variants


class PageParser(HTMLParser):
    """Small HTML DOM adapter for assertions, not a Markdown renderer."""
    VOID = {"meta", "link", "img", "br", "hr", "input", "source", "wbr"}

    def __init__(self, content):
        super().__init__(convert_charrefs=True)
        self.root = ET.Element("document")
        self.stack = [self.root]
        self.feed(content)
        self.close()

    def handle_starttag(self, tag, attrs):
        node = ET.SubElement(self.stack[-1], tag, {key: value or "" for key, value in attrs})
        if tag not in self.VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        ET.SubElement(self.stack[-1], tag, {key: value or "" for key, value in attrs})

    def handle_endtag(self, tag):
        if len(self.stack) == 1 or self.stack[-1].tag != tag:
            raise AssertionError(f"Unbalanced generated HTML: {tag}")
        self.stack.pop()

    def handle_data(self, data):
        parent = self.stack[-1]
        if len(parent):
            parent[-1].tail = (parent[-1].tail or "") + data
        else:
            parent.text = (parent.text or "") + data


def text(node):
    return "".join(node.itertext())


def by_id(root, ident):
    return next(node for node in root.iter() if node.get("id") == ident)


def by_class(root, value):
    return [node for node in root.iter() if value in node.get("class", "").split()]


def independent_source_ast(source):
    # Oracle uses the official parser independently of the publishing extension.
    # Normalize only caption-adjacent list separation in this source dialect.
    lines = source.splitlines()
    normalized, in_fence = [], False
    for line in lines:
        if line.startswith("```"):
            in_fence = not in_fence
        if (not in_fence and re.match(r"^(?:[-+*]|\d+\.) ", line) and normalized
                and normalized[-1].strip() and not normalized[-1].startswith(" ")
                and not re.match(r"^(?:[-+*]|\d+\.) ", normalized[-1])):
            normalized.append("")
        normalized.append(line)
    rendered = markdown.markdown(
        "\n".join(normalized), extensions=["tables", "fenced_code", "sane_lists"],
        tab_length=2, output_format="xhtml",
    )
    return ET.fromstring("<article>" + rendered + "</article>")


def semantic_tree(node, strategy=False):
    """Ignore publishing attributes/wrappers, retain full ordered semantic AST."""
    if node.tag == "div" and node.get("class") == "article-table":
        return semantic_tree(node[0], strategy)
    tag = node.tag.rsplit("}", 1)[-1] if isinstance(node.tag, str) else node.tag
    attrs = dict(node.attrib)
    for name in ("id", "class", "scope"):
        attrs.pop(name, None)
    if strategy and attrs.get("href") == "./ai-coding-evolution-20261116.md":
        attrs["href"] = build.detail_route(build.SURVEY_SLUG)
    return (
        tag, attrs,
        " ".join((node.text or "").split()),
        tuple(semantic_tree(child, strategy) for child in node),
        " ".join((node.tail or "").split()),
    )


class ArticleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = build.load_manifest()
        cls.pages = build.generate_pages()
        cls.dom = {path: PageParser(data.decode("utf-8")).root for path, data in cls.pages.items()}

    def test_pinned_maintenance_dependency(self):
        self.assertEqual(markdown.__version__, "3.4.1")
        requirements = (ROOT / "tools/requirements-articles.txt").read_text().splitlines()
        self.assertEqual([line for line in requirements if line and not line.startswith("#")], ["Markdown==3.4.1", "html5lib==1.1"])

    def test_exact_archived_source_bytes(self):
        expected_sources = {item["source"] for item in self.items} | {item.get("source_en") for item in self.items if "source_en" in item}
        self.assertEqual(set(HASHES), expected_sources)
        for item in self.items:
            for locale, meta, _ in locale_variants(item):
                with self.subTest(slug=item["slug"], locale=locale):
                    archived = (build.CONTENT / meta["source"]).read_bytes()
                    self.assertEqual(hashlib.sha256(archived).hexdigest(), HASHES[meta["source"]])
                    self.assertEqual(archived.decode("utf-8").encode("utf-8"), archived)
                    # Workspace originals are optional after cloning the published site.
                    original = ROOT.parent / meta["source"]
                    if original.is_file():
                        self.assertEqual(archived, original.read_bytes())

    def test_full_original_semantics_and_structure(self):
        for item in self.items:
            for locale, meta, source in locale_variants(item):
                with self.subTest(slug=item["slug"], locale=locale):
                    original = independent_source_ast(source)
                    self.assertEqual(text(original[0]), meta["title"])
                    original.remove(original[0])
                    original.text = None
                    rendered, _ = build.render_body(source, meta)
                    rendered.text = None
                    self.assertEqual(semantic_tree(rendered), semantic_tree(original, strategy=item["slug"] == build.STRATEGY_SLUG))
                    page = self.dom[build.detail_route(item["slug"], locale).lstrip("/") + "index.html"]
                    self.assertEqual(text(page.find(".//h1")), meta["title"])
                    self.assertEqual(len(list(page.iter("h1"))), 1)
                    self.assertEqual(len(list(rendered.iter("h1"))), 0)

    def test_original_ordered_external_links_and_counts(self):
        for item in self.items:
            for locale, meta, source in locale_variants(item):
                # External links may be Markdown destinations or guarded raw-HTML
                # href attributes; both must reach the body in exact source order.
                matches = sorted(
                    chain(re.finditer(r"\]\((https?://[^)\s]+)\)", source),
                          re.finditer(r'href="(https?://[^"\s]+)"', source)),
                    key=lambda match: match.start(),
                )
                expected = [html.unescape(match.group(1)) for match in matches]
                body, _ = build.render_body(source, meta)
                actual = [node.get("href") for node in body.iter("a") if node.get("href").startswith(("http://", "https://"))]
                self.assertGreater(len(expected), 10, (item["slug"], locale))
                self.assertEqual(Counter(actual), Counter(expected), (item["slug"], locale))
                self.assertEqual(actual, expected, (item["slug"], locale))

    def test_headings_stable_ascii_and_toc_main_sections_only(self):
        for item in self.items:
          for locale, meta, source in locale_variants(item):
            body, toc = build.render_body(source, meta)
            original = independent_source_ast(source)
            expected = [text(node) for node in original.iter() if node.tag in {"h2", "h3"}]
            self.assertEqual([text(node) for node in body.iter() if node.tag in {"h2", "h3"}], expected)
            section, subsection = 0, 0
            for node in body.iter():
                if node.tag == "h2":
                    section += 1
                    subsection = 0
                    self.assertEqual(node.get("id"), f"section-{section}")
                elif node.tag == "h3":
                    subsection += 1
                    self.assertEqual(node.get("id"), f"section-{section}-{subsection}")
            if item["slug"] in build.NESTED_TOC_SLUGS:
                self.assertEqual(toc.get("class"), "toc-tree")
                self.assertEqual(len(toc), section)
                toc_hrefs = [a.get("href") for a in toc.iter("a")]
                expected_all = [f"#{n.get('id')}" for n in body.iter() if n.tag in {"h2", "h3"}]
                self.assertEqual(toc_hrefs, expected_all)
                self.assertTrue(list(toc.iter("details")), (item["slug"], locale))
            else:
                self.assertEqual([a.get("href") for a in toc.iter("a")], [f"#section-{n}" for n in range(1, section + 1)])
                self.assertEqual(len(toc), section)
                for node in toc.iter("a"):
                    self.assertFalse(re.search(r"\bsection-\d+-\d+", node.get("href")))

    def test_blockquotes_code_tables_and_nested_lists_preserved(self):
        for item in self.items:
          for locale, meta, source in locale_variants(item):
            body, _ = build.render_body(source, meta)
            oracle = independent_source_ast(source)
            for tag in ("blockquote", "pre", "code", "ul", "ol", "li", "table", "th", "strong"):
                self.assertEqual(len(list(body.iter(tag))), len(list(oracle.iter(tag))), (item["slug"], locale, tag))
            self.assertEqual([text(node) for node in body.iter("blockquote")], [text(node) for node in oracle.iter("blockquote")])
            expected_code = re.findall(r"^```[^\n]*\n(.*?)^```[ \t]*$", source, re.MULTILINE | re.DOTALL)
            self.assertEqual([text(node.find("code")) for node in body.iter("pre")], expected_code)
            for pre in body.iter("pre"):
                self.assertEqual(pre.get("class"), "code")
                self.assertIsNotNone(pre.find("code"))
            for table in body.iter("table"):
                wrapper = next(node for node in body.iter("div") if table in list(node))
                self.assertEqual(wrapper.get("class"), "article-table")
                self.assertEqual(wrapper.get("tabindex"), "0")
                self.assertEqual(wrapper.get("role"), "region")
                self.assertTrue(wrapper.get("aria-label"))
                self.assertTrue(all(th.get("scope") == "col" for th in table.iter("th")))
        strategy = next(item for item in self.items if item["slug"] == build.STRATEGY_SLUG)
        body, _ = build.render_body((build.CONTENT / strategy["source"]).read_text(), strategy)
        self.assertTrue(body.findall(".//ul/li/ul/li"), "Two-space nested bullet lists must stay nested")
        self.assertTrue(body.findall(".//ul/li/ol/li"), "Nested reviewer checklist must remain ordered")
        survey = next(item for item in self.items if item["slug"] == build.SURVEY_SLUG)
        body, _ = build.render_body((build.CONTENT / survey["source"]).read_text(), survey)
        ordered = next(ol for ol in body.iter("ol") if "Markdown 审查地狱" in text(ol))
        self.assertEqual(len(ordered), 4)
        self.assertEqual(ordered.get("start", "1"), "1")
        self.assertTrue(all(li.find("blockquote") is not None for li in list(ordered)[:3]))
        self.assertIn("Spec-as-Source", text(ordered[3]))

    def test_relative_mapping_only_and_provenance_fixture(self):
        metadata = dict(self.items[1], title="原文与来源")
        source = '''# 原文与来源

> 来源：[外部页面](https://example.org/source)
> 保留原始记录。

## 一、**原文** &amp; 引用

[姐妹文章](./ai-coding-evolution-20261116.md)
[其他链接](./other.md)
[带片段](./ai-coding-evolution-20261116.md#notes)

### 引文

终点。
'''
        body, toc = build.render_body(source, metadata)
        self.assertEqual(text(body.find("blockquote")), "\n来源：外部页面\n保留原始记录。\n")
        self.assertEqual([a.get("href") for a in body.iter("a")], ["https://example.org/source", build.detail_route(build.SURVEY_SLUG), "./other.md", "./ai-coding-evolution-20261116.md#notes"])
        self.assertEqual(text(body.find("h2")), "一、原文 & 引用")
        self.assertEqual(text(toc.find("li/a")), "01 原文 & 引用")
        survey_meta = dict(metadata, slug=build.SURVEY_SLUG)
        survey_body, _ = build.render_body(source, survey_meta)
        self.assertEqual(list(survey_body.iter("a"))[1].get("href"), "./ai-coding-evolution-20261116.md")

    def test_safe_raw_html_entities_rich_text_and_urls(self):
        metadata = dict(self.items[0], title='标题 <安全> & "引文"')
        source = '''# 标题 <安全> & "引文"

<div class="co-report"><p class="co-note">版式原生 <strong>块级 HTML</strong> &amp; 实体 &#x1F642; 保留。</p></div>

## 一、**中文 &amp;** café &copy; &#x1F642;

### 子标题 *保留强调*

[实际链接](https://example.org/?a=1&b=2)

```
<script> &copy; <tag> café
```
'''
        body, toc = build.render_body(source, metadata)
        # Guarded raw block HTML passes through as real elements.
        self.assertIsNotNone(body.find("div/p/strong"))
        self.assertEqual(text(body.find("div/p")), "版式原生 块级 HTML & 实体 🙂 保留。")
        self.assertEqual(text(body.find("h2")), "一、中文 & café © 🙂")
        self.assertIsNotNone(body.find("h2/strong"))
        self.assertIsNotNone(body.find("h3/em"))
        self.assertEqual(text(toc.find("li/a")), "01 中文 & café © 🙂")
        self.assertEqual(text(body.find("pre/code")), "<script> &copy; <tag> café\n")
        self.assertEqual(body.find(".//a").get("href"), "https://example.org/?a=1&b=2")
        # Active raw HTML is rejected at build time, never rendered or escaped.
        for fragment, message in (
            ("<script>alert(\"bad\")</script>", "banned element: <script>"),
            ("<style>p { color: red }</style>", "banned element: <style>"),
            ('<iframe src="https://cdn.example/frame"></iframe>', "banned element: <iframe>"),
            ('<img src="x" onerror="bad()" />', "event-handler attribute onerror"),
            ('<div onclick="bad()">x</div>', "event-handler attribute onclick"),
            ('<a href="javascript:alert(1)">x</a>', "Unsafe article URL scheme"),
        ):
            with self.subTest(fragment=fragment), self.assertRaisesRegex(ValueError, re.escape(message)):
                build.render_body('# 标题 <安全> & "引文"\n\n' + fragment + "\n", metadata)
        for url in ("javascript:alert(1)", "data:text/html,bad", "vbscript:bad", "java\nscript:bad", "//evil.example", "\\evil.example", " javascript:bad"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                build.safe_url(url)
        with self.assertRaises(ValueError):
            build.render_body('# Safe\n\n[x](javascript:alert(1))', dict(metadata, title="Safe"))

    def test_metadata_escaping_and_validation(self):
        # Hostile metadata is escaped in the shell; the body itself goes through
        # the raw-HTML guard, so the H1 fixture stays free of active content.
        special = '<img src=x onerror="bad()"> & "中文"'
        tamed = '标题 <安全> & "引文"'
        item = dict(self.items[0], title=tamed, deck=special, category=special)
        detail = build.detail_page(item, self.items[1], "# " + tamed + "\n\n## 安全\n\n内容。")
        dom = PageParser(detail).root
        self.assertEqual(text(dom.find(".//h1")), tamed)
        self.assertEqual(dom.find('.//meta[@name="description"]').get("content"), special)
        self.assertFalse(list(dom.iter("img")))
        self.assertEqual(text(by_class(dom, "article-deck")[0]), special)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manifest.json"
            for field, value in (("slug", "../../evil"), ("source", "../evil.md"), ("related", "absent"), ("date", "2026-1-1"), ("deck", "bad\nvalue")):
                items = copy.deepcopy(self.items)
                items[0][field] = value
                path.write_text(json.dumps({"articles": items}), encoding="utf-8")
                with self.subTest(field=field), self.assertRaises(ValueError):
                    build.load_manifest(path)
            path.write_text(json.dumps({"articles": [self.items[0], self.items[0]]}))
            with self.assertRaisesRegex(ValueError, "Duplicate"):
                build.load_manifest(path)
        for slug in ("../evil", "/evil", "x/y", "中文", "a\" onclick=\"bad"):
            with self.assertRaises(ValueError):
                build.detail_route(slug)
        with self.assertRaisesRegex(ValueError, "exactly match"):
            build.render_body("# Different", self.items[0])

    def test_routes_shell_language_and_translation_pairs(self):
        self.assertEqual(set(self.pages), set(build.OWNED_OUTPUTS))
        styles = [f"/assets/css/{name}.css" for name in ("tokens", "base", "components", "pages", "articles")]
        for path, dom in self.dom.items():
            is_detail = path not in ("articles/index.html", "zh/articles/index.html")
            zh = path.startswith("zh/")
            self.assertEqual(dom.find(".//html").get("lang"), "zh-CN" if zh else "en")
            body = dom.find(".//body")
            self.assertEqual(body.get("data-page"), "article" if is_detail else "articles")
            canonical = dom.find('.//link[@rel="canonical"]').get("href")
            self.assertEqual(canonical, build.SITE + "/" + path.removesuffix("index.html"))
            self.assertEqual([node.get("href") for node in dom.findall('.//link[@rel="stylesheet"]')], styles)
            self.assertIsNotNone(dom.find('.//link[@rel="icon"]'))
            nav_links = [node.get("href") for node in by_id(dom, "site-nav").iter("a")]
            self.assertEqual(nav_links[:10], [("/zh" if zh else "") + href for href, _, _ in build.NAV])
            self.assertIsNotNone(by_id(dom, "main-content"))
            self.assertEqual(by_class(dom, "skip-link")[0].get("href"), "#main-content")
            scripts = [node.get("src") for node in dom.iter("script")]
            self.assertEqual(scripts, ["/assets/js/site.js"] + (["/assets/js/articles.js"] if is_detail else []))
            self.assertNotIn("fetch(", self.pages[path].decode())
            if is_detail:
                current_item = next(item for item in self.items if item["slug"] in path)
                locale = "zh" if zh else "en"
                meta = build.localized(current_item, locale)
                self.assertEqual(body.get("data-language-index"), "/articles/")
                switches = [node for node in by_id(dom, "site-nav").iter("a") if node.get("lang")]
                self.assertEqual(len(switches), 1)
                switch = switches[0]
                if "source_en" in current_item:
                    # Paired details advertise the full hreflang trio like paired indices.
                    self.assertEqual({node.get("hreflang"): node.get("href") for node in dom.findall('.//link[@rel="alternate"]')}, {
                        "en": build.SITE + build.detail_route(current_item["slug"], "en"),
                        "zh-CN": build.SITE + build.detail_route(current_item["slug"], "zh"),
                        "x-default": build.SITE + build.detail_route(current_item["slug"], "en"),
                    })
                    counterpart = build.detail_route(current_item["slug"], "en" if zh else "zh")
                    self.assertEqual(body.get("data-language-counterpart"), counterpart)
                    self.assertEqual(switch.get("href"), counterpart)
                else:
                    # Unpaired Chinese-only details must not advertise a translation.
                    self.assertFalse(dom.findall('.//link[@rel="alternate"]'))
                    self.assertIsNone(body.get("data-language-counterpart"))
                    self.assertEqual(switch.get("href"), "/articles/")
                    self.assertEqual(switch.get("lang"), "en")
                    self.assertIn("EN index", text(switch))
                if "source_en" in current_item:
                    self.assertEqual(switch.get("lang"), "en" if zh else "zh-CN")
                    self.assertEqual(switch.get("hreflang"), "en" if zh else "zh-CN")
                    self.assertIn("alternate", (switch.get("rel") or "").split())
                    self.assertEqual(text(switch), "EN" if zh else "中文")
                download = next(a for a in dom.iter("a") if a.get("download"))
                self.assertEqual(download.get("href"), "/content/articles/" + download.get("download"))
                self.assertEqual(download.get("download"), meta["source"])
                note = by_class(dom, "editorial-note")[0]
                self.assertEqual(note.get("aria-label"), "editorial distinction")
                expected_editorial = build.EDITORIAL if zh else build.EDITORIAL_EN
                self.assertIn(expected_editorial, text(note))
                self.assertNotIn(expected_editorial, text(by_id(dom, "article-body")))
                if build.STRATEGY_SLUG in path:
                    self.assertIn(build.STRATEGY_NOTE if zh else build.STRATEGY_NOTE_EN, text(note))
                self.assertIn("/zh/status/" if zh else "/status/", [a.get("href") for a in note.iter("a")])
                sidebar = by_class(dom, "article-sidebar")[0]
                toc = by_class(sidebar, "article-toc")[0]
                self.assertIn("open", toc.attrib)
                self.assertEqual(text(toc.find("summary")), "阅读目录" if zh else "Contents")
                self.assertEqual(toc.find("nav").get("aria-label"), "文章目录" if zh else "Article contents")
                self.assertIsNotNone(toc.find("nav/ol"))
                self.assertEqual(text(by_id(sidebar, "reading-position")), "阅读全文" if zh else "Read the full article")
                progress = by_class(dom, "reading-progress")[0]
                self.assertEqual(progress.get("aria-hidden"), "true")
                self.assertIsNotNone(by_id(progress, "reading-progress"))
                related = by_class(dom, "article-related")[0]
                self.assertEqual(len(by_class(related, "article-card")), 1)
                self.assertIn(build.detail_route(current_item["related"], locale), [a.get("href") for a in related.iter("a")])
                self.assertIn(("/zh/articles/" if zh else "/articles/"), [a.get("href") for a in related.iter("a")])

    def test_discovery_pair_ids_sections_hreflang_and_decorative_cover(self):
        en = self.dom["articles/index.html"]
        zh = self.dom["zh/articles/index.html"]
        self.assertEqual([node.get("id") for node in en.iter() if node.get("id")], [node.get("id") for node in zh.iter() if node.get("id")])
        for dom in (en, zh):
            ids = [node.get("id") for node in dom.iter() if node.get("id")]
            self.assertEqual(len(ids), len(set(ids)))
            self.assertEqual([node.get("id") for node in dom.iter("section")], ["articles", "editorial-context"])
            self.assertEqual({node.get("hreflang"): node.get("href") for node in dom.findall('.//link[@rel="alternate"]')}, {
                "en": build.SITE + "/articles/", "zh-CN": build.SITE + "/zh/articles/", "x-default": build.SITE + "/articles/",
            })
            self.assertEqual(len(by_class(dom, "article-card")), len(self.items))
            for name in ("insights-hero", "over", "insights-title", "insights-deck", "insights-cover", "insights-grid"):
                self.assertTrue(by_class(dom, name), name)
            svg = by_class(dom, "insights-cover")[0].find("svg")
            self.assertEqual(svg.get("aria-hidden"), "true")
            self.assertEqual(svg.get("focusable"), "false")
            self.assertEqual([text(node) for node in svg.iter("text")], ["v i b e", "agent", "harness"])
            self.assertFalse([node for node in svg.iter() if node.tag in {"script", "image", "foreignobject"} or node.get("href") or node.get("src")])
        # Translated items show EN cards; items without the EN trio fall back
        # to the Chinese original card linking the zh detail.
        for item in self.items:
            card = by_id(en, "article-" + item["slug"])
            self.assertIsNotNone(card, item["slug"])
            if "source_en" in item:
                self.assertEqual(card.get("lang"), "en")
                self.assertEqual(text(card.find("h3/a")), item["title_en"])
                self.assertIn(build.detail_route(item["slug"], "en"), [a.get("href") for a in card.iter("a")])
                self.assertIn("English translation", text(card))
            else:
                self.assertEqual(card.get("lang"), "zh-CN")
                self.assertEqual(text(card.find("h3/a")), item["title"])
                self.assertIn(build.detail_route(item["slug"], "zh"), [a.get("href") for a in card.iter("a")])
                self.assertIn("Chinese article · 中文原文", text(card))
        self.assertNotIn("No English translations are available", text(en))
        for path, dom in self.dom.items():
            ids = [node.get("id") for node in dom.iter() if node.get("id")]
            self.assertEqual(len(ids), len(set(ids)), path)
            for link in dom.iter("a"):
                href = link.get("href", "")
                if href.startswith("#"):
                    self.assertIn(href[1:], ids, (path, href))

    def test_check_freshness_is_byte_exact_and_never_writes(self):
        before = {path: ((ROOT / path).read_bytes(), (ROOT / path).stat().st_mtime_ns) for path in build.OWNED_OUTPUTS}
        result = subprocess.run([sys.executable, str(ROOT / "tools/build-articles.py"), "--check"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        after = {path: ((ROOT / path).read_bytes(), (ROOT / path).stat().st_mtime_ns) for path in build.OWNED_OUTPUTS}
        self.assertEqual(before, after)
        self.assertEqual(build.generate_pages(), self.pages)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            for path, data in self.pages.items():
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
            stale = root / build.OWNED_OUTPUTS[0]
            stale.write_bytes(stale.read_bytes() + b"\n")
            before = {path: ((root / path).read_bytes(), (root / path).stat().st_mtime_ns) for path in build.OWNED_OUTPUTS}
            with patch.object(build, "ROOT", root), contextlib.redirect_stderr(io.StringIO()) as errors:
                self.assertEqual(build.main(["--check"]), 1)
                self.assertIn(build.OWNED_OUTPUTS[0], errors.getvalue())
            self.assertEqual(before, {path: ((root / path).read_bytes(), (root / path).stat().st_mtime_ns) for path in build.OWNED_OUTPUTS})
            with patch.object(build, "ROOT", root), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(build.main([]), 0)
            self.assertEqual({path: (root / path).read_bytes() for path in build.OWNED_OUTPUTS}, self.pages)
            self.assertEqual({str(path.relative_to(root)) for path in root.rglob("*") if path.is_file()}, set(build.OWNED_OUTPUTS))

    def test_cannot_supply_arbitrary_output_or_symlink_target(self):
        result = subprocess.run([sys.executable, str(ROOT / "tools/build-articles.py"), "--target", "/tmp/not-owned"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("unrecognized arguments", result.stderr)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            external = root / "untouched.html"
            external.write_bytes(b"untouched")
            target = root / build.OWNED_OUTPUTS[0]
            target.parent.mkdir(parents=True, exist_ok=True)
            target.symlink_to(external)
            with patch.object(build, "ROOT", root), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(build.main([]), 1)
                self.assertEqual(build.main(["--check"]), 1)
            self.assertEqual(external.read_bytes(), b"untouched")


    def test_browser_entity_and_empty_element_semantics(self):
        expected = "https://example.com/?a=1&copycat;=2"
        for url in (expected, "https://example.com/?a=1&amp;copycat;=2"):
            body = build.markdown_fragment(f"[link]({url})")
            self.assertEqual(body.find(".//a").get("href"), expected)
        body = build.markdown_fragment("[](https://example.com) innocent text")
        serialized = build.serialize(body)
        self.assertIn('<a href="https://example.com"></a> innocent text', serialized)
        self.assertEqual(text(build.markdown_fragment("AT&T; revenue")), "AT&T; revenue")
        self.assertEqual(text(build.markdown_fragment("&#128; &#146; &#X2192; &#0; &#x110000;")), "€ ’ → � �")

    def test_multiline_inline_constructs_and_standard_code(self):
        body = build.markdown_fragment("[caption\n- item](https://example.com)")
        self.assertEqual(body.find(".//a").get("href"), "https://example.com")
        self.assertFalse(list(body.iter("ul")))
        body = build.markdown_fragment("`caption\n- item`")
        self.assertIsNotNone(body.find(".//code"))
        self.assertFalse(list(body.iter("ul")))
        body = build.markdown_fragment("    if ready:\n        do_work()")
        self.assertEqual(text(body.find("pre/code")), "if ready:\n    do_work()\n")

    def test_hardlinked_outputs_do_not_modify_shared_inodes(self):
        import os
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            backup = root / "backup.html"
            backup.write_bytes(b"unowned backup")
            for relative in build.OWNED_OUTPUTS[:2]:
                target = root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                os.link(backup, target)
            with patch.object(build, "ROOT", root), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(build.main([]), 0)
            self.assertEqual(backup.read_bytes(), b"unowned backup")
            self.assertEqual((root / "articles/index.html").read_bytes(), self.pages["articles/index.html"])
            self.assertNotEqual((root / "articles/index.html").stat().st_ino, (root / "zh/articles/index.html").stat().st_ino)

    def test_future_manifest_article_stays_in_article_namespace(self):
        # A future 7-field manifest item (no EN trio) stays a Chinese-only detail.
        base = {k: v for k, v in self.items[0].items() if not k.endswith("_en")}
        third = dict(base, slug="future-article", source="future-article.md", title="Future article")
        with tempfile.TemporaryDirectory() as directory:
            content = Path(directory)
            for item in self.items:
                (content / item["source"]).write_bytes((build.CONTENT / item["source"]).read_bytes())
                if "source_en" in item:
                    (content / item["source_en"]).write_bytes((build.CONTENT / item["source_en"]).read_bytes())
            (content / third["source"]).write_text("# Future article\n\n## Topic\n\nContent.")
            with patch.object(build, "load_manifest", return_value=self.items + [third]), patch.object(build, "CONTENT", content):
                pages = build.generate_pages()
            self.assertEqual(set(pages) - set(self.pages), {"zh/articles/future-article/index.html"})

    def test_translated_manifest_item_publishes_both_locales(self):
        translated = dict(self.items[0])
        with tempfile.TemporaryDirectory() as directory:
            content = Path(directory)
            for item in self.items:
                (content / item["source"]).write_bytes((build.CONTENT / item["source"]).read_bytes())
                if "source_en" in item:
                    (content / item["source_en"]).write_bytes((build.CONTENT / item["source_en"]).read_bytes())
            with patch.object(build, "load_manifest", return_value=self.items), patch.object(build, "CONTENT", content):
                pages = build.generate_pages()
            for item in self.items:
                self.assertIn(f"zh/articles/{item['slug']}/index.html", pages)
                if "source_en" in item:
                    self.assertIn(f"articles/{item['slug']}/index.html", pages)
                else:
                    self.assertNotIn(f"articles/{item['slug']}/index.html", pages)


if __name__ == "__main__":
    unittest.main()
