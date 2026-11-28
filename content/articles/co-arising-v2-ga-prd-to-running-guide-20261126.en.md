# co-arising 2.0 GA Complete Guide: Core Features, End-to-End PRD-to-Production Scala/Play Flow, and Quick Start (CLI + MCP + Skills)

**Published: 2026-11-26 (Synced 2026-11-28 to latest `main`)** · Release scope: `@madpolaris/truthsrc` `v2.0.0` (`main` @ `ab207e7`, incl. Waves 1–8 & Scala single-stack mode) · `bank-wealth-demo` `v2.0.0` (`b5cadc0`, original v1 baseline preserved as tag `v1.0.0-baseline`)

If you have an unstructured product requirements document (PRD) and want AI agents to turn it into a **mathematically unambiguous, drift-proof, architecturally sound, production-grade `--target scala-cqrs-play-service-v2` Scala / Play CQRS service** ready for `sbt` build and deployment, this guide walks you through the entire co-arising 2.0.0 loop.

With co-arising 2.0.0 GA and the Waves 1–8 production hardening sweeps, the toolchain moves beyond v1's model graph and scaffold generation into a full closed loop: **PRD distillation → EARS-native single behavior truth → Z3 compile-time mathematical proof → 60-family `scala-cqrs-play-service-v2` deterministic codegen & `*Impl.scala` locked-oracle AI `@cloze` TDD → 100% full-coverage governance and JVM chaos TCK**. This guide covers:

1. The six core capabilities of co-arising 2.0 (focused on Scala single-stack production delivery);
2. The 7-step end-to-end flow from a raw PRD to a running Play service;
3. A 5-minute Quick Start (`init-v2 --target scala-cqrs-play-service-v2` → `check-v2 --strict` → `tasks-v2`);
4. Wiring **CLI + MCP + Skills + Hooks + Workflow + LSP** into Antigravity (AGY) and Claude Code;
5. A worked walkthrough from a one-page PRD to green ScalaTest suites and a live Play HTTP service.

---

## 1. Why co-arising 2.0: Six Core Capabilities

In the era of AI coding, the bottleneck is no longer typing speed—it is **specification ambiguity, context rot, architectural erosion, and un-auditable black-box edits**. co-arising 2.0 redesigns the compilation and agent-collaboration trunk around those four failure modes:

### 1. Orthogonal Single Source of Truth: Structure, Behavior, and Bindings Separated

v2 retires dual expression engines and lossy lowering layers in favor of four strictly orthogonal directories:

- **`structures/*.yaml`**: Pure static types, nominal value objects (`Money`, `AccountId`), aggregate state fields, and command/event/error definitions—**no embedded behavioral expressions**;
- **`behaviors/domain/*.ears`**: Pure domain rules and state folds (`slice` + `post:`) authored in controlled EARS 1.0 (with bilingual `.zh.ears` semantic-drift gating);
- **`behaviors/application/*.story.ears` and `*.integration.ears`**: Application-layer use-case orchestration and external system integration specs declaring state transitions, port calls, `WHEN event` reactions, and `within <dur>` timing bounds;
- **`bindings/*-effects.yaml`**: Technical port and external effect bindings (`transactional-outbox`, `saga-compensation`, `idempotent-consumer`), decoupling infrastructure mechanics from business truth.

### 2. Four Domain-Boundary Gates + Path-to-Layer Physical Isolation

The v2 compiler enforces a **Path-to-Layer gate** alongside **four domain-boundary anti-regression gates**: files under `behaviors/domain/` cannot declare `layer: application` or leak database, HTTP, queue, retry, or distributed-lock terms; conversely, application specs (`*.story.ears` / `*.integration.ears`) cannot mutate aggregate internals directly. Violations fail at compile time with exact `file:line:col` caret diagnostics and actionable remediation hints.

### 3. Z3 SMT Compile-Time Hard Gate (`--strict`, Zero Silent Skip)

Before a single line of implementation code is written, `compile-v2 --strict` translates EARS rules, First-Hit priority ordering, quantifiers and aggregations (`forall` / `exists` / `sum` / `count` / `len`), nested containers (`Map[String, Map[String, VO]]`), optional predicates (`is some` / `is none`), time windows (`within`), and application-layer `k`-step bounded model checking (BMC) directly into SMT-LIB2 for Z3:

- Automatically detects **contradictions**, **dead rules shadowed by earlier rules**, **uncovered input gaps**, and **unreachable terminal states**;
- Under `--strict`, a missing Z3 binary never silently skips proof—it hard-fails with `V2_SOLVER_MISSING`;
- Passing specs emit concrete **boundary witnesses** that seed downstream ScalaTest oracles.

### 4. Production Single-Stack Delivery: `--target scala-cqrs-play-service-v2` × `*Impl.scala` Isolated TDD

For teams shipping production Scala / Play Framework services, co-arising 2.0 supports **Scala single-stack mode** backed by the 60-family strict-governance superset **`scala-cqrs-play-service-v2`** (inheriting all 47 traditional/curated families from `scala-cqrs-play-service@1` plus 13 v2 extensions)—no unnecessary TypeScript scaffolds to generate or maintain:

| Channel | Scope | Generation Strategy (`scala-cqrs-play-service-v2`) | Verification & Locking |
| :--- | :--- | :--- | :--- |
| **Channel 4A (L1)** | Deterministic domain rules, Aggregates/Events/Proto3/ReadSide/Play HTTP & Authz | **Zero-token deterministic compilation** emits complete `generated-scaffold/` (Blocks A–D: domain core, Akka Persistence/Sharding, Proto3 `BoxPO` converters, ReadSide projections, `AuthEndpointDsl`/`HttpAuthority` 401/403/CSRF Play controllers, Saga/Effect, `build.sbt`, `conf/routes`) | Compiler guarantees isomorphism with `@generated by truthsrc scala-cqrs-play-service:2` provenance anchors; zero AI hand-writing |
| **Channel 4B (L2 / L3)** | Complex domain calculations (L2), cross-port application orchestration (L3), and external adapter bindings | Compiler emits **Port interfaces**, fenced `handwritten/scala/.../*Impl.scala` isolation skeletons (`@cloze:start(<slot-id>)..@cloze:end(<slot-id>)`, with non-destructive method sync), and **SHA-256 locked ScalaTest oracles** | AI agents edit strictly inside `*Impl.scala` `@cloze` fences until all locked ScalaTest oracles and Onion DIP gates pass, followed by independent blind review |

> **Multi-subdomain monolith packaging**: When a system spans multiple subdomains, run `generate-v2 --canonicals <a.json,b.json> --bc <bcName> --packaging monolith` to merge them into a single runnable Play CQRS monolith with automatic cross-subdomain conflict detection (`BC_MERGE_CONFLICT`) and stale-file pruning. (Optional `typescript` and lightweight `scala` targets remain available in the toolchain for rapid prototyping or regression suites, but production delivery only needs `--target scala-cqrs-play-service-v2`.)

### 5. 100% Full-Coverage Zero-Gray-Zone Governance, System Lineage & Chaos TCK

Most spec-driven approaches govern only 30% of core logic while leaving 70% of glue code, adapters, and scripts in an ungoverned gray zone. v2 introduces a complete ledger separating **Problem Space (D1/D2 → E1)** from **Solution Space (S1/S2/S3 → E2/E3/E4)**:

- **`audit-coverage-v2`** requires **100% of governed files** (**188 / 188** in the latest `bank-wealth-demo` pilot) to carry explicit governance ownership with zero unclassified files and zero architectural violations;
- **`audit-system-lineage-v2`** runs SQLite recursive cross-subdomain field lineage, PII taint, and cycle gates;
- For S1 infrastructure adapters, the toolchain ships **4 chaos TCK suites** (`three-phase-reconcile`, `transactional-outbox`, `saga-compensation`, `idempotent-consumer`) with a **Scala/JVM runner** to test duplicate deliveries, reordering, and partial-failure crashes.

### 6. The Last-Mile Kit: Derived Queue + 32 MCP Tools + Skills + Hooks + Atlas/LSP

To make the loop practical in everyday engineering, 2.0.0 ships the complete last-mile workflow:

- **`tasks-v2` derived task queue**: Instead of drifting manual `TODO.md` files, task states (`PENDING`, `STALE_SPEC_CHANGED`, `GREEN_NEEDS_REVIEW`, `DONE`) are derived deterministically from `canonical-v2.json` hashes and SQLite verification provenance;
- **32 MCP tools**: Adds **6 v2 tools** (`v2_compile`, `v2_query_graph`, `v2_tasks`, `v2_context_pack`, `v2_verify`, `v2_view`) alongside the 26 v1 graph tools;
- **Cross-platform Skills**: Ships `coarising_distill` (PRD → truth source), `coarising_cloze_worker` (isolated `@cloze` TDD worker incl. Roadshow & failure attribution protocol), and `coarising_saga_monarch` (cross-aggregate Saga orchestration) for both Antigravity and Claude Code;
- **Physical write-guard Hooks + Offline Atlas + LSP**: One-command Claude Code `PreToolUse`/`Stop` hook installation, AGY `workflows/coarising_cloze_pipeline.py` parallel fan-out template, `view-v2` offline workbench, `atlas-v2` / `event-matrix-v2` 11-diagram offline architecture atlas, and zero-dependency `truthsrc lsp-ears` + VS Code TextMate extension.

---

## 2. From a Raw PRD to a Running Scala/Play Service: The 7-Step Flow

The table below traces a requirement from an unstructured document to a green `--target scala-cqrs-play-service-v2` service:

| Stage | Actor & Tooling | Inputs | Deterministic Outputs & Gates |
| :--- | :--- | :--- | :--- |
| **Step 1 · Distillation** | Human + AI (`coarising-distill` Skill + MCP `v2_compile`) | Raw PRD / stakeholder notes | `structures/*.yaml`, `behaviors/{domain,application}/*.ears`, `bindings/*-effects.yaml` + Z3-backed A/B Clarification Cards + Style E/B business signoff projections |
| **Step 2 · Proof & Graph** | `truthsrc compile-v2 --strict` | Orthogonal truth directories | `.truthsrc/canonical-v2.json`, Z3 boundary witnesses, `.truthsrc/knowledge.sqlite` |
| **Step 3 · Production Code & Oracles** | `truthsrc generate-v2 --target scala-cqrs-play-service-v2` + `emit-tests-v2` | `canonical-v2.json` (or `--canonicals` for multi-subdomain) | `generated-scaffold/` (60-family Scala/Play/Proto3/ReadSide/`build.sbt`); `handwritten/scala/.../*Impl.scala` `@cloze` skeletons; `locked-tests.sha256.json` locked ScalaTest oracles |
| **Step 4 · Derived Queue** | `truthsrc tasks-v2` / MCP `v2_tasks` | `canonical-v2.json` + SQLite | Live task queue with automatic `STALE_SPEC_CHANGED` dirty invalidation |
| **Step 5 · Cloze TDD** | AI (`coarising-cloze-worker` / AGY `run_workflow`) + `guard-write` | `v2_context_pack` minimal slice | Edits strictly inside `*Impl.scala` `@cloze` fences; `verify-v2 --strict` passes all locked ScalaTest suites and Onion DIP gates |
| **Step 6 · Blind Review & Audit** | Read-only blind reviewer + `audit-coverage-v2` + `run-tck-v2` | EARS spec + slot Diff + adapter | `tasks-v2 --record-review` marks `DONE`; 100% file coverage, lineage audit, and S1 chaos TCK pass |
| **Step 7 · Continuous CI** | `truthsrc check-v2 --strict --sync` + `sbt -batch stage` + GitHub Actions | Any spec or code PR | Single command chaining compile, proof, drift sync, tamper checks, ScalaTest suites, coverage, and Play staging |

### Why Never Track Spec-to-Code Tasks in a Manual Markdown Checklist?

Whenever an upstream PRD changes and a single EARS threshold is edited, manual checklists routinely miss which previously implemented `*Impl.scala` handwritten files are now stale. In co-arising 2.0, every behavior unit carries a `behaviorSha256` into compilation, and every passing `verify-v2` run persists provenance in `.truthsrc/knowledge.sqlite`. Changing even one number in an `.ears` file immediately flips only the affected slot to **`STALE_SPEC_CHANGED`**, allowing agents to surgically re-implement just what drifted while leaving untouched slots `DONE`.

---

## 3. Quick Start: Run Your First Scala/Play v2 Project in 5 Minutes

### 1. Prerequisites

- **Toolchain runtime**: Node.js **≥ 22.13.0** (built-in `node:sqlite`, **0 npm runtime dependencies**) and the **Z3 SMT solver** (required under `--strict`);
- **Scala / Play production build & tests**: **JDK 11+** and **`sbt`**.

```bash
# macOS example (on Linux: apt install z3 or install an official Z3 release, plus JDK 11+ and sbt)
brew install node@22 z3 sbt
node --version   # must be >= v22.13.0
z3 --version     # confirm z3 is on PATH
sbt --version    # confirm sbt and JDK are available
```

### 2. Clone the Toolchain and Scaffold a Scala Single-Stack Project (`init-v2`)

Passing `--target scala-cqrs-play-service-v2` to `init-v2` activates **Scala single-stack mode**: it records `"targets": ["scala-cqrs-play-service-v2"]` in `truthsrc.v2.json`, emits only Scala / Play / Proto3 / `build.sbt` and `*Impl.scala` scaffolds with **zero TypeScript files**, and downstream `check-v2`, `verify-v2`, and `tasks-v2` auto-detect the single-stack configuration.

```bash
export COARISING_WS="$PWD"
git clone https://github.com/co-arising/metarch-truthsrc.git
export TRUTHSRC_CLI="$COARISING_WS/metarch-truthsrc/bin/truthsrc.js"

# Confirm version (prints 2.0.0)
node "$TRUTHSRC_CLI" --version

# Scaffold a ready-to-run Scala/Play production single-stack project (zero TypeScript artifacts)
node "$TRUTHSRC_CLI" init-v2 my-v2-app \
  --target scala-cqrs-play-service-v2 \
  --package example.myv2 \
  --format human
cd my-v2-app

# Run the full v2 gate: Z3 strict proof + SHA-256 tamper check + live ScalaTest + 100% coverage audit
node "$TRUTHSRC_CLI" check-v2 --root . --strict --format human

# Inspect the derived task queue backed by canonical-v2.json and SQLite
node "$TRUTHSRC_CLI" tasks-v2 --root . --format human
```

In three commands, you have verified:

1. Orthogonal parsing and domain-boundary checks over `structures/`, `behaviors/`, and `bindings/*-effects.yaml`;
2. Strict Z3 SMT contradiction, dead-rule, and gap proofs;
3. `scala-cqrs-play-service-v2` production codegen, `generated-scaffold/build.sbt`, `handwritten/scala/.../*Impl.scala` isolation skeletons, and SHA-256 locked ScalaTest oracles;
4. SQLite knowledge-graph persistence and derived `tasks-v2` queue computation.

