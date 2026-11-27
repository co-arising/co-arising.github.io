#!/usr/bin/env python3
"""Deterministic, maintenance-only publishing of the checked-in article pairs.

Run with Python and requirements-articles.txt. --check never writes. There is
intentionally no target option: routes are confined to the articles directories.
Markdown parses the body; ElementTree adds publishing structure, never regex HTML.
Chinese details live at /zh/articles/<slug>/; manifest items that carry the
optional title_en/deck_en/source_en trio also publish an English pair page at
/articles/<slug>/ with full hreflang counterparts.
"""

import argparse
from datetime import date
import html
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

sys.dont_write_bytecode = True

import html5lib
import markdown
from markdown.blockprocessors import CodeBlockProcessor
from markdown.extensions import Extension
from markdown.preprocessors import Preprocessor

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "articles"
MANIFEST = CONTENT / "manifest.json"
SITE = "https://co-arising.github.io"
DISCORD_URL = "https://discord.gg/PwYrRpJu75"
SURVEY_SLUG = "ai-coding-evolution-20261116"
STRATEGY_SLUG = "co-arising-implications-20261116"
PRACTICE_SLUG = "lauren-tan-trust-pyramid-20261118"
CODE50_SLUG = "ai-engineer-code-2026-50-talks-20261119"
KIRO_SLUG = "aws-kiro-smt-spec-analyzer-20261119"
SPEC_SLUG = "co-arising-ears-spec-20261123"
GUIDE_SLUG = "bank-wealth-quickstart-architecture-extensibility-20261125"
CODEGEN_EXT_SLUG = "metarch-truthsrc-extending-code-generator-20261126"
V2_ARCH_SLUG = "co-arising-v2-ears-native-architecture-20261126"
V2_GA_GUIDE_SLUG = "co-arising-v2-ga-prd-to-running-guide-20261126"
V2_PLAYBOOK_SLUG = "co-arising-v2-deterministic-playbook-20261126"
PLAY_CQRS_MAP_SLUG = "play-cqrs-artifact-type-map-20261127"
MINEFIELD_MAP_SLUG = "metarch-truthsrc-architecture-minefield-map-20261127"
NESTED_TOC_SLUGS = frozenset({PLAY_CQRS_MAP_SLUG})
# Initial publication fixture; future valid manifest slugs stay in /zh/articles/.
OWNED_OUTPUTS = (
    "articles/index.html",
    "zh/articles/index.html",
    f"zh/articles/{SURVEY_SLUG}/index.html",
    f"zh/articles/{STRATEGY_SLUG}/index.html",
    f"zh/articles/{PRACTICE_SLUG}/index.html",
    f"zh/articles/{CODE50_SLUG}/index.html",
    f"articles/{SURVEY_SLUG}/index.html",
    f"articles/{STRATEGY_SLUG}/index.html",
    f"articles/{PRACTICE_SLUG}/index.html",
    f"articles/{CODE50_SLUG}/index.html",
    f"zh/articles/{KIRO_SLUG}/index.html",
    f"articles/{KIRO_SLUG}/index.html",
    f"zh/articles/{SPEC_SLUG}/index.html",
    f"articles/{SPEC_SLUG}/index.html",
    f"zh/articles/{GUIDE_SLUG}/index.html",
    f"articles/{GUIDE_SLUG}/index.html",
    f"zh/articles/{CODEGEN_EXT_SLUG}/index.html",
    f"articles/{CODEGEN_EXT_SLUG}/index.html",
    f"zh/articles/{V2_ARCH_SLUG}/index.html",
    f"articles/{V2_ARCH_SLUG}/index.html",
    f"zh/articles/{V2_GA_GUIDE_SLUG}/index.html",
    f"articles/{V2_GA_GUIDE_SLUG}/index.html",
    f"zh/articles/{V2_PLAYBOOK_SLUG}/index.html",
    f"articles/{V2_PLAYBOOK_SLUG}/index.html",
    f"zh/articles/{PLAY_CQRS_MAP_SLUG}/index.html",
    f"articles/{PLAY_CQRS_MAP_SLUG}/index.html",
    f"zh/articles/{MINEFIELD_MAP_SLUG}/index.html",
    f"articles/{MINEFIELD_MAP_SLUG}/index.html",
)
EDITORIAL = "本文整理自公开分享对话，保留原文观点、引文与来源链接。所引外部数据和结论未在本次发布中独立核验，宜结合原始来源阅读。"
STRATEGY_NOTE = "本文是战略思考与工程路线建议，不是 co-arising 已交付能力清单；文中比例、竞争定位及拟议工具接口不构成实测或可用性承诺。"
SPEC_NOTE = "本文是前瞻性技术设计规范（v1.2.1），描述目标语言设计与验收标准，不属于已交付能力；文中命令、工具与产物均以实际落地版本为准，落地进度以状态页为准。"
SPEC_NOTE_EN = "This article is a forward-looking technical design specification (v1.2.1). It describes the target language design and acceptance criteria, not delivered capabilities; commands, tools and artifacts named here are subject to the actually shipped versions, and landing progress is tracked on the status page."
GUIDE_NOTE = "本文是面向 bank-wealth-demo 参考项目的端到端实战指南、洋葱架构源码拆解与代码生成器扩展规范；文中命令、产物类型与架构边界对照当前仓库版本整理，正式验收记录请以状态页为准。"
GUIDE_NOTE_EN = "This article is an end-to-end hands-on guide, Onion Architecture source breakdown, and code-generator extension specification for the bank-wealth-demo reference project; commands, artifact types, and architectural boundaries reflect the current repositories, while formal acceptance records remain tracked on the status page."
CODEGEN_EXT_NOTE = "本文是面向 metarch-truthsrc 0.5.0 的代码生成器扩展工程指南：管线中间产物、产品注册表与核心接线点均对照当前仓库源码核实；文中 Rust 洋葱架构示例为扩展蓝图而非已内置发货的生成器，正式验收边界请以状态页为准。"
CODEGEN_EXT_NOTE_EN = "This article is an engineering guide for extending metarch-truthsrc 0.5.0 with a new code generator: pipeline artifacts, product registry entries, and core wiring seams reflect the current repository source; the Rust Onion Architecture example is an extension blueprint rather than a shipped built-in generator, and formal acceptance records remain on the status page."
V2_ARCH_NOTE = "本文是 co-arising 2.0 的架构设计蓝图（ADR），文末已追加 v2.0.0 GA 落地实况附录；关于已交付工具链、银行试点与上手命令的完整说明，请同步阅读《co-arising 2.0 GA 完整指南》并以状态页（F-32–F-34）为准。"
V2_ARCH_NOTE_EN = "This article is the co-arising 2.0 architecture design blueprint (ADR), updated with a v2.0.0 GA implementation appendix; for the shipped toolchain walkthrough, bank pilot, and hands-on commands, also read the co-arising 2.0 GA Complete Guide and check the status page (F-32–F-34)."
V2_GA_GUIDE_NOTE = "本文对照 @madpolaris/truthsrc v2.0.0 与 bank-wealth-demo v2-pilot 源码及实测结果编写；v2 试点验证（F-32–F-34）与 2026-11-12 的 v1 独立全服务验收（F-24–F-28）口径分开，详见状态页。"
V2_GA_GUIDE_NOTE_EN = "This guide reflects the shipped @madpolaris/truthsrc v2.0.0 and bank-wealth-demo v2-pilot source and verification runs; v2 pilot evidence (F-32–F-34) is tracked separately from the 2026-11-12 v1 full-service acceptance run (F-24–F-28) on the status page."
V2_PLAYBOOK_NOTE = "本文面向社区与开发者介绍 co-arising 2.0 的确定性分层、最新 7 项更新与实验期（尤其是 Skill 交互层）的动手玩法；文中所列能力与正式验收边界仍以状态页（F-32–F-35）及仓库源码为准。"
V2_PLAYBOOK_NOTE_EN = "This hands-on playbook introduces co-arising 2.0's determinism boundaries, 7 latest upgrades, and experimental walkthrough (especially the Skill layer); formal capability and verification scopes remain tracked on the status page (F-32–F-35) and in repository source."
PLAY_CQRS_MAP_NOTE = "本文是与 metarch-truthsrc (scala-cqrs-play-service:2) 及 bank-wealth-demo 源码提交精确锁定的 Play CQRS Artifact Type 架构地图；当上游新增或升级任何 Artifact Type，或扩展新的目标技术栈（如 Rust）时，须通过 sync-site-facts 与 artifact-maps.lock.json 门禁同步更新本双语地图。"
PLAY_CQRS_MAP_NOTE_EN = "This is a commit-pinned Play CQRS Artifact Type architecture map synchronized to metarch-truthsrc (scala-cqrs-play-service:2) and bank-wealth-demo; whenever any Artifact Type evolves upstream or a new target stack (such as Rust) is added, sync-site-facts and artifact-maps.lock.json require updating this bilingual map."
MINEFIELD_MAP_NOTE = "本文通过 artifact-maps.lock.json 与 metarch-truthsrc v2.0.0（提交 b2b61e5，bank-wealth-demo @ bd20e36）精确绑定，记录当前模块拓扑、14 条跨文件隐蔽耦合暗道、两波 13 个已实锤修复（SPEC-S13..S20）及 Wave-3 诚实边界雷达；正式产品验收基线请以状态页（F-32–F-35）为准。"
MINEFIELD_MAP_NOTE_EN = "Commit-pinned via artifact-maps.lock.json to metarch-truthsrc v2.0.0 (commit b2b61e5, bank-wealth-demo @ bd20e36), this engineering manual maps the current module topology, 14 cross-file hidden couplings, 13 empirically confirmed fixes across Wave-1 & Wave-2 (SPEC-S13..S20), and Wave-3 honest boundaries; formal product evidence remains tracked on the status page (F-32–F-35)."
NAV = (
    ("/", "Home", "首页"),
    ("/why-co-arising/", "Why co-arising", "为何 co-arising"),
    ("/dsl/", "Language", "真源语言"),
    ("/pipeline/", "Pipeline", "流水线"),
    ("/bank-demo/", "Bank example", "银行示例"),
    ("/explorer/", "Explorer", "探索器"),
    ("/compare/", "Landscape", "全景对比"),
    ("/guide/", "Guide", "指南"),
    ("/status/", "Status", "状态"),
    ("/articles/", "Insights", "技术观察"),
)


