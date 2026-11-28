# metarch-truthsrc Strategic Architecture Map & Underground Tunnels Mine-Sweeping Manual (v2.0.0 Source-Level Atlas)

> **Scope & Source Baseline**: Written directly against [`metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) **v2.0.0** (pinned commit [`ab207e7`](https://github.com/co-arising/metarch-truthsrc/commit/ab207e7d2fae55feffafd9c9a13d61ccd6b9d829), `bank-wealth-demo` @ `b5cadc0`), this is a **coarse-to-fine, macro-to-seam engineering battle map**. Unlike the [co-arising 2.0 Long-Term Architecture Blueprint](https://co-arising.github.io/articles/co-arising-v2-ears-native-architecture-20261126/) (design philosophy) or the [GA Complete Guide](https://co-arising.github.io/articles/co-arising-v2-ga-prd-to-running-guide-20261126/) (user workflow), this manual slices the compiler open to chart its **module boundaries, vertical dataflows, 14 cross-file hidden couplings ("underground tunnels")**, and an empirically validated **probe-based mine-sweeping playbook covering 36 confirmed fixes across Waves 1–8 (locked in `SPEC-S13..S31`) plus Wave-9 honest targets**, machine-locked to the repository commit via `artifact-maps.lock.json`.

<div class="co-kpi-strip" role="region" aria-label="metarch-truthsrc v2.0.0 codebase scale and mine-sweeping baseline">
<div><div class="kpi-num">34.5k + 14.1k</div><div class="kpi-label">34.5k+ LOC in v2 trunk/EARS/Play emitters + 14,125 LOC in 24 curated 1.0 families</div></div>
<div><div class="kpi-num">44 / 32 / 159</div><div class="kpi-label">surface-registry lock: 44 CLI commands, 32 MCP tools, 159 diagnostic error codes</div></div>
<div><div class="kpi-num red">14 Tunnels</div><div class="kpi-label">Hidden cross-file couplings spanning types, 1.0/2.0 bridge, oracles, and verify gates</div></div>
<div><div class="kpi-num">8 Waves · 36 Cleared</div><div class="kpi-label">Waves 1–6(29 @ 8950ba3) + Wave-7(5 @ cf4545a) + Wave-8(2 @ ab207e7), locked in SPEC-S13..S31</div></div>
</div>

## 1. Strategic Overview (Level 0): The Macro Terrain Map

To hunt latent bugs systematically inside `metarch-truthsrc`, discard one misconception first: **it is not a "YAML-to-template" scaffolder; it is a five-stage domain compiler built across two historical geological strata**.

- **Stratum 1 (v1 Strict-Governance Legacy Layer, `emitter/families/`)**: 24 deterministic Scala CQRS/Play emitters locked by golden-file parity in [`emitter/parity.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/emitter/parity.mjs) (value objects, aggregate protocols, Akka persistence, Protobuf converters, Play runtime, and more).
- **Stratum 2 (v2 EARS-Native Trunk, `lib/ears/` + `lib/v2/`)**: Orthogonal YAML structure loader, EARS 1.0 lexer/parser/binder/Z3 SMT solver, DMN First-Hit witness synthesizer, `Canonical Model v2`, local SQLite knowledge graph, TS/Scala dual-stack and Scala single-stack generators, locked BDD oracle emitters, mutation testing, and anti-cheat write guards.

**Most real-world bugs do not live inside isolated function logic; they live at stratum boundaries and fan-out seams where one semantic concept is independently translated by multiple downstream consumers.** Figure 1 maps the six macro stages alongside the four high-risk fault lines:

<figure class="co-arch-fig">
<div class="arch-caption-head">FIGURE 01 · METARCH-TRUTHSRC V2.0.0 STRATEGIC TERRAIN &amp; FAULT LINES</div>
<svg viewBox="0 0 840 500" width="100%" role="img" aria-label="metarch-truthsrc v2.0.0 six-stage compilation trunk and four high-risk fault lines">
  <defs>
    <marker id="map1-arr-ink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-ink"/>
    </marker>
    <marker id="map1-arr-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-teal"/>
    </marker>
    <marker id="map1-arr-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-red"/>
    </marker>
    <marker id="map1-arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-amber"/>
    </marker>
  </defs>
  <rect x="12" y="10" width="816" height="96" rx="4" class="arch-band"/>
  <text x="24" y="30" class="arch-t-band">STAGE 1–2 · ORTHOGONAL FRONTEND &amp; FORMAL HARD GATE (structure-loader + lib/ears/* + compiler)</text>
  <rect x="24" y="42" width="176" height="52" rx="4" class="arch-card"/>
  <text x="112" y="63" text-anchor="middle" class="arch-t-title">Orthogonal Truth</text>
  <text x="112" y="81" text-anchor="middle" class="arch-t-sub">YAML structs + .ears rules</text>
  <rect x="226" y="42" width="194" height="52" rx="4" class="arch-card-teal"/>
  <text x="323" y="63" text-anchor="middle" class="arch-t-title">Parse · Bind · Lineage</text>
  <text x="323" y="81" text-anchor="middle" class="arch-t-sub">structure-loader / binder / lineage</text>
  <rect x="446" y="42" width="184" height="52" rx="4" class="arch-card-teal"/>
  <text x="538" y="63" text-anchor="middle" class="arch-t-title">Z3 SMT + First-Hit</text>
  <text x="538" y="81" text-anchor="middle" class="arch-t-sub">5 proofs + k-BMC + witnesses</text>
  <rect x="656" y="42" width="160" height="52" rx="4" class="arch-card-dark"/>
  <text x="736" y="63" text-anchor="middle" class="arch-t-title-dark">Canonical v2</text>
  <text x="736" y="81" text-anchor="middle" class="arch-t-sub-dark">+ knowledge.sqlite</text>
  <line x1="200" y1="68" x2="223" y2="68" class="arch-edge-teal" marker-end="url(#map1-arr-teal)"/>
  <line x1="420" y1="68" x2="443" y2="68" class="arch-edge-teal" marker-end="url(#map1-arr-teal)"/>
  <line x1="630" y1="68" x2="653" y2="68" class="arch-edge-teal" marker-end="url(#map1-arr-teal)"/>

  <rect x="12" y="126" width="816" height="148" rx="4" class="arch-band-teal"/>
  <text x="24" y="146" class="arch-t-band-teal">STAGE 3–4 · DUAL-CHANNEL CODEGEN &amp; 1.0/2.0 BRIDGE (scala-cqrs-play-service-v2 + lib/v2/bridge + codegen)</text>
  <rect x="24" y="160" width="214" height="98" rx="4" class="arch-card"/>
  <text x="131" y="181" text-anchor="middle" class="arch-t-title">Packaging &amp; Routing</text>
  <text x="131" y="200" text-anchor="middle" class="arch-t-sub">mergeCanonicalsForBc (monolith)</text>
  <text x="131" y="218" text-anchor="middle" class="arch-t-sub">target-resolution (dual / Scala-only)</text>
  <text x="131" y="236" text-anchor="middle" class="arch-t-mono">onion-routes shared derivation</text>
  <rect x="264" y="160" width="276" height="98" rx="4" class="arch-card-teal"/>
  <text x="402" y="181" text-anchor="middle" class="arch-t-title">v2 -&gt; 1.0 Strict Bridge Suite (Block A–D)</text>
  <text x="402" y="200" text-anchor="middle" class="arch-t-sub">v1-strict-scala · block-cd · readside</text>
  <text x="402" y="218" text-anchor="middle" class="arch-t-sub">api-auth (5-layer Play) · policy · orchestration</text>
  <text x="402" y="236" text-anchor="middle" class="arch-t-teal">Invokes 24 curated 1.0 emitter/families/*</text>
  <rect x="566" y="160" width="250" height="98" rx="4" class="arch-card-amber"/>
  <text x="691" y="181" text-anchor="middle" class="arch-t-title">Dual-Channel Disk Territories</text>
  <text x="691" y="200" text-anchor="middle" class="arch-t-sub">4A Read-Only: generated-scaffold/</text>
  <text x="691" y="218" text-anchor="middle" class="arch-t-sub">4B Never-Overwrite: handwritten/ (@cloze)</text>
  <text x="691" y="236" text-anchor="middle" class="arch-t-amber">ServerSnapshotProviderImpl · Bindings</text>
  <line x1="238" y1="209" x2="261" y2="209" class="arch-edge-teal" marker-end="url(#map1-arr-teal)"/>
  <line x1="540" y1="209" x2="563" y2="209" class="arch-edge-teal" marker-end="url(#map1-arr-teal)"/>

  <rect x="12" y="294" width="816" height="114" rx="4" class="arch-band-amber"/>
  <text x="24" y="314" class="arch-t-amber">STAGE 5–6 · LOCKED BDD ORACLE EMITTERS &amp; FIVE-LAYER VERIFICATION GATES</text>
  <rect x="24" y="328" width="236" height="66" rx="4" class="arch-card"/>
  <text x="142" y="350" text-anchor="middle" class="arch-t-title">Locked Oracle Emitters</text>
  <text x="142" y="368" text-anchor="middle" class="arch-t-sub">witness-materialize -&gt; TS/Scala/HTTP</text>
  <text x="142" y="384" text-anchor="middle" class="arch-t-mono">generated-tests/ + manifest.sha256</text>
  <rect x="286" y="328" width="254" height="66" rx="4" class="arch-card-teal"/>
  <text x="413" y="350" text-anchor="middle" class="arch-t-title">verify-gate + mutation-gate</text>
  <text x="413" y="368" text-anchor="middle" class="arch-t-sub">SHA-256 tamper · offline scalac · Onion DIP</text>
  <text x="413" y="384" text-anchor="middle" class="arch-t-teal">100% Domain Mutation Kill + Provenance</text>
  <rect x="566" y="328" width="250" height="66" rx="4" class="arch-card-red"/>
  <text x="691" y="350" text-anchor="middle" class="arch-t-red">Ultimate Runtime Acceptance</text>
  <text x="691" y="368" text-anchor="middle" class="arch-t-sub">sbt -batch stage + Play 2.8.18 Roadshow</text>
  <text x="691" y="384" text-anchor="middle" class="arch-t-mono">tasks-v2 review · view-v2 / atlas-v2</text>
  <line x1="260" y1="361" x2="283" y2="361" class="arch-edge-teal" marker-end="url(#map1-arr-teal)"/>
  <line x1="540" y1="361" x2="563" y2="361" class="arch-edge-red" marker-end="url(#map1-arr-red)"/>

  <path d="M 736 94 L 736 114 L 131 114 L 131 157" class="arch-edge" marker-end="url(#map1-arr-ink)"/>
  <path d="M 736 94 L 736 114 L 402 114 L 402 157" class="arch-edge" marker-end="url(#map1-arr-ink)"/>
  <path d="M 691 258 L 691 282 L 142 282 L 142 325" class="arch-edge-amber" marker-end="url(#map1-arr-amber)"/>
  <path d="M 691 258 L 691 282 L 413 282 L 413 325" class="arch-edge-amber" marker-end="url(#map1-arr-amber)"/>

  <rect x="12" y="424" width="816" height="64" rx="4" class="arch-band-red"/>
  <text x="24" y="445" class="arch-t-band-red">FOUR HIGH-RISK SEAM FAULT LINES (WHERE ~90% OF REAL BUGS LAND)</text>
  <text x="24" y="466" class="arch-t-sub">1) Type normalization (6-way record/ExactType/VO translation)   2) 1.0/2.0 bridge &amp; offline scalac filter (SBT_FRAMEWORK_IMPORT_RE)</text>
  <text x="24" y="481" class="arch-t-sub">3) Witness materialization &amp; 4-way 5-layer Authz parity   4) Monolith dedupBy &amp; never-overwrite handwritten drift across upgrades</text>
</svg>
<figcaption>Figure 1: The six-stage trunk and four high-risk fault lines of metarch-truthsrc v2.0.0. While the trunk looks linear, Canonical v2 fans out into four parallel lines (bridge codegen, oracle tests, offline verification, and Play runtime); any single-consumer drift detonates at integration time.</figcaption>
</figure>

### Two Essential Top-Level Mental Models

1. **Dual-Stack vs. Scala Single-Stack Delivery**:
   - `typescript` gives millisecond zero-compile Node 22 feedback for rapid prototyping and demos; `scala-cqrs-play-service-v2` delivers the full production Akka/Play/Protobuf/ScalikeJDBC runtime.
   - Since `0b925ad` introduced [`lib/v2/target-resolution.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/target-resolution.mjs), Scala production projects no longer carry dual-slot overhead (`*.cloze.ts` + `*Impl.scala`): when only `generated-scaffold/scala` (or `.truthsrc/generated-scala-manifest.json`) exists without `generated-scaffold/ts`, `tasks-v2`, `verify-v2`, and `check-v2` automatically operate in Scala single-stack mode.
2. **The Blind Spot Between Offline `scalac` and Live `sbt stage`**:
   - To keep TDD loops sub-second/second-level, `verify-v2` invokes **standalone `scalac` + ScalaTest** while filtering out Akka/Play/ScalaPB/ScalikeJDBC framework files.
   - Therefore **green offline `verify-v2` does NOT guarantee green `sbt -batch stage` or HTTP 200 on Play**. Play controllers, ReadSide JDBC repositories, Protobuf converters, Guice DI modules, and `conf/routes` are only truly verified by a real `sbt -batch stage` and live Play 2.8.18 HTTP roadshow.

---

## 2. Module & Directory Atlas (Level 1): Six Zones Down to Exact Source Files

As of `8950ba3`, the v2 engine spans six operational zones. Use this atlas as a direct jump-table during triage and bug-hunting:

| Zone | Core Modules (clickable GitHub links) | LOC | Ownership & Responsibility | Key I/O Contract |
|---|---|---:|---|---|
| **A · Entrypoints & Locks** | [`bin/truthsrc.js`](https://github.com/co-arising/metarch-truthsrc/blob/main/bin/truthsrc.js) / [`lib/v2/cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/cli.mjs) | 559 / 517 | 44 CLI commands and v2 subcommand dispatch (including `--bc` / `--packaging monolith`) | Strict `BOOL_FLAGS` whitelist; unknown or missing flag values fail closed |
| **A · Entrypoints & Locks** | [`mcp/server.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/mcp/server.mjs) / [`lib/v2/surface-registry.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/surface-registry.mjs) | 370 / 300 | 32 MCP tools (6 `v2_*`) and single-source capability lock | `npm run check:contracts` pins CLI, MCP, Skills, and error-code counts |
| **A · Entrypoints & Locks** | [`tools/lint.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/tools/lint.mjs) / [`lib/runtime-profile.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/runtime-profile.mjs) | 168 / — | Zero-business-hardcoding architectural gate and sole runtime coordinate registry | Forbids domain names and `net.imadz` literals across core `lib/`, `bin/`, and active `emitter/` |
| **B · Frontend & SMT** | [`lib/v2/structure-loader.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/structure-loader.mjs) | **2,378** | **Largest single file**: loads YAML structs, rejects legacy `@guard`, normalizes `resolvedType`, validates 5-layer Authz/PII/ReadModels | Emits `structures`, `symbolTable`, and `resolveCanonicalEventFields` |
| **B · Frontend & SMT** | [`lib/ears/parser.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/ears/parser.mjs) / [`lib/ears/binder.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/ears/binder.mjs) | 772 / 1,146 | Isomorphic EN/ZH EARS 1.0 parsing, normalization (`normalize.mjs`), and strongly typed symbol binding | Binds state/param/event/extern symbols and classifies `L1/L2/L3` |
| **B · Frontend & SMT** | [`lib/ears/smt-encoder.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/ears/smt-encoder.mjs) / [`lib/v2/first-hit-witness.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/first-hit-witness.mjs) | 847 / 467 | Single-hop EARS → SMT-LIB 2 encoding, 5 Z3 proofs + `k`-BMC, DMN First-Hit exact witness synthesis | Any unreachable, conflicting, or shadowed rule blocks `Canonical v2` emission |
| **B · Frontend & SMT** | [`lib/v2/compiler.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/compiler.mjs) / [`lib/v2/lineage.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/lineage.mjs) | 594 / 1,061 | v2 compile orchestrator, full-chain field lineage, Event Sourcing `post:` fold validation, bilingual equivalence | Writes `canonical-v2.json`, `knowledge.sqlite`, Style E/B signoff docs |
| **C · Graph & Tasks** | [`lib/v2/knowledge-db.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/knowledge-db.mjs) / [`lib/v2/tasks-v2.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/tasks-v2.mjs) | 401 / 294 | Node 22 built-in `node:sqlite` dependency graph and drift-free `@cloze` task queue derivation | Preserves existing `cloze_slots.provenance` review records across rebuilds |
| **C · Graph & Tasks** | [`lib/v2/atlas-viewer.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/atlas-viewer.mjs) / [`lib/v2/diagrams.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/diagrams.mjs) / [`lib/v2/view-v2.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/view-v2.mjs) | 1,474 / 1,283 / 1,077 | 11-diagram offline `atlas.html` and interactive Workshop HTML exporter | Pure read-only consumers of `canonical-v2.json` + SQLite |
| **D · Codegen & Bridge** | [`generators/scala-cqrs-play-service-v2/generate.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/generators/scala-cqrs-play-service-v2/generate.mjs) | 396 | `scala-cqrs-play-service:2` top assembler, `@generated` stamping, multi-subdomain merge (`mergeCanonicalsForBc`) | Wires Block A/B/C/D bridges and writes `.truthsrc/generated-scala-manifest.json` |
| **D · Codegen & Bridge** | [`lib/v2/bridge/v1-strict-scala.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-scala.mjs) / [`ears-simplify.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/ears-simplify.mjs) | 1,231 / 298 | Block A domain bridge invoking 1.0 `#1/#2/#3/#45` families + EARS NNF simplification + `@cloze` stubs | Emits `domain/values`, `entities`, `invariants`, `Computations`, `*Impl.scala` |
| **D · Codegen & Bridge** | [`lib/v2/bridge/v1-strict-block-cd.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-block-cd.mjs) | 1,354 | Block C/D coordinator invoking 1.0 protocol/aggregate/repo/Protobuf/serializer/Play runtime/sbt scaffold + Authz/DI | Delegates to `readside`, `policy`, `api-auth`, and `orchestration` bridges |
| **D · Codegen & Bridge** | [`v1-strict-readside.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-readside.mjs) / [`v1-strict-api-auth.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-api-auth.mjs) / [`v1-strict-policy.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-policy.mjs) / [`v1-strict-orchestration.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-orchestration.mjs) | 709 / 576 / 569 / 702 | Full Play vertical slices: CQRS ReadSide+JDBC, auth-core Play controllers + `ServerSnapshotProvider`, reactive PolicyMachine, Saga/Effect/ToolGate | **Highest-frequency zone for `sbt stage` compile errors** |
| **D · Codegen & Bridge** | [`lib/v2/codegen/onion-routes.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/codegen/onion-routes.mjs) / [`typescript.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/codegen/typescript.mjs) / [`onion-ts.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/codegen/onion-ts.mjs) / [`onion-scala.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/codegen/onion-scala.mjs) | 120 / 1,085 / 761 / 603 | Single HTTP route derivation (`deriveStoryHttpRoutes`) and TS/Scala Onion interface layers | Must remain strictly isomorphic with `v1-strict-api-auth` and `interfaces-http` |
| **E · Oracle Emitters** | [`lib/v2/test-emitter/witness-materialize.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/witness-materialize.mjs) | 686 | Expands sparse Z3 witnesses into concrete typed TS/Scala commands, states, snapshots, and trusted contexts | **Primary leverage point behind bulk application-suite failures** |
| **E · Oracle Emitters** | [`scala-strict-scalatest.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/scala-strict-scalatest.mjs) / [`typescript-node-test.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/typescript-node-test.mjs) / [`interfaces-http.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/interfaces-http.mjs) | 427 / 342 / 796 | Emits Domain/Application ScalaTest, Node 22 TS suites, and 5-layer Authz/CSRF/PDP HTTP oracles | Stamps `generated-tests/manifest.sha256.json` tamper lock |
| **F · Gates & Guard** | [`lib/v2/verify-gate.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/verify-gate.mjs) / [`mutation-gate.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/mutation-gate.mjs) / [`guard-write.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/guard-write.mjs) | 843 / 381 / 232 | Tamper check, TS + offline `scalac` runners, Onion DIP check, Domain mutation gate, and `PreToolUse` write guard | Restricts AI writes strictly inside `@cloze:start..end`; blocks all locked zones |

---

## 3. Core Dataflows & State Machines (Level 2): Tracing a Rule End-to-End

Zooming from modules to execution paths, every bug investigation starts by tracking **two vertical pipelines** and **one derived task state machine**:

<figure class="co-arch-fig">
<div class="arch-caption-head">FIGURE 02 · DUAL VERTICAL DATAFLOWS &amp; CLOZE TASK STATE MACHINE</div>
<svg viewBox="0 0 840 430" width="100%" role="img" aria-label="Domain rule dataflow, 4-way HTTP Authz fan-out, and Cloze derived task state machine">
  <defs>
    <marker id="map2-arr-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-teal"/>
    </marker>
    <marker id="map2-arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-amber"/>
    </marker>
    <marker id="map2-arr-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-red"/>
    </marker>
  </defs>
  <rect x="12" y="10" width="816" height="128" rx="4" class="arch-band-teal"/>
  <text x="24" y="30" class="arch-t-band-teal">FLOW A · DOMAIN RULE VERTICAL PIPELINE (Domain Slice / L1 &amp; L2)</text>
  <rect x="24" y="44" width="136" height="78" rx="4" class="arch-card"/>
  <text x="92" y="66" text-anchor="middle" class="arch-t-title">YAML + .ears</text>
  <text x="92" y="84" text-anchor="middle" class="arch-t-sub">ExactType / VO</text>
  <text x="92" y="101" text-anchor="middle" class="arch-t-mono">aliases · rules · post</text>
  <rect x="186" y="44" width="150" height="78" rx="4" class="arch-card"/>
  <text x="261" y="66" text-anchor="middle" class="arch-t-title">binder + Z3</text>
  <text x="261" y="84" text-anchor="middle" class="arch-t-sub">resolvedType unified</text>
  <text x="261" y="101" text-anchor="middle" class="arch-t-mono">sparse first-hit witness</text>
  <rect x="362" y="44" width="144" height="78" rx="4" class="arch-card-dark"/>
  <text x="434" y="66" text-anchor="middle" class="arch-t-title-dark">Canonical v2</text>
  <text x="434" y="84" text-anchor="middle" class="arch-t-sub-dark">behaviors + testIr</text>
  <text x="434" y="101" text-anchor="middle" class="arch-t-sub-dark">eventFolds + lineage</text>
  <rect x="532" y="44" width="136" height="78" rx="4" class="arch-card-teal"/>
  <text x="600" y="66" text-anchor="middle" class="arch-t-title">v1-strict-scala</text>
  <text x="600" y="84" text-anchor="middle" class="arch-t-sub">RuleParams / Rules</text>
  <text x="600" y="101" text-anchor="middle" class="arch-t-mono">Computations / Impl</text>
  <rect x="692" y="44" width="124" height="78" rx="4" class="arch-card-amber"/>
  <text x="754" y="66" text-anchor="middle" class="arch-t-title">ScalaTest Oracle</text>
  <text x="754" y="84" text-anchor="middle" class="arch-t-sub">witness-materialize</text>
  <text x="754" y="101" text-anchor="middle" class="arch-t-amber">scalac + mutation</text>
  <line x1="160" y1="83" x2="183" y2="83" class="arch-edge-teal" marker-end="url(#map2-arr-teal)"/>
  <line x1="336" y1="83" x2="359" y2="83" class="arch-edge-teal" marker-end="url(#map2-arr-teal)"/>
  <line x1="506" y1="83" x2="529" y2="83" class="arch-edge-teal" marker-end="url(#map2-arr-teal)"/>
  <line x1="668" y1="83" x2="689" y2="83" class="arch-edge-amber" marker-end="url(#map2-arr-amber)"/>

  <rect x="12" y="156" width="816" height="132" rx="4" class="arch-band-amber"/>
  <text x="24" y="176" class="arch-t-amber">FLOW B · APPLICATION &amp; 5-LAYER AUTHZ FAN-OUT (1 SOURCE -&gt; 4 PARALLEL CONSUMERS)</text>
  <rect x="24" y="192" width="184" height="82" rx="4" class="arch-card-dark"/>
  <text x="116" y="214" text-anchor="middle" class="arch-t-title-dark">onion-routes.mjs</text>
  <text x="116" y="233" text-anchor="middle" class="arch-t-sub-dark">deriveStoryHttpRoutes</text>
  <text x="116" y="251" text-anchor="middle" class="arch-t-sub-dark">mode/roles/pdp/rowScope</text>
  <rect x="244" y="192" width="132" height="82" rx="4" class="arch-card"/>
  <text x="310" y="216" text-anchor="middle" class="arch-t-title">1. onion-ts</text>
  <text x="310" y="236" text-anchor="middle" class="arch-t-sub">TS HTTP Router</text>
  <text x="310" y="254" text-anchor="middle" class="arch-t-mono">Node 22 runtime</text>
  <rect x="392" y="192" width="132" height="82" rx="4" class="arch-card"/>
  <text x="458" y="216" text-anchor="middle" class="arch-t-title">2. onion-scala</text>
  <text x="458" y="236" text-anchor="middle" class="arch-t-sub">Scala HttpRouter</text>
  <text x="458" y="254" text-anchor="middle" class="arch-t-mono">offline scalac check</text>
  <rect x="540" y="192" width="134" height="82" rx="4" class="arch-card-red"/>
  <text x="607" y="216" text-anchor="middle" class="arch-t-red">3. v1-strict-api-auth</text>
  <text x="607" y="236" text-anchor="middle" class="arch-t-sub">PlayController</text>
  <text x="607" y="254" text-anchor="middle" class="arch-t-mono">auth-core + Snapshot</text>
  <rect x="690" y="192" width="126" height="82" rx="4" class="arch-card-teal"/>
  <text x="753" y="216" text-anchor="middle" class="arch-t-title">4. interfaces-http</text>
  <text x="753" y="236" text-anchor="middle" class="arch-t-sub">TS + Scala HTTP</text>
  <text x="753" y="254" text-anchor="middle" class="arch-t-teal">Locked authz oracle</text>
  <line x1="208" y1="233" x2="241" y2="233" class="arch-edge-amber" marker-end="url(#map2-arr-amber)"/>
  <path d="M 208 212 L 226 212 L 226 184 L 458 184 L 458 189" class="arch-edge-amber" marker-end="url(#map2-arr-amber)"/>
  <path d="M 226 184 L 607 184 L 607 189" class="arch-edge-red" marker-end="url(#map2-arr-red)"/>
  <path d="M 226 184 L 753 184 L 753 189" class="arch-edge-teal" marker-end="url(#map2-arr-teal)"/>

  <rect x="12" y="306" width="816" height="112" rx="4" class="arch-band"/>
  <text x="24" y="326" class="arch-t-band">STATE MACHINE · DERIVED CLOZE TASK QUEUE (computed live from disk @cloze + sqlite provenance)</text>
  <rect x="24" y="346" width="124" height="52" rx="4" class="arch-card-amber"/>
  <text x="86" y="368" text-anchor="middle" class="arch-t-title">PENDING</text>
  <text x="86" y="385" text-anchor="middle" class="arch-t-mono">has NOT_IMPLEMENTED</text>
  <rect x="184" y="346" width="142" height="52" rx="4" class="arch-card-red"/>
  <text x="255" y="368" text-anchor="middle" class="arch-t-red">UNVERIFIED</text>
  <text x="255" y="385" text-anchor="middle" class="arch-t-mono">filled, verify not green</text>
  <rect x="362" y="346" width="176" height="52" rx="4" class="arch-card-teal"/>
  <text x="450" y="368" text-anchor="middle" class="arch-t-title">GREEN_NEEDS_REVIEW</text>
  <text x="450" y="385" text-anchor="middle" class="arch-t-mono">verify-v2 green, review</text>
  <rect x="574" y="346" width="112" height="52" rx="4" class="arch-card-dark"/>
  <text x="630" y="368" text-anchor="middle" class="arch-t-title-dark">VERIFIED</text>
  <text x="630" y="385" text-anchor="middle" class="arch-t-sub-dark">blind review PASS</text>
  <rect x="716" y="346" width="100" height="52" rx="4" class="arch-card-red arch-dash"/>
  <text x="766" y="368" text-anchor="middle" class="arch-t-red">STALE</text>
  <text x="766" y="385" text-anchor="middle" class="arch-t-mono">SHA drifted</text>
  <line x1="148" y1="372" x2="181" y2="372" class="arch-edge-amber" marker-end="url(#map2-arr-amber)"/>
  <line x1="326" y1="372" x2="359" y2="372" class="arch-edge-teal" marker-end="url(#map2-arr-teal)"/>
  <line x1="538" y1="372" x2="571" y2="372" class="arch-edge-teal" marker-end="url(#map2-arr-teal)"/>
  <line x1="686" y1="372" x2="713" y2="372" class="arch-edge-red" marker-end="url(#map2-arr-red)"/>
</svg>
<figcaption>Figure 2: Two vertical data pipelines and the live Cloze task state machine. Notice how onion-routes.mjs fans out to four parallel consumers; updating three while missing the fourth immediately causes runtime/test divergence.</figcaption>
</figure>

### Disk Territory Ownership Contract

| Disk Territory | Owner | Generator Write Behavior | `guard-write.mjs` Enforcement |
|---|---|---|---|
| `truth/` (YAML + `.ears` + bindings) | Domain author / architect | Read-only input, never rewritten | Editable (requires re-running `compile-v2`) |
| `generated-scaffold/`, `generated-tests/`, `projections/` | Compiler & generators | Full deterministic overwrite | **Physically blocked (`TERRITORY_LOCKED`, exit 2)** |
| `handwritten/` (`*Impl.scala`, `*.cloze.ts`, `ServerSnapshotProviderImpl.scala`, `HandwrittenBindingsModule.scala`) | Humans / isolated AI Agents | Created once; **never overwritten once present (`overwrite: false`)** | Edits allowed only inside `@cloze:start(<id>)..@cloze:end(<id>)`; full-file overwrites blocked |
| `.truthsrc/` (`canonical-v2.json`, `knowledge.sqlite`, manifests) | Derived state cache | Rebuilt on compile/verify (preserves `cloze_slots.provenance`) | Rebuildable, with provenance & blind-review state retained in SQLite |

---

## 4. Underground Tunnels Map (Level 3): 14 Hidden Cross-File Couplings

On the surface the compiler pipeline looks clean and modular. What actually breaks multi-subdomain production projects (such as a 6-subdomain exam platform with 50 domain behaviors and 23 `@cloze` slots) are **14 underground tunnels (T01–T14)**—pairs of modules that never directly call each other yet silently share fragile invariants:

<figure class="co-arch-fig">
<div class="arch-caption-head">FIGURE 03 · UNDERGROUND TUNNELS MAP (T01–T14 HIDDEN COUPLING TOPOLOGY)</div>
<svg viewBox="0 0 840 460" width="100%" role="img" aria-label="14 underground tunnels grouped into four hidden coupling networks">
  <defs>
    <marker id="map3-arr-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-red"/>
    </marker>
    <marker id="map3-arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-amber"/>
    </marker>
  </defs>
  <rect x="12" y="10" width="398" height="210" rx="4" class="arch-band-red"/>
  <text x="24" y="30" class="arch-t-band-red">NETWORK A · TYPE &amp; NOMINAL SYSTEM FAULTS (T01–T03)</text>
  <rect x="24" y="42" width="374" height="50" rx="4" class="arch-card"/>
  <text x="34" y="61" class="arch-t-red">T01 · 6-way record(ExactType/VO) re-translation</text>
  <text x="34" y="79" class="arch-t-sub">structure-loader -&gt; readside / block-cd / policy / witness: miss 1 =&gt; String</text>
  <rect x="24" y="100" width="374" height="50" rx="4" class="arch-card"/>
  <text x="34" y="119" class="arch-t-red">T02 · SPEC-S10 primitive Json.toJson vs nominal recursion</text>
  <text x="34" y="137" class="arch-t-sub">v1-strict-readside must gate explicit JSON codecs on typeUsesNominal</text>
  <rect x="24" y="158" width="374" height="50" rx="4" class="arch-card"/>
  <text x="34" y="177" class="arch-t-red">T03 · Custom aliases missing 'state' =&gt; state.state.copy</text>
  <text x="34" y="195" class="arch-t-sub">binder / smt-encoder / v1-strict-scala / witness all assume 'state' alias</text>

  <rect x="430" y="10" width="398" height="210" rx="4" class="arch-band-amber"/>
  <text x="442" y="30" class="arch-t-amber">NETWORK B · 1.0/2.0 BRIDGE &amp; OFFLINE SCALAC (T04–T07)</text>
  <rect x="442" y="42" width="374" height="40" rx="4" class="arch-card"/>
  <text x="452" y="59" class="arch-t-amber">T04 · Duplicated SBT_FRAMEWORK_IMPORT_RE (verify + mutation)</text>
  <text x="452" y="74" class="arch-t-mono">File referencing filtered trait without matching import breaks scalac</text>
  <rect x="442" y="88" width="374" height="40" rx="4" class="arch-card"/>
  <text x="452" y="105" class="arch-t-amber">T05 · 1.0 emitter/families 24-family parity boundary</text>
  <text x="452" y="120" class="arch-t-mono">Zero-VO fallbacks belong in lib/v2/bridge, never breaking 1.0 negatives</text>
  <rect x="442" y="134" width="374" height="38" rx="4" class="arch-card"/>
  <text x="452" y="150" class="arch-t-amber">T06 · Hybrid L1+L2 RuleParams unification &amp; SPEC-S4 zero-Noop</text>
  <text x="452" y="165" class="arch-t-mono">Non-empty Computations bans val Noop; L1 test passes null.asInstanceOf</text>
  <rect x="442" y="178" width="374" height="34" rx="4" class="arch-card"/>
  <text x="452" y="199" class="arch-t-amber">T07 · lint.mjs bans domain names &amp; net.imadz -&gt; runtime-profile</text>

  <rect x="12" y="238" width="398" height="210" rx="4" class="arch-band-teal"/>
  <text x="24" y="258" class="arch-t-band-teal">NETWORK C · WITNESS &amp; LOCKED ORACLE FAULTS (T08–T10)</text>
  <rect x="24" y="272" width="374" height="52" rx="4" class="arch-card"/>
  <text x="34" y="291" class="arch-t-teal">T08 · Sparse Z3 witness -&gt; witness-materialize distortion</text>
  <text x="34" y="309" class="arch-t-sub">isRejected keeps []; accepted needs non-empty seqs, bindPrincipal, snapshot</text>
  <rect x="24" y="332" width="374" height="50" rx="4" class="arch-card"/>
  <text x="34" y="351" class="arch-t-teal">T09 · Dual event-field resolution (explicit vs lineage-derived)</text>
  <text x="34" y="369" class="arch-t-sub">Codegen and [POSTCOND] specs must share resolveCanonicalEventFields</text>
  <rect x="24" y="390" width="374" height="48" rx="4" class="arch-card"/>
  <text x="34" y="409" class="arch-t-teal">T10 · 4-way 5-layer Authz parity (public / PDP / GET / Play)</text>
  <text x="34" y="426" class="arch-t-sub">ownerField · requiresEntitlement · rowScope · HttpStatusMapper · JsNull</text>

  <rect x="430" y="238" width="398" height="210" rx="4" class="arch-band"/>
  <text x="442" y="258" class="arch-t-band">NETWORK D · MONOLITH, TARGETS &amp; GATE FAULTS (T11–T14)</text>
  <rect x="442" y="272" width="374" height="38" rx="4" class="arch-card-red"/>
  <text x="452" y="288" class="arch-t-red">T11 · mergeCanonicalsForBc short-name dedupBy &amp; stale files</text>
  <text x="452" y="303" class="arch-t-mono">Cross-subdomain name collisions silently drop the second definition</text>
  <rect x="442" y="316" width="374" height="38" rx="4" class="arch-card"/>
  <text x="452" y="332" class="arch-t-title">T12 · target-resolution single-stack &amp; forbiddenImports</text>
  <text x="452" y="347" class="arch-t-mono">tasks/verify/check auto-detect Scala-only; avoid blocking controllers/</text>
  <rect x="442" y="360" width="374" height="38" rx="4" class="arch-card"/>
  <text x="452" y="376" class="arch-t-title">T13 · verify-gate short-circuit skips mutation + open HTTP handle</text>
  <text x="452" y="391" class="arch-t-mono">Any base test failure hides mutation timeouts until full green</text>
  <rect x="442" y="404" width="374" height="36" rx="4" class="arch-card-amber"/>
  <text x="452" y="420" class="arch-t-amber">T14 · overwrite:false DI signature drift on existing repos</text>
  <text x="452" y="434" class="arch-t-mono">HandwrittenBindingsModule / ServerSnapshotProviderImpl drift</text>
</svg>
<figcaption>Figure 3: Full topology of the 14 underground tunnels (T01–T14) across four hidden coupling networks. Red and amber boxes mark historically detonated seams and highest-risk upcoming minefields.</figcaption>
</figure>

### Network A · Type & Nominal System Faults (T01–T03)

1. **T01 · 6-Way `resolvedType.kind === 'record'` Re-Translation**:
   - [`structure-loader.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/structure-loader.mjs) normalizes both `ExactType` (such as `Money`) and `ValueObject` into `{ kind: 'record', typeName }`.
   - At least **six downstream files** each maintain their own `buildNominalIndex` / `scalaTypeOf` / `defaultScalaExpr`: `v1-strict-scala.mjs`, `v1-strict-block-cd.mjs`, `v1-strict-readside.mjs`, `v1-strict-policy.mjs`, `v1-strict-api-auth.mjs`, and `witness-materialize.mjs`.
   - **Failure mechanism**: Missing `case 'record'` in any single consumer silently degrades types to `String`—directly causing **Play ReadSide `String` assigned to `BigDecimal`/`Long` ([Issue #2](https://github.com/co-arising/metarch-truthsrc/issues/2))** and **ReadModel nominal-field compile errors (Bug #4)**.
2. **T02 · `SPEC-S10` Idiomatic Primitive `Json.toJson` vs. Nominal Codecs**:
   - In [`v1-strict-readside.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-readside.mjs), primitive sequences like `Vector[String]` must keep `Json.stringify(Json.toJson(row.topics))` and `.as[Vector[String]]` (pinned by `SPEC-S10`), while collections/maps containing `ExactType` or `ValueObject` must branch via `typeUsesNominal` into recursive `jsEncodeExpr` / `jsDecodeExpr`.
3. **T03 · Four-Way Implicit Assumption That `aliases` Includes `'state'`**:
   - If YAML defines custom `aliases: [bal]` without `'state'`, [`v1-strict-scala.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-scala.mjs) and [`witness-materialize.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/witness-materialize.mjs) misread `state.field` as a nested record member and emit `state.copy(state = state.state.copy(...))` (Bug #7). Every consumer must normalize aggregate aliases to include `'state'`.

### Network B · 1.0/2.0 Bridge & Offline `scalac` Faults (T04–T07)

4. **T04 · Duplicated `SBT_FRAMEWORK_IMPORT_RE` Offline `scalac` Filter**:
   - [`verify-gate.mjs:359`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/verify-gate.mjs#L359) and [`mutation-gate.mjs:210`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/mutation-gate.mjs#L210) each hold a copy of the framework import regex that strips Akka/Play/ScalaPB/ScalikeJDBC/converter files out of standalone `scalac`.
   - **Rule of thumb**: Any generated Scala file referencing a filtered trait (such as zero-VO `DomainConverters.scala` extending `<Agg>ProtoConverters`) MUST carry a matching framework import—otherwise `sbt stage` succeeds while offline `verify-v2` fails with `not found: type`. Always update both copies together.
5. **T05 · 1.0 `emitter/families/` 24-Family Parity Red Line**:
   - [`emitter/parity.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/emitter/parity.mjs) pins golden bytes and `runNegatives` assertions across all 24 families (for instance, `proto-converter.mjs` requires `valueObjects.length > 0`).
   - **Rule of thumb**: Handle v2 edge cases (like zero-VO projects) in [`v1-strict-block-cd.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-block-cd.mjs) rather than weakening 1.0 negative batteries.
6. **T06 · Hybrid L1+L2 Aggregate `RuleParams` & `SPEC-S4` Zero-Noop Contract**:
   - Aggregates mixing L1 deterministic rules and L2 `@cloze` rules must unify all params under `<Agg>RuleParams` (never splitting out `<Agg>DomainServiceRuleParams`).
   - Because `SPEC-S4` forbids exposing `val Noop` on non-empty `<Agg>Computations` in production code, [`scala-strict-scalatest.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/scala-strict-scalatest.mjs) passes `null.asInstanceOf[<Agg>Computations]` for L1 rule tests on hybrid aggregates.
7. **T07 · `tools/lint.mjs` Architecture Guard**:
   - [`tools/lint.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/tools/lint.mjs) scans all 626 JS/MJS files: zero domain/business identifiers in generic core, zero `net.imadz` literals outside `lib/runtime-profile.mjs`, and zero hardcoded `'app/'` paths inside active `emitter/families/`.

### Network C · Witness Materialization & Oracle Faults (T08–T10)

8. **T08 · Sparse Z3 Witness → `witness-materialize` Semantic Distortion**:
   - [`first-hit-witness.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/first-hit-witness.mjs) probes Z3 only for guard-referenced symbols; [`witness-materialize.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/witness-materialize.mjs) fills the rest.
   - **Two classic traps**: (1) Overwriting `[]` with synthetic non-empty lists on rejected rules destroys `len(items) == 0` witnesses (Bug #1); (2) Omitting `bindPrincipal`, server `stateSnapshot`, or sending scalars to sequence fields breaks entire application test suites ([Issue #3](https://github.com/co-arising/metarch-truthsrc/issues/3)).
9. **T09 · Dual Event-Field Resolution**:
   - Event fields can be explicitly declared or derived from command parameters/lineage. Both [`v1-strict-scala.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-scala.mjs) and `[POSTCOND]` emitters in `scala-strict-scalatest.mjs` must share `resolveCanonicalEventFields(agg, ev)` or case-class arities drift apart (Bug #6).
10. **T10 · 4-Way 5-Layer Authz PEP/PDP Mirroring**:
    - [`onion-ts.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/codegen/onion-ts.mjs), [`onion-scala.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/codegen/onion-scala.mjs), [`v1-strict-api-auth.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-api-auth.mjs) (Play controllers), and [`interfaces-http.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/interfaces-http.mjs) (HTTP oracles) must stay byte-for-byte semantically aligned on: skipping `public` routes for 401/403 checks, injecting allow-PDP for both `external-pdp` and `resource-policy`, appending query params for `GET` routes, mapping errors via `HttpStatusMapper.statusForRejection`, converting `JsNull => null`, parsing `X-Entitlements` / `X-Principal-Attr-*`, and enforcing `ownerField` / `requiresEntitlement` / `rowScope` + `ServerSnapshotProvider.load`.

### Network D · Monolith Packaging, Targets & Gate Faults (T11–T14)

11. **T11 · Silent `dedupBy` Swallowing in `mergeCanonicalsForBc` & Stale Files**:
    - Look at [`generators/scala-cqrs-play-service-v2/generate.mjs:135`](https://github.com/co-arising/metarch-truthsrc/blob/main/generators/scala-cqrs-play-service-v2/generate.mjs#L135): multi-subdomain monolith merges deduplicate `valueObjects`, `exactTypes`, `readModels`, `aggregates`, `ports`, and `stories` by short `x.name`. Two subdomains defining same-named types with different fields silently drop the second definition. Meanwhile incremental regeneration does not garbage-collect stale `.scala` files left under old package paths ([Issue #4](https://github.com/co-arising/metarch-truthsrc/issues/4)).
12. **T12 · `target-resolution.mjs` Single-Stack Detection & `init-v2` Import Rules**:
    - [`lib/v2/target-resolution.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/target-resolution.mjs) unifies target resolution across `tasks-v2`, `verify-gate`, `check-v2`, and `cli.mjs`; [`init-v2.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/init-v2.mjs) must correspondingly switch `forbiddenImports` for Scala-only repos so Play controller imports are never false-flagged.
13. **T13 · `verify-gate` Short-Circuiting Mutation & Open HTTP Server Handles**:
    - Any single failure in the base test suite causes `verify-gate.mjs` to skip the built-in `mutation-gate`, deferring mutation timeouts or surviving-mutant surprises until after the entire suite turns green. Additionally, unclosed HTTP listeners in `interfaces-http` can keep standalone `node --test` workers alive after reporting counts.
14. **T14 · Cross-Version DI Signature Drift in `overwrite: false` Handwritten Files**:
    - Preserving `HandwrittenBindingsModule.scala`, `ServerSnapshotProviderImpl.scala`, and `@cloze` `*Impl.scala` files is a strict guarantee—which means when a newer generator adds a constructor dependency (like `ServerSnapshotProvider`), clean directories pass while pre-existing repos fail to compile until their handwritten bindings are upgraded.

---

## 5. Empirical Retrospective (Level 4A): Eight-Wave Mine-Sweeping Battle Report (`SPEC-S13..S31`)

Right after fixing the first real-world 6-subdomain run ([Issue #2](https://github.com/co-arising/metarch-truthsrc/issues/2), [#3](https://github.com/co-arising/metarch-truthsrc/issues/3), [#4](https://github.com/co-arising/metarch-truthsrc/issues/4)), we used the tunnel map above to drive eight consecutive waves of real adversarial probes (`compileCanonicalV2` + `node --test` + offline `scalac`/ScalaTest/Mutation Gate + real `sbt -batch compile`). **Wave-1 (7/7)** validated the methodology on the very first run:

| # | Confirmed Bug Symptom | Tunnel Traversed | Minimal Adversarial Probe | Fix & Regression Lock |
|---|---|---|---|---|
| **#1** | `len(items) == 0` rejected rule test failed | **T08** | Aggregate command with `Seq[String]` rejected when empty | Added `allowEmptySeq` in `witness-materialize`, preserving `[]` when `isRejected` (`SPEC-S13`) |
| **#2** | Hybrid L1+L2 aggregate failed `sbt compile` (`DomainServiceRuleParams` missing) | **T06** | Single aggregate combining 1 L1 rule + 1 L2 `extern` rule | Unified `<Agg>RuleParams`; preserved `SPEC-S4` zero-Noop via `null.asInstanceOf` in L1 tests (`SPEC-S14`) |
| **#3** | First `public` route hijacked 401/403 tests; `resource-policy` lacked PDP; `GET` missed query params | **T10** | First route `mode: public`, plus `resource-policy` and `GET` routes | Selected first non-`public` route, unified `routeNeedsPdp`, appended `buildQuerySuffix` (`SPEC-S16`) |
| **#4** | ReadModel with `ExactType`/`ValueObject` failed `sbt compile` | **T01 + T02** | ReadModel containing `Money` (`unit-decimal`) + custom VO | Wired `nominalIdx` & `typeUsesNominal` in `v1-strict-readside` while keeping `SPEC-S10` (`SPEC-S15`) |
| **#5** | Play controller hardcoded 400, omitted `X-Entitlements`/`ownerField`/`rowScope`, and mismatched `JsNull` | **T10** | Play route declaring owner, entitlement, and rowScope | Aligned `v1-strict-api-auth` with `HttpStatusMapper`, 403 checks, and recursive `PlayHttpBridge` (`SPEC-S16`) |
| **#6** | Zero-VO project missed `ProtoConverters`; `[POSTCOND]` arity mismatched derived event fields | **T04 + T05 + T09** | Primitive-only project with lineage-derived event fields | Emitted zero-VO fallback in `v1-strict-block-cd` with framework import; shared `resolveCanonicalEventFields` (`SPEC-S15`) |
| **#7** | Custom `aliases: [bal]` omitting `'state'` emitted invalid `state.state.copy(...)` | **T03** | YAML aggregate with custom `aliases` excluding `state` | Normalized aggregate aliases to always include `'state'` across bridge & witness (`SPEC-S14`) |

All regressions are locked in [`test/scala-cqrs-play-service-v2-acceptance.spec.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/test/scala-cqrs-play-service-v2-acceptance.spec.mjs) (`SPEC-S1..S31`, 31/31 PASS), verified with real `sbt -batch compile` / `stage` and 100% Mutation Gate runs (see the [status page](https://co-arising.github.io/status/)).

### Wave-2 Empirical Sweep (Commit `2f4d33d` · 6/6 Probes Confirmed & Eliminated)

Immediately after charting targets M01–M08, we ran Wave-2 adversarial probes (`probe_wave2_mines.mjs`) through real `compileCanonicalV2` + `generateScalaCqrsPlayServiceV2`/`ForBc` + `emitV2ExecutableTests` + offline `scalac` + real **`sbt -batch compile`**. **All 6 probe groups confirmed as real defects (10 underlying fixes, locked in `SPEC-S18..S20`)**:

| Radar ID | Confirmed Defect & Root Cause | Fix & Regression Lock (`2f4d33d`) |
|---|---|---|
| **M01** | Same-named structurally conflicting `SharedInfo` VO silently dropped by `dedupBy`, causing `value score is not a member` in `sbt` | Replaced with `dedupStructuralChecked`: identical Shared Kernel deduplicates cleanly; conflicts fail closed with `BC_MERGE_CONFLICT` (`SPEC-S18`) |
| **M03** | Scala reserved keywords (`type`, `match`) passed `compile-v2` then crashed `generate-v2` with `VO_INPUT` | Added `RESERVED_TARGET_IDENTIFIERS` check in `structure-loader.mjs`, failing fast with `V2_RESERVED_IDENTIFIER` (`SPEC-S18`) |
| **M06** | `v1-strict-orchestration.mjs` lacked nominal index and degraded `Money`/`TagVO` in `externContracts` to `String` (even catching a real legacy `amount: String` degradation in `bank-wealth-demo`'s `BankCashSubmitPortConnectorPort`!) | Added `buildNominalIndex` + `domain.values._`; upgraded `bank-wealth-demo` connector to strongly typed `amount: Money` (`SPEC-S19`) |
| **M07** | ReadSide nested `Seq[Optional[String]]` / `Map[String, Optional[TagVO]]` / `Optional[Seq[Money]]` hit 3 `sbt` compile errors (missing `Reads[Option]`, `JsValue.toOption`, and `Option[JsObject].getOrElse(JsNull)` widening to `Object`) | Added `needsExplicitJsCodec`, separated `JsLookupResult.toOption` vs `Option(JsValue)`, explicit `: play.api.libs.json.JsValue` widening, and depth-indexed lambda vars (`SPEC-S19`) |
| **M08-A/B** | **Pre-Z3**: missing `len/count >= 0` caused Z3 fake `-1` gap; missing quantifier Skolem equivalence; **Scala bridge**: `ears-simplify` emitted `p.x.score`; **Post-Z3**: `witness-materialize` ignored `@quant` and let scalar `x=0` shadow `x.score=1` | Added `len/count >= 0` + Skolem axioms in `smt-encoder`, `boundVars` + integer comparisons in `ears-simplify`, and record-subfield-first + `@quant` materialization in `witness-materialize` (`SPEC-S20`) |
| **M05 + M04** | Pre-existing repos adding their first ReadModel later never installed `ProjectionModule` due to `overwrite: false` on `HandwrittenBindingsModule`; full-suite mutation runs risked timeouts at scale | Moved `ProjectionModule` installation into compiler-owned `GeneratedBindingsModule` (preserving existing handwritten setups); targeted per-aggregate specs and 180s baseline timeout in `mutation-gate` (`SPEC-S19`) |

### Wave-3 Empirical Sweep (Commit `57e6440` · M02/M09–M12 + 4 Bonus Mines Eliminated)

Targeting the entire Wave-3 radar (M02 + Pre-Z3/Post-Z3 M09–M12), commit [`57e6440`](https://github.com/co-arising/metarch-truthsrc/commit/57e6440a0f10b6dd94e02d10d23bb1be23b970d7) confirmed and eliminated **all 5 radar mines plus 4 bonus deep defects uncovered during execution**, verified via `node --test`, offline `scalac`, 100% Scala Mutation Gate, and real Play 2.8.18 `sbt -batch compile` (69 Scala + 2 `.proto`, 0 errors) and locked into `SPEC-S21..S24`:

| ID | Confirmed Defect & Root Cause | Fix & Regression Lock (`57e6440`) |
|---|---|---|
| **M02** | Locked application tests asserted verbatim `toString` equality on dispatched command snapshot fields, falsely failing handwritten handlers that normalize or recompute derived values | Relaxed `scala-strict-scalatest`, `scala-scalatest`, and `typescript-node-test` to non-null + runtime type-validity assertions while preserving strict equality for `bindPrincipal` (`SPEC-S21`) |
| **M09 + M10** | **Pre-Z3**: uncoupled `len == 0` / `sum == 0` and vacuous `forall`/`exists`; opposing quantifiers reusing variable `x` collided under a single Skolem; **Post-Z3**: boundary witnesses failed to substitute bound vars and dropped `@qdef(col)`, leaving M10 mutation kill rate at 71.43% | Added alpha-normalized quantifier signatures, scoped witnesses `@qel_N`, default element `@qdef(col)`, coupled collection axioms, and distinct-scalar `len >= 2` in `smt-encoder`; aligned `first-hit-witness` and `witness-materialize` (`defaultElem` + `activeElements`), raising M10 mutation kill rate to **100%** (`SPEC-S22`) |
| **M11** | Rules guarding `sum(scores) > 100` solved `@agg(sum:scores)` in Z3, but `witness-materialize` still emitted small default lists that fell short of the target sum | Implemented exact `BigInt` scaled decomposition of `@agg(sum:col)` in `witness-materialize` for both `Seq[Int]` and fixed-scale `Seq[Decimal(scale)]`, cooperating with `len`/`count` and active quantifier elements (`SPEC-S22`) |
| **M12** | `Map[String, ValueObject]` member access (`state.entries[key].score`) was broken across binder, SMT, witness materialization, Scala, and TS emitters | Wired end-to-end: `binder` type inference through `index -> member`, typed map-subfield SMT arrays with scale/enum propagation, `map-subfield` probing & `mapPresence` gating in `first-hit-witness`, Scala `.get(k).map(_.f).getOrElse(...)` in `ears-simplify`, and TS `?.[f] ?? fallback` in `typescript.mjs` (`SPEC-S23`) |
| **Bonus #1–#4** | Real probes surfaced 4 additional latent defects: (1) multi-branch L1 commands dropped extra acceptance rules in 1.0's single-`else` template; (2) `typescript.mjs` emitted `cmd.x.score` inside quantifiers; (3) nested `ExactType` `post:` updates emitted invalid `.copy(...)` on `sealed abstract case class ... private (...)`; (4) unconstrained `ExactType` unit fields materialized as `""`, making `Money.create` fall back to `Money.Zero` | (1) Emitted full First-Hit `if / else if / else` for multi-branch L1 in `v1-strict-scala` (24/24 1.0 parity intact); (2) tracked `boundVars`/`boundVarTypes` and `sum`/`len`/`count` in `typescript.mjs`; (3) emitted `.create(...).getOrElse(...)` in `buildNestedCopy`; (4) defaulted unconstrained unit fields to `resolvedType.units?.[0]` (`SPEC-S22..S24`) |

### Wave-4 Empirical Sweep (Commit `1e87c6a` · Proto3 Nested Containers + Play 5-Layer Authz Parity)

Wave-4 targeted **T01/T05 (Proto3 persistence for nested containers on Aggregate state)** and **T10 (PlayController 5-layer Authz parity)** using a 2-subdomain monolith probe (`orders` + `billing` with ReadModels, Stories, Authz, and nested containers). Commit [`1e87c6a`](https://github.com/co-arising/metarch-truthsrc/commit/1e87c6a899cc05ffaa265b2b9c89d947975b1c78) eliminated both cross-layer defects, verified by real **`sbt -batch compile`** (111 Scala sources + 3 `.proto` files, 0 errors in 16s) and locked into `SPEC-S25`:

| Radar ID | Confirmed Defect & Root Cause | Fix & Regression Lock (`1e87c6a`) |
|---|---|---|
| **M13** | **T01 + T05 · Invalid Proto3 Nested Containers**: Aggregate states declaring `Optional[Seq[String]]`, `Seq[Optional[String]]`, or `Map[String, Optional[TagVO]]` broke `scalapb` / `sbt compile` because Proto3 forbids nested `repeated`/`optional` inside `repeated`/`map` | Added recursive Proto3 `BoxPO` wrapper synthesis (`SeqStringBoxPO`, `OptStringBoxPO`, `OptTagVOBoxPO`, etc.) in `v1-strict-block-cd.mjs` and spliced `encode<BoxPO>` / `decode<BoxPO>` into `SharedValueProtoConverters.scala` (including zero-VO fallback) without touching 1.0 `emitter/families/` (24/24 parity preserved) (`SPEC-S25`) |
| **M15** | **T10 · PlayController Principal Map & HTTP/2 Header Case Drift**: `v1-strict-api-auth.mjs` omitted `"entitlements"` and `"attributes"` from `PlayController`'s `principal` map (diverging from `HttpRouter`), and `resolvePrincipalBinding` used case-sensitive header lookups that broke under HTTP/2 lowercased headers | Added `"entitlements" -> ctx.entitlements, "attributes" -> ctx.attributes` in `PlayController` and case-insensitive `lookupAttr` in `resolvePrincipalBinding`, restoring full parity between `HttpRouter` and live Play (`SPEC-S25`) |

### Wave-5 Empirical Sweep (Commit `93a6350` · Nested-Map Stack Overflow + Handwritten Method Sync + Package-Rename Pruning)

Wave-5 probed all four **M16–M19** targets through real `sbt -batch compile` + Z3 + TS/Scala + Mutation Gate: **M16 (`form: decimal` `ExactType`)** (66 Scala + 2 `.proto`, 0 errors) and **M18B (nonlinear `QF_NIA` `qty * unitPrice`)** verified healthy end-to-end, while **3 confirmed high-impact defects (M18A / M17 / M19)** were detonated, eliminated in commit [`93a6350`](https://github.com/co-arising/metarch-truthsrc/commit/93a63508caf9f221f39a9a7f04ea9727b7ae1efc), and locked into `SPEC-S26..S27`:

| Radar ID | Confirmed Defect & Root Cause | Fix & Regression Lock (`93a6350`) |
|---|---|---|
| **M18A** | **T08 · Nested `Map[String, Map[String, VO]]` Stack Overflow + Invalid Scala `_.`**: `state.grid[row][col].score` triggered infinite mutual recursion (`encVal <-> encBool` → `RangeError: Maximum call stack size exceeded`) in `smt-encoder.mjs`; `ears-simplify` emitted invalid Scala `_.`; unconstrained map presence caused Z3 to default `present=false` and wipe witnesses | Broke `encVal`/`encBool` recursion, generalized `extractIndexedAccess` to arbitrary-depth nested `(Array Int ...)` SMT arrays with `hasPresence` gating, and wired arbitrary-depth indexing across `ears-simplify`, `typescript.mjs`, `first-hit-witness`, and `witness-materialize`; TS + Scala + **100% Mutation Gate** + real **`sbt -batch compile`** (54 Scala + 2 `.proto`, 0 errors in 15s) pass (`SPEC-S26`) |
| **M17** | **T14 · Evolving Existing Repos with New L2 Commands or `externContracts` Broke `sbt`**: `overwrite: false` skipped `ScorerComputationsImpl.scala` and `EnginePortConnectorImpl.scala`, so adding `scoreBeta` / `checkBeta` caused `sbt compile` to fail with `class needs to be abstract` | Added non-destructive `syncMissingScalaMethods` (appends only missing `override def` stubs before the class's closing `}`, preserving 100% of existing user code/comments) plus `handwrittenDrift` diagnostics when `HandwrittenBindingsModule` lacks `GeneratedBindingsModule`; real **`sbt -batch compile`** (62 Scala + 1 `.proto`, 0 errors in 14s) pass (`SPEC-S27`) |
| **M19** | **T11 · Package Rename Left Stale `handwritten/` Starter Files Breaking `sbt`**: Renaming `packageName` pruned old `generated-scaffold/` files but left unmodified starter `ServerSnapshotProviderImpl` / `HandwrittenBindingsModule` under `handwritten/scala/<oldPkg>/`, causing `not found: type` in `sbt` | Persisted `packageName` and `starterHandwrittenHashes` in `.truthsrc/generated-scala-manifest.json`: automatically prunes untouched starter files (matching starter SHA-256) and old-package `src_managed` proto caches, while preserving user-modified files and reporting `STALE_HANDWRITTEN_FILE`; real **`sbt -batch compile`** (69 Scala + 2 `.proto`, 0 errors in 16s) pass (`SPEC-S27`) |

### Wave-6 Empirical Sweep (Commit `8950ba3` · Event-Triggered Policy Lineage + Null-Safe `Optional[VO]` Member Access)

Wave-6 probed **T01/T08/T09** across reactive Policy stories, Map `post:` mutations, and `Optional[ValueObject]` member chains: **M21 (`state.buckets'[bucket] = ...` + `state.note' = none`)** verified healthy end-to-end (49 Scala + 1 `.proto`, 0 errors + 100% Mutation Gate), while **2 deep defects (M20 / M23)** were confirmed, eliminated in commit [`8950ba3`](https://github.com/co-arising/metarch-truthsrc/commit/8950ba3b390169ef592bee6459e79ec663a937d6), and locked into `SPEC-S28`:

| Radar ID | Confirmed Defect & Root Cause | Fix & Regression Lock (`8950ba3`) |
|---|---|---|
| **M20** | **T09 · False `V2_LINEAGE_UNCONSUMED_NUMERIC_FIELD` Error on Event-Triggered Policy Stories**: When a reactive story declared `WHEN event Trade.TradeConfirmed SHALL dispatch Ledger.PostEntry`, `verifyDispatchLineage` marked `amount: Money` as `@PROPAGATED` but failed to record it in `consumedEventFields`, causing `compile-v2` to fail closed | Passed `consumedEventFields` into `verifyDispatchLineage` so every `@PROPAGATED` field consumed by an event-triggered story is registered; full reactive Policy build with `Money`/`TagVO`/`Optional[String]` passed real **`sbt -batch compile`** (87 Scala + 3 `.proto`, 0 errors in 22s) (`SPEC-S28`) |
| **M23** | **T01 + T08 · `Optional[ValueObject]` Member Access Failed `scalac` & Risked TS Null Dereference**: Guards like `state.profile is some AND state.profile.score < 50` emitted `state.profile.score < BigDecimal("50")` in Scala (`value score is not a member of Option[ProfileVO]`) and unguarded `.score` in TS under conjunction reordering | Added `stepFieldType` and arbitrary-depth optional chaining across `ears-simplify` (`.map(_.score).getOrElse(0L)`, switching to `.flatMap` for nested `Optional`) and `typescript.mjs` (`(state.profile?.score ?? 0)`); TS + Scala + **100% Mutation Gate** + real **`sbt -batch compile`** (52 Scala + 2 `.proto`, 0 errors in 20s) pass (`SPEC-S28`) |

### Wave-7 Empirical Sweep (Commit `cf4545a` · Scalar Optional Narrowing + OR/Optional Boundary Witness + GET Query Coercion + forall+sum LIA + Sync Drift Surfacing)

Wave-7 hit **4/4** across radar targets **M24–M27**, and the 100% Mutation Gate additionally caught bonus defect **M24B** (`<= -> <` mutants masked behind `OR` short-circuiting), eliminating **5 cross-layer defects** in commit [`cf4545a`](https://github.com/co-arising/metarch-truthsrc/commit/cf4545a9a3ea8c85e423282e76f884470d692398), verified across TS + Scala + 100% Mutation Gate + three real **`sbt -batch compile`** builds (`M24` 48 Scala + 1 `.proto`, `M25` 48 Scala, `M26` 48 Scala + 1 `.proto`, all 0 errors) and locked into `SPEC-S29..S30`:

| Radar ID | Confirmed Defect & Root Cause | Fix & Regression Lock (`cf4545a`) |
|---|---|---|
| **M24** | **T01 + T08 · Guarded Scalar `Optional[Int/Decimal/String]` Rejected by `binder`**: Even when guarded by `state.optLimit is some AND requested > state.optLimit` or `(state.optLimit is none OR requested <= state.optLimit)`, `binder.mjs` rejected all three scalar optionals with `EARS_TYPE_MISMATCH` | Added flow-sensitive narrowing (`extractEmptinessFacts` + `narrowLookupWithSomePaths`) in `binder.mjs`: narrows `Optional[T]` to `T` strictly under `is some` / `!= none` conjunctions or `is none` / `== none` disjunctions while **keeping unguarded comparisons rejected**; synced safe `.getOrElse(...)` / `(x ?? fallback)` unwrapping across `ears-simplify.mjs`, `scala.mjs`, and `typescript.mjs` (`SPEC-S29`) |
| **M24B (Bonus)** | **T08 + T13 · `OR`/Optional Short-Circuiting Masked Boundary Mutants (60% Kill Rate)**: For `(state.optLimit is none OR requested <= state.optLimit)`, `first-hit-witness` asserted `(= requested state.optLimit)` without requiring `state.optLimit is some`; Z3 chose `None`, deduplication dropped the witness, and `<= -> <` survived | Extended `collectBoundaryEqualityAssertions` with disjunctive path conditions (negating sibling `OR` branches) and `.__present = true` presence constraints for referenced optionals, lifting M24 mutation kill rate from 60% to **100%** (`SPEC-S29`) |
| **M25** | **T10 · `GET` Query Params Degraded to Raw `String` Across TS/Scala/Play & Scala HTTP Oracle Cheated via `body`**: `GET ?page=2&onlyActive=true&minPrice=10.00` arrived as strings in `onion-ts`, `onion-scala`, `v1-strict-block-cd`, and `PlayController`, while Scala `InterfacesHttpSpec` bypassed `query` by placing `GET` params into `body` | Derived `queryParamTypes` in `onion-routes.mjs`; wired typed `Int`/`Bool`/`Decimal` coercion across `onion-ts` (`coerceQueryParams`), `onion-scala` & `v1-strict-block-cd` (`QueryParamCoercer`), and `v1-strict-api-auth` (`PlayController.coerceQueryValue`); switched Scala `InterfacesHttpSpec` `GET` cases to real `query = Map[String, String]` (`SPEC-S30`) |
| **M26** | **T08 · Missing Linear `forall`+`sum` Axioms Caused Spurious Z3 Gaps**: Exhaustive rules combining `len(scores) > 0 AND forall x in scores: x > 0 AND sum(scores) >= len(scores)` failed `V2_SMT_GATE_FAILED` | Added pure-LIA (`QF_AUFLIA`) constant-bound axioms in `smt-encoder.mjs` (`forall` / `not exists` → `sum >= lo * len` & `sum <= hi * len`, `len == 1 => sum == def`, plus active-witness coupling) with zero nonlinearity; TS + Scala + 100% Mutation Gate + real `sbt` pass (`SPEC-S29`) |
| **M27** | **T14 · `check-v2 --sync` Dropped Handwritten Sync/Stale/Drift Diagnostics**: `generateScalaCqrsPlayServiceV2` returned `syncedHandwrittenMethods`, `prunedHandwrittenFiles`, `staleHandwrittenFiles`, and `handwrittenDrift`, yet `check-v2.mjs` omitted them from `syncSummary` and human output | Aggregated all four fields into `res.sync` in `check-v2.mjs` and emitted actionable `[WARN] STALE_HANDWRITTEN_FILE` / `HANDWRITTEN_DRIFT` lines in `renderCheckV2Human` on both PASS and FAIL paths (`SPEC-S30`) |

### Wave-8 Empirical Sweep (Commit `ab207e7` · Multi-BC External-Event-Bridge Typed Payloads + ReadSide Multi-Event Option Wrapping)

Wave-8 pushed real **`sbt -batch compile`** across four deep seams—Multi-BC packaging (`Saga` + `Effect` + `#46 external-event-bridge` + `ReadModel`), `Seq[VO]` quantifiers with `Optional` subfields, multi-event partial ReadSide projections, and `Map` invariant axioms: **M29 (`Seq[VO]` with `Optional[String]` subfield quantifier)** (52 Scala + 2 `.proto`, 0 errors + 100% Mutation Gate) and **M31 (`Map[String, Decimal(2)]` `ALWAYS` invariant + `in` + `post:` update)** (48 Scala + 1 `.proto`, 0 errors + 100% Mutation Gate) verified healthy end-to-end, while **2 real `sbt compile` bombs (M28 / M30)** were confirmed, eliminated in commit [`ab207e7`](https://github.com/co-arising/metarch-truthsrc/commit/ab207e7d2fae55feffafd9c9a13d61ccd6b9d829), and locked into `SPEC-S31`:

| Radar ID | Confirmed Defect & Root Cause | Fix & Regression Lock (`ab207e7`) |
|---|---|---|
| **M28** | **T05 + T11 · Multi-BC `#46 external-event-bridge` Broke `sbt compile`**: When `domainMap.integrations` wired a cross-BC bridge, `v1-strict-orchestration.mjs` passed `outputType = String` and empty `slotMembers = []` to 1.0 `external-event-bridge`, emitting invalid `def billingPaid(output: String): OrderPlaced = OrderPlaced()` and `Vector(output.orderId)` | Emitted a typed `<Producer>Payload` case class under `domain/values/` (carrying full canonical event fields and a `String` identity key) and populated `slotMembers` / `identityKeys` in `v1-strict-orchestration.mjs` without touching 1.0 `emitter/families/` (24/24 parity preserved); 100 Scala + 4 `.proto` multi-subdomain BC passed real **`sbt -batch compile`** with 0 errors (`SPEC-S31`) |
| **M30** | **T01 · ReadSide Multi-Event Partial Projection Missing `T -> Option[T]` Wrapping Broke `#26` & `#28` in `sbt`**: When a `ReadModel` stored fields from later lifecycle events (`LoanApproved`) as `Optional[Decimal(2)]` / `Optional[RiskNote]`, both `LoanOverviewApplyEvent.scala` (`#26`) and `LoanOverviewReadsideProjectionHandler.scala` (`#28`) assigned raw `e.rate` / `e.riskNote`, failing `scalac` (`found: T, required: Option[T]`) | Resolved canonical event field types via `resolveCanonicalEventFields` in `v1-strict-readside.mjs` to wrap `Some(e.field)` (`T -> Option[T]`) or unwrap `e.field.getOrElse(default)` (`Option[T] -> T`), fixed `#28` assignment rendering and `domain.values._` imports; 68 Scala + 2 `.proto` passed real **`sbt -batch compile`** with 0 errors (`SPEC-S31`) |

---

## 6. Next-Wave Mine-Sweeping Playbook (Level 4B): Probe Method & Wave-9 Honest Radar

### The 4-Step Adversarial Probe Method

1. **Pick a Tunnel**: Choose an under-tested cross-module seam from T01–T14 in Figure 3.
2. **Craft a Minimal Adversarial Truth**: Write 10–40 lines of valid but edge-case YAML + `.ears` (zero VO, hybrid L1+L2, nested `Option[ExactType]`, Scala reserved keywords, cross-subdomain colliding names).
3. **Run the Full Real Pipeline (never rely on regex-only unit tests)**:
   - `compileCanonicalV2` (real Z3)
   - `generateScalaCqrsPlayServiceV2` / `generateScalaCqrsPlayServiceV2ForBc`
   - `emitV2ExecutableTests`
   - `node --test` + offline `scalac` + **real `sbt -batch stage` + live Play HTTP roadshow**
4. **Lock Every Confirmed Hit**: Fix via general derivation (`npm run lint:arch` = 0 issues, `emitter/parity.mjs` = 24/24 green) and lock the probe permanently as `SPEC-S32+`.

### Wave-9 High-Risk Radar (Honest Boundaries as of `ab207e7`)

M01–M31 (36 confirmed defects eliminated + 5 deep seams empirically verified healthy) are closed and locked in `SPEC-S13..S31` through commits `2f4d33d`, `57e6440`, `1e87c6a`, `93a6350`, `8950ba3`, `cf4545a`, and `ab207e7`. The table below honestly inventories the **4 remaining engineering boundaries (M32–M35)** queued for Wave-9 probing:

| Radar ID | Suspected Latent Mine / Known Boundary | Linked Tunnel | Recommended Adversarial Probe | Blast Radius |
|---|---|---|---|---|
| **M32** | **`Seq[VO]` Field-Level Aggregation (`sum(items.amount)`) & Incremental `post:` Append/Remove Folds**: Scalar `sum(scores)` and full sequence replacement `state.items' = items` are verified end-to-end, while VO-field sums and incremental sequence append/remove folds remain unimplemented | **T08 + T09** | `.ears` combining `sum(items.amount) <= limit` and incremental `state.items'` append/remove folds → SMT, TS/Scala & mutation gate | Expressiveness boundary on line-item aggregation and incremental sequence folds |
| **M33** | **Live Play 2.8.18 HTTP Roadshow of Malformed `GET` Queries & Nested `Optional[VO]` JSON Payloads**: Valid typed `GET` query coercion is locked in Wave-7, while malformed query values (`?page=abc` / `?onlyActive=maybe`) and deeply nested optional JSON payloads need live Play 400 vs. 500 verification | **T10** | Boot `sbt -batch stage` Play binary and send malformed query strings and partial nested `Optional[VO]` POST JSON | Edge-case invalid inputs returning unexpected status codes |
| **M34** | **Guided Migration CLI (`migrate-handwritten-v2`) for User-Edited Stale Files**: Wave-7 surfaces `staleHandwrittenFiles` and `handwrittenDrift` via `check-v2 --sync`, but major package refactors still require manual file moves | **T14** | Add dry-run / interactive migration helper verified by zero-regression `verify-v2 --strict` | Manual refactor friction on large package renames |
| **M35** | **ReadSide `#26 projection-apply-event` Advanced Forms (`updateOnly` / `delete` / `persistenceIdCreate`) & Cross-Aggregate Views**: v2 currently routes projections through `create` form (Option-safe as of M30); delete events and cross-aggregate merged projections await full bridge support | **T01 + T05** | Probe a ReadModel updated by two aggregates plus a delete event through real `sbt -batch compile` while keeping 1.0 parity 24/24 | Expressiveness boundary on delete & multi-aggregate CQRS views |

### 30-Second Failure Attribution Protocol

| Failure Signature | Owner | Required Action |
|---|---|---|
| `compile-v2` emits `V2_SMT_GATE_FAILED`, `V2_FIRST_HIT_SHADOWED_RULE`, `V2_LINEAGE_*`, or `EARS_*` | **Truth Source** | Fix YAML / `.ears` specification; never weaken the Z3 gate |
| Locked oracle matches truth, but `@cloze` implementation or `ServerSnapshotProviderImpl` diverges | **Handwritten Isolation Zone** | Fix logic strictly inside `@cloze:start..end` or handwritten provider |
| Generated code fails `sbt stage`, locked oracle sends inputs violating truth/Authz contracts, or incremental packaging leaves stale artifacts | **Compiler / Generator (`metarch-truthsrc`)** | File upstream issue with file:line & minimal repro → fix via 4-step probe and lock in `SPEC-S*` |

> **Closing Takeaway**: Do not read this map once and file it away. Before every major release or multi-subdomain onboarding, pick the 3–5 riskiest seams from Figure 3 and radar targets M32–M35, write a 100-line adversarial probe, and run it through real `sbt stage` + Play HTTP. Turning underground tunnels into lit corridors and turning surprises into locked probes is how `metarch-truthsrc` converges on industrial-grade determinism.
