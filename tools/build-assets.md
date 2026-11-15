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

The shipped legacy graph is the dated 2026-11-11 capture. `compile-project`
compiles in memory; it **does not refresh** `generated/current/.truthsrc/canonical.json`.
Do not use that command followed by an old disk canonical as a freshness check.
For a standalone graph, follow the guide's explicit `graph --tree ... --out NEW_FILE`
recipe. Replacing the published graph requires count/byte review and publication
approval; a standalone graph is not a project code snapshot.

### Matched Graph / Code public snapshot

The website adapter uses `inspectProject` once and builds Graph, author mappings
and code locations from that same verified capture. It does not edit the toolchain,
project graph, generated code, ledger or anchors. Requires Node ≥22.13 and an
explicit matching complete tool checkout, project, and owned generated output.

```bash
node tools/export-explorer-snapshot.mjs \
  --tool /absolute/matching/metarch-truthsrc \
  --project /absolute/bank/truthsrc.project.json \
  --out /absolute/bank/generated/current \
  --authors /absolute/public-author-allowlist.json \
  --requirements /absolute/site/tools/bank-explorer-requirements.json \
  --dest /absolute/new-public-candidate
```

The author allowlist is a JSON array of exact project-relative real author paths,
not globs and not expanded virtual slice paths. The bank requirements bind the
CreditBalance, ReserveFunds and LEDGER_SUFFICIENT identities. Required sources
and code must remain publicly available after the withholding pass; a private
location cannot satisfy the public demonstration gate. Destination must be absent and
outside tool/project/author/generated roots. Export never activates `current.json`.

A failed full verifier is a blocking result: do not rewrite receipts, relabel old
anchors, or regenerate the shared bank output as a website maintenance shortcut.
On 2026-11-15 the shared output failed `PROJECT_VERIFICATION_CURRENTINPUTS`.
A separate candidate then copied current bank inputs unchanged, used an independent
knowledge database and output, validated the three pinned 0.3.0 JARs, and passed
validate/roundtrip/generate/verify/export. The installed pointer now selects the
real bank snapshot documented in `docs/bank-explorer-20261115.md` (F-30).
Synthetic browser fixtures are not public bank assets and must not be copied into
`assets/data/`. No shared generated files or receipts were repaired.

After a successful export, inspect every candidate payload, including SQLite JSON,
source files, manifests and indexes. Keep source bytes intact: sensitive files are
withheld whole, not edited while retaining old spans. Check published/withheld
counts, identity bridges, hashes, and browser round-trips. Only after separate
publication approval install the immutable snapshot directory and replace the
small current pointer with the export's manifest hash/size. Preserve older snapshot
URLs. Graph counts and new dated verification facts must be updated together.

The historical Workshop HTML is a different, truncated snapshot. Its public copy
was sanitized on 2026-11-15 with `tools/sanitize-historical-workshop.mjs`: only
`verification.project` and `verification.output` were replaced, and a notice added.
Original code excerpts, mappings, fingerprints, script/CSP and verification state
were checked unchanged. Do not join that historical view into current Graph/Code.

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
2026-11-06 by `bank-workshop.mjs view --html`). Images retain that historical
capture. For the HTML, run the pinned sanitizer before installing the public copy;
never restore the original local verification paths into `downloads/`.

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