def esc(value):
    return html.escape(str(value), quote=True)


def detail_route(slug, locale="zh"):
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        raise ValueError("Invalid article slug")
    prefix = "" if locale == "en" else "/zh"
    if locale not in {"zh", "en"}:
        raise ValueError("Article locale must be zh or en")
    return f"{prefix}/articles/{slug}/"


# Translated detail pages extend the base contract with this exact trio; items
# without it stay Chinese-only details and keep their unpaired index fallback.
EN_FIELDS = {"title_en", "deck_en", "source_en"}

# Category names are a closed editorial set; unknown categories fail the build.
CATEGORY_EN = {
    "行业综述": "Industry survey",
    "战略思考": "Strategy",
    "工程实践": "Engineering practice",
    "设计规范": "Design specification",
}


def localized(item, locale):
    """Manifest metadata for one locale: EN fields must exist when requested."""
    if locale == "zh":
        return item
    if "source_en" not in item:
        raise ValueError(f"Article {item['slug']} has no English translation fields")
    return dict(item, title=item["title_en"], deck=item["deck_en"], source=item["source_en"])


def load_manifest(path=MANIFEST):
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or set(data) != {"articles"}:
        raise ValueError("Manifest must contain only articles")
    articles = data["articles"]
    fields = {"slug", "title", "deck", "category", "date", "source", "related"}
    if not isinstance(articles, list) or not articles:
        raise ValueError("Manifest articles must be a nonempty list")
    slugs, sources = set(), set()
    for item in articles:
        if not isinstance(item, dict) or set(item) not in (fields, fields | EN_FIELDS):
            raise ValueError("Article metadata fields do not match the contract")
        for field, value in item.items():
            if not isinstance(value, str) or not value.strip() or any(ord(c) < 32 for c in value):
                raise ValueError(f"Invalid metadata field: {field}")
        detail_route(item["slug"])
        detail_route(item["related"])
        if item["source"] != item["slug"] + ".md":
            raise ValueError("Source must be the article slug plus .md, not a path")
        if "source_en" in item:
            if item["source_en"] != item["slug"] + ".en.md":
                raise ValueError("English source must be the article slug plus .en.md, not a path")
        if item["slug"] in slugs or item["source"] in sources or item.get("source_en") in sources:
            raise ValueError("Duplicate article slug or source")
        slugs.add(item["slug"])
        sources.add(item["source"])
        if "source_en" in item:
            sources.add(item["source_en"])
        if item["category"] not in CATEGORY_EN:
            raise ValueError(f"Article category has no English name: {item['category']}")
        if date.fromisoformat(item["date"]).isoformat() != item["date"]:
            raise ValueError("Article date must be YYYY-MM-DD")
    for item in articles:
        if item["related"] not in slugs or item["related"] == item["slug"]:
            raise ValueError("Related article must be another manifest slug")
    return articles


