# co-arising 2.0 Long-Term Architecture Blueprint: An EARS-Native Compilation Trunk and Locked Cloze TDD Loop

> **Scope and Evolution Notice**: This document is a forward-looking **v2 target architecture blueprint (ADR)** designed from first principles. The current public [`co-arising`](https://co-arising.github.io/) v1 baseline and [`bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo) remain stable and runnable; for v2, we eliminate the historical burden of maintaining dual expression engines plus a lossy lowering bridge, making controlled EARS 1.0 the **single behavioral trunk** from specification and SMT proof through `Canonical Model v2`, deterministic scaffolding, and locked AI `@cloze` TDD in the isolated zone.

<div class="co-kpi-strip" role="region" aria-label="co-arising 2.0 core architecture metrics">
<div><div class="kpi-num">1 AST</div><div class="kpi-label">One native behavioral IR (EARS IR) end-to-end; retires legacy dual expressions and lowering</div></div>
<div><div class="kpi-num">5 + k</div><div class="kpi-label">5-check SMT gate plus k-step BMC; unproved specs never emit a Canonical Model</div></div>
<div><div class="kpi-num">80 / 20</div><div class="kpi-label">L1 rules compile zero-token into scaffolds; L2/L3 &amp; app zones run locked oracle TDD</div></div>
<div><div class="kpi-num red">exit 2</div><div class="kpi-label">PreToolUse + Stop Hooks physically lock scaffolds, oracles, and @cloze bounds</div></div>
</div>

## 1. Why v2 Retires Dual Expression Engines and Any Lowering Bridge

Across [`metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) v1 (`0.5.0`), the project validated that a git-native Event Storming tree can deterministically compile into typed semantic products, Onion Architecture scaffolds, and bidirectional code anchors. Meanwhile, the [co-arising EARS 1.0 Technical Specification](https://co-arising.github.io/articles/co-arising-ears-spec-20261123/) established controlled EARS paired with single-hop `SMT-LIB 2` formal verification.

However, binding EARS against real v1 projects exposed an unmistakable structural mismatch: **v1's legacy slice-guard expression language (`expressions.mjs` v4 + escaped `@guard` strings in `.slice.yaml`) does not live on the same expressive plane as EARS 1.0**:

| Dimension | v1 Legacy Expressions (`domain-decision@4` / `@guard`) | `co-arising 2.0` EARS-Native Trunk |
|---|---|---|
| **Authoring signal-to-noise** | Escaped single-line JSON strings (often 400+ chars), no named predicate reuse, opaque to domain experts | Bilingual isomorphic syntax (Canonical EN + CN Profile), positive `where:` predicate reuse, deterministic Style E AC &amp; Style B DMN table projections |
| **Global &amp; temporal invariants** | Per-command short-circuit guards only; no global `ALWAYS` axioms, `SHALL NOT` prohibitions, or cross-command safety properties | First-class `axioms: ALWAYS`, `SHALL / SHALL NOT` conflict detection, and `k`-step bounded model checking (BMC) |
| **Mathematical expressiveness** | Linear addition/subtraction and comparisons only; no multiplication `*` (`shares * nav <= netAmount`) and no FEEL intervals `[min..max]` | Follows [AWS Cedar](https://www.cedarpolicy.com/) decidability partitioning: `L1 (QF_AUFLIA)` / `L2 (QF_NIA + BMC)` / `L3 (extern)` |
| **Isolated zone (`handwritten/`) coverage** | **Blind spot**: trusted admission, replay dedup, cross-aggregate orchestration, and read-model isolation live only in prose | Native `layer: application` contracts (`pin`, `dispatch`, `respond`, `expose`) compiled into locked executable BDD oracles for AI TDD |

Inserting an **`EARS → legacy @guard` lowering compiler** merely to preserve v1 generators would lock the codebase into permanent double maintenance: **two expression ASTs, two type checkers, and a leaky translation seam** that breaks whenever EARS adds nonlinear math, intervals, prohibitions, or application-layer contracts.

Because the existing public showcase remains runnable as-is, **the cleanest long-term decision is to keep v1 stable and build v2 natively around EARS from start to finish**.

<figure class="co-arch-fig">
<div class="arch-caption-head">FIGURE 01 · v1 TRANSITIONAL BRIDGE VS v2 EARS-NATIVE SINGLE TRUNK</div>
<svg viewBox="0 0 820 278" width="100%" role="img" aria-label="Comparison between v1 dual-expression lowering architecture and v2 EARS-Native single-trunk architecture">
  <defs>
    <marker id="v1v2-arr-ink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-ink"/>
    </marker>
    <marker id="v1v2-arr-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-teal"/>
    </marker>
    <marker id="v1v2-arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-amber"/>
    </marker>
  </defs>
  <rect x="12" y="10" width="796" height="114" rx="4" class="arch-band-amber"/>
  <text x="26" y="31" class="arch-t-amber">v1 TRANSITIONAL SHAPE (Cost of backward lowering: dual ASTs + lossy bridge + unverified handwritten zone)</text>
  <rect x="26" y="44" width="150" height="64" rx="4" class="arch-card-amber"/>
  <text x="101" y="68" text-anchor="middle" class="arch-t-title">.slice.yaml @guard</text>
  <text x="101" y="88" text-anchor="middle" class="arch-t-sub">Legacy AST #1</text>
  <rect x="206" y="44" width="144" height="64" rx="4" class="arch-card-amber arch-dash"/>
  <text x="278" y="68" text-anchor="middle" class="arch-t-title">Lossy Lowering</text>
  <text x="278" y="88" text-anchor="middle" class="arch-t-sub">EARS → guards v4</text>
  <rect x="380" y="44" width="156" height="64" rx="4" class="arch-card-amber"/>
  <text x="458" y="68" text-anchor="middle" class="arch-t-title">Canonical v1</text>
  <text x="458" y="88" text-anchor="middle" class="arch-t-sub">Aggregate L1 only</text>
  <rect x="566" y="44" width="226" height="64" rx="4" class="arch-card-red arch-dash"/>
  <text x="679" y="68" text-anchor="middle" class="arch-t-red">handwritten/ left outside compiler</text>
  <text x="679" y="88" text-anchor="middle" class="arch-t-sub">Prose specs · no SMT · drift risk</text>
  <line x1="176" y1="76" x2="203" y2="76" class="arch-edge-amber" marker-end="url(#v1v2-arr-amber)"/>
  <line x1="350" y1="76" x2="377" y2="76" class="arch-edge-amber" marker-end="url(#v1v2-arr-amber)"/>
  <line x1="536" y1="76" x2="563" y2="76" class="arch-edge-amber" marker-end="url(#v1v2-arr-amber)"/>
  <rect x="12" y="142" width="796" height="124" rx="4" class="arch-band-teal"/>
  <text x="26" y="164" class="arch-t-band-teal">v2 EARS-NATIVE SINGLE TRUNK (Zero lowering loss · pre-codegen SMT gate · unified domain &amp; isolated-zone loop)</text>
  <rect x="26" y="178" width="154" height="72" rx="4" class="arch-card-teal"/>
  <text x="103" y="203" text-anchor="middle" class="arch-t-title">Orthogonal Truth</text>
  <text x="103" y="222" text-anchor="middle" class="arch-t-sub">YAML Struct + EARS</text>
  <text x="103" y="238" text-anchor="middle" class="arch-t-mono">Single behavioral AST</text>
  <rect x="206" y="178" width="158" height="72" rx="4" class="arch-card-teal"/>
  <text x="285" y="203" text-anchor="middle" class="arch-t-title">SMT Hard Gate</text>
  <text x="285" y="222" text-anchor="middle" class="arch-t-sub">Z3 / cvc5 5-check + BMC</text>
  <text x="285" y="238" text-anchor="middle" class="arch-t-teal">Blocks unproved specs</text>
  <rect x="390" y="178" width="176" height="72" rx="4" class="arch-card-dark"/>
  <text x="478" y="203" text-anchor="middle" class="arch-t-title-dark">Canonical Model v2</text>
  <text x="478" y="222" text-anchor="middle" class="arch-t-sub-dark">Native EARS IR + TestIR</text>
  <text x="478" y="238" text-anchor="middle" class="arch-t-sub-dark">+ SQLite Dep Graph</text>
  <rect x="592" y="178" width="200" height="72" rx="4" class="arch-card-teal"/>
  <text x="692" y="201" text-anchor="middle" class="arch-t-title">Dual-Channel Delivery</text>
  <text x="692" y="220" text-anchor="middle" class="arch-t-teal">4A: L1 Zero-Token Scaffold</text>
  <text x="692" y="238" text-anchor="middle" class="arch-t-red">4B: Locked Oracle Cloze TDD</text>
  <line x1="180" y1="214" x2="203" y2="214" class="arch-edge-teal" marker-end="url(#v1v2-arr-teal)"/>
  <line x1="364" y1="214" x2="387" y2="214" class="arch-edge-teal" marker-end="url(#v1v2-arr-teal)"/>
  <line x1="566" y1="214" x2="589" y2="214" class="arch-edge-teal" marker-end="url(#v1v2-arr-teal)"/>
</svg>
<figcaption>Figure 1: By retiring legacy @guard lowering, v2 carries a single proved EARS IR straight into Canonical Model v2, deterministic code generation, and locked AI Cloze TDD.</figcaption>
</figure>

## 2. End-to-End `co-arising 2.0` Architecture Flowchart

The full four-layer architecture below maps every asset, verification gate, and physical anti-cheat feedback loop from git-native truth to verified runtime code:

<figure class="co-arch-fig">
<div class="arch-caption-head">FIGURE 02 · CO-ARISING 2.0 END-TO-END ARCHITECTURE &amp; CONTROL FLOW</div>
<svg viewBox="0 0 820 970" width="100%" role="img" aria-label="co-arising 2.0 four-layer end-to-end architecture flowchart covering orthogonal truth, SMT gate, Canonical Model v2, zero-token codegen, and locked AI Cloze TDD">
  <defs>
    <marker id="arr-ink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-ink"/>
    </marker>
    <marker id="arr-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-teal"/>
    </marker>
    <marker id="arr-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-red"/>
    </marker>
    <marker id="arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-amber"/>
    </marker>
  </defs>
  <rect x="14" y="12" width="792" height="148" rx="4" class="arch-band"/>
  <text x="28" y="34" class="arch-t-band">LAYER 1 · GIT SINGLE AUTHORING TRUTH (Orthogonal: Structure in YAML, Behavior in EARS)</text>
  <rect x="28" y="48" width="234" height="96" rx="4" class="arch-card"/>
  <text x="145" y="72" text-anchor="middle" class="arch-t-title">Structure Truth (truth/*.yaml)</text>
  <text x="145" y="92" text-anchor="middle" class="arch-t-sub">VOs &amp; exact decimals (Money, scale)</text>
  <text x="145" y="110" text-anchor="middle" class="arch-t-sub">State defaults · Cmd/Event schemas</text>
  <text x="145" y="128" text-anchor="middle" class="arch-t-mono">Saga topology · ReadModel · No @guard</text>
  <rect x="284" y="48" width="320" height="96" rx="4" class="arch-card-teal"/>
  <text x="444" y="72" text-anchor="middle" class="arch-t-title">Behavior Truth (truth/**/*.ears · EN/CN)</text>
  <text x="444" y="92" text-anchor="middle" class="arch-t-sub">• layer: domain — axioms · rules · post folds</text>
  <text x="444" y="110" text-anchor="middle" class="arch-t-sub">• layer: application — admission · flows · views</text>
  <text x="444" y="128" text-anchor="middle" class="arch-t-teal">Single behavioral surface · Style A &amp; Style C</text>
  <rect x="630" y="58" width="162" height="76" rx="4" class="arch-card-amber arch-dash"/>
  <text x="711" y="81" text-anchor="middle" class="arch-t-amber">Drafting Aid (Unchecked-in)</text>
  <text x="711" y="100" text-anchor="middle" class="arch-t-sub">Plain notes / Event Storming</text>
  <text x="711" y="118" text-anchor="middle" class="arch-t-mono">LLM drafting · Human merge</text>
  <line x1="630" y1="96" x2="608" y2="96" class="arch-edge-amber" marker-end="url(#arr-amber)"/>
  <path d="M 145 144 L 145 182 L 315 182 L 315 204" class="arch-edge" marker-end="url(#arr-ink)"/>
  <line x1="444" y1="144" x2="444" y2="204" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <rect x="14" y="190" width="792" height="222" rx="4" class="arch-band"/>
  <text x="28" y="212" class="arch-t-band">LAYER 2 · SINGLE FRONTEND, READ-ONLY PROJECTIONS &amp; SMT PROOF GATE</text>
  <rect x="206" y="224" width="356" height="58" rx="4" class="arch-card-teal"/>
  <text x="384" y="246" text-anchor="middle" class="arch-t-title">Single EARS Parser + Unified Type &amp; Symbol Checker</text>
  <text x="384" y="266" text-anchor="middle" class="arch-t-sub">Positive naming lint · L1/L2/L3 auto-routing · retires expressions.mjs</text>
  <rect x="596" y="224" width="196" height="74" rx="4" class="arch-card arch-dash"/>
  <text x="694" y="245" text-anchor="middle" class="arch-t-title">Read-Only Projections</text>
  <text x="694" y="264" text-anchor="middle" class="arch-t-sub">• Style E: Plain-text AC (.md)</text>
  <text x="694" y="282" text-anchor="middle" class="arch-t-sub">• Style B: DMN Table (.md)</text>
  <line x1="562" y1="253" x2="592" y2="253" class="arch-edge" marker-end="url(#arr-ink)"/>
  <rect x="206" y="302" width="356" height="58" rx="4" class="arch-card"/>
  <text x="384" y="324" text-anchor="middle" class="arch-t-title">Single-Hop SMT-LIB 2 Compiler → Z3 / cvc5</text>
  <text x="384" y="344" text-anchor="middle" class="arch-t-sub">1.Conflicts · 2.Gaps · 3.Invariants · 4.Dead rules · 5.Witnesses + k-step BMC</text>
  <line x1="384" y1="282" x2="384" y2="298" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <rect x="292" y="374" width="184" height="28" rx="14" class="arch-band-teal"/>
  <text x="384" y="392" text-anchor="middle" class="arch-t-teal">All SMT Proofs Green?</text>
  <line x1="384" y1="360" x2="384" y2="371" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <rect x="28" y="302" width="152" height="96" rx="4" class="arch-card-red"/>
  <text x="104" y="325" text-anchor="middle" class="arch-t-red">Fail → Hard Block</text>
  <text x="104" y="345" text-anchor="middle" class="arch-t-title">A/B Clarification Card</text>
  <text x="104" y="364" text-anchor="middle" class="arch-t-sub">Z3 model + :named IDs</text>
  <text x="104" y="382" text-anchor="middle" class="arch-t-mono">No codegen emitted</text>
  <path d="M 292 388 L 184 388" class="arch-edge-red" marker-end="url(#arr-red)"/>
  <path d="M 104 302 L 104 170 L 345 170 L 345 148" class="arch-edge-red" marker-end="url(#arr-red)"/>
  <text x="238" y="382" text-anchor="middle" class="arch-t-red">No (SAT defect)</text>
  <line x1="384" y1="402" x2="384" y2="438" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <text x="466" y="424" text-anchor="middle" class="arch-t-teal">Yes (Proved + Witnesses)</text>
  <rect x="14" y="442" width="792" height="106" rx="4" class="arch-card-dark"/>
  <text x="30" y="466" class="arch-t-title-dark">LAYER 3 · CANONICAL MODEL v2 (EARS-NATIVE SINGLE IR · ZERO LOWERING LOSS)</text>
  <rect x="30" y="480" width="176" height="52" rx="4" class="arch-pill-dark"/>
  <text x="118" y="502" text-anchor="middle" class="arch-t-title-dark">Structure Meta</text>
  <text x="118" y="520" text-anchor="middle" class="arch-t-sub-dark">Types · State · Saga</text>
  <rect x="218" y="480" width="206" height="52" rx="4" class="arch-pill-dark"/>
  <text x="321" y="502" text-anchor="middle" class="arch-t-title-dark">Native EARS IR v2</text>
  <text x="321" y="520" text-anchor="middle" class="arch-t-sub-dark">First-Hit · emit/post folds</text>
  <rect x="436" y="480" width="172" height="52" rx="4" class="arch-pill-dark"/>
  <text x="522" y="502" text-anchor="middle" class="arch-t-title-dark">Proved TestIR</text>
  <text x="522" y="520" text-anchor="middle" class="arch-t-sub-dark">Z3 witnesses + BMC</text>
  <rect x="620" y="480" width="172" height="52" rx="4" class="arch-pill-dark"/>
  <text x="706" y="502" text-anchor="middle" class="arch-t-title-dark">Dependency Graph</text>
  <text x="706" y="520" text-anchor="middle" class="arch-t-sub-dark">knowledge.sqlite cache</text>
  <path d="M 220 548 L 220 572 L 195 572 L 195 596" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <text x="114" y="578" text-anchor="middle" class="arch-t-teal">domain L1 + structure</text>
  <path d="M 560 548 L 560 572 L 585 572 L 585 596" class="arch-edge-red" marker-end="url(#arr-red)"/>
  <text x="692" y="578" text-anchor="middle" class="arch-t-red">L2/L3 + app isolated zone</text>
  <rect x="14" y="600" width="356" height="354" rx="4" class="arch-band-teal"/>
  <text x="28" y="622" class="arch-t-band-teal">CHANNEL 4A · ZERO-TOKEN CODEGEN (~80%)</text>
  <rect x="30" y="636" width="324" height="78" rx="4" class="arch-card-teal"/>
  <text x="192" y="660" text-anchor="middle" class="arch-t-title">Multi-Language Deterministic Generators</text>
  <text x="192" y="680" text-anchor="middle" class="arch-t-sub">Scala · TypeScript · Java · Rust · Go</text>
  <text x="192" y="698" text-anchor="middle" class="arch-t-mono">Consume EARS IR directly · zero LLM</text>
  <line x1="192" y1="714" x2="192" y2="736" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <rect x="30" y="740" width="324" height="114" rx="4" class="arch-card"/>
  <text x="192" y="764" text-anchor="middle" class="arch-t-title">generated-scaffold/ (Read-Only Locked)</text>
  <text x="192" y="785" text-anchor="middle" class="arch-t-sub">• Aggregate Behavior + EventHandler</text>
  <text x="192" y="804" text-anchor="middle" class="arch-t-sub">• Protobuf / Codec / Saga Host / Pure Oracle</text>
  <text x="192" y="823" text-anchor="middle" class="arch-t-sub">• Port Traits + empty @cloze slot stubs</text>
  <text x="192" y="842" text-anchor="middle" class="arch-t-mono">Stamped with @generated &amp; @ProvenanceId</text>
  <line x1="192" y1="854" x2="192" y2="876" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <rect x="30" y="880" width="324" height="58" rx="4" class="arch-card-teal"/>
  <text x="192" y="904" text-anchor="middle" class="arch-t-title">Drift-Free L1 Core &amp; Architecture</text>
  <text x="192" y="924" text-anchor="middle" class="arch-t-teal">Rebuildable on every spec edit · never hand-edited</text>
  <path d="M 354 796 L 398 796 L 398 675 L 414 675" class="arch-edge-amber" marker-end="url(#arr-amber)"/>
  <rect x="394" y="600" width="412" height="354" rx="4" class="arch-band-red"/>
  <text x="408" y="622" class="arch-t-band-red">CHANNEL 4B · ISOLATED AI @CLOZE TDD (~20%)</text>
  <rect x="410" y="636" width="186" height="72" rx="4" class="arch-card-red"/>
  <text x="503" y="657" text-anchor="middle" class="arch-t-title">Locked Executable Oracles</text>
  <text x="503" y="675" text-anchor="middle" class="arch-t-sub">.feature + *EarsSpec</text>
  <text x="503" y="694" text-anchor="middle" class="arch-t-mono">generated-tests/ SHA-256</text>
  <rect x="608" y="636" width="182" height="72" rx="4" class="arch-card"/>
  <text x="699" y="657" text-anchor="middle" class="arch-t-title">Sandwich Context Pack</text>
  <text x="699" y="675" text-anchor="middle" class="arch-t-sub">Type sigs + @caller rules</text>
  <text x="699" y="694" text-anchor="middle" class="arch-t-mono">Graph-sliced · zero-grep</text>
  <line x1="503" y1="708" x2="548" y2="736" class="arch-edge" marker-end="url(#arr-ink)"/>
  <line x1="699" y1="708" x2="650" y2="736" class="arch-edge" marker-end="url(#arr-ink)"/>
  <rect x="410" y="740" width="242" height="58" rx="4" class="arch-card-teal"/>
  <text x="531" y="762" text-anchor="middle" class="arch-t-title">AI Agent Single-Slot Cloze TDD</text>
  <text x="531" y="782" text-anchor="middle" class="arch-t-sub">Edits confined to @cloze:start..end</text>
  <rect x="664" y="740" width="126" height="58" rx="4" class="arch-card-red"/>
  <text x="727" y="761" text-anchor="middle" class="arch-t-red">PreToolUse Hook</text>
  <text x="727" y="780" text-anchor="middle" class="arch-t-mono">Out-of-bounds exit 2</text>
  <line x1="664" y1="769" x2="656" y2="769" class="arch-edge-red" marker-end="url(#arr-red)"/>
  <line x1="531" y1="798" x2="531" y2="816" class="arch-edge" marker-end="url(#arr-ink)"/>
  <rect x="410" y="820" width="380" height="52" rx="4" class="arch-card-red"/>
  <text x="600" y="841" text-anchor="middle" class="arch-t-title">Stop Hook Triple Gate (exit 2 forces self-heal)</text>
  <text x="600" y="860" text-anchor="middle" class="arch-t-sub">1. Test SHA-256 integrity · 2. Run *EarsSpec · 3. AST anchor audit</text>
  <path d="M 410 846 L 402 846 L 402 769 L 408 769" class="arch-edge-red" marker-end="url(#arr-red)"/>
  <line x1="600" y1="872" x2="600" y2="888" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <rect x="410" y="892" width="380" height="48" rx="4" class="arch-card-teal"/>
  <text x="600" y="912" text-anchor="middle" class="arch-t-title">Fresh Blind Subagent (contract-reviewer · skip style)</text>
  <text x="600" y="930" text-anchor="middle" class="arch-t-teal">Blocks witness hardcoding → persists Provenance &amp; graph anchors</text>
</svg>
<figcaption>Figure 2: End-to-end co-arising 2.0 control flow. Solid teal edges carry mathematically verified deterministic data; dashed red edges enforce physical blocking and self-healing feedback (A/B clarification cards, PreToolUse write guard, Stop Hook triple gate).</figcaption>
</figure>

## 3. Orthogonal Single Truth Source: Structure in YAML, Behavior in EARS

The first invariant of v2 is **orthogonal separation**: YAML carries zero escaped business predicates, and EARS carries zero serialization or storage boilerplate:

| Concern | Sole Authoring Surface | Owns | Explicitly Excluded |
|---|---|---|---|
| **Structure truth** | `truth/<sys>/contexts/<ctx>/*.yaml` | ValueObject schemas, exact numeric `scale`/`precision`/`units`, Protobuf wire/storage codecs, aggregate `stateFields` defaults, command/event signatures, Saga &amp; Pipeline topology, read-model schemas | `@guard` boolean strings, inline business logic |
| **Behavior truth** | `truth/<sys>/contexts/<ctx>/specs/**/*.ears` | `where:` positive predicates, `extern` black-box boundaries, `axioms:` global invariants, `rules:` domain reject/idempotency/transition rules, `post:` folds, `layer: application` admission &amp; view contracts | Storage types, wire codecs, framework annotations, implementation code |
| **Review projections** | `projections/ac/**`, `projections/tables/**` | Zero-LLM deterministic Style E plain-language AC and Style B DMN decision tables | **Never hand-edited** (rebuilt from truth on demand) |

### Orthogonal Pairing Example: Dual-Cap Quota Slice with Zero Duplication

Structure declares what fields and exact decimal scales exist; EARS declares the laws governing them:

```yaml
# truth/bank-wealth/contexts/bankwealth/aggregates/fund-quota/aggregate.yaml (pure structure, zero @guard)
kind: aggregate
name: FundQuota
stateFields:
  - minPurchase: AmountDecimal = "0.00"
  - maxSingleLimit: AmountDecimal = "0.00"
  - fundTotalUsed: AmountDecimal = "0.00"
  - fundTotalCap: AmountDecimal = "0.00"
  - perAccountCap: AmountDecimal = "0.00"
  - accountUsed: Map[AccountId, AmountDecimal] = []
commands:
  - name: ReserveSubscriptionQuota
    parameters: [accountId: AccountId, amount: AmountDecimal]
    produces: [SubscriptionQuotaReserved]
```

```text
# truth/bank-wealth/contexts/bankwealth/specs/fund-quota-reserve.ears (sole behavioral truth)
slice FundQuota.ReserveSubscriptionQuota

where:
  validAmount   = amount in [quota.minPurchase..quota.maxSingleLimit]          as "Single amount within valid range"
  withinFundCap = quota.fundTotalUsed + amount <= quota.fundTotalCap           as "Within total fund subscription cap"
  withinAcctCap = quota.accountUsed[accountId] + amount <= quota.perAccountCap as "Within per-account cap"

axioms:
  [AX-Q-1] ALWAYS quota.fundTotalUsed <= quota.fundTotalCap
  [AX-Q-2] ALWAYS quota.accountUsed[accountId] <= quota.perAccountCap

rules:
  [QUOTA_AMOUNT_RANGE] IF not validAmount   THEN SHALL reject request with QUOTA_AMOUNT_RANGE
  [QUOTA_FUND_CAP]     IF not withinFundCap THEN SHALL reject request with QUOTA_FUND_CAP
  [QUOTA_ACCOUNT_CAP]  IF not withinAcctCap THEN SHALL reject request with QUOTA_ACCOUNT_CAP

  [QUOTA_RESERVED]     WHILE validAmount and withinFundCap and withinAcctCap
                       WHEN ReserveSubscriptionQuota
                       SHALL emit SubscriptionQuotaReserved
                       post:
                         quota.fundTotalUsed'          = quota.fundTotalUsed + amount
                         quota.accountUsed'[accountId] = quota.accountUsed[accountId] + amount
```

A single symbol-table binder validates every path, exact decimal scale, command parameter, event name, and rule anchor before SMT compilation starts — catching drift such as referencing `occurrenceId` instead of `occurrence.occurrenceId` immediately at compile time.

## 4. The Mathematical Proof Gate: No `Canonical Model v2` Without Proof

In v1, verification ran downstream after code was generated. In v2, [SMT-LIB 2](https://smt-lib.org/) proof checking via [Z3](https://z3prover.github.io/) / [cvc5](https://cvc5.github.io/) becomes a **hard pre-compilation gate** in front of `Canonical Model v2`.

1. **Automatic Decidability Routing**:
   - **L1 Decidable Core (`QF_AUFLIA`)**: fixed-point linear arithmetic, enum state machines, monotonic cursors, `Map[K, V]` encoded as presence bitmap `(Array K Bool)` + value array `(Array K V)`, and FEEL intervals `[start..end)`. Millisecond complete solving.
   - **L2 Bounded Extension (`QF_NIA` isolated + `k`-step BMC)**: local nonlinear multiplication (`shares * nav <= netAmount`) runs isolated under `QF_NIA` with a 2-second timeout; multi-command stateful slices unroll `k`-step BMC to prove cross-step safety (such as a `skipped` due slot never being resurrected into `backlog`).
   - **L3 Black-Box External Layer (`extern` / `@host`)**: session auth, CSRF verification, external TA receipt parsing, and deterministic host IDs map to uninterpreted Boolean predicates or symbolic constants — preserving 100% Boolean completeness checks without leaking infrastructure into SMT.
2. **Automatic Fixed-Point Scale Alignment**:
   - Each numeric variable tracks its decimal scale (`Money` `scale = 2`, NAV `scale = 4`, integer shares `scale = 0`). Comparisons like `shares * nav <= order.netAmount` automatically align scales (`(* shares nav) <= (* netAmount 100)`), eliminating floating-point drift.
3. **Five `(push 1) ... (pop 1)` Checks &amp; A/B Clarification Cards**:
   - **Mutual-exclusion conflicts**: `SAT(Axioms ∧ G_emit ∧ G_reject)` and `SHALL` vs `SHALL NOT` must be `unsat`.
   - **Logic gaps**: `SAT(Axioms ∧ ¬(G_1 ∨ ... ∨ G_n))` must be `unsat`; on `sat`, the decoded counterexample renders an **A/B Clarification Card** for human decision.
   - **Invariant induction**: `SAT(Inv(s) ∧ G_i ∧ Post(s, s') ∧ Frame(s, s') ∧ ¬Inv(s'))` must be `unsat`.
   - **Dead-rule detection**: `UNSAT(Axioms ∧ G_i)` reports blocking axioms via `get-unsat-core`.
   - **Boundary witness synthesis**: `(get-model)` extracts concrete decoded decimals and enum samples directly into `TestIR`.

## 5. Native `Canonical Model v2`: Freezing Three Core Semantic Contracts

To let multi-language generators consume `Canonical Model v2` directly with zero legacy `@guard` lowering, v2 freezes three contracts inside `co-arising.canonical/v2`:

### Contract 1: Single Native Behavioral IR (`co-arising.ears-ir/v2`)
Every proved slice or story embeds its normalized EARS IR, theory tier, solver proof receipt, and synthesized `TestIR` witnesses directly inside `Canonical Model v2`:

```json
{
  "schemaVersion": "co-arising.canonical/v2",
  "context": "bankwealth",
  "structures": { "valueObjects": [], "exactTypes": [], "aggregates": [], "sagas": [], "readModels": [] },
  "behaviors": [
    {
      "kind": "slice",
      "layer": "domain",
      "target": "FundQuota.ReserveSubscriptionQuota",
      "hitPolicy": "FIRST",
      "theory": { "tier": "L1", "logic": "QF_AUFLIA", "codegenChannel": "deterministic" },
      "verification": { "solver": "z3", "passed": true, "bmcSteps": 0, "canonicalSha256": "..." },
      "axioms": [],
      "rules": [],
      "testIr": { "schemaVersion": "co-arising.test-ir/v2", "scenarios": [] }
    }
  ]
}
```

### Contract 2: Unifying Declarative SMT with Imperative Codegen via DMN First-Hit
In SMT, overlapping `IF ... reject` guards are not conflicts because both reject the request. Yet imperative codegen (Scala `Either`, Rust `Result`, Go `error`) must choose a deterministic error code when multiple rejections hold simultaneously.

`Canonical Model v2` adopts [OMG DMN](https://www.omg.org/spec/DMN/) **First-Hit** semantics: top-to-bottom declaration order in `rules:` is the authoritative rejection priority for code generation. Declarative proofs, Style B decision tables, and imperative codegen stay 100% isomorphic.

### Contract 3: Pure Event Sourcing Closure (`emit` Auto-Propagation + `post:` Fold Consistency)
Event Sourcing forbids mutating aggregate state directly inside `handleCommand`; state evolves solely in `applyEvent(event)`. `Canonical Model v2` closes this loop cleanly:

- **Auto-propagated payloads (`@PROPAGATED`)**: matching command parameter and event payload names/types bind automatically; only derived values and `@host(...)` computations require explicit mapping.
- **`post:` as event-fold contract**: when a rule emits `E` with `post: state.x' = ...`, the compiler binds those updates as the deterministic fold of `E` (and enforces fold equivalence if multiple commands emit `E`), enabling lossless generation of `handleCommand`, `applyEvent`, and the `Pure Replay Oracle`.

## 6. Dual-Channel Delivery: Zero-Token Scaffolds (4A) vs Locked AI Cloze TDD (4B)

Following Ashby's Law of Requisite Variety ([Harness Engineering](https://martinfowler.com/articles/harness-engineering.html)), a regulator can govern only what it explicitly models. `co-arising 2.0` partitions work strictly along decidability boundaries:

### Channel 4A: Deterministic Zero-Token Codegen (L1 + All Structural Scaffolds)
- Consumes all structural metadata plus `tier == L1 && layer == domain` EARS IR directly from `Canonical Model v2`.
- Independent multi-language generator plugins (`Scala`, `TypeScript`, `Java`, `Rust`, `Go`) emit ValueObjects, exact codecs, Aggregate Behaviors, EventHandlers, Protobuf/JSON schemas, Saga hosts, Port traits, and empty `// @cloze:start(<id>) .. // @cloze:end(<id>)` stubs — zero LLM tokens, zero hallucination.
- Every generated file is stamped with `@generated` and bidirectional `@ProvenanceId` anchors inside read-only `generated-scaffold/`.

### Channel 4B: Isolated-Zone AI `@cloze` TDD Loop (L2/L3 + `layer: application`)
Complex handwritten orchestration that lived outside v1's compiler (trusted admission, idempotent replay dedup, nonlinear share math, external TA bridges, read-model watermark recovery) now enters the same EARS contract loop:

1. **Locked Executable BDD Oracles (`EarsTestEmitter`)**:
   - Emits locked [Gherkin](https://cucumber.io/docs/gherkin/reference/) `.feature` specs and executable target-language suites ([ScalaTest](https://www.scalatest.org/) + [Akka Persistence TestKit](https://doc.akka.io/libraries/akka-persistence-testkit/current/index.html), Vitest, JUnit 5, or `cargo test`).
   - Tags every test with `@CoArisingSpec(id="<RULE_ID>", witness="<witness-id>")` and seals all generated test files under `generated-tests/manifest.sha256.json`.
2. **Graph-Sliced Sandwich Context Pack**:
   - Exported from `knowledge.sqlite` with three layers — transitive type/port signatures, caller transaction &amp; retry `@caller` contracts, and linked `@CoArisingSpec` failure scenarios — eliminating blind repository grepping.
3. **Physical Anti-Cheat Hooks &amp; Blind Contract Review ([Claude Code Best Practices](https://code.claude.com/docs/en/best-practices))**:
   - **`PreToolUse` Hook (`exit 2`)**: blocks writes to `projections/`, `generated-scaffold/`, `generated-tests/`, or any line outside `@cloze:start..end` (including marker tampering).
   - **`Stop` Hook (`exit 2`)**: enforces a triple gate before the agent may stop — (a) SHA-256 verification against `manifest.sha256.json` to block shell/sed test tampering; (b) real execution of `*EarsSpec`; (c) bidirectional AST provenance verification. Any failure injects the failing `@CoArisingSpec` IDs to `stderr` and forces in-place self-healing.
   - **Fresh Blind Subagent (`contract-reviewer`)**: zero shared reasoning history, hardcoded `skip style`, auditing only `*.ears`, `TestIR`, and the `@cloze` `git diff` to reject witness-hardcoding cheats before writing layered provenance records.

## 7. Honest Boundary vs v1 Baseline and Phased Roadmap

To keep delivered facts distinct from forward-looking design goals:

| Phase | Milestone | Current Status | Exit Gate |
|---|---|---|---|
| **v1 Frozen Baseline** | Public Pages + `bank-wealth-demo` v1 + EARS 1.0 frontend / Z3 5-check / 4-step BMC / Style E &amp; B projections / Hooks prototype | **Completed (verified green on v1 branches)** | Zero lint issues across `metarch-truthsrc`, 15/15 EARS unit tests pass; 6 bilingual `bank-wealth-demo` pairs 100% AST &amp; `.smt2` identical; Hooks `exit 2` verified; existing 160-atom roundtrip untouched |
| **v2 Phase 1** | `Canonical Model v2` schema &amp; single compiler (Structure YAML + native EARS IR + SMT hard gate) | Planned | Retires second expression parser; single type/symbol checker serves SMT, projections, and codegen; unproved specs cannot emit `canonical-v2.json` |
| **v2 Phase 2** | Direct EARS-IR L1 deterministic code generators (first target: Scala or TypeScript/Rust) | Planned | Generates `Behavior`, `EventHandler`, and `Pure Replay Oracle` directly from `First-Hit` rules and `emit`/`post:` folds with zero `@guard` lowering |
| **v2 Phase 3** | Executable `EarsTestEmitter` (upgrading witness stubs to real Actor/Port-driving BDD oracles) | Planned | Synthesizes real command/value-object constructors and assertions executing under `sbt "testOnly *EarsSpec"` / `vitest` |
| **v2 Phase 4** | End-to-end isolated-zone AI `@cloze` TDD pilot (Context Pack + `Stop` Hook self-heal + blind review) | Planned | Full loop on a real application story and L2 slice: red locked oracle → `@cloze`-only AI fill → mutation kill check → blind review pass → graph anchor write-back |

## 8. Standards, Citations, and Related Articles

- [co-arising EARS 1.0 Technical Specification (v1.2 Bilingual Edition)](https://co-arising.github.io/articles/co-arising-ears-spec-20261123/) — Bilingual isomorphic EARS grammar, four `bank-wealth-demo` benchmarks, and read-only projections
- [How to Extend a New Code Generator in metarch-truthsrc](https://co-arising.github.io/articles/metarch-truthsrc-extending-code-generator-20261126/) — v1 artifact pipeline map and multi-language generator plugin contracts
- [Specs Have Bugs Too: AWS Kiro &amp; SMT Solvers](https://co-arising.github.io/articles/aws-kiro-smt-spec-analyzer-20261119/) — Eliminating specification ambiguity and conflicts before writing code
- [Implications for co-arising: Strategic Validation &amp; Engineering Route](https://co-arising.github.io/articles/co-arising-implications-20261116/) — Ashby's Law, Behaviour Harness, two-speed workflow, and Cloze context packing
- [Z3 Prover (Microsoft Research)](https://z3prover.github.io/) — Primary SMT-LIB 2 solver for 5-check verification and `k`-step BMC
- [cvc5 SMT Solver](https://cvc5.github.io/) — Solver-independent backend supporting `QF_SLIA` string theories
- [SMT-LIB 2 Standard](https://smt-lib.org/) — Solver-neutral formal verification interchange language
- [AWS Cedar Policy Language](https://www.cedarpolicy.com/) — Reference design for trading Turing completeness for 100% decidable analysis
- [EARS (Easy Approach to Requirements Syntax)](https://en.wikipedia.org/wiki/Easy_Approach_to_Requirements_Syntax) — Foundational controlled requirements syntax
- [OMG DMN Specification](https://www.omg.org/spec/DMN/) — Reference for Style B decision tables, FEEL intervals, and First-Hit policy
- [Cucumber Gherkin Reference](https://cucumber.io/docs/gherkin/reference/) — Locked `.feature` acceptance oracle syntax
- [ScalaTest](https://www.scalatest.org/) &amp; [Akka Persistence TestKit](https://doc.akka.io/libraries/akka-persistence-testkit/current/index.html) — Event-sourced aggregate test oracle reference harness
- [Harness Engineering for Coding Agent Users (Martin Fowler / Birgitta Böckeler)](https://martinfowler.com/articles/harness-engineering.html) — Variety-reduction topology and Behaviour Harness framing
- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices) — Deterministic `PreToolUse`/`Stop` Hooks (`exit 2`) and fresh-context blind review
- [`co-arising/metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) &amp; [`co-arising/bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo) — Current v1 compiler and benchmark repositories
