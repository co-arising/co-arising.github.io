# LEDGER — deferred items, honestly tracked

This is the honest backlog of the co-arising project family. Anything the site
or the repos imply but do not deliver lands here with a stable ID. Pages link
to `/status/#DEF-xx`. Update this file and `/status/` in the same commit.

## Deferred / open

| ID | Category | Item | Status | Why deferred | Unblocks when |
|----|----------|------|--------|--------------|---------------|
| DEF-01 | behavior | BDD / Gherkin behavior specs | deferred | Positioned as a *derivative* of the truth tree (guards + scenarios can generate Gherkin); formalization of guards/folds took priority | Behavior projection ships |
| DEF-02 | tooling | Visual truth-tree authoring (Qlerify / Miro import, reverse extraction into a tree) | deferred | The language layer is published first; editing UX is a separate discussion | Strategy/scope layer validated by early adopters |
| DEF-03 | publishing | truthsrc npm release (currently local tgz / source only) | blocked | Not yet published to a registry | Release-ready decision by owner |
| DEF-04 | publishing | monarch-* / saga-* Maven Central release (currently v0.2 tag, 0.2.1/0.3.0-dev candidates local) | blocked | Version alignment audit is the last milestone item | Reconciliation & audit deliverables close |
| DEF-05 | demos | fab-simulator-demo, bank-batch-transactor-demo open-sourcing | deferred | Version alignment of those repos comes after the current four-repo set | Alignment wave 2 |
| DEF-06 | bank-service | service02 full-service gate | open | Fresh read-side replay missed the 90-second caught-up readiness gate (2026-11-06); code + 24 recovery cases and real-DB initial/restart/refund did pass | Replay gate passes |
| DEF-07 | bank-service | `sbt run` + HTTP smoke of generated project | open | Not yet executed in a manual session | Smoke session completed |
| DEF-08 | hosting | Bank demo hosted on a free web service | deferred | Requires DEF-06/07 first; free-tier JVM+Akka memory budget is doubtful | Service gate + smoke pass |
| DEF-09 | examples | End-to-end business example threading Saga/Monarch through the original transfer flow | deferred | The bank example covers saga + monarch declarations; a dedicated cross-cutting narrative is still missing | Example authored in truth |
| DEF-10 | i18n | Chinese site edition; English version of the workshop HTML (currently zh-CN) | deferred | English-first go-to-market decision (2026-11-11) | Post-launch evaluation |
| DEF-11 | alignment | Per-repo README alignment with this site | deferred | Explicitly next-phase work after the site ships | Site approved & stable |
| DEF-12 | explorer | Force-directed graph canvas; asciinema/screencasts | deferred | Query console + radial view cover v1 needs; no recording toolchain in workspace | Post-launch |
| DEF-13 | naming | npm scope rename `@madpolaris/truthsrc` → `@co-arising/truthsrc` | deferred | Zero cost before first npm publish (DEF-03) | Before DEF-03 closes |
| DEF-14 | org | Remaining repos (bank-wealth-demo, monarch-*, saga-*) migration to the co-arising org | deferred | Site links centralize in `site.js`, so migration is a one-line change | Owner decision |