class CaptionListSpacing(Preprocessor):
    """Adapt caption-adjacent lists without touching the archived source bytes.

    Use the installed Markdown list recognizers, not a separate syntax parser.
    Fenced code is already stashed before this runs. Only column-zero list starts
    get a separating blank line; indentation and numbering go to Markdown intact.
    """
    def run(self, lines):
        lists = [self.md.parser.blockprocessors[name] for name in ("olist", "ulist")]

        def is_list(line):
            return any(processor.RE.match(line) for processor in lists)

        result = []
        for line in lines:
            if (line and not line[0].isspace() and is_list(line) and result
                    and re.fullmatch(r"\*\*[^\n]+\*\*", result[-1])):
                result.append("")
            result.append(line)
        return result


class StandardCodeBlock(CodeBlockProcessor):
    """Keep conventional four-space code while allowing two-space nested lists."""
    def __init__(self, parser):
        super().__init__(parser)
        self.tab_length = 4


class PublishingMarkdown(Extension):
    def extendMarkdown(self, md):
        # Block/inline raw HTML passes through for editorial layout (scoped
        # classes styled in assets/css/articles.css). render_body rejects
        # active content at build time, and the runtime external-resource ban
        # stays with check-site.py and the browser gate. The independent
        # entity processor stays enabled, so &copy; and &amp; retain their meaning.
        md.preprocessors.register(CaptionListSpacing(md), "caption_lists", 24)
        md.parser.blockprocessors.register(StandardCodeBlock(md.parser), "code", 80)


