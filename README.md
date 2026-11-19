# co-arising.github.io

The organization site for [co-arising](https://github.com/co-arising) — domain
knowledge that co-arises, and compiles. Live at **https://co-arising.github.io**

## What this site is

A zero-build, zero-npm **deployment**: static HTML, CSS, JavaScript and local assets.
No bundler, framework or CDN is required by the application. Optional maintenance
checks have their own prerequisites; they are not application dependencies. Derived
assets retain their documented source identity and regeneration contracts.

| Path | Role |
|---|---|
| `index.html`, core `*/index.html`, `zh/**/index.html`, `404.html` | 9 paired EN/ZH core pages + a shared 404; static navigation survives missing JavaScript |
| `articles/index.html`, `zh/articles/index.html`, `articles/*/index.html`, `zh/articles/*/index.html` | Paired editorial indices and paired EN/ZH article details; checked-in generated HTML |
| `content/articles/*.md`, `content/articles/manifest.json` | Original editorial Markdown and publication metadata; source for the article generator |
| `assets/css/*.css` | design tokens → base → components → pages (in that order) |
| `assets/js/site.js` | Shared `SITE` repository/nav configuration, language routes, optional theme persistence and code-only copy controls |
| `assets/js/explorer.js`, `explorer-worker.js`, `explorer-query.js` | real sql.js queries in cancellable, per-query disposable databases; fixed presets never share mutable state with free SQL |
| `assets/js/dissolve.js`, `dissolve-model.js` | real CreditBalance relationship exercise with complete/partial/missing guard coverage and keyboard controls |
| `assets/data/` | derived data — `tools/build-assets.md` documents every rebuild |
| `SITE-FACTS.md` | Verified product claims and quantitative evidence, with captured scope and F-xx IDs; not a registry of editorial quotations |
| `LEDGER.md` | the honest backlog (DEF-xx IDs) |
| `tools/checks.md` | pre-deploy checklist |

## Honest layering — product evidence and editorial perspectives

1. **Verified product claims and their numbers require an F-xx in SITE-FACTS.md**
   (captured date + scope + source + reproduce command). Editorial text cannot be
   used to bypass this product-evidence requirement.
2. **Product promises must distinguish shipped capability from the backlog in
   LEDGER.md**, with stable DEF-xx links (`/status/#DEF-xx`) for tracked gaps.
3. **Insights are editorial articles, not product acceptance evidence.** Original
   sources, quotations and third-party statistics are retained as attributed,
   unverified editorial material; they are not automatically verified by the site.
   Analysis, suggestions and proposed engineering directions do **not** prove
   product shipping or become delivery commitments merely by being published.
   Promoting any such statement into a product claim requires the usual F/DEF
   evidence and scope review.

Update the relevant registry in the same commit as any product claim depending on
it. Article source fidelity and generated freshness are separate checks; neither
verifies external research nor certifies implemented product behavior.

## Working on the site

Maintenance prerequisites: **Python ≥3.9**, **Node ≥22.13**, and **Bash** for
parse-only shell checks. Resource comparisons additionally use Git. Python
Playwright and an already-installed Chromium or WebKit are optional browser-test
tools, not site dependencies. Select the intended Node/Python interpreter explicitly
if your PATH points to an older or unrelated installation.

```bash
# Static and example checks; no network or application generation
python3 -B tools/check-site.py --strict
node tools/check-examples.mjs
node --test tools/tests/*.test.mjs

# Read-only raw/gzip entry budgets against the review baseline; no checkout/build
python3 -B tools/check-resources.py --baseline 28ba7c2

# Preview on localhost only; file:// blocks Explorer's asset fetches
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/` or `/zh/`. **After the content/Explorer/shared-asset
changes are integrated**, the integrator can run the browser matrix:

```bash
python3 -B tools/browser-checks.py --browser chromium --extended
python3 -B tools/browser-checks.py --browser webkit --extended
```

Without `--extended`, the B browser regressions still run. The driver owns an
ephemeral localhost server and writes screenshots, measurements and `report.json`
only to a new temporary evidence directory. Missing tooling/browser executables
produce a structured **BLOCKED** result (exit 2), not a pass; no browser is installed
by the script. A test failure exits 1. It does not execute bank services or publish
the site. The 2026-11-14 integrated Chromium and WebKit matrices passed after an
explicitly authorized WebKit installation. This is local automated cross-browser
validation, not physical-device or human acceptance. See
[tools/checks.md](tools/checks.md) for exact scope and remaining manual checks.

Navigation is readable static HTML before enhancement; `SITE.nav` owns the shared
interactive destinations. Keep static fallbacks aligned. Repository bases live in
`SITE.urls`, but static prose, source links and copyable CLI examples also contain
URLs and must be reviewed when repositories migrate (DEF-14).

Marked `data-example` code is byte-identical between EN/ZH pages. Stable baseline
IDs remain required; new paired IDs are allowed. The bank slice records its relative
source path and SHA-256; `--bank-root /absolute/checkout` optionally compares existing
source bytes read-only. Do not change a fingerprint without reviewing the source
and both copies. Shell blocks are parsed with `bash -n`, never executed. The named
Counter IR fragment and explicitly marked compiled JSON fragments receive grammar
checks only; author/proposal examples do not become validated language programs
merely by looking like JSON. There is no implicit compiler or semantic test here.

The static checker reads `SITE-FACTS.md` and `LEDGER.md` directly, checks actual status
table anchors, and compares bilingual section/example/fact markers. It parses only
the literal `SITE` configuration, never its executable body. Runtime URL checks cover
finite first-party fetch/Worker/import patterns; ordinary external documentation
links are not runtime loads. Browser observation is still needed for computed URLs.
No second hand-maintained facts registry is introduced. Paired article indices
share the language/section contract. Manifest items carrying the EN trio publish
paired EN/ZH details with a full hreflang trio and a switch to the translated
counterpart; details without it stay Chinese-only, retain their own canonical
URL and use **EN index**, not a fake English translation. That index link
deliberately drops article-specific query/fragment state. Unknown paths remain
on the existing 404 recovery path.

Resource reports inventory transitive literal dependencies (including on-demand
Explorer data/WASM/Workers), with raw and deterministic per-file gzip sizes. Both
article indices and discovered Chinese detail pages are reading entries; a page
absent from the baseline is reported as `newEntry`, not a broken historic inventory.
Growth above 20% for existing entries requires explanation; it is not a measured loading-time regression. No
service worker or reliable cold/cached-offline site-loading promise is implied.

The SQL console executes real SQLite statements on a fresh Worker-owned copy per
request. It is **disposable, not an SQL read-only authorizer**. Mutations are lost;
query text is never transmitted or persisted in a share URL. Output limits and a
five-second Worker deadline are browser-protection policies, not guarantees of
bounded SQLite memory under hostile input. Graph counts and documentary provenance
retain their captured scope rather than being inferred from UI success.

## Authoring and rebuilding articles

Articles are authored in `content/articles/*.md`; `content/articles/manifest.json`
records each stable slug, original title and deck, optional English title/deck/
source trio, category, publication date, relative source filename and related
article. Keep imported originals byte-identical to the reviewed source.
Publication metadata and site chrome are separate from that original prose.
Review attribution and the editorial/verified-product distinction before
publishing; adding a translated title does not create a translated article —
the EN detail page exists only when the manifest item carries the full
title_en/deck_en/source_en trio and the translated Markdown passes the same
guard and hash pinning as the original.

The optional authoring tool requires Python **Markdown==3.4.1** and
**html5lib==1.1**, pinned in `tools/requirements-articles.txt`. They are not
deployment or browser dependencies. HTML5 parsing preserves browser entity/link
semantics; conventional indented code uses four spaces while nested lists may use
two. The imported compact list-caption syntax is a standalone `**caption**` line.

```sh
python3 -m pip install -r tools/requirements-articles.txt
python3 -B tools/build-articles.py
python3 -B tools/build-articles.py --check
python3 -B -m unittest discover -s tools/tests -p test_articles.py
# Browser evidence on an ephemeral local server; no browser installation
python3 -B tools/article-browser-checks.py --browser chromium
python3 -B tools/article-browser-checks.py --browser webkit
```

The generator produces the EN/ZH indices and Chinese detail HTML from the manifest
and Markdown. Review and commit those outputs with their source/metadata changes;
do not hand-edit generated article HTML. `--check` checks freshness without writing
outputs. Run it after shared navigation or generator changes too. The live site
serves the checked-in HTML without running Python. The English index links to
paired English details; items without the EN trio keep linking the Chinese
originals.

## Rebuilding derived data

See [tools/build-assets.md](tools/build-assets.md) — the graph sqlite, the
dissolve subgraph and the relation registry all regenerate from sibling
checkouts of `metarch-truthsrc` and `bank-wealth-demo`.

## Licenses

- Site prose/content: **CC BY 4.0**
- Site code: **MIT**
- Vendored: sql.js 1.13.0 (MIT), IBM Plex fonts (SIL OFL 1.1) — see NOTICE files.
