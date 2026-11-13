# SITE-FACTS — the single registry of every number this site claims

Every quantitative claim on co-arising.github.io must carry a fact-ID listed here.
Update this file first, then the pages. If a number is not here, it must not appear on the site.

Content updated: 2026-11-13. Evidence dates are per row; this is not a claim that every older fact was re-run.

Current bank technical evidence: [sanitized 0.3.0 acceptance summary](docs/bank-technical-20261112.md).
The underlying reports were reviewed locally and their hashes checked; the reports and complete delivery materials are not publicly available. Historical captures below retain their own scope and date.

## Verified facts (F-*)

| ID | Fact | Value | Captured | Source | Reproduce |
|----|------|-------|----------|--------|-----------|
| F-01 | Bank truth tree compiles with zero hard errors | 0 hard findings | 2026-11-11 | bank-wealth-demo working tree @ `fix/pending-replay-20261111` | `cd bank-wealth-demo && npm run validate` |
| F-02 | Bank truth tree roundtrips byte-identical | 157 atoms | 2026-11-11 | same | `npm run validate` (roundtrip is part of the gate) |
| F-03 | Bank knowledge graph size | 389 nodes / 413 edges | 2026-11-11 | truthsrc `graph` over the bank canonical | `node ../metarch-truthsrc/bin/truthsrc.js graph --tree truth/bank-wealth --out <db>` |
| F-04 | Code generation output | 235 files | 2026-11-11 | `generate-project` into a fresh target | `npm run project -- --out <fresh-dir>` |
| F-05 | Anchor verification | verify-project passed, 792 anchors | 2026-11-11 | generated project ledger | `verify-project --project truthsrc.project.json --out <dir>` |
| F-06 | Generated Scala compiles | 0 errors, 534 sources | 2026-11-11 | `sbt compile` in generated project | `cd <generated> && sbt compile` |
| F-07 | Generated unit tests (not the independent bank business suites) | 23/23 passed | 2026-11-11 | generated unit runner; handwritten production sources are compiled, not independent handwritten test expectations | `cd <generated> && sbt test` |
| F-08 | Handwritten zone | 35 files, complete implementations (not stubs) | 2026-11-11 | `find handwritten -type f \| wc -l` | filesystem |
| F-09 | Invariants declared in truth tree | 149 `@rule(...)` across 3 aggregate.yaml | 2026-11-11 | `grep -c '@rule(' truth/bank-wealth/contexts/bankwealth/aggregates/*/aggregate.yaml` | filesystem |
| F-10 | Truth atoms by kind | 157 YAML atoms: 59 VO, 27 slice, 36 formal-product, 8 structure, 4 pipeline, 4 story, 6 read-model, 3 aggregate, 2 saga, 1 use-cases, 1 context, 5 inbox notes | 2026-11-11 | filesystem count | `find truth -name '*.yaml' \| wc -l` |
| F-11 | Sagas declared | 2 (bank cash saga, bank-independent refund saga) | 2026-11-11 | `truth/.../sagas/` | filesystem |
| F-12 | Counter tutorial is Node-only | no JVM / DB / network required | 2026-11-11 | TUTORIAL.md walkthrough | `truthsrc init counter-lab --format human` |
| F-13 | truthsrc runtime footprint | 0 npm runtime dependencies; Node ≥ 22.13.0 (built-in `node:sqlite`) | 2026-11-11 | metarch-truthsrc package.json | — |
| F-14 | Relation registry | 22 relations (R1–R22) with propagates flags | 2026-11-11 | metarch-truthsrc `lib/shared.mjs` RELATION_REGISTRY | — |
| F-15 | Atom kinds / note types | 12 atom kinds, 15 note types | 2026-11-11 | metarch-truthsrc `lib/shared.mjs` | — |
| F-16 | MCP tools | 26 tools over stdio JSON-RPC | 2026-11-11 | metarch-truthsrc `mcp/server.mjs` | `truthsrc mcp` |
| F-17 | Workshop HTML snapshot (distinct from the Explorer graph) | single-file, 2.18 MB, offline, zh-CN; 120 exported nodes / 183 edges from a project view declaring totals 861 / 737, with 741 nodes omitted | 2026-11-06; scope checked 2026-11-13 | embedded `workshop-view` in `downloads/bank-workshop.html`; `truthsrc.project-view/v1`, not the F-03 graphstore | Parse embedded JSON and inspect exported arrays, totals and truncation; this historical snapshot does not contain the new service-acceptance report |
| F-18 | Engine licenses | monarch-core / monarch-persistence / saga-core: Apache-2.0, tag v0.3.0 | 2026-11-12 | per-repo LICENSE + `git describe` | — |
| F-19 | truthsrc license | MIT | 2026-11-11 | metarch-truthsrc/LICENSE | — |
| F-20 | Bank repo license | Apache-2.0 (added 2026-11-11) | 2026-11-11 | bank-wealth-demo/LICENSE | — |
| F-21 | Blast radius of `event:SipInstallmentFailed`, depth 3 | 55 nodes — site SQL preset and CLI `blast_radius` agree | 2026-11-11 | MCP `tools/call blast_radius` over bank canonical | `truthsrc mcp` → `blast_radius {id: event:SipInstallmentFailed, depth: 3}` |
| F-22 | Orphans in bank graph | 11 distinct sourceless pool events (BankPaymentResult*×5, BankRefundResult*×5, FundTAReceiptObserved); 23 rows in graphstore with qualified pool copies | 2026-11-11 | MCP `orphans` + graphstore SQL cross-check | `truthsrc mcp` → `orphans` |
| F-23 | Engines 0.3.0 on Maven Central | `net.imadz` saga-core / monarch-core / monarch-persistence `0.3.0`; JAR SHA-256 `550fbd5c…` / `0c7a25ee…` / `f42f1b99…` | 2026-11-12 | public JAR/POM responses and pinned bytes; publication is not bank service acceptance | Fetch the three versioned artifacts from Maven Central and compare SHA-256; full coordinates in the acceptance summary |
| F-24 | Relocated bank technical acceptance | source / anchors / code / service passed and rechecked; `fullPipelinePassed=true`; no diagnostics | 2026-11-12 | `bank030-relocated-20261112-02`; report SHA-256 `b1b88cf5…`; bank `ce51d0e6` plus 16 pinned source-overlay files, tool `cb860b5c` | [Acceptance scope and prerequisites](docs/bank-technical-20261112.md); private paired materials required, not a public one-command reproduction |
| F-25 | Actor and readside test scopes | actor 64 passed; readside 47 passed; the two scopes share 23 generated tests, not 111 distinct cases | 2026-11-12 | same relocated candidate; approved fixed business expectations retained | Candidate workshop `verify --through service` includes separate actor/readside builds; see supply and ownership prerequisites |
| F-26 | Relocated recovery and service observations | 24 three-JVM recovery windows (72 JVMs); 4 real database/HTTP phases; 3 automated browser observations; 5 MySQL negatives passed | 2026-11-12 | same candidate; verification summary SHA-256 `91f42cb5…` | Same sealed candidate and explicit service verification; automated browser checks do not sign off independent or human experience |
| F-27 | Fresh SQL rebuild readiness | 66.847 s within the unchanged 90 s gate; initial / restart / refund 2.132 / 14.251 / 13.667 s | 2026-11-12 | same candidate; `readinessMs.replay=66847`; not the previous candidate's result or a general performance promise | Review the candidate-specific readiness record; re-execution requires the full isolated service setup |
| F-28 | Candidate scope, source stability and resource exit | native Darwin x64 / JDK11, one owner; source unchanged, owned resources exited and lease released | 2026-11-12 | owner-02 driver SHA-256 `a51f1210…`; does not describe other sessions | Driver and input-before/after evidence in the locally reviewed acceptance set |
| F-29 | CLI installation and Counter relocation | tool package 0.5.0; package-pin verification and functional offline install / actual prefix relocation / Counter 0→2 update passed, 40 command observations | 2026-11-12 | `tool-install-counter-review`; this tool version is distinct from engines 0.3.0 | Requires the matched package; zero repeated generated-source writes does not mean zero evidence/graph writes; material delivery and newcomer usability are separate |

## Conventions

- Pages reference facts inline as a small verified badge; the badge title carries the fact-ID.
- Re-audit cadence: before any release-month push, re-run the Reproduce column and bump `Captured`.
- Numbers that differ across in-repo docs (e.g. invariant counts 21/24/149 in different documents)
  are resolved by re-running the reproduce command — the freshly captured value wins.