def markdown_fragment(source):
    parser = markdown.Markdown(
        extensions=["tables", "fenced_code", "sane_lists", PublishingMarkdown()],
        tab_length=2,
        output_format="xhtml",
    )
    # Parse with browser HTML semantics, including attribute-specific and numeric
    # entity rules. An XML bridge would misdecode URLs and reject valid HTML text.
    body = html5lib.parseFragment(parser.convert(source), treebuilder="etree", namespaceHTMLElements=False)
    body.tag = "div"
    return body


def safe_url(value):
    # Reject active/obfuscated schemes, but leave every accepted URL unchanged.
    if any(ord(char) < 32 or ord(char) == 127 for char in value) or value != value.strip():
        raise ValueError("Control characters or surrounding whitespace in article URL")
    parsed = urlsplit(value)
    if parsed.scheme.lower() not in {"", "https", "http", "mailto"}:
        raise ValueError("Unsafe article URL scheme")
    if not parsed.scheme and (parsed.netloc or "\\" in value or ":" in value.split("/")[0]):
        raise ValueError("Ambiguous relative article URL")
    return value


# Raw block/inline HTML is sanctioned for editorial layout only. Active content
# is rejected at build time instead of being rendered or silently escaped; the
# external-runtime-resource ban remains enforced by check-site.py and the
# browser-observation gate on the generated pages.
RAW_BANNED_ELEMENTS = frozenset({"script", "style", "iframe", "link", "meta", "object", "embed", "base", "form"})


def strip_foreign_namespaces(body):
    # html5lib keeps foreign content (SVG/MathML) in its own namespace, which
    # ElementTree would serialize with ns0: prefixes the browser discards.
    # Namespaces are stripped before the guard so <svg><script> cannot evade
    # the banned-element check by hiding behind a foreign namespace.
    for node in body.iter():
        if isinstance(node.tag, str) and node.tag.startswith("{"):
            node.tag = node.tag.rsplit("}", 1)[-1]
        for key in [key for key in node.attrib if key.startswith("{")]:
            node.attrib[key.rsplit("}", 1)[-1]] = node.attrib.pop(key)


def guard_raw_html(body):
    for node in body.iter():
        if node.tag in RAW_BANNED_ELEMENTS:
            raise ValueError(f"Raw HTML contains banned element: <{node.tag}>")
        for attr, value in node.attrib.items():
            if attr.lower().startswith("on"):
                raise ValueError(f"Raw HTML contains event-handler attribute {attr} on <{node.tag}>")
            if attr in {"href", "src"}:
                safe_url(value)


def render_body(source, metadata):
    body = markdown_fragment(source)
    strip_foreign_namespaces(body)
    guard_raw_html(body)
    headings = list(body.iter("h1"))
    if len(headings) != 1 or not len(body) or body[0] is not headings[0]:
        raise ValueError("Source must begin with exactly one H1")
    if "".join(headings[0].itertext()) != metadata["title"]:
        raise ValueError("Manifest title must exactly match the original H1 text")
    body.remove(headings[0])
    body.tag = "article"
    body.attrib = {"id": "article-body", "class": "article-body"}
    nested_toc = metadata["slug"] in NESTED_TOC_SLUGS
    overview_label = "Section overview" if metadata["source"].endswith(".en.md") else "本层总览"
    toc = ET.Element("ol", {"class": "toc-tree"} if nested_toc else {})
    section, subsection = 0, 0
    sections_meta = []
    for node in body.iter():
        if node.tag == "h2":
            section += 1
            subsection = 0
            node.set("id", f"section-{section}")
            text = "".join(node.itertext())
            clean_title = re.sub(r"^(?:[〇零一二三四五六七八九十百]+、|\d+\.\s*)", "", text)
            sections_meta.append({"id": node.get("id"), "num": f"{section:02d}", "title": clean_title, "children": []})
        elif node.tag == "h3":
            if not section:
                raise ValueError("H3 needs a preceding H2")
            subsection += 1
            node.set("id", f"section-{section}-{subsection}")
            sections_meta[-1]["children"].append({"id": node.get("id"), "title": "".join(node.itertext())})
        elif node.tag == "pre":
            node.set("class", "code")
        elif node.tag in {"a", "img"}:
            attr = "href" if node.tag == "a" else "src"
            url = safe_url(node.get(attr, ""))
            if (metadata["slug"] == STRATEGY_SLUG
                    and url == "./ai-coding-evolution-20261116.md"):
                node.set(attr, detail_route(SURVEY_SLUG))
    first_group = True
    for sec in sections_meta:
        if nested_toc and sec["children"]:
            entry = ET.SubElement(toc, "li", {"class": "toc-group-item"})
            details_attrs = {"class": "toc-group"}
            if first_group:
                details_attrs["open"] = "open"
                first_group = False
            details = ET.SubElement(entry, "details", details_attrs)
            summary = ET.SubElement(details, "summary", {"class": "toc-group-summary"})
            number = ET.SubElement(summary, "span", {"class": "toc-number"})
            number.text = sec["num"]
            number.tail = " " + sec["title"]
            sublist = ET.SubElement(details, "ol", {"class": "toc-sublist"})
            ov_li = ET.SubElement(sublist, "li", {"class": "toc-sub-overview"})
            ov_a = ET.SubElement(ov_li, "a", {"href": "#" + sec["id"]})
            ov_a.text = overview_label
            for child in sec["children"]:
                ch_li = ET.SubElement(sublist, "li")
                ch_a = ET.SubElement(ch_li, "a", {"href": "#" + child["id"]})
                ch_a.text = child["title"]
        else:
            entry = ET.SubElement(toc, "li")
            link = ET.SubElement(entry, "a", {"href": "#" + sec["id"]})
            number = ET.SubElement(link, "span", {"class": "toc-number"})
            number.text = sec["num"]
            number.tail = " " + sec["title"]
    # Wrap via parent nodes; ElementTree has no parent pointer. Keep the tail
    # on the wrapper so no neighboring text is dropped or moved into the table.
    for parent in list(body.iter()):
        for index, node in enumerate(list(parent)):
            if node.tag == "table":
                header = node.find("./thead/tr")
                label = "表格：" + " / ".join("".join(th.itertext()) for th in header) if header is not None else "文章表格"
                wrapper = ET.Element("div", {
                    "class": "article-table", "tabindex": "0", "role": "region", "aria-label": label,
                })
                wrapper.tail, node.tail = node.tail, None
                for th in node.iter("th"):
                    th.set("scope", "col")
                parent.remove(node)
                wrapper.append(node)
                parent.insert(index, wrapper)
    return body, toc


