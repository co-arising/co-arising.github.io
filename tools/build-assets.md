# Rebuilding site assets

Every derived asset in this site is reproducible from the source repos.
None of it is hand-maintained. Run from this repo's root; requires
Node ≥ 22.13 and checkouts of the two repos as siblings.

```
mad-polaris/
├── metarch-truthsrc/     # the toolchain
├── bank-wealth-demo/     # the worked example
└── co-arising.github.io/ # this site
```

## 1 · Graph store + fingerprint

```bash
cd ../bank-wealth-demo
node ../metarch-truthsrc/bin/truthsrc.js compile-project --project truthsrc.project.json
node ../metarch-truthsrc/bin/truthsrc.js graph \
  --canonical generated/current/.truthsrc/canonical.json \
  --out ../co-arising.github.io/assets/data/bank-wealth.graph.sqlite
```

Expected: `389 nodes · 413 edges · workshop bank-wealth-v1`.
Then update `sha256` / counts in `assets/data/bank-wealth.graph.meta.json`
and re-capture any changed number in SITE-FACTS.md.

## 2 · Dissolve subgraph (why-co-arising page)

One-off export over the same sqlite (see git history of this file for the
exact script). Node census of the current export: 1 aggregate, 3 slices,
3 commands, 18 invariants, 3 events / 35 edges — regenerate if the bank
tree's CreditBalance slices change:

```bash
node --no-warnings -e '<the export script from git history>' \
  # reads nodes/edges tables, expands slice-atom guards into invariant nodes
```

## 3 · Screenshots + workshop snapshot

Not regenerable headlessly (browser capture). Source of truth:
`bank-wealth-demo/target/onboarding-graph-preview-MSkaJ6/` —
`desktop.png / mobile.png / search.png / bank-workshop.html` (generated
2026-11-06 by `bank-workshop.mjs view --html`). Copy the four files into
`assets/img/` (renamed `workshop-*.png`) and `downloads/`.

## 4 · Relation registry

```bash
node --no-warnings -e '
const { RELATION_REGISTRY, ATOM_KINDS, NOTE_TYPES } = require("../metarch-truthsrc/lib/shared.mjs");
const fs = require("fs");
fs.writeFileSync("assets/data/relation-registry.json", JSON.stringify({
  version: "v0.5",
  source: "metarch-truthsrc/lib/shared.mjs",
  relations: RELATION_REGISTRY.map(r => ({ id: r.id, from: r.from, relation: r.relation, to: r.to, propagates: !!r.propagates, description: r.description })),
  atomKinds: ATOM_KINDS, noteTypes: NOTE_TYPES
}, null, 1));'
```

## 5 · Vendored third-party assets

- `assets/vendor/sqljs/` — sql.js 1.13.0 (`npm pack sql.js@1.13.0`, copy
  `dist/sql-wasm.js`, `dist/sql-wasm.wasm`, `LICENSE`), MIT.
- `assets/fonts/` — IBM Plex latin woff2 subsets from
  `@fontsource/ibm-plex-sans` / `@fontsource/ibm-plex-mono` (SIL OFL 1.1;
  the package LICENSE is copied as OFL.txt).

## Discipline

- Data files (sqlite/json) regenerate; never hand-edit.
- SITE-FACTS.md is updated in the same commit as any regenerated number.
- If a rebuild diverges from SITE-FACTS (node/edge counts), investigate
  before updating either — divergence is information.