### 3. Run the Real `bank-wealth-demo` v2.0.0 Pilot

To explore a full banking pilot featuring **3 domain slices (`CreditBalance`, `FundQuota`, `FundOrder`) + 2 application stories (`cash-fund-purchase.story.ears` / `ta-bridge-settlement.integration.ears`) + `scala-cqrs-play-service-v2` live `sbt -batch stage` & Play 2.8.18 HTTP roadshow + S1 chaos TCK + mutation kills**, run `bank-wealth-demo`:

```bash
cd "$COARISING_WS"
git clone https://github.com/co-arising/bank-wealth-demo.git
cd bank-wealth-demo

# 1. Confirm the frozen v1 truth tree remains 100% intact (160 YAML atoms)
npm run validate

# 2. Run the v2 pilot: compile + Z3 proof + tamper-checked live suites & mutation gate
npm run v2:compile
npm run v2:verify

# 3. 100% full-coverage governance audit (188 / 188 files, 0 gray zone, 0 arch violations)
npm run v2:audit-coverage

# 4. S1 chaos TCK (8 / 8) and end-to-end mutation-kill suite (5 / 5)
npm run v2:tck
npm run test:v2

# 5. Inspect the derived task queue for v2-pilot
node "$TRUTHSRC_CLI" tasks-v2 --root v2-pilot --format human
```

---

## 4. Wiring AI Agents: CLI + MCP + Skills + Hooks + Workflow Setup

co-arising 2.0 gives **Antigravity (AGY)** and **Claude Code** a clean separation of concerns: **MCP handles deterministic reads, compilation, and verification; Skills encode engineering discipline; Hooks and Workflows enforce physical write boundaries and parallel orchestration**.

### 1. Register `truthsrc mcp` (32 Tools: 26 v1 + 6 v2)

In Claude Code:

```bash
claude mcp add truthsrc -- node /absolute/path/to/metarch-truthsrc/bin/truthsrc.js mcp
```

Or in Antigravity / standard MCP client configuration:

```json
{
  "mcpServers": {
    "truthsrc": {
      "command": "node",
      "args": ["/absolute/path/to/metarch-truthsrc/bin/truthsrc.js", "mcp"]
    }
  }
}
```

The six v2 MCP tools (32 total alongside the 26 v1 tools):

| MCP Tool | Responsibility | Typical Usage |
| :--- | :--- | :--- |
| **`v2_compile`** | Compiles orthogonal truth, runs strict Z3 proofs (`strict: true`), persists `canonical-v2.json` & `knowledge.sqlite` | Iterative ambiguity checks during PRD distillation |
| **`v2_query_graph`** | Queries v2 SQLite graph (`overview`, `cloze_slots`, `coverage`, `node`, `edges`) | Blast-radius checks, slot discovery, coverage inspection |
| **`v2_tasks`** | Derives live L1 / `@cloze` task queue with `STALE_SPEC_CHANGED` invalidation | Deciding which slots to implement or re-verify next |
| **`v2_context_pack`** | Builds a minimal isolated context pack for one `slotId` (relevant EARS rules, types, Port signatures, fence lines, locked oracle paths) | Sole context input for a Cloze TDD worker, preventing prompt bloat |
| **`v2_verify`** | Verifies locked-test SHA-256 hashes, runs the project's configured target suites (in Scala single-stack mode: `domain / application / interfaces` ScalaTest oracles), audits Onion DIP, and records SQLite provenance | Mandatory verification gate after every edit |
| **`v2_view`** | Exports a self-contained strict-CSP offline HTML visual workbench (truth ↔ generated code ↔ locked tests with line reverse lookup) for any v2 project | Interactive local browser inspection after signoff or green verification |

### 2. Install Cross-Platform Skills (Distillation + Cloze Worker + Saga Monarch)

The toolchain ships open-format skills under `skills/` ready for `.claude/skills/` (Claude Code) or your Antigravity skills directory:

```bash
# Example project-local install for Claude Code
mkdir -p .claude/skills
cp -r /absolute/path/to/metarch-truthsrc/skills/coarising_distill .claude/skills/
cp -r /absolute/path/to/metarch-truthsrc/skills/coarising_cloze_worker .claude/skills/
cp -r /absolute/path/to/metarch-truthsrc/skills/coarising_saga_monarch .claude/skills/
```

- **`coarising_distill`**: Activated when turning a PRD into truth source. Follows a strict loop—inventory entities & invariants → author orthogonal files → call `v2_compile` to let Z3 surface gaps/conflicts → issue A/B Clarification Cards → export readable signoff projections—never jumping straight into code;
- **`coarising_cloze_worker`**: Activated when implementing a `*Impl.scala` `@cloze` slot. Fetches the minimal `v2_context_pack`, edits only inside `@cloze:start(<slot-id>)` and `@cloze:end(<slot-id>)`, proves green via `v2_verify` (strict, incl. Roadshow & gate failure attribution protocol), and hands off for independent blind review;
- **`coarising_saga_monarch`**: Activated for cross-aggregate / cross-subdomain Saga orchestration and compensation flows.