def serialize(node):
    return ET.tostring(node, encoding="unicode", method="html")


def shell(locale, page, title, deck, route, content, paired=False):
    zh = locale == "zh"
    language = "zh-CN" if zh else "en"
    skip = "跳至正文" if zh else "Skip to content"
    nav_label = "站点导航" if zh else "Site navigation"
    nav = []
    for href, en_label, zh_label in NAV:
        localized = "/zh" + href if zh else href
        current = ' aria-current="page"' if href == "/articles/" else ""
        nav.append(f'<a href="{localized}"{current}>{esc(zh_label if zh else en_label)}</a>')
    if page == "article":
        page_data = ' data-language-index="/articles/"'
        if paired:
            # A real translation pair: full hreflang trio plus a nav switch that
            # leads to the counterpart detail, mirroring the paired-index model.
            en_route = route[3:] if zh else route
            zh_route = "/zh" + en_route
            alternate = '\n'.join(
                f'  <link rel="alternate" hreflang="{lang}" href="{SITE}{esc(path)}" />'
                for lang, path in (("en", en_route), ("zh-CN", zh_route), ("x-default", en_route))
            )
            counterpart_route = en_route if zh else zh_route
            language_link = (f'<a class="nav-link" href="{esc(counterpart_route)}" '
                             f'lang="{"en" if zh else "zh-CN"}" rel="alternate" hreflang="{"en" if zh else "zh-CN"}">'
                             f'{"EN" if zh else "中文"}</a>')
            page_data += f' data-language-counterpart="{esc(counterpart_route)}"'
        else:
            # Unpaired Chinese-only detail: the switch deliberately falls back to
            # the shared English index without translation metadata.
            alternate = ""
            language_link = '<a class="nav-link" href="/articles/" lang="en" title="English article index; this article is in Chinese">EN index</a>'
    else:
        alternate = '\n'.join(
            f'  <link rel="alternate" hreflang="{lang}" href="{SITE}{path}" />'
            for lang, path in (("en", "/articles/"), ("zh-CN", "/zh/articles/"), ("x-default", "/articles/"))
        )
        counterpart = "/articles/" if zh else "/zh/articles/"
        language_link = f'<a class="nav-link" href="{counterpart}" lang="{"en" if zh else "zh-CN"}">{"EN" if zh else "中文"}</a>'
        page_data = ""
    scripts = '  <script src="/assets/js/site.js"></script>\n'
    if page == "article":
        scripts += '  <script src="/assets/js/articles.js"></script>\n'
    return f'''<!doctype html>
<html lang="{language}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{esc(title)} — co-arising</title>
  <meta name="description" content="{esc(deck)}" />
  <meta property="og:type" content="{"article" if page == "article" else "website"}" />
  <meta property="og:title" content="{esc(title)}" />
  <meta property="og:description" content="{esc(deck)}" />
  <meta property="og:url" content="{SITE}{esc(route)}" />
  <meta property="og:image" content="{SITE}/assets/img/og-image.png" />
  <meta property="og:site_name" content="co-arising" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="{SITE}/assets/img/og-image.png" />
{alternate}
  <link rel="canonical" href="{SITE}{esc(route)}" />
  <link rel="icon" href="/assets/img/co-arising-icon.png" type="image/png" sizes="64x64" />
  <link rel="stylesheet" href="/assets/css/tokens.css" />
  <link rel="stylesheet" href="/assets/css/base.css" />
  <link rel="stylesheet" href="/assets/css/components.css" />
  <link rel="stylesheet" href="/assets/css/pages.css" />
  <link rel="stylesheet" href="/assets/css/articles.css" />
</head>
<body data-page="{page}"{page_data}>
  <a class="skip-link" href="#main-content">{skip}</a>
  <nav id="site-nav" aria-label="{nav_label}"><div class="site-nav"><div class="row">{' · '.join(nav)} · {language_link}</div></div></nav>
  <noscript><div class="wrap"><p class="small">{"JavaScript 已关闭——正文、目录、链接与下载仍可使用。" if zh else "JavaScript is off — articles and navigation remain available."}</p></div></noscript>
  <main id="main-content" class="wrap">
{content}
  </main>
  <footer id="site-footer"></footer>
{scripts}</body>
</html>
'''


