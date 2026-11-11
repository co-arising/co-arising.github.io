# Pre-deploy checks

Manual checklist, run against a local server (`python3 -m http.server 8000`
from this repo root — `file://` will CORS-block the sqlite fetch).

## Pages

- [ ] Every page loads: `/`, `/why-co-arising/`, `/dsl/`, `/pipeline/`,
      `/bank-demo/`, `/explorer/`, `/compare/`, `/guide/`, `/status/`, `/404.html`
- [ ] Nav current-page highlight correct on each page
- [ ] Footer repo links resolve (truthsrc → co-arising org; engines/bank → MadPolaris)
- [ ] Theme tri-state cycles auto → light → dark; persists across reload

## Honesty layer

- [ ] No quantitative claim without a `title="F-xx"` badge or an inline fact ref
- [ ] `grep -rhoE '[0-9]+' index.html */index.html` sanity pass on suspicious numbers
- [ ] Every `/status/#DEF-xx` anchor exists on the status page
- [ ] SITE-FACTS.md F-xx list matches badges used across pages
- [ ] LEDGER.md rows match the status-page table (same-commit rule)

## Explorer

- [ ] sql.js loads offline (DevTools → Network → Offline → reload)
- [ ] All 7 presets run and their stated expected answers match results
- [ ] Free SQL console: census query returns 389-node graph numbers
- [ ] Radial view renders for a describe result

## Dissolve demo

- [ ] Dissolve mode: removing ALL guard edges of a slice flags that slice
- [ ] Arise mode rebuilds to full assembly
- [ ] Fallback text visible with JS disabled

## Assets

- [ ] `assets/data/bank-wealth.graph.sqlite` sha256 matches meta.json
- [ ] `downloads/bank-workshop.html` opens offline from disk
- [ ] Total repo weight < 8 MB excluding .git

## Deployment

- [ ] `.nojekyll` present at root
- [ ] Pushed to `co-arising/co-arising.github.io` main branch
- [ ] https://co-arising.github.io/ serves; social card preview (OG png) correct
- [ ] No external network calls anywhere (grep for `https://` in JS/HTML —
      links to GitHub/docs are fine; `fetch`/`src=` to CDNs are not)
