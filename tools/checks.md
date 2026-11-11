# Pre-deploy checks

Manual checklist, run against a local server (`python3 -m http.server 8000`
from this repo root — `file://` will CORS-block the sqlite fetch).

## Pages

- [ ] Every page loads: `/`, `/why-co-arising/`, `/dsl/`, `/pipeline/`,
      `/bank-demo/`, `/explorer/`, `/compare/`, `/guide/`, `/status/`, `/404.html`
- [ ] Every zh page loads: `/zh/` plus the same nine paths under `/zh/…`
- [ ] Nav current-page highlight correct on each page (EN and zh)
- [ ] Footer repo links resolve (truthsrc → co-arising org; engines/bank → MadPolaris)
- [ ] Theme tri-state cycles auto → light → dark; persists across reload
- [ ] Nav 中/EN switch lands on the counterpart page (same page, other language),
      carrying `#hash` and `?query`; no dead `/zh` + double-slash corners

## Honesty layer

- [ ] No quantitative claim without a `title="F-xx"` badge or an inline fact ref
      (EN and zh pages carry the same F-xx IDs and the same numbers)
- [ ] `grep -rhoE '[0-9]+' index.html */index.html zh/index.html zh/*/index.html`
      sanity pass on suspicious numbers — zh numbers must equal EN numbers
- [ ] Every `/status/#DEF-xx` anchor exists on the status page (EN `/status/`,
      zh `/zh/status/`)
- [ ] SITE-FACTS.md F-xx list matches badges used across pages
- [ ] LEDGER.md rows match the status-page tables (EN + zh) — same-commit rule

## Explorer

- [ ] sql.js loads offline (DevTools → Network → Offline → reload)
- [ ] All 7 presets run and their stated expected answers match results
      (EN `/explorer/` and zh `/zh/explorer/`; zh shows Chinese titles/prose)
- [ ] Free SQL console: census query returns 389-node graph numbers
- [ ] Radial view renders for a describe result

## Dissolve demo

- [ ] Dissolve mode: removing ALL guard edges of a slice flags that slice
- [ ] Arise mode rebuilds to full assembly
- [ ] Fallback text visible with JS disabled
- [ ] zh `/zh/why-co-arising/`: Chinese captions/controls; caption deep links
      point at `/zh/explorer/#orphans`, not the EN path

## Chinese edition (zh)

- [ ] `<html lang="zh-CN">` on all nine zh pages; EN pages stay `lang="en"`
- [ ] hreflang pairs present in both heads (en / zh-CN / x-default)
- [ ] zh nav labels come from site.js (`labelZh`) — no duplicated link lists
- [ ] explorer.js / dissolve.js pick the dictionary from `<html lang>`, not
      from `location.pathname`
- [ ] `/zh/` pages link internal pages to `/zh/…` (no accidental EN hops),
      while `/assets/…`, `/downloads/bank-workshop.html` and GitHub links stay
      site-root absolute
- [ ] No untranslated English prose left in zh page bodies (spot-read each page)

## Assets

- [ ] `assets/data/bank-wealth.graph.sqlite` sha256 matches meta.json
- [ ] `downloads/bank-workshop.html` opens offline from disk (zh-CN, self-contained)
- [ ] Total repo weight < 8 MB excluding .git

## Deployment

- [ ] `.nojekyll` present at root
- [ ] Pushed to `co-arising/co-arising.github.io` main branch
- [ ] https://co-arising.github.io/ serves; social card preview (OG png) correct
- [ ] No external network calls anywhere (grep for `https://` in JS/HTML —
      links to GitHub/docs are fine; `fetch`/`src=` to CDNs are not)
