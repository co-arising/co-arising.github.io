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
| `index.html`, `*/index.html`, `zh/**/index.html` | 9 paired EN/ZH pages + a shared 404; static navigation survives missing JavaScript |
| `assets/css/*.css` | design tokens → base → components → pages (in that order) |
| `assets/js/site.js` | Shared `SITE` repository/nav configuration, language routes, optional theme persistence and code-only copy controls |
| `assets/js/explorer.js`, `explorer-worker.js`, `explorer-query.js` | real sql.js queries in cancellable, per-query disposable databases; fixed presets never share mutable state with free SQL |
| `assets/js/dissolve.js`, `dissolve-model.js` | real CreditBalance relationship exercise with complete/partial/missing guard coverage and keyboard controls |
| `assets/data/` | derived data — `tools/build-assets.md` documents every rebuild |
| `SITE-FACTS.md` | the registry of every number the site claims (F-xx IDs) |
| `LEDGER.md` | the honest backlog (DEF-xx IDs) |
| `tools/checks.md` | pre-deploy checklist |

## Honest layering — the two files that make this site different

1. **A number may appear on a page only if it has an F-xx in SITE-FACTS.md**
   (captured date + source + reproduce command). No exceptions.
2. **A promise may be implied only if it is either shipped or on LEDGER.md**
   with a stable DEF-xx ID that pages link to (`/status/#DEF-xx`).

Both files are updated in the same commit as any claim that depends on them.

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
No second hand-maintained facts registry is introduced.

Resource reports inventory transitive literal dependencies (including on-demand
Explorer data/WASM/Workers), with raw and deterministic per-file gzip sizes. Growth
above 20% requires explanation; it is not a measured loading-time regression. No
service worker or reliable cold/cached-offline site-loading promise is implied.

The SQL console executes real SQLite statements on a fresh Worker-owned copy per
request. It is **disposable, not an SQL read-only authorizer**. Mutations are lost;
query text is never transmitted or persisted in a share URL. Output limits and a
five-second Worker deadline are browser-protection policies, not guarantees of
bounded SQLite memory under hostile input. Graph counts and documentary provenance
retain their captured scope rather than being inferred from UI success.

## Rebuilding derived data

See [tools/build-assets.md](tools/build-assets.md) — the graph sqlite, the
dissolve subgraph and the relation registry all regenerate from sibling
checkouts of `metarch-truthsrc` and `bank-wealth-demo`.

## Licenses

- Site prose/content: **CC BY 4.0**
- Site code: **MIT**
- Vendored: sql.js 1.13.0 (MIT), IBM Plex fonts (SIL OFL 1.1) — see NOTICE files.