### 3. One-Command Physical Write-Guard Hooks (Claude Code)

Prompt reminders alone cannot stop an agent from editing locked tests or generated code. `init-v2` installs hooks automatically; in an existing repo, install deterministic physical fences in one command:

```bash
node "$TRUTHSRC_CLI" init-hooks --root . --target scala-cqrs-play-service-v2 --format human
```

This writes `.claude/settings.json` with two hard hooks:

1. **`PreToolUse` (`Edit|Write|MultiEdit`)**: Invokes `truthsrc guard-write` to **physically block** writes to `generated-scaffold/`, `generated-tests/`, `locked-tests.sha256.json`, or any line outside the active `@cloze` fence;
2. **`Stop` hook**: Runs `truthsrc verify-v2 --strict` before the agent may finish, blocking completion if any oracle fails or a locked hash drifts.

### 4. Parallel Multi-Slot Orchestration in Antigravity (`run_workflow`)

When a spec update opens multiple independent `@cloze` slots (e.g., `cash-fund-purchase`, `fund-order-confirm-tashares`, and `ta-bridge-settlement`), run the bundled workflow template `workflows/coarising_cloze_pipeline.py`:

1. Phase 1 invokes `v2_compile` and `v2_tasks` to discover all `PENDING` / `STALE_SPEC_CHANGED` slots;
2. Phase 2 fans out independent `coarising-cloze-worker` subagents via `parallel(...)` for isolated TDD implementation;
3. Phase 3 dispatches a **fresh, read-only blind reviewer subagent** per green slot comparing only the EARS spec and slot diff, then records approval with `tasks-v2 --record-review`.

### 5. Editor Support: VS Code TextMate Grammar & Zero-Dependency LSP

- Syntax highlighting lives in `metarch-truthsrc/editor/ears-vscode/`, covering `.ears`, `.zh.ears`, `.story.ears`, and `.integration.ears`;
- Start the zero-dependency stdio language server via `node "$TRUTHSRC_CLI" lsp-ears` for live parse diagnostics, symbol outlines, and hover help.

### 6. Taking Your Own PRD End-to-End: Copy-Paste Playbook for Claude Code (Scala Single-Stack)

If you have a real PRD on disk (say `docs/prd.md`) and want to take it smoothly from raw prose to Z3-verified truth, `--target scala-cqrs-play-service-v2` production code, locked ScalaTest suites, blind-reviewed code, and a running Play service in Claude Code, follow these five exact steps:

**Step A · Scaffold the Scala Single-Stack Project, Drop in Your PRD, and Wire MCP + Skills**

```bash
# 1. Scaffold the Scala single-stack project (creates truth/<context>/, governance/, truthsrc.v2.json, and .claude/settings.json hooks)
node "$TRUTHSRC_CLI" init-v2 my-prd-app \
  --system my-sys \
  --context my-ctx \
  --target scala-cqrs-play-service-v2 \
  --package example.myctx \
  --format human
cd my-prd-app

# 2. Place your PRD inside the repo (Markdown, plain text, or requirement tables)
mkdir -p docs
cp /path/to/your-prd.md docs/prd.md

# 3. Register truthsrc MCP and install official skills into this project
claude mcp add truthsrc -- node "$TRUTHSRC_CLI" mcp
mkdir -p .claude/skills
cp -r "$COARISING_WS/metarch-truthsrc/skills/coarising_distill" .claude/skills/
cp -r "$COARISING_WS/metarch-truthsrc/skills/coarising_cloze_worker" .claude/skills/
cp -r "$COARISING_WS/metarch-truthsrc/skills/coarising_saga_monarch" .claude/skills/
```

> Note: `init-v2` automatically writes `"targets": ["scala-cqrs-play-service-v2"]` and `.claude/settings.json` (`PreToolUse` `guard-write` + `Stop` `verify-v2 --strict`). In an existing repository, run `node "$TRUTHSRC_CLI" init-hooks --root . --target scala-cqrs-play-service-v2` to install them separately.

**Step B · Turn 1 Prompt (PRD → Z3-Verified Orthogonal Truth Source)**

Launch `claude` inside `my-prd-app` and paste this prompt directly:

```text
Use the coarising-distill skill to distill docs/prd.md into an orthogonal co-arising 2.0 truth source under truth/my-ctx/ (replacing the starter example):
1. Phase 1: Extract the domain glossary, exactTypes (fixed scale + closed units), status enums, aggregate commands/events, inbound ports, and externContracts into truth/my-ctx/structures/my-ctx.yaml and pause for my confirmation first;
2. Phase 2: Once confirmed, author behaviors/domain/*.ears, behaviors/application/*.story.ears, behaviors/application/*.integration.ears, and bindings/my-ctx-effects.yaml strictly by layer;
3. Phase 3: Run truthsrc MCP v2_compile (strict: true) for Z3 SMT proofs. Auto-fix syntax or path-layer diagnostics via file:line:col; whenever Z3 reports a gap, conflict, dead-rule, or invariant failure, NEVER guess—present plain-language A/B Clarification Cards and wait for my decision;
4. Phase 4: Once Z3 passes, emit read-only business signoff projections (Style E AC and Style B decision tables) for approval before writing any implementation code.
```

