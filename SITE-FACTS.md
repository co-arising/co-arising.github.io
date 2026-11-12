# SITE-FACTS — the single registry of every number this site claims

Every quantitative claim on co-arising.github.io must carry a fact-ID listed here.
Update this file first, then the pages. If a number is not here, it must not appear on the site.

Audited: 2026-11-11

## Verified facts (F-*)

| ID | Fact | Value | Captured | Source | Reproduce |
|----|------|-------|----------|--------|-----------|
| F-01 | Bank truth tree compiles with zero hard errors | 0 hard findings | 2026-11-11 | bank-wealth-demo working tree @ `fix/pending-replay-20261111` | `cd bank-wealth-demo && npm run validate` |
| F-02 | Bank truth tree roundtrips byte-identical | 157 atoms | 2026-11-11 | same | `npm run validate` (roundtrip is part of the gate) |
| F-03 | Bank knowledge graph size | 389 nodes / 413 edges | 2026-11-11 | truthsrc `graph` over the bank canonical | `node ../metarch-truthsrc/bin/truthsrc.js graph --tree truth/bank-wealth --out <db>` |
| F-04 | Code generation output | 235 files | 2026-11-11 | `generate-project` into a fresh target | `npm run project -- --out <fresh-dir>` |
| F-05 | Anchor verification | verify-project passed, 792 anchors | 2026-11-11 | generated project ledger | `verify-project --project truthsrc.project.json --out <dir>` |
| F-06 | Generated Scala compiles | 0 errors, 534 sources | 2026-11-11 | `sbt compile` in generated project | `cd <generated> && sbt compile` |
| F-07 | Generated + handwritten tests | 23/23 passed | 2026-11-11 | `sbt test` | `sbt test` |
| F-08 | Handwritten zone | 35 files, complete implementations (not stubs) | 2026-11-11 | `find handwritten -type f \| wc -l` | filesystem |
| F-09 | Invariants declared in truth tree | 149 `@rule(...)` across 3 aggregate.yaml | 2026-11-11 | `grep -c '@rule(' truth/bank-wealth/contexts/bankwealth/aggregates/*/aggregate.yaml` | filesystem |
| F-10 | Truth atoms by kind | 157 YAML atoms: 59 VO, 27 slice, 36 formal-product, 8 structure, 4 pipeline, 4 story, 6 read-model, 3 aggregate, 2 saga, 1 use-cases, 1 context, 5 inbox notes | 2026-11-11 | filesystem count | `find truth -name '*.yaml' \| wc -l` |
| F-11 | Sagas declared | 2 (bank cash saga, bank-independent refund saga) | 2026-11-11 | `truth/.../sagas/` | filesystem |
| F-12 | Counter tutorial is Node-only | no JVM / DB / network required | 2026-11-11 | TUTORIAL.md walkthrough | `truthsrc init counter-lab --format human` |
| F-13 | truthsrc runtime footprint | 0 npm runtime dependencies; Node ≥ 22.13.0 (built-in `node:sqlite`) | 2026-11-11 | metarch-truthsrc package.json | — |
| F-14 | Relation registry | 22 relations (R1–R22) with propagates flags | 2026-11-11 | metarch-truthsrc `lib/shared.mjs` RELATION_REGISTRY | — |
| F-15 | Atom kinds / note types | 12 atom kinds, 15 note types | 2026-11-11 | metarch-truthsrc `lib/shared.mjs` | — |
| F-16 | MCP tools | 26 tools over stdio JSON-RPC | 2026-11-11 | metarch-truthsrc `mcp/server.mjs` | `truthsrc mcp` |
| F-17 | Workshop HTML snapshot | single-file, 2.18 MB, offline, lang zh-CN | 2026-11-06 | `view-project --html` output in bank repo target/ | — |
| F-18 | Engine licenses | monarch-core / monarch-persistence / saga-core: Apache-2.0, tag v0.3.0 | 2026-11-12 | per-repo LICENSE + `git describe` | — |
| F-19 | truthsrc license | MIT | 2026-11-11 | metarch-truthsrc/LICENSE | — |
| F-20 | Bank repo license | Apache-2.0 (added 2026-11-11) | 2026-11-11 | bank-wealth-demo/LICENSE | — |
| F-21 | Blast radius of `event:SipInstallmentFailed`, depth 3 | 55 nodes — site SQL preset and CLI `blast_radius` agree | 2026-11-11 | MCP `tools/call blast_radius` over bank canonical | `truthsrc mcp` → `blast_radius {id: event:SipInstallmentFailed, depth: 3}` |
| F-22 | Orphans in bank graph | 11 distinct sourceless pool events (BankPaymentResult*×5, BankRefundResult*×5, FundTAReceiptObserved); 23 rows in graphstore with qualified pool copies | 2026-11-11 | MCP `orphans` + graphstore SQL cross-check | `truthsrc mcp` → `orphans` |
| F-23 | Engines 0.3.0 on Maven Central | `net.imadz` saga-core / monarch-core / monarch-persistence `0.3.0` published; jar sha256 `550fbd5c…` / `0c7a25ee…` / `f42f1b99…`; bank full chain re-verified against these bytes (validate 0 hard · 157 atoms · 235 files · sbt 0 errors · tests 23/23 · 792 anchors) | 2026-11-12 | `curl -s https://repo1.maven.org/maven2/net/imadz/&lt;artifact&gt;_2.13/0.3.0/&lt;artifact&gt;_2.13-0.3.0.jar \| shasum -a 256`; bank `npm run validate && npm run project && sbt test` | `npm run runtime:prepare` (bank) |

## Conventions

- Pages reference facts inline as a small verified badge; the badge title carries the fact-ID.
- Re-audit cadence: before any release-month push, re-run the Reproduce column and bump `Captured`.
- Numbers that differ across in-repo docs (e.g. invariant counts 21/24/149 in different documents)
  are resolved by re-running the reproduce command — the freshly captured value wins.