def card(item, locale="zh", stable_id=False):
    # Items without the EN trio render as the Chinese original on both indices.
    translated = "source_en" in item
    if locale == "en" and translated:
        meta, category, lang_attr, language = localized(item, "en"), CATEGORY_EN[item["category"]], "en", "English translation"
    else:
        meta, category, lang_attr = item, item["category"], "zh-CN"
        language = "中文原文" if locale == "zh" else "Chinese article · 中文原文"
    route_locale = locale if (locale == "zh" or translated) else "zh"
    ident = f' id="article-{esc(item["slug"])}"' if stable_id else ""
    return f'''<div class="article-card"{ident} lang="{lang_attr}">
      <p class="article-meta"><span>{esc(category)}</span> · <time datetime="{esc(item["date"])}">{esc(item["date"])}</time></p>
      <h3><a href="{detail_route(item["slug"], route_locale)}">{esc(meta["title"])}</a></h3>
      <p class="article-deck">{esc(meta["deck"])}</p>
      <p class="small">{language}</p>
    </div>'''


def cover(locale):
    caption = "从直觉式编码，到智能体协作，再到显式边界与验证闭环。" if locale == "zh" else "From intuitive coding to agents, then explicit boundaries and verification loops."
    return f'''<figure class="insights-cover">
      <svg viewBox="0 0 960 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" stroke-width="2">
          <path d="M48 110 Q92 32 136 104 T224 100 T312 106" opacity="0.45" />
          <circle cx="92" cy="124" r="5" /><circle cx="153" cy="83" r="8" /><circle cx="224" cy="133" r="5" />
          <path d="M320 110 H382 M370 100 L382 110 L370 120" />
          <circle cx="475" cy="110" r="32" /><path d="M410 110 H443 M507 110 H542 M475 48 V78 M475 142 V172" />
          <circle cx="410" cy="110" r="5" /><circle cx="547" cy="110" r="5" /><circle cx="475" cy="43" r="5" />
          <path d="M584 110 H646 M634 100 L646 110 L634 120" />
          <rect x="689" y="46" width="208" height="127" rx="16" />
          <path d="M719 86 H857 V133 H719 Z M733 112 L747 125 L771 96" />
          <path d="M765 46 V24 H919 V195 H793 V173 M905 187 L919 195 L931 182" opacity="0.55" />
        </g>
        <g fill="currentColor" font-family="monospace" font-size="20" text-anchor="middle">
          <text x="177" y="212">v i b e</text><text x="475" y="212">agent</text><text x="793" y="212">harness</text>
        </g>
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>'''


def list_page(items, locale):
    zh = locale == "zh"
    title = "技术观察" if zh else "Insights"
    deck = ("持续整理值得阅读的技术文章、工程实战手册与语言设计规范：覆盖 bank-wealth-demo 端到端实战与洋葱架构、受控 EARS + SMT 规约验证，以及 AI Coding 范式演进。" if zh else
            "A growing bilingual collection of hands-on handbooks, design specifications and technical surveys — covering the bank-wealth-demo Quick Start and Onion Architecture, controlled EARS + SMT verification, and the AI coding paradigm shift.")
    ordered = list(reversed(items))
    content = f'''    <header class="insights-hero">
      <p class="over">{"工程实践 · 设计规范 · 行业演进" if zh else "Engineering practice · design specs · industry evolution"}</p>
      <h1 id="insights-title" class="insights-title">{esc(title)}</h1>
      <p class="insights-deck">{esc(deck)}</p>
      <p class="page-outline"><a href="#articles">{"阅读文章" if zh else "Read the articles"}</a> · <a href="#editorial-context">{"发布说明" if zh else "Editorial context"}</a></p>
    </header>
    {cover(locale)}
    <aside class="insights-community" aria-label="{"加入 Discord 社区" if zh else "Join the Discord community"}">
      <div class="insights-community-copy">
        <p class="article-community-kicker">{"Co-arising Discord 社区" if zh else "Co-arising Discord Community"}</p>
        <p class="article-community-title">{"对文章内容、EARS 规约或真源建模有想法？" if zh else "Questions on these articles, EARS specs, or truth-source modeling?"}</p>
        <p>{"加入 Discord 社区，与作者和开发者一起讨论 DDD、SMT 形式化验证与 AI Agent 工程实践。" if zh else "Join the Discord community to discuss DDD, SMT formal verification, and agentic engineering with the authors and peers."}</p>
      </div>
      <a class="article-community-cta" href="{DISCORD_URL}">{"加入 Discord 社区" if zh else "Join the Discord community"} <span aria-hidden="true">↗</span></a>
    </aside>
    <section id="articles" aria-labelledby="articles-heading">
      <h2 id="articles-heading">{"全部文章 · 按发布时间倒序" if zh else "All articles · newest first"}</h2>
      <div class="insights-grid">{''.join(card(item, locale, stable_id=True) for item in ordered)}</div>
    </section>
    <section id="editorial-context" aria-labelledby="editorial-context-heading">
      <h2 id="editorial-context-heading">{"正文与发布说明各有边界" if zh else "Original views, explicit editorial boundaries"}</h2>
      <p>{EDITORIAL if zh else "These articles were compiled from a publicly shared conversation. External data and conclusions were not independently verified for this publication; consult the original references."}</p>
      <p>{STRATEGY_NOTE if zh else "The strategy article is a perspective and proposed engineering roadmap, not a list of delivered co-arising capabilities. Ratios, competitive positioning and proposed tool interfaces are not measured results or availability commitments."}</p>
      <p><a href="{"/zh/status/" if zh else "/status/"}">{"核对当前状态与证据" if zh else "Check current status and evidence"}</a></p>
    </section>'''
    return shell(locale, "articles", title, deck, "/zh/articles/" if zh else "/articles/", content)


