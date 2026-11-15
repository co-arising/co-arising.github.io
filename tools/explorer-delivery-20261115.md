# Explorer Graph / Code delivery — 2026-11-15

## Completed

The same Explorer now provides Graph and Code views over the **real bank snapshot**:

`cfc3fb229a0390922eaaea3ffc6604503b340add7fdcd0b1cf3d2b781ca3149d`

- 228 generated source/configuration files plus all 157 author YAML files are
  browsable. `build.sbt` remains withheld whole because it contains local paths.
- Full verification passed: 792 anchor keys, 2,898 locations, 669 byte spans;
  374 Graph nodes have explicit identity bridges. Unmapped/ambiguous cases remain
  explicit, not inferred from names.
- Public manifest, index and original file bytes are installed under
  `assets/data/explorer/snapshots/`; current.json selects this snapshot.
- Chromium and WebKit observed actual ReserveFunds → Behaviors line 26 → same
  command identity, and LEDGER_SUFFICIENT → Rules line 33 → same guard identity.
  Real author structure pointer, refresh/language, narrow layout and withheld
  file handling passed. This was not fixture substitution.
- Historical Workshop public copy had only its two machine-local verification
  paths removed. Code excerpts, mappings, fingerprints, script/CSP and historical
  verification state were compared and preserved. Public payload scan passes.

See `docs/bank-explorer-20261115.md` and F-30 for source identities, count scopes,
licensing, reproducible commands and the runtime boundary.

## How the previous blocker was resolved

The shared bank output failed the active tool fingerprint gate; it was not repaired.
An independent non-Git candidate copied current author/configuration/binding and
handwritten input bytes, checked the three pinned 0.3.0 runtime JARs, and used its
own project knowledge database and generated output. The existing public CLI ran
validate → roundtrip → plan → generate → verify, then the site exporter ran full
verification again. All twelve checks and required demonstration spans passed.

Original shared inputs were rehashed unchanged. No shared generated output,
ledger, anchors, knowledge database, tool core or runtime service was changed.
No Scala build or bank runtime acceptance is claimed by this source snapshot.

## Maintenance

- `tools/export-explorer-snapshot.mjs`: complete verifier, explicit author allowlist,
  original-byte resources, whole-file withholding, identity/span/capture checks.
- `tools/bank-explorer-requirements.json`: required aggregate, command and guard.
- `tools/browser-bank-explorer.py`: actual installed bank browser observations.
- `tools/browser-explorer-code.py`: labeled synthetic failure/lifecycle probes.
- `tools/check-public-payloads.py`: public JSON/text/SQLite/download payload gate.
- `tools/sanitize-historical-workshop.mjs`: pinned historical redaction; fails on
  an unknown baseline rather than guessing or re-signing evidence.

## External publication

The local implementation, real bank data integration and browser acceptance are
complete. No commit, push or GitHub Pages deployment was performed. Publishing
this reviewed local change is a separate outward-facing action requiring explicit
authorization. The current source snapshot does not close independent runtime,
newcomer or complete runnable-material distribution ledger items.