You will walk through four crisp interactive checkpoints:

1. **Glossary & closed-vocabulary signoff**: Verify numeric scales, status enums, and external predicates so typos fail at compile time;
2. **Layered truth authoring**: Pure domain logic in `behaviors/domain/*.ears`, user-story choreography in `behaviors/application/*.story.ears`, and external settlement/reconciliation in `behaviors/application/*.integration.ears` + `bindings/my-ctx-effects.yaml`;
3. **Z3 A/B Clarification Cards**: Whenever Z3 exposes an omitted edge case (such as `amount == 0` or external `UNKNOWN` timeouts), simply reply with Option A, Option B, or a custom rule—Claude Code updates `.ears` and re-proves until `[PASS]`;
4. **Stakeholder signoff projections**: Generate PM-readable acceptance criteria (`projections/ac/*.md`) and DMN decision tables (`projections/tables/*.md`):

```bash
node "$TRUTHSRC_CLI" compile-v2 \
  --structures truth/my-ctx/structures \
  --behaviors truth/my-ctx/behaviors \
  --out .truthsrc/canonical-v2.json \
  --db .truthsrc/knowledge.sqlite \
  --out-ac projections/ac \
  --out-tables projections/tables \
  --lang en \
  --strict \
  --format human
```

**Step C · Emit `scala-cqrs-play-service-v2` Production Code, Locked ScalaTest Oracles & Task Queue**

After signoff, emit the complete 60-family production Scala/Play service (`generated-scaffold/` with domain core, Aggregate/Protocol/Repository/Bootstrap, Proto3 `.proto` + `BoxPO` converters, ReadSide projections, `AuthEndpointDsl` / `HttpAuthority` 401/403/CSRF PlayControllers, `conf/routes`, `conf/dev.conf`, and `build.sbt`) plus `handwritten/scala/.../*Impl.scala` isolation skeletons, lock all `domain / application / interfaces` ScalaTest oracles via SHA-256, and inspect the task queue:

```bash
# Single subdomain (for multi-subdomain monolith packaging, use --canonicals a.json,b.json --bc my-bc --packaging monolith)
node "$TRUTHSRC_CLI" generate-v2 \
  --in .truthsrc/canonical-v2.json \
  --out . \
  --target scala-cqrs-play-service-v2 \
  --package example.myctx \
  --with-scaffold

node "$TRUTHSRC_CLI" emit-tests-v2 \
  --in .truthsrc/canonical-v2.json \
  --out . \
  --target scala-cqrs-play-service-v2 \
  --package example.myctx

node "$TRUTHSRC_CLI" tasks-v2 --root . --format human
```

Then send Turn 2 Prompt to Claude Code to fill each isolated `*Impl.scala` `@cloze` slot:

```text
Use the coarising-cloze-worker skill (Mode A):
1. Call v2_tasks to claim the next actionable @cloze slot;
2. Load only that slot's minimal context via v2_context_pack, edit strictly inside handwritten/scala/.../*Impl.scala between // @cloze:start(<slot-id>) and // @cloze:end(<slot-id>), never touch generated-tests/, generated-scaffold/, or lines outside the fence, and use exact fixed-point decimal math (BigDecimal / ExactType) instead of floating point;
3. Run v2_verify (strict: true) and confirm SHA-256 tamper checks, Onion DIP boundaries, and all domain / application / interfaces locked ScalaTest oracles pass before reporting back.
```

**Step D · Independent Blind Review & Final Gate**

Open a fresh Claude Code session (or read-only subagent) so review has zero shared implementation bias, and send Turn 3 Prompt:

```text
Use the coarising-cloze-worker skill (Mode B, independent blind review) on slot <slot-id>:
Read ONLY the authoritative .ears file, the handwritten/scala @cloze file, and the locked generated-tests spec. Audit all 5 red lines (witness hardcoding, floating-point drift, off-by-one < vs <=, SHALL NOT leakage, edits outside the fence).
If clean, record the verdict into SQLite:
truthsrc tasks-v2 --root . --record-review --slot <slot-id> --verdict PASS --reviewer blind-reviewer --notes "Verified First-Hit order, exact decimal math, and SHALL NOT invariants."
```

Once `tasks-v2` shows zero pending/review items (and new files are registered in `governance/coverage-manifest.json`), run the single final gate:

```bash
node "$TRUTHSRC_CLI" check-v2 --root . --strict --format human
```

**Step E · Stage & Run the Play Service via `sbt` + Open Your Project's Offline Workbench & Atlas**

Once the final gate is green, you have a **production-grade Play CQRS service** ready to compile and boot via `sbt`, plus one-command offline visual tools for your own PRD project:

1. **Stage and start the Scala / Play service locally**:

```bash
# Compile and stage the generated Play service
cd generated-scaffold
sbt -batch stage

# Start the local Play HTTP server (routes in conf/routes, config in conf/dev.conf)
sbt run

# Terminal 2: verify /health and your AuthEndpointDsl / HttpAuthority protected routes
curl -s http://127.0.0.1:9000/health
```

2. **Export and open your project's offline visual workbench and 11-diagram Atlas**:

```bash
cd ..
# Export the offline visual workbench (or ask Claude Code to invoke MCP tool v2_view)
node "$TRUTHSRC_CLI" view-v2 --root . --out workshop.html

# Export the 11-diagram Problem-Space & Solution-Space offline Atlas
node "$TRUTHSRC_CLI" atlas-v2 --canonical .truthsrc/canonical-v2.json --out atlas.html

# Open directly in your browser (macOS: open; Linux: xdg-open; Windows: start)
open workshop.html
open atlas.html
```

`workshop.html` is a single strict-CSP offline file requiring no web server: chapters are auto-organized by your stories and slices, the full graph renders with 0 omitted nodes, and clicking any line number in the `scala-cqrs-play-service-v2` / `*Impl.scala` code panel reverse-navigates straight back to the owning EARS rule.

3. **Day-2 PRD evolution loop**:
   When requirements change later, edit `truth/<context>/` (`.ears` / YAML) instead of patching code blindly, then re-run `compile-v2` → `generate-v2 --target scala-cqrs-play-service-v2` → `emit-tests-v2 --target scala-cqrs-play-service-v2` → `tasks-v2` (or `check-v2 --root . --strict --sync`): untouched modules stay intact, `*Impl.scala` supports non-destructive method sync, only affected `@cloze` slots flip to `STALE_SPEC_CHANGED`, and Claude Code re-implements and re-verifies them under `check-v2 --strict`.

**Two Practical Tips for a Smooth First Run**

- **Chunk large PRDs by aggregate or subdomain**: For a 20+ page PRD, distill 1 core aggregate or 1–2 main stories at a time so Z3 Clarification Cards stay focused and converge rapidly, then package multiple subdomains together with `--canonicals ... --bc <name> --packaging monolith`.
- **Warm up with a 5-line mini-PRD first**: On your very first run, try a 5-line wallet-transfer prompt (insufficient balance reject, duplicate `requestId` idempotency, single-transfer cap) to watch Z3 catch zero/negative gaps and pass locked ScalaTest suites in minutes before feeding your full PRD.

---

## 5. Worked Walkthrough: From a One-Page PRD to Verified Scala/Play Production Code

Here is how every piece fits together on a concise banking purchase story:

### Step 1: Raw PRD Excerpt (Full of Hidden Ambiguity)

> "When a customer purchases a fund, check available balance and reserve funds; then submit the purchase order to the external Transfer Agent (TA). If TA confirms, finalize reserved funds and confirm shares; if TA rejects, trigger an independent refund flow."

### Step 2: `coarising-distill` + Z3 Catch Three Unspoken Edge Cases

The agent splits the requirement cleanly into:

- `structures/bankwealth.yaml`: `AccountId`, `Money(amount, currency)`, `CreditBalance` state, and `ReserveFunds` command/events;
- `behaviors/domain/credit-balance-reserve.ears` (L1 domain slice): currency match, positive amount, sufficient balance guards, and `post:` reservation folds;
- `behaviors/application/cash-fund-purchase.story.ears` (L3 application orchestration): reserve → TA submit → confirm/reject choreography.

Calling MCP **`v2_compile` (`strict: true`)** immediately lets Z3 surface three gaps the PRD omitted:

1. **Is `amount == 0` accepted or rejected?** (Z3 reports an uncovered gap at zero);
2. **Does retrying the same `requestId` reject or succeed idempotently?**;
3. **If the TA channel times out with `UNKNOWN`, may the workflow refund immediately?** (Application BMC flags the missing `UNKNOWN` branch).

The agent presents three concise **A/B Clarification Cards**. Stakeholders decide: amount must be strictly `> 0`; matching `requestId` + matching amount is idempotent while mismatched amount rejects as a conflict; and `UNKNOWN` must **never** trigger blind refund—it enters an explicit reconciliation hold state.

### Step 3: Business Signoff & Deterministic Generation (`compile-v2` + `generate-v2 --target scala-cqrs-play-service-v2` + `emit-tests-v2`)

Once updated, `v2_compile` proves **0 conflicts, 0 dead rules, and 0 gaps**, exporting Style E/B read-only signoff tables for product and compliance review. Then:

- **L1 slice `credit-balance-reserve.ears`** compiles via Channel 4A with **zero tokens** into complete Scala value objects, aggregate behavior, event handlers, Proto3 serializers, ReadSide projections, and ScalaTest unit tests;
- **L3 story `cash-fund-purchase.story.ears`** emits via Channel 4B the application port contracts, PlayController routes & authz stubs, fenced `handwritten/scala/.../application/services/CashFundPurchaseImpl.scala` (`@cloze:start(cash-fund-purchase)..@cloze:end(cash-fund-purchase)` plus `ServerSnapshotProviderImpl.scala` and `HandwrittenBindingsModule.scala`), and SHA-256 locked ScalaTest oracle suites (`locked-tests.sha256.json`) including an explicit adversary test forbidding blind refund on `UNKNOWN`.