EDITORIAL_EN = "These articles were compiled from a publicly shared conversation. External data and conclusions were not independently verified for this publication; consult the original references."
STRATEGY_NOTE_EN = "The strategy article is a perspective and proposed engineering roadmap, not a list of delivered co-arising capabilities. Ratios, competitive positioning and proposed tool interfaces are not measured results or availability commitments."


def detail_page(item, related, source, locale="zh"):
    zh = locale == "zh"
    meta = localized(item, locale)
    paired = "source_en" in item
    body, toc = render_body(source, meta)
    if zh:
        note = f"<p>{EDITORIAL}</p>"
        status_href, breadcrumb = "/zh/status/", '<a href="/zh/">首页</a> / <a href="/zh/articles/">文章</a>'
        labels = {"meta": "中文原文", "download": "下载原始 Markdown", "read": "阅读全文",
                  "toc_summary": "阅读目录", "toc_nav": "文章目录", "position": "阅读全文",
                  "related": "继续阅读", "back": "返回文章索引"}
    else:
        note = f"<p>{EDITORIAL_EN}</p>"
        status_href, breadcrumb = "/status/", '<a href="/">Home</a> / <a href="/articles/">Articles</a>'
        labels = {"meta": "English translation", "download": "Download the English Markdown", "read": "Read the full article",
                  "toc_summary": "Contents", "toc_nav": "Article contents", "position": "Read the full article",
                  "related": "Continue reading", "back": "Back to article index"}
    if item["slug"] == STRATEGY_SLUG:
        note += f"<p>{STRATEGY_NOTE if zh else STRATEGY_NOTE_EN}</p>"
    if item["slug"] == SPEC_SLUG:
        note += f"<p>{SPEC_NOTE if zh else SPEC_NOTE_EN}</p>"
    if item["slug"] == GUIDE_SLUG:
        note += f"<p>{GUIDE_NOTE if zh else GUIDE_NOTE_EN}</p>"
    if item["slug"] == CODEGEN_EXT_SLUG:
        note += f"<p>{CODEGEN_EXT_NOTE if zh else CODEGEN_EXT_NOTE_EN}</p>"
    if item["slug"] == V2_ARCH_SLUG:
        note += f"<p>{V2_ARCH_NOTE if zh else V2_ARCH_NOTE_EN}</p>"
    if item["slug"] == V2_GA_GUIDE_SLUG:
        note += f"<p>{V2_GA_GUIDE_NOTE if zh else V2_GA_GUIDE_NOTE_EN}</p>"
    if item["slug"] == V2_PLAYBOOK_SLUG:
        note += f"<p>{V2_PLAYBOOK_NOTE if zh else V2_PLAYBOOK_NOTE_EN}</p>"
    if item["slug"] == PLAY_CQRS_MAP_SLUG:
        note += f"<p>{PLAY_CQRS_MAP_NOTE if zh else PLAY_CQRS_MAP_NOTE_EN}</p>"
    if item["slug"] == MINEFIELD_MAP_SLUG:
        note += f"<p>{MINEFIELD_MAP_NOTE if zh else MINEFIELD_MAP_NOTE_EN}</p>"
    category = item["category"] if zh else CATEGORY_EN[item["category"]]
    counterpart_route = detail_route(item["slug"], "en" if zh else "zh")
    switch_label = "Read in English" if zh else "中文原文"
    content = f'''    <div class="reading-progress" aria-hidden="true"><span id="reading-progress"></span></div>
    <header class="article-hero">
      <nav class="article-breadcrumb" aria-label="{"面包屑" if zh else "Breadcrumb"}">{breadcrumb} / <span aria-current="page">{esc(category)}</span></nav>
      <p class="article-meta"><span>{esc(category)}</span> · <time datetime="{esc(item["date"])}">{esc(item["date"])}</time> · {labels["meta"]}</p>
      <h1>{esc(meta["title"])}</h1>
      <p class="article-deck">{esc(meta["deck"])}</p>
      <div class="article-actions"><a href="/content/articles/{esc(meta["source"])}" download="{esc(meta["source"])}">{labels["download"]}</a> · <a href="#article-body">{labels["read"]}</a>{"" if not paired else f' · <a href="{counterpart_route}">{switch_label}</a>'} · <a class="action-discord" href="{DISCORD_URL}">{"加入 Discord 社区" if zh else "Join Discord"} <span aria-hidden="true">↗</span></a></div>
    </header>
    <aside class="editorial-note" aria-label="editorial distinction">{note}<p><a href="{status_href}">{"当前已交付能力与证据请以状态页为准" if zh else "Delivered capabilities and evidence live on the status page"}</a>{"。发布说明不改写下方原文观点。" if zh else ". The publication notes below do not rewrite the original views."}</p></aside>
    <div class="article-layout">
      <aside class="article-sidebar">
        <details class="article-toc" open="open"><summary>{labels["toc_summary"]}</summary><nav aria-label="{labels["toc_nav"]}">{serialize(toc)}</nav></details>
        <p id="reading-position" class="reading-position">{labels["position"]}</p>
        <div class="sidebar-community">
          <p class="sidebar-community-kicker">{"社区讨论" if zh else "Community"}</p>
          <p>{"对本文观点、EARS 规约或工程落地有疑问？欢迎来 Discord 一起交流。" if zh else "Have questions or feedback on this article? Join the discussion on Discord."}</p>
          <a class="sidebar-community-btn" href="{DISCORD_URL}">{"加入 Discord 社区" if zh else "Join Discord"} <span aria-hidden="true">↗</span></a>
        </div>
      </aside>
      {serialize(body)}
    </div>
    <aside class="article-community" aria-label="{"加入 Discord 社区" if zh else "Join the Discord community"}">
      <div class="article-community-copy">
        <p class="article-community-kicker">{"Co-arising Discord 社区" if zh else "Co-arising Discord Community"}</p>
        <p class="article-community-title">{"读完这篇，想进一步交流或提出质疑？" if zh else "Want to discuss this further or share feedback?"}</p>
        <p>{"加入 co-arising Discord 社区，直接与作者及同行探讨 DDD、EARS/SMT 验证与 AI 时代代码生成实践。" if zh else "Join the co-arising Discord community to talk DDD, EARS/SMT verification, and deterministic code generation with the maintainers and peers."}</p>
      </div>
      <a class="article-community-cta" href="{DISCORD_URL}">{"加入 Discord 社区" if zh else "Join the Discord community"} <span aria-hidden="true">↗</span></a>
    </aside>
    <section id="related-reading" class="article-related" aria-labelledby="related-heading">
      <h2 id="related-heading">{labels["related"]}</h2>
      {card(related, locale)}
      <p><a href="{"/zh/articles/" if zh else "/articles/"}">{labels["back"]}</a></p>
    </section>'''
    return shell(locale, "article", meta["title"], meta["deck"], detail_route(item["slug"], locale), content, paired=paired)


