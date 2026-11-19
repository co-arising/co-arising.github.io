"""Article publishing contract tests: stdlib unittest plus maintenance Markdown.

Run: python3 -m unittest discover -s tools/tests -p test_articles.py
"""

from collections import Counter
import contextlib
import copy
import hashlib
from html.parser import HTMLParser
import importlib.util
import io
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
    "co-arising-implications-20261116.md": "d2f62b4646fc0e3118e5a93b44dfd97ec2de20038fc2b0d810fd26a78c537a32",
    "lauren-tan-trust-pyramid-20261118.md": "0b68c0a2034492c61a2f8be0423f7675134d60dbd82ad4490c716aa76edc3495",
}


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
    attrs = dict(node.attrib)
    for name in ("id", "class", "scope"):
        attrs.pop(name, None)
    if strategy and attrs.get("href") == "./ai-coding-evolution-20261116.md":
        attrs["href"] = build.detail_route(build.SURVEY_SLUG)
    return (
        node.tag, attrs,
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
        self.assertEqual(set(HASHES), {item["source"] for item in self.items})
        for item in self.items:
            with self.subTest(slug=item["slug"]):
                archived = (build.CONTENT / item["source"]).read_bytes()
                self.assertEqual(hashlib.sha256(archived).hexdigest(), HASHES[item["source"]])
                self.assertEqual(archived.decode("utf-8").encode("utf-8"), archived)
                # Workspace originals are optional after cloning the published site.
                original = ROOT.parent / item["source"]
                if original.is_file():
                    self.assertEqual(archived, original.read_bytes())

    def test_full_original_semantics_and_structure(self):
        for item in self.items:
            with self.subTest(slug=item["slug"]):
                source = (build.CONTENT / item["source"]).read_text(encoding="utf-8")
                original = independent_source_ast(source)
                self.assertEqual(text(original[0]), item["title"])
                original.remove(original[0])
                original.text = None
                rendered, _ = build.render_body(source, item)
                rendered.text = None
                self.assertEqual(semantic_tree(rendered), semantic_tree(original, strategy=item["slug"] == build.STRATEGY_SLUG))
                page = self.dom[build.detail_route(item["slug"]).lstrip("/") + "index.html"]
                self.assertEqual(text(page.find(".//h1")), item["title"])
                self.assertEqual(len(list(page.iter("h1"))), 1)
                self.assertEqual(len(list(rendered.iter("h1"))), 0)

    def test_original_ordered_external_links_and_counts(self):
        for item in self.items:
            source = (build.CONTENT / item["source"]).read_text(encoding="utf-8")
            expected = re.findall(r"\]\((https?://[^)\s]+)\)", source)
            body, _ = build.render_body(source, item)
            actual = [node.get("href") for node in body.iter("a") if node.get("href").startswith(("http://", "https://"))]
            self.assertGreater(len(expected), 10)
            self.assertEqual(Counter(actual), Counter(expected))
            self.assertEqual(actual, expected)

    def test_headings_stable_ascii_and_toc_main_sections_only(self):
        for item in self.items:
            source = (build.CONTENT / item["source"]).read_text(encoding="utf-8")
            body, toc = build.render_body(source, item)
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
            self.assertEqual([a.get("href") for a in toc.iter("a")], [f"#section-{n}" for n in range(1, section + 1)])
            self.assertEqual(len(toc), section)
            for node in toc.iter("a"):
                self.assertFalse(re.search(r"\bsection-\d+-\d+", node.get("href")))

    def test_blockquotes_code_tables_and_nested_lists_preserved(self):
        for item in self.items:
            source = (build.CONTENT / item["source"]).read_text(encoding="utf-8")
            body, _ = build.render_body(source, item)
            oracle = independent_source_ast(source)
            for tag in ("blockquote", "pre", "code", "ul", "ol", "li", "table", "th", "strong"):
                self.assertEqual(len(list(body.iter(tag))), len(list(oracle.iter(tag))), (item["slug"], tag))
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

<script>alert("bad")</script>

<img src="x" onerror="bad()" />

## 一、**中文 &amp;** café &copy; &#x1F642;

### 子标题 *保留强调*

[实际链接](https://example.org/?a=1&b=2)

```
<script> &copy; <tag> café
```
'''
        body, toc = build.render_body(source, metadata)
        self.assertFalse(list(body.iter("script")))
        self.assertFalse(list(body.iter("img")))
        self.assertIn('<script>alert("bad")</script>', text(body))
        self.assertEqual(text(body.find("h2")), "一、中文 & café © 🙂")
        self.assertIsNotNone(body.find("h2/strong"))
        self.assertIsNotNone(body.find("h3/em"))
        self.assertEqual(text(toc.find("li/a")), "01 中文 & café © 🙂")
        self.assertEqual(text(body.find("pre/code")), "<script> &copy; <tag> café\n")
        self.assertEqual(body.find(".//a").get("href"), "https://example.org/?a=1&b=2")
        serialized = build.serialize(body)
        self.assertIn("&lt;script&gt;", serialized)
        self.assertNotIn('<script>', serialized)
        for url in ("javascript:alert(1)", "data:text/html,bad", "vbscript:bad", "java\nscript:bad", "//evil.example", "\\evil.example", " javascript:bad"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                build.safe_url(url)
        with self.assertRaises(ValueError):
            build.render_body('# Safe\n\n[x](javascript:alert(1))', dict(metadata, title="Safe"))

    def test_metadata_escaping_and_validation(self):
        special = '<img src=x onerror="bad()"> & "中文"'
        item = dict(self.items[0], title=special, deck=special, category=special)
        detail = build.detail_page(item, self.items[1], "# " + special + "\n\n## 安全\n\n内容。")
        dom = PageParser(detail).root
        self.assertEqual(text(dom.find(".//h1")), special)
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

    def test_routes_shell_language_and_no_fake_translation(self):
        self.assertEqual(set(self.pages), set(build.OWNED_OUTPUTS))
        styles = [f"/assets/css/{name}.css" for name in ("tokens", "base", "components", "pages", "articles")]
        for path, dom in self.dom.items():
            is_detail = path.count("/") > 2
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
                self.assertEqual(body.get("data-language-index"), "/articles/")
                self.assertFalse(dom.findall('.//link[@rel="alternate"]'))
                self.assertFalse([node for node in dom.iter() if node.get("hreflang") == "en"])
                self.assertEqual(text(list(by_id(dom, "site-nav").iter("a"))[-1]), "EN index")
                download = next(a for a in dom.iter("a") if a.get("download"))
                self.assertEqual(download.get("href"), "/content/articles/" + download.get("download"))
                note = by_class(dom, "editorial-note")[0]
                self.assertEqual(note.get("aria-label"), "editorial distinction")
                self.assertIn(build.EDITORIAL, text(note))
                self.assertNotIn(build.EDITORIAL, text(by_id(dom, "article-body")))
                if build.STRATEGY_SLUG in path:
                    self.assertIn(build.STRATEGY_NOTE, text(note))
                self.assertIn("/zh/status/", [a.get("href") for a in note.iter("a")])
                sidebar = by_class(dom, "article-sidebar")[0]
                toc = by_class(sidebar, "article-toc")[0]
                self.assertIn("open", toc.attrib)
                self.assertEqual(text(toc.find("summary")), "阅读目录")
                self.assertEqual(toc.find("nav").get("aria-label"), "文章目录")
                self.assertIsNotNone(toc.find("nav/ol"))
                self.assertEqual(text(by_id(sidebar, "reading-position")), "阅读全文")
                progress = by_class(dom, "reading-progress")[0]
                self.assertEqual(progress.get("aria-hidden"), "true")
                self.assertIsNotNone(by_id(progress, "reading-progress"))
                related = by_class(dom, "article-related")[0]
                self.assertEqual(len(by_class(related, "article-card")), 1)
                current_item = next(item for item in self.items if item["slug"] in path)
                self.assertIn(build.detail_route(current_item["related"]), [a.get("href") for a in related.iter("a")])
                self.assertIn("/zh/articles/", [a.get("href") for a in related.iter("a")])

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
        self.assertIn("No English translations are available", text(en))
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
        third = dict(self.items[0], slug="future-article", source="future-article.md", title="Future article")
        with tempfile.TemporaryDirectory() as directory:
            content = Path(directory)
            for item in self.items:
                (content / item["source"]).write_bytes((build.CONTENT / item["source"]).read_bytes())
            (content / third["source"]).write_text("# Future article\n\n## Topic\n\nContent.")
            with patch.object(build, "load_manifest", return_value=self.items + [third]), patch.object(build, "CONTENT", content):
                pages = build.generate_pages()
            self.assertEqual(set(pages) - set(self.pages), {"zh/articles/future-article/index.html"})


if __name__ == "__main__":
    unittest.main()
