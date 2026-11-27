# Play CQRS (scala-cqrs-play-service:2) Artifact Type Architecture Map: Onion Layers, Decomposition & Re-Assembly, and Target Code Reference

> Version lock: `metarch-truthsrc` @ [`0b925ad`](https://github.com/co-arising/metarch-truthsrc) (`scala-cqrs-play-service:2` · `catalogSha256: 156b224f3614` · 60 unified families / 14 producers / 64 `artifactKinds`) · `bank-wealth-demo` @ [`80a9acb`](https://github.com/co-arising/bank-wealth-demo) · Controlled by `assets/data/artifact-maps.lock.json` and the `sync-site-facts` CI gate (cross-referenced with `F-32` / `F-33` on the status page).

Most code generators emit one giant `OrderService.scala` per model. That shortcut feels fast on day one, yet as soon as invariants, persistence adapters, authorization, read projections, and reactive policies evolve together, templates collapse into an untestable tangle where **AI edits leak infrastructure into business rules and Onion boundaries erode silently**.

[`scala-cqrs-play-service:2`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/scala-cqrs-play-service) inside `metarch-truthsrc` takes the opposite approach: **fine-grained orthogonal decomposition (60 unified families across 64 `artifactKinds` — expanding the 54-family baseline with `#55`–`#60` Reactive Policy families) + strict inward-only Onion dependencies + deterministic outer-edge re-assembly through Guice DI and `ApplicationBootstrap`**. This guide walks from **architectural philosophy** → **clickable interactive Onion & Wiring maps** → **layer-by-layer breakdown with real generated Scala** → **end-to-end transaction trace** → **the upgrade sync contract and Rust/Axum extension blueprint**.

---

## 1. Architecture Philosophy: Why Decompose Into 60 Artifact Families Before Re-Assembling

<div class="co-kpi-strip" role="region" aria-label="Play CQRS v2 Artifact Scale Overview">
  <div><div class="kpi-num">60</div><div class="kpi-label">Unified Families (54 Baseline + Policy #55–#60)</div></div>
  <div><div class="kpi-num">14</div><div class="kpi-label">Registered Producers (manifest-backed)</div></div>
  <div><div class="kpi-num">64</div><div class="kpi-label">Governed Artifact Kinds (Full Pipeline)</div></div>
  <div><div class="kpi-num red">0</div><div class="kpi-label">Onion DIP Violations (126 Scala files checked)</div></div>
</div>

### 1. First Principles: Partitioning Every Artifact Into Kernel, Seam, or Glue

Every Artifact Type in `co-arising` carries an explicit architectural role so neither humans nor agents mix business truth with framework plumbing:

<div class="article-table">
<table>
<thead>
<tr><th>Role</th><th>Badge</th><th>Authority &amp; Origin</th><th>Change Driver</th><th>Representative Artifact Types</th></tr>
</thead>
<tbody>
<tr><td><strong>Critical Business Kernel (Kernel)</strong></td><td><span class="at-badge at-kernel">KERNEL</span></td><td>Derived strictly from YAML structures + <a href="https://co-arising.github.io/articles/co-arising-ears-spec-20261123/">EARS behavioral specs</a> + Z3 mathematical proofs (<code>4A</code> zero-token codegen or verified contract)</td><td>Domain rule changes</td><td><code>ValueObject</code>, <code>Entity</code>, <code>EventHandler</code>, <code>Rules</code>, <code>Axioms</code>, <code>PolicyOn&lt;Cmd&gt;</code></td></tr>
<tr><td><strong>Isolation Boundary (Seam &amp; Port)</strong></td><td><span class="at-badge at-seam">SEAM</span></td><td>Compiler-derived typed interfaces (<code>Port</code> / <code>Protocol</code> / <code>CallerContractSpec</code> / <code>Semantics</code>) caging non-deterministic <code>L2</code>/<code>L3</code>/Infra code inside <code>handwritten/</code> <code>@cloze</code> slots</td><td>Capability boundary changes</td><td><code>*Computations</code>, <code>*Protocol</code>, <code>*Repository</code>, <code>*Port.scala</code>, <code>ApplyEventSemantics</code>, <code>PolicyDlqSink</code></td></tr>
<tr><td><strong>Wiring &amp; Runtime Plumbing (Glue)</strong></td><td><span class="at-badge at-glue">GLUE</span></td><td>Zero new business decisions — adapts Kernel and Seam contracts onto Akka Typed, ClusterSharding, Play HTTP, ScalaPB, and Guice DI</td><td>Target runtime/framework upgrades</td><td><code>*Aggregate</code>, <code>*Behaviors</code>, <code>*ProtoConverters</code>, <code>*Bootstrap</code>, <code>ApplicationBootstrap</code>, <code>GeneratedBindingsModule</code></td></tr>
</tbody>
</table>
</div>

**Core invariant — purity inside, plumbing outside**: The innermost `domain/` package contains zero `akka.*`, `play.*`, `scalikejdbc.*`, `javax.inject.*`, or Protobuf imports. That purity makes it possible for [`verify-gate.mjs`](https://github.com/co-arising/metarch-truthsrc) to compile **all Kernel + Seam Scala files via standalone offline `scalac` in milliseconds and execute a 100% domain mutation gate** without booting an Akka cluster.

### 2. Why Decompose Thoroughly Before Re-Assembling?

1. **Ownership Separation (Overwrite vs. Never-Overwrite)**: Keeping compiler-owned `FundOrderRules.scala` separate from human/AI-owned `FundOrderComputationsImpl.scala` allows [`generated-scaffold/` vs. `handwritten/`](https://github.com/co-arising/metarch-truthsrc/blob/main/CODEGEN.md) to live side by side and re-assemble cleanly via `GeneratedBindingsModule` without regeneration ever clobbering handwritten `@cloze` logic.
2. **Dual-Channel Verification (`4A` vs. `4B`)**: Deterministic linear rules and folds stay in `#45 Rules` / `#3 EventHandler` / `#48 Axioms`; non-linear math and multi-step orchestration stay behind `#51 ApplicationPort` and `*Computations` supervised by locked BDD oracles.
3. **Cross-Stack Portability (Scala/Play → Rust/Axum)**: Once Kernel contracts and Port seams are separated, porting `metarch-truthsrc` to another stack (see Section 9's Rust/Axum blueprint) primarily swaps **Glue adapters** while preserving the same semantic architecture.

---

## 2. Master Play CQRS Artifact Type Map & Wiring Topology

> Click any node in Figure 1 to jump directly to that layer's Artifact Type breakdown and Scala code sample. Use the 2-level collapsible Onion-layer sidebar on the left to expand or collapse individual layers.

<figure class="co-arch-fig co-arch-map">
<div class="arch-caption-head">FIGURE 01 · PLAY CQRS (scala-cqrs-play-service:2 @ 0b925ad) ONION ARTIFACT TYPE MAP (CLICKABLE)</div>
<svg viewBox="0 0 920 980" width="100%" role="img" aria-label="Master 5-layer Onion Architecture Artifact Type Map for Play CQRS showing Domain Core, Application, Infrastructure, Interfaces/Runtime, and Verification Oracle Gate with Kernel/Seam/Glue roles and dependency edges">
  <defs>
    <marker id="map-arr-ink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-ink"/>
    </marker>
    <marker id="map-arr-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-teal"/>
    </marker>
    <marker id="map-arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-amber"/>
    </marker>
    <marker id="map-arr-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-red"/>
    </marker>
  </defs>

  <rect x="14" y="12" width="892" height="104" rx="5" class="arch-band-red"/>
  <text x="28" y="34" class="arch-t-band-red">LAYER 5 · VERIFICATION &amp; BDD ORACLE GATE (Independent Proof Harness · Never Runtime-Coupled)</text>
  <a class="arch-node" href="#section-7-1">
    <rect x="28" y="46" width="418" height="56" rx="4" class="arch-card-teal"/>
    <text x="237" y="68" text-anchor="middle" class="arch-t-title">#53 Gherkin Features · TS/Scala Oracles · manifest.sha256.json</text>
    <text x="237" y="88" text-anchor="middle" class="arch-t-mono">KERNEL · SHA-256 Locked Oracles &amp; Witness Suites (Domain/App/HTTP)</text>
  </a>
  <a class="arch-node" href="#section-7-2">
    <rect x="468" y="46" width="424" height="56" rx="4" class="arch-card-red"/>
    <text x="680" y="68" text-anchor="middle" class="arch-t-title">#54 Mutation Gate · Onion DIP Gate · sbt/scalac Partition</text>
    <text x="680" y="88" text-anchor="middle" class="arch-t-mono">GLUE · 100% Guard Mutation Kill + 0 DIP Violations + Boundary Audit</text>
  </a>

  <rect x="14" y="130" width="892" height="132" rx="5" class="arch-band-ink"/>
  <text x="28" y="152" class="arch-t-band">LAYER 4 · INTERFACES &amp; PLAY SERVICE RUNTIME (HTTP Entry / 5-Layer Authz / Build Scaffold)</text>
  <a class="arch-node" href="#section-6-1">
    <rect x="28" y="166" width="204" height="80" rx="4" class="arch-card-teal"/>
    <text x="130" y="190" text-anchor="middle" class="arch-t-title">#49 ApiDto &amp; 5-Layer PEP/PDP</text>
    <text x="130" y="210" text-anchor="middle" class="arch-t-sub">Principal / Authz / RowScope</text>
    <text x="130" y="230" text-anchor="middle" class="arch-t-teal">KERNEL + SEAM</text>
  </a>
  <a class="arch-node" href="#section-6-2">
    <rect x="248" y="166" width="210" height="80" rx="4" class="arch-card"/>
    <text x="353" y="190" text-anchor="middle" class="arch-t-title">#34–#36 Controllers &amp; DSL</text>
    <text x="353" y="210" text-anchor="middle" class="arch-t-sub">PlayController / StateApi / CommandDsl</text>
    <text x="353" y="230" text-anchor="middle" class="arch-t-mono">GLUE · HTTP → AppPort</text>
  </a>
  <a class="arch-node" href="#section-6-3">
    <rect x="474" y="166" width="212" height="80" rx="4" class="arch-card"/>
    <text x="580" y="190" text-anchor="middle" class="arch-t-title">#37–#38 ServiceLoader &amp; Routes</text>
    <text x="580" y="210" text-anchor="middle" class="arch-t-sub">ServiceContract / PlayHttpBridge</text>
    <text x="580" y="230" text-anchor="middle" class="arch-t-mono">GLUE · Routing &amp; Contract Check</text>
  </a>
  <a class="arch-node" href="#section-6-4">
    <rect x="702" y="166" width="190" height="80" rx="4" class="arch-card"/>
    <text x="797" y="190" text-anchor="middle" class="arch-t-title">#39 Project Scaffold</text>
    <text x="797" y="210" text-anchor="middle" class="arch-t-sub">build.sbt / dev.conf / serialization</text>
    <text x="797" y="230" text-anchor="middle" class="arch-t-mono">GLUE · ScalaPB + Akka</text>
  </a>

  <rect x="14" y="278" width="892" height="162" rx="5" class="arch-band-amber"/>
  <text x="28" y="300" class="arch-t-band-amber">LAYER 3 · INFRASTRUCTURE &amp; DI RE-ASSEMBLY (Outermost Implementations: Wire Codecs, Stores &amp; Boot)</text>
  <a class="arch-node" href="#section-5-1">
    <rect x="28" y="314" width="204" height="110" rx="4" class="arch-card"/>
    <text x="130" y="338" text-anchor="middle" class="arch-t-title">#29–#33 Protobuf &amp; Adapters</text>
    <text x="130" y="358" text-anchor="middle" class="arch-t-sub">*.proto / *ProtoConverter</text>
    <text x="130" y="376" text-anchor="middle" class="arch-t-sub">*EventAdapter / SnapshotAdapter</text>
    <text x="130" y="394" text-anchor="middle" class="arch-t-sub">DomainProtoSerializer</text>
    <text x="130" y="412" text-anchor="middle" class="arch-t-mono">GLUE · ScalaPB Journal Codec</text>
  </a>
  <a class="arch-node" href="#section-5-2">
    <rect x="248" y="314" width="204" height="110" rx="4" class="arch-card"/>
    <text x="350" y="338" text-anchor="middle" class="arch-t-title">#12 / #24 Repo &amp; DLQ Impl</text>
    <text x="350" y="358" text-anchor="middle" class="arch-t-sub">*RepositoryImpl / *Schema DDL</text>
    <text x="350" y="376" text-anchor="middle" class="arch-t-sub">ReadsideRepositoryImpl</text>
    <text x="350" y="394" text-anchor="middle" class="arch-t-sub">PolicyDlqBury (kn_projection_dlq)</text>
    <text x="350" y="412" text-anchor="middle" class="arch-t-mono">GLUE · ScalikeJDBC / InMem</text>
  </a>
  <a class="arch-node" href="#section-5-3">
    <rect x="468" y="314" width="196" height="110" rx="4" class="arch-card-amber"/>
    <text x="566" y="338" text-anchor="middle" class="arch-t-title">#25 Connectors &amp; Effects</text>
    <text x="566" y="358" text-anchor="middle" class="arch-t-sub">DefaultOutboundConnectors</text>
    <text x="566" y="376" text-anchor="middle" class="arch-t-sub">*ConnectorImpl / *EffectPortImpl</text>
    <text x="566" y="394" text-anchor="middle" class="arch-t-sub">ServerSnapshotProviderImpl</text>
    <text x="566" y="412" text-anchor="middle" class="arch-t-amber">GLUE + Isolated Adapters</text>
  </a>
  <a class="arch-node" href="#section-5-5">
    <rect x="680" y="314" width="212" height="110" rx="4" class="arch-card-dark"/>
    <text x="786" y="338" text-anchor="middle" class="arch-t-title-dark">#38 / #47 / #50 DI &amp; Bootstrap</text>
    <text x="786" y="358" text-anchor="middle" class="arch-t-sub-dark">*Bootstrap (#47 / #38b / #59 Policy)</text>
    <text x="786" y="376" text-anchor="middle" class="arch-t-sub-dark">BootstrapModule + GeneratedBindings</text>
    <text x="786" y="394" text-anchor="middle" class="arch-t-sub-dark">HandwrittenBindings + ProjectionMod</text>
    <text x="786" y="412" text-anchor="middle" class="arch-t-teal">★ RE-ASSEMBLY HUB ★</text>
  </a>

  <rect x="14" y="456" width="892" height="252" rx="5" class="arch-band"/>
  <text x="28" y="478" class="arch-t-band">LAYER 2 · APPLICATION LAYER (Write Hosts, Read Projections, Reactive Policy &amp; Long-Running Sagas)</text>
  <a class="arch-node" href="#section-4-1">
    <rect x="28" y="492" width="204" height="92" rx="4" class="arch-card-amber"/>
    <text x="130" y="516" text-anchor="middle" class="arch-t-title">#7 / #11 Protocol &amp; Helpers</text>
    <text x="130" y="536" text-anchor="middle" class="arch-t-sub">Command / Reply(Accepted/Refused)</text>
    <text x="130" y="554" text-anchor="middle" class="arch-t-sub">Params → Command Unpacking</text>
    <text x="130" y="572" text-anchor="middle" class="arch-t-amber">SEAM + GLUE</text>
  </a>
  <a class="arch-node" href="#section-4-2">
    <rect x="248" y="492" width="204" height="92" rx="4" class="arch-card"/>
    <text x="350" y="516" text-anchor="middle" class="arch-t-title">#6 / #8–#10 Aggregate &amp; Behaviors</text>
    <text x="350" y="536" text-anchor="middle" class="arch-t-sub">EntityKey / tags / commandHandler</text>
    <text x="350" y="554" text-anchor="middle" class="arch-t-sub">runReplyingPolicy + withPost</text>
    <text x="350" y="572" text-anchor="middle" class="arch-t-mono">GLUE · Hosts Domain Rules</text>
  </a>
  <a class="arch-node" href="#section-4-4">
    <rect x="468" y="492" width="212" height="92" rx="4" class="arch-card-teal"/>
    <text x="574" y="516" text-anchor="middle" class="arch-t-title">#51 / #52 StoryPort &amp; @cloze Impl</text>
    <text x="574" y="536" text-anchor="middle" class="arch-t-sub">ExternPorts / EffectsPort / Handler</text>
    <text x="574" y="554" text-anchor="middle" class="arch-t-sub">CallerContractSpec · handwritten Impl</text>
    <text x="574" y="572" text-anchor="middle" class="arch-t-teal">KERNEL + SEAM</text>
  </a>
  <a class="arch-node" href="#section-4-3">
    <rect x="696" y="492" width="196" height="92" rx="4" class="arch-card-amber"/>
    <text x="794" y="516" text-anchor="middle" class="arch-t-title">#12 Repository Port</text>
    <text x="794" y="536" text-anchor="middle" class="arch-t-sub">&lt;Agg&gt;Repository trait</text>
    <text x="794" y="554" text-anchor="middle" class="arch-t-sub">getState / askAsync</text>
    <text x="794" y="572" text-anchor="middle" class="arch-t-amber">SEAM · DIP Boundary</text>
  </a>

  <a class="arch-node" href="#section-4-5">
    <rect x="28" y="600" width="278" height="94" rx="4" class="arch-card-teal"/>
    <text x="167" y="624" text-anchor="middle" class="arch-t-title">#15 / #23 / #26–#28 ReadSide Suite</text>
    <text x="167" y="644" text-anchor="middle" class="arch-t-sub">&lt;View&gt; · QueryService · ReadsideRepository</text>
    <text x="167" y="662" text-anchor="middle" class="arch-t-sub">ApplyEvent / ProjectionHandler / Projection</text>
    <text x="167" y="680" text-anchor="middle" class="arch-t-teal">KERNEL + GLUE · Event → Query View</text>
  </a>
  <a class="arch-node" href="#section-4-6">
    <rect x="322" y="600" width="280" height="94" rx="4" class="arch-card-teal"/>
    <text x="462" y="624" text-anchor="middle" class="arch-t-title">#55–#60 Reactive Policy &amp; PolicyMachine</text>
    <text x="462" y="644" text-anchor="middle" class="arch-t-sub">#55 Decision · #56 Mechanics · #57 Handler</text>
    <text x="462" y="662" text-anchor="middle" class="arch-t-sub">#58 Runner · #60 PolicyMachine(Left→Dispose)</text>
    <text x="462" y="680" text-anchor="middle" class="arch-t-teal">KERNEL + GLUE · Event ⇒ Command Loop</text>
  </a>
  <a class="arch-node" href="#section-4-7">
    <rect x="618" y="600" width="274" height="94" rx="4" class="arch-card-amber"/>
    <text x="755" y="624" text-anchor="middle" class="arch-t-title">#13 / #40–#46 Saga &amp; ExternalBridge</text>
    <text x="755" y="644" text-anchor="middle" class="arch-t-sub">*SagaModule · CompositionHost · EffectFace</text>
    <text x="755" y="662" text-anchor="middle" class="arch-t-sub">*ConnectorPort · #46 ExternalAuthority</text>
    <text x="755" y="680" text-anchor="middle" class="arch-t-amber">KERNEL + SEAM · Cross-Agg &amp; Cross-BC</text>
  </a>

  <rect x="14" y="724" width="892" height="242" rx="5" class="arch-band-teal"/>
  <text x="28" y="746" class="arch-t-band-teal">LAYER 1 · DOMAIN CORE (Innermost Ring · Zero Akka / Play / JDBC Dependencies · Standalone scalac + Mutation)</text>
  <a class="arch-node" href="#section-3-1">
    <rect x="28" y="762" width="278" height="84" rx="4" class="arch-card-teal"/>
    <text x="167" y="786" text-anchor="middle" class="arch-t-title">#1 Value Objects &amp; ExactTypes</text>
    <text x="167" y="806" text-anchor="middle" class="arch-t-sub">Money / AmountDecimal / NavDecimal</text>
    <text x="167" y="826" text-anchor="middle" class="arch-t-teal">KERNEL · Construction-Time Proofs</text>
  </a>
  <a class="arch-node" href="#section-3-2">
    <rect x="322" y="762" width="280" height="84" rx="4" class="arch-card-teal"/>
    <text x="462" y="786" text-anchor="middle" class="arch-t-title">#2 Domain Entity</text>
    <text x="462" y="806" text-anchor="middle" class="arch-t-sub">State / empty / sealed trait Event</text>
    <text x="462" y="826" text-anchor="middle" class="arch-t-teal">KERNEL · Pure Aggregate Model</text>
  </a>
  <a class="arch-node" href="#section-3-3">
    <rect x="618" y="762" width="274" height="84" rx="4" class="arch-card-teal"/>
    <text x="755" y="786" text-anchor="middle" class="arch-t-title">#3 EventHandler (Event Fold)</text>
    <text x="755" y="806" text-anchor="middle" class="arch-t-sub">(State, Event) =&gt; State Fold</text>
    <text x="755" y="826" text-anchor="middle" class="arch-t-teal">KERNEL · Single Truth from EARS post:</text>
  </a>

  <a class="arch-node" href="#section-3-4">
    <rect x="28" y="862" width="278" height="88" rx="4" class="arch-card-teal"/>
    <text x="167" y="886" text-anchor="middle" class="arch-t-title">#4 / #5 / #45 Invariant Rules &amp; Params</text>
    <text x="167" y="906" text-anchor="middle" class="arch-t-sub">(State, Params) =&gt; Either[Err, List[Event]]</text>
    <text x="167" y="926" text-anchor="middle" class="arch-t-teal">KERNEL · Z3 First-Hit + Postconditions</text>
  </a>
  <a class="arch-node" href="#section-3-5">
    <rect x="322" y="862" width="280" height="88" rx="4" class="arch-card-teal"/>
    <text x="462" y="886" text-anchor="middle" class="arch-t-title">#48 Domain Axioms &amp; Replay</text>
    <text x="462" y="906" text-anchor="middle" class="arch-t-sub">replay(events) / checkAxioms(state)</text>
    <text x="462" y="926" text-anchor="middle" class="arch-t-teal">KERNEL · Runtime ALWAYS Invariants</text>
  </a>
  <a class="arch-node" href="#section-3-6">
    <rect x="618" y="862" width="274" height="88" rx="4" class="arch-card-amber"/>
    <text x="755" y="886" text-anchor="middle" class="arch-t-title">#14 / #51 Computations Port &amp; Impl</text>
    <text x="755" y="906" text-anchor="middle" class="arch-t-sub">L1 → .Noop / L2 → handwritten Impl</text>
    <text x="755" y="926" text-anchor="middle" class="arch-t-amber">SEAM · Non-Linear / Domain Compute</text>
  </a>

  <line x1="130" y1="246" x2="130" y2="274" class="arch-edge" marker-end="url(#map-arr-ink)"/>
  <line x1="353" y1="246" x2="353" y2="310" class="arch-edge" marker-end="url(#map-arr-ink)"/>
  <line x1="580" y1="246" x2="580" y2="488" class="arch-edge" marker-end="url(#map-arr-ink)"/>
  <line x1="786" y1="424" x2="786" y2="452" class="arch-edge-teal" marker-end="url(#map-arr-teal)"/>
  <line x1="350" y1="584" x2="350" y2="858" class="arch-edge-teal" marker-end="url(#map-arr-teal)"/>
  <line x1="462" y1="694" x2="462" y2="758" class="arch-edge-amber" marker-end="url(#map-arr-amber)"/>
  <line x1="167" y1="694" x2="167" y2="758" class="arch-edge-teal" marker-end="url(#map-arr-teal)"/>
  <line x1="566" y1="424" x2="566" y2="488" class="arch-edge-amber" marker-end="url(#map-arr-amber)"/>
</svg>
<figcaption>Figure 1: Five-layer Onion Architecture Artifact Type Map for Play CQRS (<code>scala-cqrs-play-service:2</code>). Solid arrows indicate <strong>inward compile-time dependencies</strong> (outer layers depend on inner Ports/Kernels; inner rings never import frameworks); dashed/accent edges show <strong>runtime DI assembly and reactive Event ⇒ Command loops</strong>.</figcaption>
</figure>

### How Decomposed Pieces Re-Assemble Into a Running Service

On first inspection, splitting a service into 60 artifact kinds raises an obvious question: **who actually stitches `FundQuotaRules`, `FundOrderComputationsImpl`, `CashFundPurchaseImpl`, `BankOrderApplyEventSemanticsImpl`, and `PolicyOn*Runner` together at boot?** Figure 2 shows both assembly backbones:

<figure class="co-arch-fig co-arch-map">
<div class="arch-caption-head">FIGURE 02 · DECOMPOSITION &amp; RE-ASSEMBLY WIRING TOPOLOGY (GUICE DI + AKKA RUNTIME)</div>
<svg viewBox="0 0 920 390" width="100%" role="img" aria-label="How decomposed Artifact Types re-assemble via the Guice DI module tree and ApplicationBootstrap into running Akka Sharding and Projection daemons">
  <defs>
    <marker id="wire-arr-ink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-ink"/>
    </marker>
    <marker id="wire-arr-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-teal"/>
    </marker>
    <marker id="wire-arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-amber"/>
    </marker>
  </defs>

  <rect x="14" y="14" width="430" height="360" rx="5" class="arch-band"/>
  <text x="28" y="38" class="arch-t-band">1. PLAY / GUICE DI MODULE TREE (STATIC WIRING)</text>

  <rect x="34" y="56" width="390" height="68" rx="4" class="arch-card-dark"/>
  <text x="229" y="82" text-anchor="middle" class="arch-t-title-dark">BootstrapModule (modules/BootstrapModule.scala)</text>
  <text x="229" y="102" text-anchor="middle" class="arch-t-sub-dark">Binds AggRepositories → installs HandwrittenBindingsModule → eager ApplicationBootstrap</text>

  <rect x="34" y="148" width="390" height="62" rx="4" class="arch-card-amber"/>
  <text x="229" y="172" text-anchor="middle" class="arch-t-title">HandwrittenBindingsModule (handwritten/ · never overwritten)</text>
  <text x="229" y="192" text-anchor="middle" class="arch-t-sub">install(GeneratedBindingsModule) + install(&lt;Ctx&gt;ProjectionModule)</text>

  <rect x="34" y="234" width="212" height="122" rx="4" class="arch-card-teal"/>
  <text x="140" y="258" text-anchor="middle" class="arch-t-title">GeneratedBindingsModule</text>
  <text x="140" y="278" text-anchor="middle" class="arch-t-sub">• L1 Computations → .Noop</text>
  <text x="140" y="296" text-anchor="middle" class="arch-t-sub">• L2 Computations → *Impl</text>
  <text x="140" y="314" text-anchor="middle" class="arch-t-sub">• L3 StoryHandler → *Impl</text>
  <text x="140" y="332" text-anchor="middle" class="arch-t-sub">• PolicySemantics + DlqSink</text>
  <text x="140" y="348" text-anchor="middle" class="arch-t-sub">• HttpRouter + ToolGates</text>

  <rect x="262" y="234" width="162" height="122" rx="4" class="arch-card"/>
  <text x="343" y="258" text-anchor="middle" class="arch-t-title">&lt;Ctx&gt;ProjectionModule</text>
  <text x="343" y="280" text-anchor="middle" class="arch-t-sub">#26 ApplyEventSemantics</text>
  <text x="343" y="298" text-anchor="middle" class="arch-t-sub">→ ApplyEventSemanticsImpl</text>
  <text x="343" y="322" text-anchor="middle" class="arch-t-mono">handwritten/ ReadModel</text>
  <text x="343" y="340" text-anchor="middle" class="arch-t-mono">custom row fold hooks</text>

  <line x1="229" y1="124" x2="229" y2="145" class="arch-edge-teal" marker-end="url(#wire-arr-teal)"/>
  <line x1="140" y1="210" x2="140" y2="231" class="arch-edge-teal" marker-end="url(#wire-arr-teal)"/>
  <line x1="343" y1="210" x2="343" y2="231" class="arch-edge-amber" marker-end="url(#wire-arr-amber)"/>

  <rect x="468" y="14" width="438" height="360" rx="5" class="arch-band-teal"/>
  <text x="482" y="38" class="arch-t-band-teal">2. AKKA RUNTIME BOOTSTRAP &amp; REACTIVE LOOP (DYNAMIC)</text>

  <rect x="488" y="56" width="398" height="68" rx="4" class="arch-card-dark"/>
  <text x="687" y="82" text-anchor="middle" class="arch-t-title-dark">ApplicationBootstrap (mixes in all *Bootstrap traits)</text>
  <text x="687" y="102" text-anchor="middle" class="arch-t-sub-dark">init&lt;Agg&gt;Aggregate + init&lt;View&gt;ReadsideProjection + initPolicyOn&lt;Cmd&gt;Projection</text>

  <rect x="488" y="150" width="188" height="94" rx="4" class="arch-card-teal"/>
  <text x="582" y="174" text-anchor="middle" class="arch-t-title">ClusterSharding Write Ring</text>
  <text x="582" y="194" text-anchor="middle" class="arch-t-sub">EventSourcedBehavior</text>
  <text x="582" y="212" text-anchor="middle" class="arch-t-sub">Behaviors → Rules + EventHandler</text>
  <text x="582" y="230" text-anchor="middle" class="arch-t-sub">EventAdapter → Protobuf Journal</text>

  <rect x="698" y="150" width="188" height="94" rx="4" class="arch-card-amber"/>
  <text x="792" y="174" text-anchor="middle" class="arch-t-title">ShardedDaemonProcess</text>
  <text x="792" y="194" text-anchor="middle" class="arch-t-sub">eventsByTag(ReadJournal)</text>
  <text x="792" y="212" text-anchor="middle" class="arch-t-sub">① ReadSide → ViewTable</text>
  <text x="792" y="230" text-anchor="middle" class="arch-t-sub">② PolicyMachine → EntityKey.ask</text>

  <rect x="488" y="268" width="398" height="88" rx="4" class="arch-card"/>
  <text x="687" y="292" text-anchor="middle" class="arch-t-title">PlayHttpBridge / ServiceLoader → StoryController → StoryImpl</text>
  <text x="687" y="314" text-anchor="middle" class="arch-t-sub">5-Layer Authz (PEP/PDP + RowScope) → ExternPorts/EffectsPort → AggregateProtocol</text>
  <text x="687" y="334" text-anchor="middle" class="arch-t-mono">SagaCoordinatorBootstrap drives cross-aggregate flows &amp; #46 ExternalAuthority</text>

  <line x1="582" y1="124" x2="582" y2="147" class="arch-edge-teal" marker-end="url(#wire-arr-teal)"/>
  <line x1="792" y1="124" x2="792" y2="147" class="arch-edge-amber" marker-end="url(#wire-arr-amber)"/>
  <line x1="676" y1="196" x2="695" y2="196" class="arch-edge" marker-end="url(#wire-arr-ink)"/>
  <line x1="424" y1="90" x2="485" y2="90" class="arch-edge-teal" marker-end="url(#wire-arr-teal)"/>
</svg>
<figcaption>Figure 2: Static assembly walks <code>BootstrapModule → HandwrittenBindingsModule → GeneratedBindingsModule + ProjectionModule</code>, while runtime startup executes inside <code>ApplicationBootstrap</code> mixing in aggregate, readside, and reactive policy bootstraps.</figcaption>
</figure>

---

## 3. Domain Core Layer (Innermost · Zero Framework Dependencies)

The `domain/` package holds the highest-trust **Kernel** and **Seam** artifacts: zero HTTP, Akka, or database knowledge, compiling standalone via offline `scalac`.

### Value Object & ExactType (#1)

<span class="at-badge at-kernel">KERNEL</span> **Problem solved**: Eliminates raw `BigDecimal` / `String` currency mix-ups, precision drift, and unchecked domain enums. Generated from `structures/exactTypes` and `valueObjects` (`Money`, `AmountDecimal`, `NavDecimal`, `BankCashAcknowledgement`), enforcing scale/unit proofs at construction time.

```scala
// generated-scaffold/scala/example/bankwealth/v2/domain/values/Money.scala
sealed abstract case class Money private (amount: BigDecimal, currency: String) {
  def isPositive: Boolean = amount > 0
  def plus(other: Money): Either[iMadzError, Money] =
    if (currency != other.currency) Left(iMadzError("EXACT_UNIT_MISMATCH", "exact units differ"))
    else for {
      lhs <- Money.checkedAmount(amount)
      rhs <- Money.checkedAmount(other.amount)
      result <- Money.checkedAmount(lhs + rhs)
    } yield new Money(result, currency) {}
}
```

### Domain Entity (#2)

<span class="at-badge at-kernel">KERNEL</span> **Problem solved**: Defines each aggregate root's immutable `State`, `empty` baseline, and `sealed trait Event extends CborSerializable` vocabulary from a single structural truth.

```scala
// generated-scaffold/scala/example/bankwealth/v2/domain/entities/FundOrderEntity.scala
object FundOrderEntity {
  final case class State(netAmount: BigDecimal, paymentOutcome: String, taStatus: String)
  def empty: State = State(netAmount = BigDecimal("0.00"), paymentOutcome = "pending", taStatus = "pending")

  sealed trait Event extends CborSerializable
  final case class CashRequestSourceRecorded(principal: String, clientRequestId: String) extends Event
  final case class FundTASharesConfirmed(shares: Long, nav: BigDecimal) extends Event
  type EventHandler = (State, Event) => State
}
```

### EventHandler (#3)

<span class="at-badge at-kernel">KERNEL</span> **Problem solved**: Guarantees Event Sourcing state replay matches EARS `post:` assignments identically, preventing divergence between write guards and state folding.

```scala
// generated-scaffold/scala/example/bankwealth/v2/domain/entities/behaviors/FundQuotaEventHandler.scala
object FundQuotaEventHandler extends EventHandler {
  override def apply(state: State, input: Event): State = input match {
    case event: SubscriptionQuotaReserved =>
      state.copy(
        fundTotalUsed = (state.fundTotalUsed + event.amount),
        accountUsed = state.accountUsed.updated(
          event.accountId,
          (state.accountUsed.getOrElse(event.accountId, BigDecimal("0")) + event.amount))
      )
  }
}
```

### Aggregate Invariant Rules & RuleParams (#4 / #5 / #45)

<span class="at-badge at-kernel">KERNEL</span> **Problem solved**: Encapsulates pure command inputs inside `<Agg>RuleParams.<Cmd>Params` and compiles EARS rules into `InvariantRule[Event, State, Params]` enforcing **DMN FIRST-HIT** order and `checkEventPostconditions`, each tagged with `@knowledge` provenance anchors.

```scala
// generated-scaffold/scala/example/bankwealth/v2/domain/invariants/FundQuotaRules.scala
final class ReserveSubscriptionQuotaRule(hosts: FundQuotaComputations)
    extends InvariantRule[Event, State, ReserveSubscriptionQuotaParams] {
  override def apply(state: State, p: ReserveSubscriptionQuotaParams): Either[iMadzError, List[Event]] = {
    if ((p.amount < state.minPurchase || p.amount > state.maxSingleLimit)) Left(iMadzError("QUOTA_AMOUNT_RANGE", "QUOTA_AMOUNT_RANGE"))
    else if (((state.fundTotalUsed + p.amount) > state.fundTotalCap)) Left(iMadzError("QUOTA_FUND_CAP", "QUOTA_FUND_CAP"))
    else if (((state.accountUsed.getOrElse(p.accountId, BigDecimal("0")) + p.amount) > state.perAccountCap)) Left(iMadzError("QUOTA_ACCOUNT_CAP", "QUOTA_ACCOUNT_CAP"))
    else Right(List(SubscriptionQuotaReserved(p.accountId, p.amount)))
  }
}
```

### Z3 Axioms & Replay (#48)

<span class="at-badge at-kernel">KERNEL</span> **Problem solved**: Turns [Z3 Prover](https://github.com/Z3Prover/z3)-verified `axioms: ALWAYS` into executable runtime/test predicates (`checkAxioms(state)`) paired with deterministic `replay(initial, events)`.

```scala
// generated-scaffold/scala/example/bankwealth/v2/domain/entities/FundQuotaAxioms.scala
object FundQuotaAxioms {
  def replay(initial: State, events: Seq[Event]): State =
    events.foldLeft(initial)(FundQuotaEventHandler.apply)

  def checkAxioms(state: State): Seq[String] = {
    val violated = scala.collection.mutable.ListBuffer.empty[String]
    if (!(state.fundTotalUsed <= state.fundTotalCap)) violated += "AX-Q-1"
    if (state.accountUsed.keys.exists(accountId => !(state.accountUsed.getOrElse(accountId, BigDecimal("0")) <= state.perAccountCap))) violated += "AX-Q-2"
    violated.toSeq
  }
}
```

### Domain Computations Port & L2 @cloze Impl (#14 / #51)

<span class="at-badge at-seam">SEAM</span> **Problem solved**: `L1` aggregates auto-bind `Computations.Noop`; `L2` aggregates (e.g., non-linear `shares * nav <= netAmount`) get a typed `domain/services/<Agg>Computations` trait plus a never-overwritten `handwritten/` `*ComputationsImpl.scala` `@cloze` slot wired via Guice.

---

## 4. Application Layer (Write Protocol, ReadSide, Reactive Policy & Orchestration)

The application ring turns pure domain kernels into scheduled CQRS endpoints, materialized views, reactive `Event => Command` projections, and cross-aggregate sagas.

### Aggregate Protocol & CommandHelpers (#7 / #11)

<span class="at-badge at-seam">SEAM</span> <span class="at-badge at-glue">GLUE</span> **Problem solved**: Defines [Akka Cluster Sharding](https://doc.akka.io/docs/akka/current/typed/cluster-sharding.html) command envelopes (`replyTo: ActorRef[Reply]`, `Accepted(events)` / `Refused(error)`) and pure `Command → RuleParams` extractors so `ActorRef` never leaks into Domain Rules.

```scala
// generated-scaffold/scala/example/bankwealth/v2/application/aggregates/FundOrderProtocol.scala
object FundOrderProtocol {
  sealed trait Command extends CborSerializable
  final case class RecordFundTAConfirmed(shares: Long, nav: BigDecimal, replyTo: ActorRef[Reply]) extends Command
  final case class RequestIndependentRefund(orderId: String, replyTo: ActorRef[Reply]) extends Command
  final case class GetState(replyTo: ActorRef[State]) extends Command

  sealed trait Reply extends CborSerializable
  final case class Accepted(events: Vector[Event]) extends Reply
  final case class Refused(error: iMadzError) extends Reply
  type CommandHandler = (State, Command) => Effect[Event, State]
}
```

### Aggregate, Factory & Behaviors (#6 / #8 / #9 / #10)

<span class="at-badge at-glue">GLUE</span> **Problem solved**: Pure framework **Glue**. `<Agg>Aggregate` exports `EntityKey` and `tags`; `<Agg>Behaviors` adapts pure `Rules` onto Akka persistence via `runReplyingPolicy(rule, helper)(state, cmd).withPost(...).replyWith(cmd.replyTo)`.

```scala
// generated-scaffold/scala/example/bankwealth/v2/application/aggregates/behaviors/FundQuotaBehaviors.scala
private def executionBehavior(state: State, hosts: FundQuotaComputations): PartialFunction[Command, Effect[Event, State]] = {
  case cmd: ReserveSubscriptionQuota =>
    runReplyingPolicy(new FundQuotaRules.ReserveSubscriptionQuotaRule(hosts), ReserveSubscriptionQuotaHelper)(state, cmd)
      .withPost(FundQuotaRules.checkEventPostconditions)
      .replyWith(cmd.replyTo)
}
```

### Aggregate Repository Port (#12)

<span class="at-badge at-seam">SEAM</span> **Problem solved**: Exposes `<Agg>Repository` traits to upper orchestration layers so callers never depend directly on `ClusterSharding`.

### Application Story Port, CallerContractSpec & L3 @cloze Impl (#51 / #52)

<span class="at-badge at-kernel">KERNEL</span> <span class="at-badge at-seam">SEAM</span> **Problem solved**: For `layer: application` EARS stories, generates typed `Request`, `ExternPorts`, `EffectsPort`, `CallerContractSpec` (replacing raw JSON strings with typed idempotency/retry/untrusted-field contracts), and `<Story>Impl.scala` inside `handwritten/`.

```scala
// generated-scaffold/scala/example/bankwealth/v2/application/services/CashFundPurchasePort.scala
trait CashFundPurchaseHandler extends ApplicationService {
  def handle(req: CashFundPurchaseRequest, externs: CashFundPurchaseExternPorts, effects: CashFundPurchaseEffectsPort): Either[iMadzError, CashFundPurchaseSuccessResponse]
}
object CashFundPurchaseCallerContract {
  val spec: CallerContractSpec = CallerContractSpec(
    idempotencyKey = "(principal, clientRequestId)",
    retryPolicy = "at-least-once safe; replayed identical payload must never re-dispatch settlement",
    forbiddenUntrustedFields = Seq("operationId", "investorAccountId", "fundCollectionAccountId")
  )
}
```

### ReadModel View, QueryService & ReadSide Projection (#15 / #23 / #26 / #27 / #28)

<span class="at-badge at-kernel">KERNEL</span> <span class="at-badge at-glue">GLUE</span> **Problem solved**: Realizes CQRS read models via `<View>`, `<View>QueryService`, `ReadsideRepository`, [`Akka Projection`](https://doc.akka.io/docs/akka-projection/current/) definitions, `ProjectionHandler`, and `#26` `ApplyEventSemantics` (bound in `<Context>ProjectionModule` to handwritten `ApplyEventSemanticsImpl`).

```scala
// generated-scaffold/scala/example/bankwealth/v2/application/readmodels/bank_order_readside/BankOrderReadsideProjectionHandler.scala
override def process(envelope: EventEnvelope[Any]): Future[Done] =
  envelope.event match {
    case e: FundOrderEntity.CashRequestSourceRecorded =>
      val base = BankOrderView(clientRequestId = envelope.persistenceId)
      repository.upsert(base.copy(principal = e.principal, clientRequestId = e.clientRequestId)).map(_ => Done)
    case _ => bindings.onUnmatchedEvent(envelope)
  }
```

### Reactive Policy & PolicyMachine (#55–#58 / #60)

<span class="at-badge at-kernel">KERNEL</span> <span class="at-badge at-glue">GLUE</span> **Problem solved**: Wires `WHEN event <SrcAgg>.<SrcEvent> SHALL dispatch <TargetAgg>.<TargetCmd>` specs into fault-tolerant `Event ⇒ Command` projections — accounting for the **6 new families (`#55`–`#60`)** added on top of the 54-family baseline:

- **`#55 policy-decision` (`PolicyOn<Cmd>.scala`)**: Pure `(decide, dispose)` kernel pair + `DefaultSemantics` with zero Akka dependencies;
- **`#56 policy-mechanics` (`PolicyOn<Cmd>Mechanics.scala`)**: Sends commands via `ClusterSharding.entityRefFor(EntityKey, entityId).ask[Reply]`, translating `Refused(err)` into `Left(err)`;
- **`#57 policy-handler` (`PolicyOn<Cmd>Handler.scala`)**: Akka `Handler[EventEnvelope[Any]]` shell decoding events into `PolicyEnvelope` and delegating to `PolicyMachine.run`;
- **`#58 policy-runner` (`PolicyOn<Cmd>Runner.scala`)**: Owns `EventSourcedProvider.eventsByTag` and `ProjectionId`;
- **`#60 projection-runtime-mechanism` (`PolicyMachine.scala` / `FailureVerdict.scala` / `PolicyEnvelope.scala` / `PolicyDlqBury.scala`)**: Shared 4-stage execution pipeline inspecting **every `Left(err)` inside `Future.traverse(commands)(execute)`** — burying `Permanent` verdicts via `PolicyDlqSink.bury` (advancing offsets) while failing the `Future` on `Retryable` verdicts (blocking offset commits for at-least-once replay); daemon registration traits belong to **`#59 policy-bootstrap`** (Section 5.4).

```scala
// application/projection/policy/PolicyMachine.scala (metarch-truthsrc scala-cqrs-play-service:2 @ 0b925ad)
Future
  .traverse(commands)(execute)
  .flatMap { results =>
    val verdicts = results.collect { case Left(err) => dispose(e, err) }
    val permanents = verdicts.collect { case p: FailureVerdict.Permanent => p }
    val retryables = verdicts.collect { case r: FailureVerdict.Retryable => r }
    Future
      .traverse(permanents)(p => bury(envelope, s"$aggType·${p.what}"))
      .flatMap { _ =>
        retryables.headOption match {
          case Some(FailureVerdict.Retryable(err)) =>
            Future.failed(new RuntimeException(s"[policy] $aggType retryable failure: err=${err.code}"))
          case None => Future.successful(())
        }
      }
  }
```

### Orchestration, Saga, EffectFace & ExternalEventBridge (#13 / #16–#21 / #40–#44 / #46)

<span class="at-badge at-kernel">KERNEL</span> <span class="at-badge at-seam">SEAM</span> **Problem solved**: Unifies multi-step Sagas (`#40`–`#44` superseding legacy `#16`–`#21`), toolgate connectors, effect hosts, and cross-bounded-context ACL integration (`#46 ExternalEventBridge`).

---

## 5. Infrastructure Layer (Serialization, Persistence & Re-Assembly Wiring)

The outermost implementation ring handles Protobuf persistence, SQL/in-memory stores, external connectors, and—critically—**re-assembling every decomposed Artifact Type into a live system**.

### Protobuf Schema, ProtoConverters & Serialization Adapters (#29–#33)

<span class="at-badge at-glue">GLUE</span> **Problem solved**: Protects [Akka Persistence Typed](https://doc.akka.io/docs/akka/current/typed/persistence.html) event journals with schema-evolved [ScalaPB](https://scalapb.github.io/) Protobuf messages, converters, `EventAdapter`/`SnapshotAdapter`, and `DomainProtoSerializer` with explicit `ClassTag` registries.

```scala
// infrastructure/persistence/FundOrderEventAdapter.scala
class FundOrderEventAdapter extends EventAdapter[Event, pb.FundOrderEventPO] with FundOrderProtoConverters {
  override def manifest(event: Event): String = "FundOrderEventPO"
  override def toJournal(event: Event): pb.FundOrderEventPO = encodeFundOrderEventPO(event)
  override def fromJournal(envelope: pb.FundOrderEventPO, manifest: String): EventSeq[Event] =
    EventSeq.single(decodeFundOrderEventPO(envelope))
}
```

### Repository Impl, ReadSide DDL & PolicyDlqBury (#12 / #24)

<span class="at-badge at-glue">GLUE</span> **Problem solved**: Emits SQL `CREATE TABLE IF NOT EXISTS` DDLs (`<View>ReadsideSchema`), [ScalikeJDBC](http://scalikejdbc.org/) upsert repositories (`<View>RepositoryImpl`), aggregate repository sharding adapters, and `PolicyDlqBury` writing dead-letter rows to `kn_projection_dlq`.

### Outbound Connectors & Effect Implementations (#25)

<span class="at-badge at-glue">GLUE</span> **Problem solved**: Supplies default runnable adapters (`DefaultOutboundConnectors`, `InMemoryStore`) and handwritten extension points (`*ConnectorImpl`, `*EffectPortImpl`).

### Bootstrap Traits (#47 / #38b / #38c / #38d / #59 policy-bootstrap)

<span class="at-badge at-glue">GLUE</span> **Problem solved**: Isolates Akka cluster initialization ceremonies into composable traits (`<Agg>Bootstrap`, `<View>ReadsideBootstrap`, `PolicyOn<Cmd>Bootstrap`, `SagaCoordinatorBootstrap`) using `EventSourcedBehavior` and `ShardedDaemonProcess`.

```scala
// infrastructure/bootstrap/FundQuotaBootstrap.scala
EventSourcedBehavior[Command, Event, State](
  persistenceId = PersistenceId.ofUniqueId(persistenceId),
  emptyState = initial,
  commandHandler = FundQuotaAggregate.commandHandler(hosts),
  eventHandler = FundQuotaEventHandler.apply
).withTagger(_ => Set(tag))
 .withRetention(RetentionCriteria.snapshotEvery(numberOfEvents = 100, keepNSnapshots = 3))
 .eventAdapter(new FundQuotaEventAdapter)
 .snapshotAdapter(new FundQuotaSnapshotAdapter)
```

### Guice DI Wiring & ApplicationBootstrap (#38 / #50)

<span class="at-badge at-glue">GLUE</span> **Problem solved**: The **global re-assembly switch** chaining [Google Guice](https://github.com/google/guice) and [Play Framework](https://www.playframework.com/) modules in four clear hops:

1. **`BootstrapModule`**: Binds `<Agg>RepositoryImpl`, loads `HandwrittenBindingsModule` via `installOptionalModule`, and marks `ApplicationBootstrap` `.asEagerSingleton()`.
2. **`HandwrittenBindingsModule` (`handwritten/` never overwritten)**: Installs `GeneratedBindingsModule` and `<Context>ProjectionModule`, offering a single safe override point for custom production bindings.
3. **`GeneratedBindingsModule`**: Closes all DI loops (`L1 Computations → .Noop`, `L2 Computations → *Impl`, `L3 StoryHandler → *Impl`, `ReadsideRepositoryImpl`, `PolicyDlqSink`, `PolicyOn<Cmd>Semantics`, `HttpRouter`).
4. **`ApplicationBootstrap`**: Mixes in every `<Agg>Bootstrap`, `<View>ReadsideBootstrap`, and `PolicyOn<Cmd>Bootstrap` trait and initializes them at startup.

---

## 6. Interfaces & Service Runtime Layer (HTTP, 5-Layer Authz & Build Scaffold)

The service interface shell translates HTTP traffic, enforces 5-layer authorization, and packages the complete Play/sbt build.

### 5-Layer Authz PEP/PDP & ApiDto (#49)

<span class="at-badge at-kernel">KERNEL</span> <span class="at-badge at-seam">SEAM</span> **Problem solved**: Standardizes `Principal`, `AuthzDecisionQuery`, `AuthorizationPort`, `EntitlementPort`, CSRF checks, and HTTP error status mapping.

### HTTP Controllers, AggregateStateApiController & CommandDsl (#34–#36)

<span class="at-badge at-glue">GLUE</span> **Problem solved**: Thin Play controllers merge request inputs and `Principal`, invoke `<Story>Handler`, and enforce post-handler **`RowScope` anti-IDOR verification** (`403 FORBIDDEN_ROW_SCOPE` on mismatch), alongside `#34 AggregateStateApiController` read probes.

```scala
// interfaces/http/CashFundPurchaseController.scala
handler.handle(appReq, externs, effects) match {
  case Left(err) => HttpResponse(status = HttpStatusMapper.statusForRejection(err.code), body = Map("ok" -> false, "code" -> err.code))
  case Right(res) =>
    if (rowScopeDenied) HttpResponse(status = 403, body = Map("ok" -> false, "code" -> "FORBIDDEN_ROW_SCOPE"))
    else HttpResponse(status = 200, body = withView)
}
```

### ServiceContract, ServiceLoader, PlayHttpBridge & Routes (#37 / #38)

<span class="at-badge at-glue">GLUE</span> **Problem solved**: Enforces startup endpoint pinning (`requireInstalled`) and routes HTTP verbs/paths (`conf/routes`) through `PlayHttpBridge`.

### Project Scaffold & Runtime Configs (#39)

<span class="at-badge at-glue">GLUE</span> **Problem solved**: Emits `build.sbt` (mounting both `generated-scaffold/scala` and `handwritten/scala` plus `sbt-protoc`/ScalaPB), `conf/serialization.conf`, and self-contained `conf/dev.conf`.

---

## 7. Verification & BDD Oracle Layer (Executable Proof Gates)

Verification artifacts are first-class generated outputs—never afterthought prose.

### Gherkin Features, Executable Oracles & Locked Manifest (#53)

<span class="at-badge at-kernel">KERNEL</span> **Problem solved**: Materializes Z3 witnesses into Gherkin `.feature` files, TypeScript `node:test` specs, ScalaTest `AnyFunSuite` suites, and a SHA-256 anti-tamper lock `manifest.sha256.json`.

### Mutation Gate & Onion DIP Gate (#54)

<span class="at-badge at-glue">GLUE</span> **Problem solved**: `verify-v2` runs automated `checkOnionDipBoundaries` (verifying 0 inward-dependency violations across `domain/` and `application/`) plus `mutation-gate.mjs` (requiring 100% mutant kill rates on guarded rules).

---

## 8. End-to-End Walkthrough: Tracing a Bank Wealth Purchase Through All 5 Onion Layers

Tracing [`bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo) alongside the newly wired Reactive Policy loop shows how all 60 families (64 artifact kinds) collaborate at runtime:

1. **HTTP Ingress (Layer 4)**: `POST /api/v1/bankwealth/bank-cash-submit-port/submit` enters `CashFundPurchaseController` via `PlayHttpBridge` and `HttpRouter`, authenticated and role-checked by `ApiDto` (#49).
2. **Application Seam (Layer 2)**: `CashFundPurchaseImpl` implements `CashFundPurchaseHandler` (#51), checks `ExternPorts.requestExists` & `payloadMatchesOriginal` against `CallerContractSpec` (`(principal, clientRequestId)`, forbidding `investorAccountId`), then executes `pin` and `dispatch`.
3. **Write Sharding → Domain Kernel (Layer 2 Glue → Layer 1 Kernel)**: Commands hit `FundQuotaAggregate.EntityKey` and `FundQuotaBehaviors` → `FundQuotaRules.ReserveSubscriptionQuotaRule` (#45) → `Money` (#1) arithmetic → emits `SubscriptionQuotaReserved` (#2) → `FundQuotaEventHandler` (#3) updates state → `FundQuotaAxioms.checkAxioms` (#48) validates `ALWAYS` invariants.
4. **Journal & Reactive Consumers (Layer 3 + Layer 2)**: `FundQuotaEventAdapter` + `DomainProtoSerializer` (#29–#33) persist Protobuf payloads and tags; `ShardedDaemonProcess` feeds both:
   - **ReadSide**: `BankOrderReadsideProjectionHandler` (#28) upserts rows via `BankOrderReadsideRepositoryImpl` (#24) for `BankOrderViewQueryService` (#15);
   - **Reactive Policy**: `PolicyOn<Cmd>Runner` feeds `PolicyMachine.run` → `PolicyOn<Cmd>.DefaultSemantics.decide` → `PolicyOn<Cmd>Mechanics` (`EntityKey.ask`), inspecting every `Left(err)` via `dispose` to either bury `Permanent` failures in `PolicyDlqBury` or trigger at-least-once retries on `Retryable` failures.

---

## 9. Artifact Type Upgrade Sync Contract & Future Target Blueprint (Rust / Axum)

To guarantee this map **never drifts from `metarch-truthsrc`**, CI enforces a machine-verifiable lock chain (documented in `docs/artifact-map-authoring-contract.md`):

1. **Upstream Catalog Hash (`metarch-truthsrc`)**: `lib/v2/surface-registry.mjs` scans `generators/*/generator.json` (`schemaVersion === "truthsrc.product-generator/v2"`), hashes `artifactFamilyCoverage`, `producers`, and `artifactKinds` into `catalogSha256`, and embeds `targetArtifactCatalogs` in `exportCapabilitiesLock()`.
2. **Site Lock Synchronization**: `tools/sync-site-facts.mjs --write` snapshots `targetArtifactCatalogs` into `assets/data/facts.lock.json`; `assets/data/artifact-maps.lock.json` maps every target generator to its bilingual article `slug`, `catalogSha256`, `truthsrcShort`, and `bankShort`.
3. **CI Gate (`site_ci.yml`)**: `sync-site-facts.mjs --check` fails whenever `metarch-truthsrc` upgrades any Artifact Type (changing `catalogSha256`) or adds a new target generator without updating the corresponding bilingual map article (embedding matching `truthsrcShort` + 12-char `catalogSha256`) and lock files.

### Future Target Requirement: Rust (`rust-cqrs-axum-service:2`) Blueprint

As introduced in our [Extending metarch-truthsrc Code Generators guide](https://co-arising.github.io/articles/metarch-truthsrc-extending-code-generator-20261126/), whenever a future Rust target generator (`Axum + Tokio + SQLx + Prost + Tonic`) is added under `generators/`, it MUST ship a companion bilingual Onion Architecture Map covering this exact 5-layer mapping:

<div class="article-table">
<table>
<thead>
<tr><th>Onion Layer</th><th>Play / Scala Role</th><th>Rust Target Artifact Type (e.g. <code>rust-cqrs-axum-service:2</code>)</th><th>Role</th></tr>
</thead>
<tbody>
<tr><td><strong>Layer 1 · Domain Core</strong></td><td><code>Money</code>, <code>*Entity</code>, <code>*EventHandler</code>, <code>*Rules</code>, <code>*Axioms</code>, <code>*Computations</code></td><td>Zero-dependency crate <code>domain</code>: Newtypes / <code>rust_decimal</code>, <code>enum Event</code>, <code>fn apply(state, ev)</code>, <code>fn handle(state, params) -&gt; Result&lt;Vec&lt;Event&gt;, DomainError&gt;</code>, <code>trait Computations</code></td><td><span class="at-badge at-kernel">KERNEL</span> + <span class="at-badge at-seam">SEAM</span></td></tr>
<tr><td><strong>Layer 2 · Application</strong></td><td><code>*Protocol</code>, <code>*StoryPort</code>, <code>*ReadsideProjection</code>, <code>PolicyMachine</code></td><td>Crate <code>application</code>: command/reply DTOs, <code>async trait Repository</code>, typed <code>CallerContract</code>, <code>ReadsideProjector</code>, and <code>PolicyMachine::run</code> effect loop</td><td><span class="at-badge at-kernel">KERNEL</span> + <span class="at-badge at-seam">SEAM</span> + <span class="at-badge at-glue">GLUE</span></td></tr>
<tr><td><strong>Layer 3 · Infrastructure</strong></td><td><code>*.proto</code> / <code>*Serializer</code> / <code>*RepositoryImpl</code> / <code>GeneratedBindingsModule</code></td><td>Crate <code>infrastructure</code>: <code>prost</code> `.proto` codecs, <code>sqlx</code> Outbox/ReadSide/DLQ implementations, <code>AppState</code> DI container, and worker tasks</td><td><span class="at-badge at-glue">GLUE</span></td></tr>
<tr><td><strong>Layer 4 · Interfaces &amp; Runtime</strong></td><td><code>*Controller</code>, <code>ApiDto</code>, <code>HttpRouter</code>, <code>build.sbt</code></td><td>Crate <code>interfaces</code> + binary entrypoint: <code>axum::Router</code>, Tower 5-layer Authz extractors, <code>RowScope</code> response guard, and <code>Cargo.toml</code> workspace</td><td><span class="at-badge at-kernel">KERNEL</span> + <span class="at-badge at-glue">GLUE</span></td></tr>
<tr><td><strong>Layer 5 · Verification</strong></td><td>Gherkin + ScalaTest + Mutation Gate + DIP Check</td><td><code>cargo test</code> BDD oracles, <code>cargo-mutants</code> guard kill gate, and workspace dependency checks forbidding <code>tokio/axum/sqlx</code> inside <code>domain</code></td><td><span class="at-badge at-kernel">KERNEL</span> + <span class="at-badge at-glue">GLUE</span></td></tr>
</tbody>
</table>
</div>

### Further Reading

- [metarch-truthsrc Repository](https://github.com/co-arising/metarch-truthsrc) · [Generator Architecture (`CODEGEN.md`)](https://github.com/co-arising/metarch-truthsrc/blob/main/CODEGEN.md) · [EARS v2 Grammar Reference](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/reference/ears_v2_grammar_reference.md)
- [bank-wealth-demo Pilot Repository](https://github.com/co-arising/bank-wealth-demo) · [co-arising 2.0 GA Complete Guide](https://co-arising.github.io/articles/co-arising-v2-ga-prd-to-running-guide-20261126/)
- [The Onion Architecture (Jeffrey Palermo)](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/) · [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/)