def generate_pages():
    items = load_manifest()
    pages = {
        "articles/index.html": list_page(items, "en"),
        "zh/articles/index.html": list_page(items, "zh"),
    }
    by_slug = {item["slug"]: item for item in items}
    for item in items:
        for locale in ("zh", "en"):
            if locale == "en" and "source_en" not in item:
                continue
            meta = localized(item, locale)
            source = (CONTENT / meta["source"]).read_bytes().decode("utf-8")
            output = detail_route(item["slug"], locale).lstrip("/") + "index.html"
            pages[output] = detail_page(item, by_slug[item["related"]], source, locale)
    return {path: value.encode("utf-8") for path, value in pages.items()}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare exact generated bytes without writing")
    args = parser.parse_args(argv)
    try:
        pages = generate_pages()
        # Check every path before writing any output. Replace with a fresh inode
        # rather than truncating a pre-existing hardlinked file or backup.
        targets = {relative: ROOT / relative for relative in pages}
        for relative, target in targets.items():
            if target.resolve() != target:
                raise ValueError(f"Symlinked output is not owned: {relative}")
        stale = []
        for relative, target in targets.items():
            if args.check:
                if not target.is_file() or target.read_bytes() != pages[relative]:
                    stale.append(relative)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                temporary = None
                try:
                    with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as output:
                        temporary = Path(output.name)
                        output.write(pages[relative])
                    temporary.chmod(0o644)
                    os.replace(temporary, target)
                finally:
                    if temporary is not None and temporary.exists():
                        temporary.unlink()
        if stale:
            print("Stale article outputs:\n" + "\n".join(stale), file=sys.stderr)
            return 1
        print(f"Article {'check passed' if args.check else 'generation complete'}: {len(pages)} pages")
        return 0
    except (ValueError, OSError, ET.ParseError) as error:
        print(f"Article publishing failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
