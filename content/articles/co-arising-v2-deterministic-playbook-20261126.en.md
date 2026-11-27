# Stop Gambling on AI-Generated Business Logic: co-arising 2.0 Deterministic Guarantees, Experimental Hands-On Playbook, and the 11-Diagram Offline Atlas

**Published: 2026-11-26** · Toolchain: [`@madpolaris/truthsrc` v2.0.0](https://github.com/co-arising/metarch-truthsrc) · Community: [Join Discord for feedback](https://discord.gg/PwYrRpJu75)

Talking with engineering friends about AI coding lately, almost everyone shares the same frustration:

> **Writing code fast is no longer the bottleneck — probabilistic drift is.**
>
> A PRD leaves an edge case ambiguous, and the AI silently guesses one;
> a screen asks for a field that no upstream event ever captured;
> a public endpoint accidentally leaks phone numbers or IDs, or omits row-level authorization (IDOR);
> tests fail, and the AI quietly weakens an assertion to make them pass;
> a single business threshold changes, and nobody knows which handwritten code slots just went stale.

**[co-arising 2.0 (`metarch-truthsrc`)](https://github.com/co-arising/metarch-truthsrc)** takes the opposite stance: **instead of asking AI to write more code freely, it cages AI's probabilistic uncertainty inside formal proofs, compiler gates, and physical write fences.**

Yesterday we landed a major batch of upgrades — end-to-end field lineage, PII & compliance hard gates, resource-level IDOR and row-level authorization, CQRS read-side materialization bindings, a single-file offline 11-diagram Atlas viewer (`atlas-v2`), a built-in deterministic Domain mutation-testing gate, and a thoroughly upgraded [`coarising-distill` Skill](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_distill/SKILL.md).

Let's be completely upfront: **this project is still in an experimental stage — the underlying compiler, Z3 proofs, graph store, and hard gates are rock-solid, while the front-end AI Skill layer (turning messy, real-world PRDs into clean truth smoothly) is still being actively tuned.** We'd love for you to throw your messiest real PRD at it, see what bugs it catches before a single line of code is written, and tell us where the Skill still rubs the wrong way.

---

## 1. What Deterministic Guarantees Does This Actually Deliver?

Conventional vibe coding hands the entire pipeline — requirement interpretation, architecture, coding, and testing — to probabilistic LLM output. co-arising 2.0 splits the PRD-to-running-service lifecycle into **10 explicit stages**, drawing a sharp line between where AI is allowed to explore and where compilers and mathematics enforce 100% determinism:

| Stage | Core Action / Tool | Executor | Determinism | Guardrail |
| :--- | :--- | :--- | :---: | :--- |
| **0. Init & Fences** | `init-v2` / `init-hooks` | Deterministic CLI | **High** | Orthogonal folder layout + physical write-guard hooks out of the box |
| **1. PRD Distillation** | [`coarising-distill` Skill](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_distill/SKILL.md) | AI Agent | **Low** | Intentionally placed up front to absorb natural-language ambiguity, backstopped by Stage 2 |
| **2. Compile, SMT Proof & Graph** | `compile-v2` / MCP `v2_compile` | Compiler + [Z3 SMT](https://github.com/Z3Prover/z3) | **High** | **100% detection** of rule conflicts, gaps, dead rules, layer leaks, lineage breaks, and compliance violations |
| **3. Business Signoff** | Adjudicate A/B cards + review signoff pack | Business / Human + AI | **Medium** | Humans make the business call; Z3 proves with 100% certainty whether ambiguity is actually eliminated |
| **4. Scaffold & Onion 5-Layer Codegen** | `generate-v2` + `emit-tests-v2` | Deterministic Emitter | **High** | Zero-token Onion 5-layer emission + `@cloze` slots + **SHA-256 locked 3-layer test oracles** |
| **5. Derived Queue & Context Packs** | `tasks-v2` / `context-pack-v2` | Deterministic Engine | **High** | Derived live from truth hashes & SQLite; editing one `.ears` line marks affected slots `STALE` automatically |
| **6. Parallel Isolated BDD+TDD** | [`coarising-cloze-worker`](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_cloze_worker/SKILL.md) + Hook | AI Agent + Hook | **Medium** | AI can only edit inside `@cloze` line bounds; out-of-bounds edits are blocked by `guard-write` |
| **7. Full 3-Layer & Chaos Gate** | `verify-v2 --strict` + `audit-coverage-v2` + `run-tck-v2` | Deterministic Runner | **High** | SHA-256 tamper check + live TS/Scala execution + 0 DIP violations + coverage/mutation gate + chaos TCK |
| **8. Clean-Context Blind Review** | `coarising-cloze-worker` Mode B | Fresh Read-Only AI / Human | **Medium** | Sees only `.ears` + `@cloze` Diff in an isolated context, eliminating self-review bias |
| **9. Local Run & Offline Workbench** | `node handwritten/server.ts` + `view-v2` / `atlas-v2` | Deterministic Runtime / Renderer | **High** | Local runnable HTTP server + single-file offline Atlas & line-level bidirectional code workbench |

Combined with yesterday's seven major upgrades, this gives you five concrete deterministic advantages:

1. **Prove requirement bugs away with the [Z3 SMT solver](https://github.com/Z3Prover/z3) before writing code**: conflicting rules, uncovered boundary gaps (e.g., what happens when `amount == 0`), and shadowed dead rules are caught mathematically and surfaced as plain-language **A/B Clarification Cards** so the AI never guesses on your behalf.
2. **End-to-end field lineage & strict type drift prevention**: full `Command → Event → post: fold → State → ReadModel` verification, including multi-subdomain recursive lineage (`audit-system-lineage-v2`). Unconsumed numeric/monetary event fields fail closed by default unless explicitly exempted with a typed `waiveLineage`; every read-model column must declare a machine-checkable source.
3. **Compliance, privacy, and visibility hard gates**: declare top-level `compliance` obligations and field sensitivity (`pii / secret / tokenized-pii`) so the compiler blocks **public endpoints leaking PII** and forbids **raw PII inside immutable events when erasure is legally required** (GDPR / PIPL), while emitting a signoff report with legal review slots.
4. **Authorization upgraded from coarse RBAC to resource-level IDOR, entitlements & row isolation**: adds resource-policy checks (`403 FORBIDDEN_RESOURCE`), anti-spoofing principal binding (`bindPrincipal`), prerequisite entitlement checks (`requiresEntitlement → 403 ENTITLEMENT_REQUIRED`), and structured ReadModel `rowScope` (`403 FORBIDDEN_ROW_SCOPE`) with 1:1 TypeScript and Scala parity plus auto-generated per-route Authz/IDOR test matrices.
5. **Anti-cheat delivery loop & quality gates**: `guard-write` hooks physically confine AI edits to `@cloze` line ranges so locked tests and scaffolds cannot be tampered with; verification enforces SHA-256 integrity, 0 Onion DIP violations, 100% file coverage, line/branch coverage (including Scala `sbt-scoverage`), Git worktree parallel TDD isolation, 8/8 S1 chaos TCK, and a built-in **deterministic Domain mutation-testing gate (`--mutation-gate`)** to catch weak tests.

---

## 2. Full Transparency: Still Experimental, Especially the Skills

We don't want to oversell this as a magic wand. Here is the honest boundary today (with dated verification records tracked on the [status ledger](https://co-arising.github.io/status/)):

- **Solid deterministic core**: the [`metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) CLI (zero npm runtime dependencies, built on Node stdlib + `node:sqlite`), Z3 strict proofs, lineage/compliance/authz gates, Onion 5-layer dual-stack code & test emission, and offline HTML Atlas/Workbench rendering are deterministic down to the byte. You can also inspect the full banking pilot in [`bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo).
- **Experimental and actively evolving — the Skill layer**: [`coarising-distill`](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_distill/SKILL.md) (PRD → truth) and [`coarising-cloze-worker`](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_cloze_worker/SKILL.md) (isolated `@cloze` TDD).
  - Yesterday we upgraded `coarising-distill` to cover all 13 [EventStorming](https://www.eventstorming.com/) stages, synced the [schema reference](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_distill/references/structures_and_bindings_schema.md) and [error code manual](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/reference/v2_diagnostics_error_codes.md), and added **Hard Rule 8 (Zero DDD Jargon with PMs / Business Users)** so the agent translates every architectural question into plain user and compliance scenarios.
  - Still, real PRDs are wildly unpredictable, and LLMs in long sessions can occasionally cut corners or skip a reference file. **Stress-testing these Skills against real PRDs is exactly where your feedback helps most.**

---

## 3. How to Try It Right Now (Two Modes, From Clone to PRD)

You don't need a full JVM/Scala setup just to experience it. Start with **Light Mode (5–10 minutes, Node ≥ 22.13 + Z3 only)**: take any real PRD, run distillation + Z3 proof, and open the 11-diagram offline Atlas and signoff docs. If you like what you see, continue into Onion 5-layer code generation and live local execution.

### Step 1: Prerequisites & Clone

All you need is **Node.js ≥ 22.13.0** (for built-in `node:sqlite`) and **[Z3](https://github.com/Z3Prover/z3)** (required under `--strict`):

```bash
# macOS (Ubuntu: sudo apt-get install -y z3; Windows: winget install Microsoft.Z3)
brew install z3
node --version   # verify >= v22.13.0

# Clone the toolchain (zero third-party npm runtime dependencies)
export COARISING_WS="$PWD"
git clone https://github.com/co-arising/metarch-truthsrc.git
export TRUTHSRC_CLI="$COARISING_WS/metarch-truthsrc/bin/truthsrc.js"
node "$TRUTHSRC_CLI" --version
```

### Step 2: Scaffold a Sandbox, Wire MCP, and Add Skills

Shown below for **Claude Code** (**Antigravity (AGY)** is natively compatible as well — place `skills/` into your workspace or global skills directory and register the same `truthsrc` MCP server; see the [v2.0 GA Complete Guide](https://co-arising.github.io/articles/co-arising-v2-ga-prd-to-running-guide-20261126/) for details):

```bash
# 1. Scaffold an orthogonal v2 workspace (includes .claude/settings.json anti-cheat hooks)
node "$TRUTHSRC_CLI" init-v2 my-prd-lab --system demo --context core --target typescript --package example.core --format human
cd my-prd-lab

# 2. Register truthsrc MCP (32 tools incl. v2_compile / v2_tasks / v2_context_pack / v2_verify / v2_view)
claude mcp add truthsrc -- node "$TRUTHSRC_CLI" mcp

# 3. Copy the two official Skills (PRD distillation + isolated cloze TDD)
mkdir -p .claude/skills
cp -r "$COARISING_WS/metarch-truthsrc/skills/coarising_distill" .claude/skills/
cp -r "$COARISING_WS/metarch-truthsrc/skills/coarising_cloze_worker" .claude/skills/
```

### Step 3: Drop In Any Real PRD

Put an existing PRD, RFC, meeting notes, or even a half-page draft into `docs/prd.md`, open Claude Code / AGY, and send this prompt:

```text
Use the coarising-distill skill to distill docs/prd.md into an orthogonal co-arising 2.0 truth source under truth/core/:
1. Read the bundled Schema and EARS grammar references first — never guess YAML keys or EARS syntax from memory.
2. Ask me in plain business language (no DDD jargon) about any missing compliance, privacy, partial-failure, deadline, or authorization decisions, and record unresolved items as hotspots.
3. After authoring structures/*.yaml, behaviors/{domain,application}/*.ears, and bindings/*.yaml, run truthsrc MCP v2_compile (or CLI compile-v2 --strict --strict-lineage --out-signoff signoff).
4. Whenever Z3 surfaces an A/B Clarification Card, never guess — translate the options into plain business terms and wait for my decision until compilation passes and signoff/ is exported.
```

---

## 4. What Friction or "Problems" Will You Hit Along the Way?

Expect two distinct kinds of stops — **intentional guardrails catching real PRD holes**, and **experimental rough edges we want to smooth out**:

### A. Intentional "Good Problems" (The Toolchain Catching Holes in Your PRD)

1. **Tough business & compliance follow-ups (8-dimension PRD blind-spot radar)**
   The agent will ask concrete questions PRDs routinely skip: *"If a user deletes their account later, must personal identifiers be erased or anonymized?" "When a batch of 500 has 2 failures and 1 external timeout, can you retry just the failed ones?" "Can an org admin view another org's records?"* Unresolved architecture-shaping answers become blocking `hotspots` until decided.
2. **Z3 A/B Clarification Cards**
   When `amount == 0` falls through every rule, or two rules overlap, Z3 refuses to let the build pass and shows exact counterexamples as A/B business choices. Pick A, B, or a custom rule and the agent rewrites `.ears` and re-verifies.
3. **Lineage, PII, and Authz compiler diagnostics**
   Errors like `V2_LINEAGE_UNCONSUMED_NUMERIC_FIELD`, `V2_COMPLIANCE_RAW_PII_IN_IMMUTABLE_EVENT`, or missing ReadModel field provenance come with exact `file:line:col` pointers (see the [EARS v2 Grammar Reference](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/reference/ears_v2_grammar_reference.md) and [Diagnostics Reference](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/reference/v2_diagnostics_error_codes.md)) so the agent can fix them deterministically.

### B. Experimental Rough Edges (Screenshots & Bug Reports Welcome!)

1. **The Skill occasionally cutting corners**: on very long or informal PRDs, an LLM may skip reading `references/` or rush straight into writing implementation code. A quick nudge — *"read the bundled references first and pass `compile-v2 --strict` before coding"* — usually puts it back on track.
2. **Missing Z3 or older Node**: `--strict` intentionally fails with `V2_SOLVER_MISSING` if `z3` is absent rather than silently skipping proofs; Node `< 22.13.0` prompts an upgrade.
3. **Wanting TypeScript-only without Scala tooling**: pass `--target typescript` to `init-v2` and `generate-v2` so no JDK or `sbt` is required.

---

## 5. What Can You Inspect Once It Passes?

### 1. Right After Compilation Passes (Zero Handwritten Code Needed Yet): Open `signoff/`

- **Single-File Offline Architecture Atlas `signoff/atlas.html` (11 Interactive Diagrams!)**
  Double-click it in any browser (strict offline CSP, Light/Dark themes, 3 density levels, pan/zoom, neighbor spotlight, 1-click SVG / Mermaid / CSV / CML export). You can also generate multi-subdomain Atlases directly with `truthsrc atlas-v2`:
  - **6 Problem-Space Diagrams**:
    1. **Alberto Brandolini Orange-Sticky 2D Event Matrix**: left-to-right timeline cascade layout + stage/role/Event Modeling views & hotspots;
    2. **2D User Story Map**: also exports `signoff/story-map.csv` for direct import into [Miro](https://miro.com/) or [StoriesOnBoard](https://storiesonboard.com/);
    3. **Use-Case Sequence SVG & Durable Pipelines**;
    4. **Domain Model & Aggregate Relations** (`1:1` / `1:N` / `N:M`, Deadlines, ValueObjects, ExactTypes);
    5. **Field-Level Lineage & PII Compliance Ledger** (including multi-hop cross-subdomain PII taint tracking);
    6. **Subdomain Context Map** (with standard [ContextMapper](https://contextmapper.org/) `signoff/domain-map.cml` export).
  - **5 Solution-Space Diagrams**:
    7. **Onion 5-Layer Architecture & L1/L2/L3 Codegen Channels**;
    8. **Authz PEP / PDP / IDOR / Entitlement / Row-Scope Matrix**;
    9. **CQRS Read-Side Physical Materialization Topology** (`stream` / `batch` / `hybrid` shared views & column conflict checks);
    10. **Layered Testing Strategy & Git Worktree Parallel TDD**;
    11. **BoundedContexts Deployment Topology**.
- **Human-Readable Signoff Docs for PMs, Architects & Legal**:
  - `signoff/ac/*.md` (Style E Acceptance Criteria)
  - `signoff/tables/*.md` (DMN Decision Tables)
  - `signoff/lineage.md` (Field lineage + compliance obligations & legal signoff ledger)
  - `signoff/event-matrix.md` & `signoff/use-cases.md`

### 2. After Finishing Code Generation & Isolated `@cloze` Verification

Continue with codegen and locked-oracle TDD:

```bash
# Zero-token Onion 5-layer code + static scaffold + SHA-256 locked 3-layer tests
node "$TRUTHSRC_CLI" generate-v2 --in .truthsrc/canonical-v2.json --out . --target typescript --package example.core --with-scaffold
node "$TRUTHSRC_CLI" emit-tests-v2 --in .truthsrc/canonical-v2.json --out . --target typescript --package example.core
node "$TRUTHSRC_CLI" tasks-v2 --root . --format human
```

Have the agent fill the derived `@cloze` slots via `coarising-cloze-worker` and pass `check-v2 --strict` (optionally with `--mutation-gate`). You'll get:

- **A runnable local HTTP service**: start `node handwritten/server.ts` (or the Scala Play scaffold) with `/health`, `/api/v1/...`, and `HttpAuthority` enforcing 401/403/IDOR boundaries;
- **Single-File Offline Code Workbench `workshop.html`**: run `node "$TRUTHSRC_CLI" view-v2 --root . --out workshop.html` (or MCP `v2_view`) to click any business rule and jump straight to the exact highlighted lines in Onion 5-layer code and locked test specs — **bidirectional truth ↔ code ↔ test traceability**;
- **An un-fudgeable quality ledger**: SHA-256 tamper verification, 0 Onion DIP violations, 100% file coverage, line/branch coverage, Domain mutation-kill results, and 8/8 S1 chaos TCK passes.

---

## 6. Try Breaking It & Share Feedback on Discord

What this project needs most right now isn't applause — it's **real-world PRDs stress-testing every edge**.

Even if you only spend 10 minutes feeding in one gnarly PRD:

- see whether Z3 uncovers a logic hole you hadn't noticed;
- open `signoff/atlas.html` and explore all 11 diagrams;
- and if a Skill stalls, asks an awkward question, or throws a confusing error, drop a screenshot straight into Discord!

- **Discord Community (Feedback / Bug Reports / Discussion)**: [Join the co-arising Discord](https://discord.gg/PwYrRpJu75)
- **GitHub Toolchain Repository**: [co-arising/metarch-truthsrc](https://github.com/co-arising/metarch-truthsrc)
- **Dual-Stack Banking Pilot**: [co-arising/bank-wealth-demo](https://github.com/co-arising/bank-wealth-demo)
- **Project Website & Docs**: [co-arising.github.io](https://co-arising.github.io/)
