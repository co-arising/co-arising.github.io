# Implications for co-arising: Strategic Validation and an Engineering Route for the AI Coding Paradigm Shift



## The one-sentence conclusion

**The industry's two years of collective trial and error (2024–2026) have precisely validated that co-arising's steadfast direction — deterministic metamodel compilation + slice cloze fill-in + bidirectional code anchoring — is the endgame; and the stumbles of the pioneers (AWS Kiro, GitHub Spec-Kit, MetaGPT, Nuanced) form a priceless product pitfall-avoidance guide.**

---

## Core strategic validation: why the external evolution precisely proves co-arising's moat

### 1.1 The narrative positioning holds: "the architecture seatbelt for AI coding" hits the mainline

Reframing co-arising from a "Scala/DDD backend scaffold" into a "complex-system anti-hallucination and architecture governance engine for the AI era" aligns tightly with the industry's post-"Vibe Coding disillusionment" consensus — even Karpathy himself has iterated Vibe Coding into Agentic Engineering, whose core demand is precisely "agent leverage + deterministic guardrails + zero compromise on software quality". This story sits right on the H2 2026 mainline where the industry is searching for "Post-Vibe-Coding infrastructure".

Third-party hard data the pain-point narrative can quote directly (to avoid looking like "technical purism"):

- Karpathy's pivot from Vibe Coding to Agentic Engineering ([The New Stack](https://thenewstack.io/vibe-coding-is-passe/))
- [GitClear: code churn doubled (3.3% → 7.1%), duplicated blocks up 4x](https://www.gitclear.com/ai_assistant_code_quality_2025_research)
- [Foundra: AI code carries 1.7x the major defects](https://www.foundra.ai/key-reads/vibe-coding-over-karpathy-agentic-engineering-first-time-founders-may-2026)
- [The Thoughtworks Radar's characterization of the "AI-accelerated architectural-drift positive feedback loop"](https://www.thoughtworks.com/radar/techniques/architecture-drift-reduction-with-llms)

### 1.2 Cybernetics' "Ashby's Law" provides the hardest theoretical endorsement

Thoughtworks Distinguished Engineer Birgitta Böckeler points out in [Harness engineering for coding agent users (Apr 2026)](https://martinfowler.com/articles/harness-engineering.html): a regulator can only govern what it has an explicit model of; LLM coding agents can produce almost any code (unbounded variety), and only locking a predefined topology — a variety-reduction move — makes a tight control harness achievable.

**What this means for co-arising**: this is effectively a footnote written for co-arising. General-purpose IDEs (Cursor, Windsurf) fail to contain architectural decay because they face "an unconstrained Turing-complete code space"; co-arising, through its truth-tree metamodel of DDD + CQRS + Event Sourcing + Saga, first locks the architecture topology onto a finite set of deterministic tracks, **cutting the degrees of freedom that produce architectural hallucinations at the information-theoretic source (80% — a working hypothesis, not yet measured)**.

### 1.3 Filling the industry's recognized hardest gap: the Behaviour Harness

Böckeler's harness taxonomy admits plainly: the industry has so far only built the Maintainability Harness (linters / CodeScene catching cyclomatic complexity) and a rudimentary Architecture Fitness Harness (ArchUnit catching package dependencies); for the hardest one — the **Behaviour Harness** (ensuring AI-generated code actually conforms to expected business behaviour) — the whole industry still relies on "natural-language specs + blindly trusting the AI's own tests".

**What this means for co-arising**: co-arising is not another static code checker — it is one of the very few systems that can compile **business invariant guards + state folds + Given-When-Then acceptance contracts** into deterministic code stubs and bidirectional reconciliation tables. By this design, co-arising's goal is: **where others only built harnesses for "code shape", co-arising aims to deliver the Domain Behaviour Harness the industry is missing.**

### 1.4 The "L3→L5 asymmetric neuro-symbolic gap" is a precision competitive-positioning weapon

Borrowing the FAOS paper's (arXiv:2604.00555) L0–L5 coupling maturity model to cut up the competitive landscape:

| Competitor | Maturity level |
|------|----------|
| Graph+MCP tools such as Greptile, Codebase-Memory, Nomik | L2 (input-side AST syntax retrieval) |
| DDD tools such as Qlerify | Soft advisory hints, no compiler-grade locking |
| co-arising | **L4–L5: a compiler-grade engine closing the loop between input trimming and output-side deterministic verification** |

It also lists as primary attack targets the two unsolved problems of the [KIT JDomInO paper (arXiv:2608.05612)](https://arxiv.org/html/2608.05612v1): persistent reverse-engineering anchors (Provenance Identity Markers) and cross-context Sagas.

### 1.5 The "Inverse Parametric Knowledge Effect (Inverse PKE)" gives extreme context compression an academic basis

The FAOS paper's law: the thinner the LLM's pretraining coverage of a private business rule, the greater the accuracy gain from ontology grounding (up to 2x or more, p < .001); conversely, stuffing universally-known concepts into context triggers "contextual interference".

**What this means for co-arising**: this echoes co-arising's already-validated route of "macro expansion + single-line micro-grammar compression + business-slice cloze (Context Pack Cloze)" — feeding tens of thousands of lines of source code or a full graph to the LLM is not only expensive, it triggers contextual interference. **80% of generic architecture boilerplate goes to the deterministic compiler (zero tokens, zero hallucination), while only the 20% of core private business invariants the LLM lacks most reaches the agent through precision slicing.** (The 80/20 ratio is a working hypothesis, not yet measured.)

---

## Five product and architecture lessons: learning from the pioneers' scars

### Lesson 1: heed the "death of Plan Mode" — commit to single-line micro-grammar, never fall into "Markdown/YAML review hell"

- **The cautionary tale**: Böckeler sharply criticized [GitHub Spec-Kit and Kiro](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) for generating masses of verbose, repetitive Markdown ("I'd rather review code directly"); [Ayman Nadeem's "Plan mode is dead" (Sep 2026)](https://www.aymannadeem.com/artificial/intelligence,/developer/tools/2026/09/24/plan-mode-is-dead.html) shows AI-generated verbose specs make readers' "eyes glaze over" and force users to "finish thinking prematurely".
- **Concrete moves**:
  - Stick to **micro-grammar and macro-expansion compression** — the truth source exposed to architects and LLMs must be as compact and high-signal as formulas (Qualified Ref, Guard, Binding, Fold single-line micro-syntax), never a JSON/YAML configuration swamp;
  - Replace "form-filling up-front modeling" with a **Socratic reverse interview**: when a user wants a new business capability, co-arising asks 3–5 precise architecture multiple-choice questions grounded in the existing graph ("Should a failed command trigger a compensating event? Which preconditions must the aggregate root's state validate?"), and on completion directly generates a few lines of micro-grammar truth source.

### Lesson 2: abandon soft prompt constraints entirely; build a physical anti-cheating cage with PreToolUse + Stop Hook (exit 2)

- **The cautionary tale**: [Anthropic's official documentation](https://code.claude.com/docs/en/best-practices) draws the line explicitly — rules written in CLAUDE.md, prompts or Skills are all **non-deterministic** (the model may ignore them at any time); [Chris Richardson's field tests](https://microservices.io/post/architecture/2026/03/09/genai-development-platform-part-1-development-guardrails.html) found Claude Code will even make excuses to refuse fixing smells.
- **Concrete moves**: when shipping the MCP server, co-arising must **distribute a native `.claude/settings.json` hooks suite alongside it**:
  - **A PreToolUse hook locks the generated zone**: when the agent attempts to modify deterministically compiled scaffold skeletons, protocol layers or cross-context modules, the script exits 2 to physically block the file write, forcing all changes to stay inside the `@cloze` business fill-in zone;
  - **A Stop hook injects self-healing positive feedback**: when the agent finishes a business method and tries to end its turn, the bidirectional reconciler and slice tests fire automatically; any domain-invariant violation or graph-contract breach immediately exits 2, and **compiler errors carrying precise domain-repair instructions** are written to stderr, forcing the agent to self-correct before a human ever steps in.

### Lesson 3: cut the "multi-agent roleplay theater"; establish the iron triangle of "compiler + single-point Cloze agent + blind-review subagent"

- **The cautionary tale**: the [r/better_claw 200-task benchmark](https://www.reddit.com/r/better_claw/comments/1uvht82/every_local_multiagent_setup_ranked_by_how_often/) and the [NeurIPS MAST retrospective (r/hermesagent)](https://www.reddit.com/r/hermesagent/comments/1wvfi1b/multiagent_role_design_findings_how_i_use_the/) have falsified the MetaGPT/ChatDev-style "PM agent meeting the architect agent" — persona backstories add zero value, and multi-hop message passing only compounds hallucinations while burning the KV cache.
- **Concrete moves**:
  - The deterministic co-arising compiler **directly replaces the "architect agent" and the "tech-lead agent"**;
  - Through graph traversal, the compiler generates a highly isolated **Context Pack** for each business slice awaiting implementation (containing only type dependencies, caller contracts, preconditions/guards and acceptance scenarios), handing it to a single coding agent that does "single-file cloze fill-in" within a minimal context window;
  - After coding completes, spin up an independent **fresh subagent** that never saw the coding derivation history, feeding it only the Context Pack and the Git diff for a contract blind review, with the system prompt welded to `skip style` (ignore style nitpicks; check only business invariants and missed boundaries) — eliminating over-engineering caused by reviewers' misguided directives.

### Lesson 4: establish a "two-speed workflow"

- **The cautionary tale**: [Böckeler's field tests](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) show that "applying one heavyweight spec process to problems of every size" must fail — requiring a four-step approval to change one line of logic means developers will uninstall the tool.
- **Concrete moves**:
  - **The fast lane (Cloze fast path)**: when domain events, aggregate boundaries and state structures are unchanged and only the logic inside a handler adjusts — rerun the single-node Context Pack cloze directly, with the Stop hook validating in seconds and zero modeling ceremony;
  - **The slow lane (architecture evolution path)**: only when adding commands/events, crossing bounded contexts, or changing Saga orchestration — trigger a truth-tree update, graph impact-radius analysis and scaffold recompilation.

### Lesson 5: replace hand-drawn diagrams with "automatic Mermaid C4 / event-flow projection"

- **The cautionary tale**: [Ayman Nadeem posed 2026's deepest open question](https://www.aymannadeem.com/artificial/intelligence,/developer/tools/2026/09/24/plan-mode-is-dead.html) — "when 5 or even 100 parallel agents are modifying the system at high speed simultaneously, how does a human maintain a mental model of the whole system without reading every line of code or tens of thousands of words of AI verbiage?"
- **Concrete move**: this is exactly where co-arising's **CQRS graph projection + visual domain dashboard** shines. Humans never draw; leveraging bidirectional code anchoring, every agent PR automatically maps the change onto a [C4 model / Mermaid event-flow visual diff on the truth tree](https://arxiv.org/html/2603.15021v1) — letting the architect see at a glance: "this PR merely filled in a green cloze node inside `OrderAggregate`, without touching the red cross-context boundary at all".

---

## The merged ideal closed-loop workflow (four steps)

Weaving the lessons above together, co-arising can deliver a highly persuasive four-step standard execution flow:

```
┌─────────────────────────────────────────────────────────────┐
│ ① Reverse interview & micro-grammar truth evolution        │
│    Replaces verbose Markdown Plan Mode                      │
│    Architect states a change intent -> co-arising asks      │
│    3-5 boundary-clarifying questions grounded in the        │
│    existing Neo4j/SQLite domain graph -> incremental        │
│    truthsrc micro-grammar writes -> the graph renders       │
│    a Mermaid event-flow impact view for approval            │
├─────────────────────────────────────────────────────────────┤
│ ② Deterministic scaffold compile & Context Pack export     │
│    Variety reduction via Inverse PKE and Ashby's Law        │
│    The compiler generates most of the strongly-typed        │
│    CQRS/ES/Saga skeleton and test stubs with zero           │
│    tokens and zero hallucination; exports minimal           │
│    per-slice Context Packs for the remaining core           │
│    business behaviour                                       │
├─────────────────────────────────────────────────────────────┤
│ ③ Single-point cloze fill-in under dual physical hooks     │
│    PreToolUse anti-escape + Stop Hook (exit 2) healing      │
│    A clean-context coding agent fills one file; at turn     │
│    end the Stop Hook runs the compiler, the bidirectional   │
│    provenance reconciler and acceptance tests, blocking     │
│    any violation and injecting domain-level repairs         │
├─────────────────────────────────────────────────────────────┤
│ ④ Independent subagent blind review and graph write-back   │
│    Fresh Subagent + skip style                              │
│    A history-unpolluted subagent blind-reviews against      │
│    only the Context Pack and the Git Diff, then writes      │
│    the code's AST symbol-table anchors back to the          │
│    domain knowledge graph                                   │
└─────────────────────────────────────────────────────────────┘
```

This design sidesteps the ruts of early multi-agent frameworks and heavyweight SDD tooling, pushing the Harness Engineering that Silicon Valley only groped toward in late 2026 up to **compiler grade**.

---

## What goes into the toolchain vs. what becomes a Skill: the golden dividing line

### 4.1 First principles

Combining Anthropic's "Deterministic vs. Non-deterministic" dichotomy with Böckeler's "Computational (CPU-grade) vs. Inferential (GPU-grade semantic reasoning)" framework:

- **Into the toolchain (CLI compiler + MCP server + hooks)**: anything requiring 100% exception-free execution, involving syntax and symbol-table transformations, precise graph traversal, skeleton generation, or physical boundary interception — build it as deterministic compilation and computation, **never consuming LLM tokens, never leaving the agent room to bargain or hallucinate**;
- **Into Skills (`.claude/skills/` + independent subagents)**: anything involving asking humans to clarify ambiguous requirements (knowledge crunching), writing business algorithms within constrained slots, distilling business semantics from legacy rotten code, or semantic-reasonableness review — package it as an on-demand `SKILL.md` that costs a few dozen tokens to describe and loads the full workflow only when triggered.

### 4.2 The full responsibility matrix (by lifecycle stage)

| Lifecycle stage | Core capability module | Layer | Engineering vehicle | Architectural rationale |
|---|---|---|---|---|
| 1. Requirement clarification and incremental modeling | Socratic reverse questioning; identifying missing guards and exception branches | **Skill** | `.claude/skills/domain-interview/SKILL.md` | Early requirements are ambiguous natural language; an LLM must play domain expert, quizzing the human with multiple-choice questions to remove ambiguity |
| 2. Truth-source parsing and macro expansion | Bidirectional parsing of truthsrc single-line micro-syntax, M1/M2/M3 macro expansion, metamodel integrity validation | **Toolchain** | co-arising CLI compiler + deterministic validator | Lexical/syntactic parsing and graph-topology legality checks must be 100% deterministic (filling JDomInO's missing independent validator) |
| 3a. Brownfield reverse cold start (structure) | Static AST scanning, call-chain extraction, database schema export | **Toolchain** | CLI scanner + local SQLite/Neo4j graph builder | Static structure extraction completes in milliseconds with Tree-Sitter/LSP, saving 10x the tokens of an agent running grep |
| 3b. Brownfield reverse cold start (semantics) | Identifying aggregate roots and implicit domain events from static class clusters | **Skill** | `.claude/skills/brownfield-miner/SKILL.md` (`disable-model-invocation: true`) | Static tools cannot distinguish generic classes from DDD semantic roles; an LLM must cluster semantically and hand the result to humans for confirmation |
| 4. Scaffold generation and slice packaging | Generating CQRS/Saga/Actor skeletons, injecting `@ProvenanceId` anchors, exporting slice Context Packs | **Toolchain** | co-arising codegen engine + MCP server toolset | Most structural boilerplate is generated with zero tokens; per-slice trimming avoids long-context degradation and contextual interference |
| 5. Business logic cloze fill-in | Writing business state computations and domain algorithms inside a single `@cloze` slot | **Skill** | `.claude/skills/cloze-fill/SKILL.md` | Local business algorithms need flexible logic synthesis — ideal for an agent filling in step by step from a minimal Context Pack |
| 6. Write protection and bidirectional reconciliation gate | Forbidding tampering with non-cloze generated zones; automatic compile-test and symbol-table reconciliation at turn end | **Toolchain** | PreToolUse and Stop hooks in `.claude/settings.json` (`exit 2`) | Zero-tolerance rules in prompts will always be bypassed; they must be blocked at the physical hook layer |
| 7. Contract blind review and anti-cheating checks | Checking for hardcoded fake data fooling the tests; checking that business intent is fully honored | **Skill / Subagent** | `.claude/agents/contract-reviewer.md` (isolated context + `skip style`) | Static compilation cannot catch semantic cheating like `if (id == 1) return true` |

### 4.3 Four hardcore components that must be welded into the toolchain

**① The truthsrc micro-grammar compiler and graph engine (core CLI)**
- Bidirectional lossless conversion: deterministic compilation between single-line micro-syntax (Qualified Ref, Guard, Binding, Fold, Parameter) and the metamodel AST / graph database (Neo4j or embedded SQLite);
- Metamodel static type and topology checks (a model-level linter): before generating code, deterministically catch "orphan domain events (no publisher/subscriber)", "cross-bounded-context direct entity references", "Sagas missing a compensating channel", and more.

**② The scaffold generator with persistent identity anchors (deterministic codegen)**
- Forward generation of package structure, aggregate-root state-machine shells, Command/Event serialization, CQRS ReadModel projection frameworks, Given-When-Then test scaffolds;
- **The key moat**: write persistent provenance identity anchors into every generated class, method and `@cloze` zone (e.g. `@CoArisingNode(id = "bc.wealth.ta.ConfirmOrder")`), definitively solving JDomInO's pain where name-based matching desynchronizes the moment a refactoring renames anything.

**③ The precisely-trimmed MCP server (4–6 highly cohesive atomic tools)**
- `coarising_get_slice_context(slice_id)`: given a business slice ID (e.g. `TA-01`, `REFUND-02`), a graph traversal directly returns the doubly-compressed Context Pack (parameter/return type definitions, precondition invariant-guard declarations, caller contracts, acceptance test scenarios);
- `coarising_analyze_impact(node_id)`: returns the upstream/downstream impact radius across the whole graph of modifying an aggregate root or event, plus the list of affected cloze nodes;
- `coarising_compile_and_reconcile()`: triggers incremental compilation and bidirectional code–graph symbol reconciliation, returning a structured diff report and Mermaid C4 / event-flow visualizations.

**④ Physical anti-cheating hooks (mandatory guardrails in `.claude/settings.json`)**
- First gate (PreToolUse intercepting out-of-bounds writes): matches `Edit|Write|MultiEdit` calls; when the target file belongs to the locked generated zone, or the modified lines cross an `@cloze:start` / `@cloze:end` boundary, immediately exit 2 and print: `[co-arising Guardrail] Directly modifying architecture skeleton files is forbidden. Write business logic only inside @cloze slots, or edit the truthsrc metamodel and recompile.`
- Second gate (Stop hook enforcing the L4–L5 reconciliation loop): when the agent tries to end its turn, `co-arising verify --slice <current>` runs automatically (incremental compile + reverse AST anchor reconciliation + that slice's Given-When-Then tests); any failure exits 2 with the error injected into stderr, forcing the agent to fix it in place until everything is green.

### 4.4 Four cognitive workflows to package as Skills / Subagents

**① The domain-interview Skill (Socratic reverse interview and micro-grammar modeling)**
- Positioning: replaces heavyweight Plan Mode as the translator from "human business intent" to "truthsrc micro-grammar truth source";
- Instruction essentials: on new features or business changes, first call `coarising_analyze_impact` to see context; never invent a full model unilaterally — ask **no more than 4 structured multiple-choice questions** covering command preconditions (invariant guards), state evolution (folds) and exception compensation; once the user confirms, update the truth tree per the micro-grammar spec and call `coarising_compile_and_reconcile` to generate the skeleton and a Mermaid event-flow diagram for one-glance verification.

**② The cloze-fill Skill (controlled slice cloze workflow)**
- Positioning: guides the coding agent to complete core business fill-ins efficiently within a minimal context window;
- Instruction essentials: step one, call `coarising_get_slice_context` to fetch the Context Pack, **strictly forbidden from blind global grep or reading unrelated bounded-context files**; step two, write domain logic only within the target file's `@cloze` anchor range, covering every Given-When-Then boundary the Context Pack lists; step three, trigger the local slice unit tests, then hand off to the Stop hook for reconciliation.

**③ The brownfield-miner Skill (legacy rotten-code reverse-mining workflow)**
- Positioning: progressive import of legacy Spring Boot / Node.js / Scala projects into co-arising (frontmatter sets `disable-model-invocation: true`, triggered only manually via `/brownfield-miner` by an architect);
- Instruction essentials: first run the toolchain's static AST and database-schema extractors for coarse-grained module clustering; then the LLM reads the core business tables and service classes, distinguishing real business entities, immutable value objects and implicit state-transition events from pure technical DTO noise, drafting the initial truthsrc candidate files.

**④ The contract-reviewer Subagent (a zero-context-pollution contract blind reviewer)**
- Positioning: the `.claude/agents/contract-reviewer.md` independent subagent, solving "the authoring agent rationalizing itself or gaming the tests";
- Instruction essentials: runs in a brand-new clean context, never having seen the main agent's coding conversation; its only inputs are the Context Pack + `git diff`; **`skip style` is mandatory** (completely ignore naming preferences, formatting and unnecessary abstraction-refactoring suggestions) while performing three cold checks:
  1. Are all guard conditions genuinely implemented rather than hardcoded around?
  2. Are there hidden side effects or external calls not declared in the truth source?
  3. Do the acceptance tests genuinely cover the reverse exception branches?

---

## The commercial narrative in one sentence

> **Skills compile humanity's fuzzy intent into the deterministic domain truth source (truthsrc), while the toolchain (compiler + MCP + hooks) locks coding agents onto the tracks the truth source defines, like physical laws, to finish the fill-ins and self-heal — preserving Vibe Coding's conversational silkiness while achieving compiler-grade architectural certainty underneath.**

---

## GTM route and pitfall checklist

### 6.1 Three-stage evolution direction

| Stage | Strategy | Essentials |
|------|------|------|
| Phase 1 | Open-source-first traction (Developer-First & MCP Native) | PLG route; ship the official MCP server immediately; break the language circle (TypeScript/Python/Rust lightweight parsing or a universal architecture-contract DSL); GitHub community operations + hands-on tutorials |
| Phase 2 | Enterprise architecture governance platform (top-down SaaS) | Architecture conformance and drift detection (CI/CD plugins comparing PRs against the domain graph, intercepting violations); a visual domain dashboard (Event Storming & Graph Studio) breaking the curse of "design docs and code never matching" |
| Phase 3 | Ecosystem expansion: self-evolving agents (AI-first agentic loop) | Structured domain model + graph + bidirectional anchoring = "an executable enterprise digital-twin architecture brain"; natural-language business change → AI edits the model automatically → compile → test verification |

### 6.2 Four pitfalls to avoid

1. **Sinking into technical religion (too academic)**: DDD/Akka is relatively niche in Silicon Valley; never require users to understand tactical DDD first — the entry must be **zero-friction** (start from OpenAPI specs, database schemas or Markdown requirement documents, then progressively guide toward structured modeling).
2. **Avoid becoming "yet another diagramming tool"**: the core moat is **compiler-grade consistency (a bidirectional Code-to-Graph & Model-to-Code closed loop)** — grind relentlessly on code anchoring and automated generation accuracy.
3. **Add a brownfield (legacy system) reverse-mining entry point**: the biggest pain for Silicon Valley majors and financial enterprises is not writing new projects from zero — it is their mass of legacy systems they dare not let agents touch. If the Phase 1 MCP server can combine an AST parser to auto-cluster legacy TypeScript/Java/Scala codebases into an initial candidate domain graph, then let human architects "lock" the critical boundaries (freezing aggregates and invariants), PLG cold-start friction drops by an order of magnitude.
4. **The two-speed workflow**: applying one heavyweight process to problems of every size must fail; small changes must carry zero ceremony (see Lesson 4).

---

## Key external references (directly relevant to these implications)

- [Birgitta Böckeler: Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html) (Ashby's Law, the harness taxonomy, Computational vs. Inferential)
- [Birgitta Böckeler: three SDD tools field-tested](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) (Markdown review hell, the false sense of control)
- [Claude Code official best practices (Nov 2026)](https://code.claude.com/docs/en/best-practices) (reverse interview, hooks, blind-review subagents, skip style)
- [Ayman Nadeem: Plan mode is dead](https://www.aymannadeem.com/artificial/intelligence,/developer/tools/2026/09/24/plan-mode-is-dead.html) (planning ≠ a plan)
- [arXiv:2604.00555 — FAOS](https://arxiv.org/html/2604.00555v5) (Inverse PKE, the L0–L5 asymmetric coupling maturity model)
- [arXiv:2608.05612 — JDomInO](https://arxiv.org/html/2608.05612v1) (model drift = toolchain failure; the anchor and Saga problems = co-arising's entry point)
- [arXiv:2603.27277 — Codebase-Memory](https://arxiv.org/html/2603.27277v1) (graph queries save 10x tokens; AST blindness to DDD semantics = School 1's blind spot)
- [Qlerify SDD](https://www.qlerify.com/spec-driven-development) (advisory validation = School 2's blind-spot contrast)
- [Chris Richardson: GenAI development guardrails](https://microservices.io/post/architecture/2026/03/09/genai-development-platform-part-1-development-guardrails.html) (agents making excuses for smells; why hooks are necessary)
- [r/better_claw 200-task benchmark](https://www.reddit.com/r/better_claw/comments/1uvht82/every_local_multiagent_setup_ranked_by_how_often/) | [r/hermesagent role-design retrospective](https://www.reddit.com/r/hermesagent/comments/1wvfi1b/multiagent_role_design_findings_how_i_use_the/) (falsifying the multi-agent theater)
- [arXiv:2603.15021 — C4 for Agentic Systems](https://arxiv.org/html/2603.15021v1) (the basis for automatic Mermaid C4 projection)
