# co-arising.github.io

The organization site for [co-arising](https://github.com/co-arising) — domain
knowledge that co-arises, and compiles. Live at **https://co-arising.github.io**

## What this site is

A zero-build, zero-npm static site. No bundler, no framework, no CDN calls —
the site practices what the toolchain it documents preaches: files are the
source of truth, everything derived is regenerable, every claim is traceable.

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

```bash
# Static and example checks; no network or application generation
python3 -B tools/check-site.py --strict
node tools/check-examples.mjs
node --test tools/tests/*.test.mjs

# Preview on localhost only; file:// blocks Explorer's asset fetches
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/` or `/zh/`. For real browser observation, run
`python3 -B tools/browser-checks.py` using the Python interpreter with Playwright
and Chromium already installed. It owns an ephemeral localhost server and writes
screenshots/results only to a new temporary evidence directory. It does not install
software, execute the bank service or publish the site. See [tools/checks.md](tools/checks.md)
for scope, failure checks and publication boundaries.

Navigation is readable static HTML before enhancement; `SITE.nav` owns the shared
interactive destinations. Keep static fallbacks aligned. Repository bases live in
`SITE.urls`, but static prose, source links and copyable CLI examples also contain
URLs and must be reviewed when repositories migrate (DEF-14).

Marked `data-example` code is identical between EN/ZH pages. The bank slice also
records its source path and SHA-256; the checker can compare it to a supplied bank
checkout with `--bank-root`. Do not change a fingerprint without reviewing the
new source and both page copies. Example checks do not execute the code.

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