### Step 4: `tasks-v2` Dispatch & Isolated Cloze TDD

`v2_tasks` reports:

- `CreditBalance.ReserveFunds`: L1 `DONE` (zero hand-written code);
- `cash-fund-purchase`: L3 `PENDING`.

Running `coarising-cloze-worker` (or AGY `run_workflow`):

1. Calls `v2_context_pack(slotId="cash-fund-purchase")` to load only the bounded EARS rules, Port types, and fence lines;
2. Edits strictly inside the `CashFundPurchaseImpl.scala` `@cloze` fence under `PreToolUse` `guard-write` protection;
3. Calls `v2_verify(strict=true)`: locked SHA-256 hashes verify, all three ScalaTest oracle layers pass, SQLite records provenance, and the slot moves to `GREEN_NEEDS_REVIEW`;
4. An independent blind reviewer checks the EARS rules against the diff and signs off via `tasks-v2 --root v2-pilot --record-review --slot cash-fund-purchase --verdict PASS --reviewer blind-reviewer`, transitioning the slot to **`DONE`**.

### Step 5: Full-Coverage Audit, `sbt` Staging & Adversary Verification

Finally, `audit-coverage-v2`, `run-tck-v2`, and `sbt -batch stage` confirm in the latest `bank-wealth-demo` pilot: **188 / 188** governed files (0 gray zone, 0 architecture or Onion DIP violations), zero-error `sbt -batch stage` across 8 `.proto` + 169 Scala + 2 Java files and live Play 2.8.18 HTTP roadshow checks (`/health` 200, unauth 401, wrong role 403, invalid payload 400, authorized purchase & ReadSide query 200), 8/8 S1 chaos TCK passes on the TA adapter, and mutation tests proving that any mutant attempting blind refund on `UNKNOWN` is immediately killed by the locked oracles.

---

## 6. Relationship with v1 and Honest Evidence Boundaries

- **Coexistence without breaking changes**: The original v1 architecture and frozen 160-atom `bank-wealth-demo` truth tree remain intact and tagged as **`v1.0.0-baseline`**. Inside `metarch-truthsrc` `v2.0.0`, every v1 command (`validate`, `roundtrip`, `graph`, `generate-project`, `verify-project`) and all 26 v1 MCP tools continue to work unchanged, and `scala-cqrs-play-service-v2` is itself a strict superset of `scala-cqrs-play-service@1`.
- **Explicit evidence scope**: The `bank-wealth-demo` v2 pilot ([Status F-33](/status/#F-33)) verifies orthogonal EARS compilation, strict Z3 proofs, `scala-cqrs-play-service:2` + TypeScript pilot suites, real `sbt -batch stage` & local Play 2.8.18 HTTP roadshow, 188/188 file-coverage auditing, S1 chaos TCK, and mutation kills. It **does not replace** the separate 2026-11-12 v1 full-service multi-JVM recovery run ([F-24](/status/#F-24)–[F-28](/status/#F-28)). All quantitative claims and reproduction commands remain tracked on the [Status & Ledger page](/status/#F-32).
- **Further reading**:
  - [co-arising 2.0 Long-Term Architecture Blueprint (ADR)](/articles/co-arising-v2-ears-native-architecture-20261126/)
  - [Hands-on Guide (v1 Counter & v2 Quick Entry)](/guide/)
  - [Knowledge-Graph Explorer](/explorer/)

### Source & Reference Links

- [metarch-truthsrc Repository (v2.0.0)](https://github.com/co-arising/metarch-truthsrc)
- [co-arising v2 Quickstart Guide](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/guides/co_arising_v2_quickstart.md)
- [EARS v2 Grammar Reference](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/reference/ears_v2_grammar_reference.md)
- [v2 Diagnostics & Error Codes](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/reference/v2_diagnostics_error_codes.md)
- [v2.0.0 Release Notes](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/releases/v2_0_0_release_notes.md)
- [coarising-distill Skill (PRD Distillation)](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_distill/SKILL.md)
- [coarising-cloze-worker Skill (Isolated Cloze TDD)](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_cloze_worker/SKILL.md)
- [Antigravity Parallel Workflow Pipeline](https://github.com/co-arising/metarch-truthsrc/blob/main/workflows/coarising_cloze_pipeline.py)
- [VS Code EARS TextMate Grammar](https://github.com/co-arising/metarch-truthsrc/tree/main/editor/ears-vscode)
- [bank-wealth-demo Repository (v2-pilot + frozen v1)](https://github.com/co-arising/bank-wealth-demo)
- [Z3 Theorem Prover (SMT Solver)](https://github.com/Z3Prover/z3)
- [Model Context Protocol (MCP) Specification](https://modelcontextprotocol.io/)
