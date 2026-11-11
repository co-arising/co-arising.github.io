# co-arising.github.io

The organization site for [co-arising](https://github.com/co-arising) — domain
knowledge that co-arises, and compiles. Live at **https://co-arising.github.io**

## What this site is

A zero-build, zero-npm static site. No bundler, no framework, no CDN calls —
the site practices what the toolchain it documents preaches: files are the
source of truth, everything derived is regenerable, every claim is traceable.

| Path | Role |
|---|---|
| `index.html`, `*/index.html` | 9 hand-written pages + 404 |
| `assets/css/*.css` | design tokens → base → components → pages (in that order) |
| `assets/js/site.js` | **`SITE` config is the single source for every repo URL**; injects nav/footer; theme tri-state; copy buttons |
| `assets/js/explorer.js` | sql.js-powered query console over the real bank graph |
| `assets/js/dissolve.js` | the aggregate dissolve/arise demo (real CreditBalance subgraph) |
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
# preview (must be http:// — file:// CORS-blocks the sqlite fetch)
python3 -m http.server 8000
open http://localhost:8000

# before pushing: run the checklist
open tools/checks.md
```

When a repository migrates orgs (see LEDGER DEF-14), change `SITE.urls` in
`assets/js/site.js` — that is the only place repo URLs live.

## Rebuilding derived data

See [tools/build-assets.md](tools/build-assets.md) — the graph sqlite, the
dissolve subgraph and the relation registry all regenerate from sibling
checkouts of `metarch-truthsrc` and `bank-wealth-demo`.

## Licenses

- Site prose/content: **CC BY 4.0**
- Site code: **MIT**
- Vendored: sql.js 1.13.0 (MIT), IBM Plex fonts (SIL OFL 1.1) — see NOTICE files.
