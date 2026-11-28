# Play CQRS (scala-cqrs-play-service:2) Artifact Type Architecture Map: Onion Layers, Decomposition & Re-Assembly, and Target Code Reference

> Version lock: `metarch-truthsrc` @ [`ab207e7`](https://github.com/co-arising/metarch-truthsrc) (`scala-cqrs-play-service:2` · `catalogSha256: 156b224f3614` · 60 unified families / 14 producers / 64 `artifactKinds`) · `bank-wealth-demo` @ [`b5cadc0`](https://github.com/co-arising/bank-wealth-demo) · Controlled by `assets/data/artifact-maps.lock.json` and the `sync-site-facts` CI gate (cross-referenced with `F-32` / `F-33` on the status page).

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
<div class="arch-caption-head">FIGURE 01 · PLAY CQRS (scala-cqrs-play-service:2 @ 8950ba3) ONION ARTIFACT TYPE MAP (CLICKABLE)</div>
<svg viewBox="0 0 1120 1110" width="100%" role="img" aria-label="Concentric 5-layer Onion Architecture Artifact Type Map for Play CQRS showing Domain Core, Application, Infrastructure, Interfaces/Runtime, and Verification Oracle Gate with Kernel/Seam/Glue roles and inward DIP edges">
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

  <ellipse cx="560" cy="480" rx="540" ry="472" class="arch-ring-iface"/>
  <ellipse cx="560" cy="480" rx="470" ry="400" class="arch-ring-infra"/>
  <ellipse cx="560" cy="480" rx="368" ry="296" class="arch-ring-app"/>
  <ellipse cx="560" cy="480" rx="220" ry="168" class="arch-ring-domain"/>

  <text x="560" y="42" text-anchor="middle" class="arch-t-band">LAYER 4 · INTERFACES &amp; PLAY RUNTIME</text>
  <text x="560" y="60" text-anchor="middle" class="arch-t-chip-sub">HTTP Entry · 5-Layer Authz · Build Scaffold</text>

  <text x="560" y="114" text-anchor="middle" class="arch-t-band-amber">LAYER 3 · INFRASTRUCTURE &amp; DI RE-ASSEMBLY</text>
  <text x="560" y="212" text-anchor="middle" class="arch-t-band">LAYER 2 · APPLICATION LAYER</text>

  <text x="560" y="354" text-anchor="middle" class="arch-t-band-teal">LAYER 1 · DOMAIN CORE</text>
  <text x="560" y="372" text-anchor="middle" class="arch-t-chip-sub">Zero Akka / Play / JDBC Deps</text>
  <text x="560" y="574" text-anchor="middle" class="arch-t-chip-teal">KERNEL + SEAM · Standalone scalac</text>

  <a class="arch-node" href="#section-3-1">
    <rect x="392" y="398" width="156" height="44" rx="5" class="arch-card-teal"/>
    <text x="470" y="417" text-anchor="middle" class="arch-t-chip-title">#1 Value Objects</text>
    <text x="470" y="434" text-anchor="middle" class="arch-t-chip-sub">Money · ExactTypes</text>
  </a>
  <a class="arch-node" href="#section-3-2">
    <rect x="572" y="398" width="156" height="44" rx="5" class="arch-card-teal"/>
    <text x="650" y="417" text-anchor="middle" class="arch-t-chip-title">#2 Domain Entity</text>
    <text x="650" y="434" text-anchor="middle" class="arch-t-chip-sub">State · sealed Event</text>
  </a>
  <a class="arch-node" href="#section-3-3">
    <rect x="392" y="452" width="156" height="44" rx="5" class="arch-card-teal"/>
    <text x="470" y="471" text-anchor="middle" class="arch-t-chip-title">#3 EventHandler</text>
    <text x="470" y="488" text-anchor="middle" class="arch-t-chip-sub">(State, Evt) =&gt; State</text>
  </a>
  <a class="arch-node" href="#section-3-4">
    <rect x="572" y="452" width="156" height="44" rx="5" class="arch-card-teal"/>
    <text x="650" y="471" text-anchor="middle" class="arch-t-chip-title">#4/#5/#45 Rules</text>
    <text x="650" y="488" text-anchor="middle" class="arch-t-chip-sub">Z3 Guard + Postcond</text>
  </a>
  <a class="arch-node" href="#section-3-5">
    <rect x="392" y="506" width="156" height="44" rx="5" class="arch-card-teal"/>
    <text x="470" y="525" text-anchor="middle" class="arch-t-chip-title">#48 Axioms/Replay</text>
    <text x="470" y="542" text-anchor="middle" class="arch-t-chip-sub">ALWAYS Invariants</text>
  </a>
  <a class="arch-node" href="#section-3-6">
    <rect x="572" y="506" width="156" height="44" rx="5" class="arch-card-amber"/>
    <text x="650" y="525" text-anchor="middle" class="arch-t-chip-title">#14/#51 Compute</text>
    <text x="650" y="542" text-anchor="middle" class="arch-t-chip-sub">L1 Noop / L2 Impl</text>
  </a>

  <a class="arch-node" href="#section-4-1">
    <rect x="380" y="228" width="170" height="52" rx="5" class="arch-card-amber"/>
    <text x="465" y="249" text-anchor="middle" class="arch-t-chip-title">#7/#11 Protocol</text>
    <text x="465" y="267" text-anchor="middle" class="arch-t-chip-sub">Command · Reply · Params</text>
  </a>
  <a class="arch-node" href="#section-4-2">
    <rect x="570" y="228" width="170" height="52" rx="5" class="arch-card"/>
    <text x="655" y="249" text-anchor="middle" class="arch-t-chip-title">#6/#8–#10 Behaviors</text>
    <text x="655" y="267" text-anchor="middle" class="arch-t-chip-sub">EntityKey · Rules Host</text>
  </a>
  <a class="arch-node" href="#section-4-3">
    <rect x="212" y="440" width="122" height="76" rx="5" class="arch-card-amber"/>
    <text x="273" y="463" text-anchor="middle" class="arch-t-chip-title">#12 Repo Port</text>
    <text x="273" y="482" text-anchor="middle" class="arch-t-chip-sub">Repository trait</text>
    <text x="273" y="501" text-anchor="middle" class="arch-t-chip-amber">SEAM · DIP</text>
  </a>
  <a class="arch-node" href="#section-4-4">
    <rect x="786" y="440" width="122" height="76" rx="5" class="arch-card-teal"/>
    <text x="847" y="463" text-anchor="middle" class="arch-t-chip-title">#51/#52 Story</text>
    <text x="847" y="482" text-anchor="middle" class="arch-t-chip-sub">ExternPorts/Impl</text>
    <text x="847" y="501" text-anchor="middle" class="arch-t-chip-teal">KERNEL + SEAM</text>
  </a>
  <a class="arch-node" href="#section-4-5">
    <rect x="320" y="640" width="152" height="52" rx="5" class="arch-card-teal"/>
    <text x="396" y="661" text-anchor="middle" class="arch-t-chip-title">#15/#26+ ReadSide</text>
    <text x="396" y="679" text-anchor="middle" class="arch-t-chip-sub">View · Query · Proj</text>
  </a>
  <a class="arch-node" href="#section-4-6">
    <rect x="484" y="666" width="152" height="52" rx="5" class="arch-card-teal"/>
    <text x="560" y="687" text-anchor="middle" class="arch-t-chip-title">#55–#60 Policy</text>
    <text x="560" y="705" text-anchor="middle" class="arch-t-chip-sub">Event ⇒ Cmd Loop</text>
  </a>
  <a class="arch-node" href="#section-4-7">
    <rect x="648" y="640" width="152" height="52" rx="5" class="arch-card-amber"/>
    <text x="724" y="661" text-anchor="middle" class="arch-t-chip-title">#13/#40–#46 Saga</text>
    <text x="724" y="679" text-anchor="middle" class="arch-t-chip-sub">Cross-Agg · Bridge</text>
  </a>

  <a class="arch-node" href="#section-5-1">
    <rect x="356" y="128" width="196" height="48" rx="5" class="arch-card"/>
    <text x="454" y="148" text-anchor="middle" class="arch-t-chip-title">#29–#33 Protobuf Codec</text>
    <text x="454" y="166" text-anchor="middle" class="arch-t-chip-sub">*.proto · SnapAdapter</text>
  </a>
  <a class="arch-node" href="#section-5-2">
    <rect x="568" y="128" width="196" height="48" rx="5" class="arch-card"/>
    <text x="666" y="148" text-anchor="middle" class="arch-t-chip-title">#12 / #24 Repo &amp; DLQ</text>
    <text x="666" y="166" text-anchor="middle" class="arch-t-chip-sub">ScalikeJDBC · DLQ Bury</text>
  </a>
  <a class="arch-node" href="#section-5-3">
    <rect x="358" y="784" width="194" height="48" rx="5" class="arch-card-amber"/>
    <text x="455" y="804" text-anchor="middle" class="arch-t-chip-title">#25 Connectors &amp; Effects</text>
    <text x="455" y="822" text-anchor="middle" class="arch-t-chip-sub">Outbound · ServerSnapshot</text>
  </a>
  <a class="arch-node" href="#section-5-5">
    <rect x="568" y="784" width="194" height="48" rx="5" class="arch-card-dark"/>
    <text x="665" y="804" text-anchor="middle" class="arch-t-chip-title-dark">#38/#47/#50 DI &amp; Boot ★</text>
    <text x="665" y="822" text-anchor="middle" class="arch-t-chip-sub-dark">Guice + PolicyBootstrap</text>
  </a>

  <a class="arch-node" href="#section-6-1">
    <rect x="16" y="36" width="228" height="66" rx="5" class="arch-card-teal"/>
    <text x="130" y="57" text-anchor="middle" class="arch-t-chip-title">#49 ApiDto &amp; 5-Layer Authz</text>
    <text x="130" y="75" text-anchor="middle" class="arch-t-chip-sub">Principal · PEP/PDP · RowScope</text>
    <text x="130" y="92" text-anchor="middle" class="arch-t-chip-teal">KERNEL + SEAM</text>
  </a>
  <a class="arch-node" href="#section-6-2">
    <rect x="876" y="36" width="228" height="66" rx="5" class="arch-card"/>
    <text x="990" y="57" text-anchor="middle" class="arch-t-chip-title">#34–#36 Controllers &amp; DSL</text>
    <text x="990" y="75" text-anchor="middle" class="arch-t-chip-sub">PlayController · StateApi</text>
    <text x="990" y="92" text-anchor="middle" class="arch-t-chip-tag">GLUE · HTTP → AppPort</text>
  </a>
  <a class="arch-node" href="#section-6-3">
    <rect x="16" y="854" width="228" height="66" rx="5" class="arch-card"/>
    <text x="130" y="875" text-anchor="middle" class="arch-t-chip-title">#37–#38 ServiceLoader</text>
    <text x="130" y="893" text-anchor="middle" class="arch-t-chip-sub">ServiceContract · HttpBridge</text>
    <text x="130" y="910" text-anchor="middle" class="arch-t-chip-tag">GLUE · Routes &amp; Contract</text>
  </a>
  <a class="arch-node" href="#section-6-4">
    <rect x="876" y="854" width="228" height="66" rx="5" class="arch-card"/>
    <text x="990" y="875" text-anchor="middle" class="arch-t-chip-title">#39 Project Scaffold</text>
    <text x="990" y="893" text-anchor="middle" class="arch-t-chip-sub">build.sbt · dev.conf · Akka</text>
    <text x="990" y="910" text-anchor="middle" class="arch-t-chip-tag">GLUE · ScalaPB + Play</text>
  </a>

  <line x1="28" y1="480" x2="84" y2="480" class="arch-edge" marker-end="url(#map-arr-ink)"/>
  <line x1="98" y1="480" x2="186" y2="480" class="arch-edge-teal" marker-end="url(#map-arr-teal)"/>
  <text x="142" y="466" text-anchor="middle" class="arch-t-chip-teal">DIP →</text>

  <line x1="1092" y1="480" x2="1036" y2="480" class="arch-edge" marker-end="url(#map-arr-ink)"/>
  <line x1="1022" y1="480" x2="934" y2="480" class="arch-edge-teal" marker-end="url(#map-arr-teal)"/>
  <text x="978" y="466" text-anchor="middle" class="arch-t-chip-teal">← DIP</text>

  <line x1="348" y1="336" x2="398" y2="376" class="arch-edge-teal" marker-end="url(#map-arr-teal)"/>
  <line x1="772" y1="336" x2="722" y2="376" class="arch-edge-teal" marker-end="url(#map-arr-teal)"/>

  <text x="560" y="918" text-anchor="middle" class="arch-t-chip-tag">Teal = Kernel · Amber = Seam · Neutral = Glue · Dark ★ = DI Hub · → Inward DIP</text>

  <rect x="16" y="972" width="1088" height="122" rx="6" class="arch-band-red arch-dash"/>
  <text x="34" y="996" class="arch-t-band-red">LAYER 5 · VERIFICATION &amp; BDD ORACLE GATE (Independent Audit Bar · Never Enters Production Runtime)</text>
  <a class="arch-node" href="#section-7-1">
    <rect x="34" y="1012" width="520" height="66" rx="5" class="arch-card-teal"/>
    <text x="294" y="1035" text-anchor="middle" class="arch-t-chip-title">#53 Gherkin Features · TS/Scala Oracles · manifest.sha256.json</text>
    <text x="294" y="1057" text-anchor="middle" class="arch-t-chip-sub">KERNEL · Locked Oracles &amp; Bidirectional Witness · Domain / App / HTTP</text>
  </a>
  <a class="arch-node" href="#section-7-2">
    <rect x="566" y="1012" width="520" height="66" rx="5" class="arch-card-red"/>
    <text x="826" y="1035" text-anchor="middle" class="arch-t-chip-title">#54 Mutation Gate · Onion DIP Gate · sbt/scalac Partition</text>
    <text x="826" y="1057" text-anchor="middle" class="arch-t-chip-sub">GLUE · 100% Guard Mutation Kill + 0 DIP Violations + Boundary Audit</text>
  </a>

  <line x1="306" y1="972" x2="306" y2="928" class="arch-edge-red" marker-end="url(#map-arr-red)"/>
  <line x1="814" y1="972" x2="814" y2="928" class="arch-edge-red" marker-end="url(#map-arr-red)"/>
</svg>
<figcaption>Figure 1: Concentric five-layer Onion Architecture Artifact Type Map for Play CQRS (<code>scala-cqrs-play-service:2</code>). From outside in: Layer 4 Interfaces, Layer 3 Infrastructure (including the DI re-assembly hub), Layer 2 Application, and the innermost Layer 1 Domain Core, with the offline Layer 5 Verification &amp; DIP Gate mounted below.</figcaption>
</figure>

### How Decomposed Pieces Re-Assemble Into a Running Service

On first inspection, splitting a service into 60 artifact kinds raises an obvious question: **who actually stitches `FundQuotaRules`, `FundOrderComputationsImpl`, `CashFundPurchaseImpl`, `BankOrderApplyEventSemanticsImpl`, and `PolicyOn*Runner` together at boot?** Figure 2 shows both assembly backbones:

<figure class="co-arch-fig co-arch-map">
<div class="arch-caption-head">FIGURE 02 · DECOMPOSITION &amp; RE-ASSEMBLY WIRING TOPOLOGY (GUICE DI + AKKA RUNTIME)</div>
<svg viewBox="0 0 960 448" width="100%" role="img" aria-label="How decomposed Artifact Types re-assemble via the Guice DI module tree and ApplicationBootstrap into running Akka Sharding and Projection daemons">
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

  <rect x="14" y="14" width="452" height="420" rx="5" class="arch-band"/>
  <text x="28" y="38" class="arch-t-band">1. PLAY / GUICE DI MODULE TREE (STATIC WIRING)</text>

  <rect x="30" y="54" width="420" height="82" rx="4" class="arch-card-dark"/>
  <text x="240" y="78" text-anchor="middle" class="arch-t-title-dark">BootstrapModule (modules/)</text>
  <text x="240" y="99" text-anchor="middle" class="arch-t-sub-dark">Binds AggRepositories → HandwrittenBindingsModule</text>
  <text x="240" y="117" text-anchor="middle" class="arch-t-sub-dark">→ eager singleton ApplicationBootstrap</text>

  <rect x="30" y="160" width="420" height="74" rx="4" class="arch-card-amber"/>
  <text x="240" y="183" text-anchor="middle" class="arch-t-title">HandwrittenBindingsModule (handwritten/)</text>
  <text x="240" y="203" text-anchor="middle" class="arch-t-sub">Safe zone · install(GeneratedBindingsModule)</text>
  <text x="240" y="220" text-anchor="middle" class="arch-t-sub">+ install(&lt;Ctx&gt;ProjectionModule)</text>

  <rect x="30" y="260" width="204" height="152" rx="4" class="arch-card-teal"/>
  <text x="132" y="284" text-anchor="middle" class="arch-t-chip-title">GeneratedBindingsModule</text>
  <text x="132" y="306" text-anchor="middle" class="arch-t-chip-sub">• L1 Computations → .Noop</text>
  <text x="132" y="325" text-anchor="middle" class="arch-t-chip-sub">• L2 Computations → *Impl</text>
  <text x="132" y="344" text-anchor="middle" class="arch-t-chip-sub">• L3 StoryHandler → *Impl</text>
  <text x="132" y="363" text-anchor="middle" class="arch-t-chip-sub">• PolicySemantics + DlqSink</text>
  <text x="132" y="382" text-anchor="middle" class="arch-t-chip-sub">• HttpRouter + ToolGates</text>

  <rect x="246" y="260" width="204" height="152" rx="4" class="arch-card"/>
  <text x="348" y="284" text-anchor="middle" class="arch-t-chip-title">&lt;Ctx&gt;ProjectionModule</text>
  <text x="348" y="308" text-anchor="middle" class="arch-t-chip-sub">#26 ApplyEventSemantics</text>
  <text x="348" y="328" text-anchor="middle" class="arch-t-chip-sub">→ ApplyEventSemanticsImpl</text>
  <text x="348" y="354" text-anchor="middle" class="arch-t-mono">handwritten/ ReadModel</text>
  <text x="348" y="373" text-anchor="middle" class="arch-t-mono">custom row fold hooks</text>

  <line x1="240" y1="136" x2="240" y2="157" class="arch-edge-teal" marker-end="url(#wire-arr-teal)"/>
  <line x1="132" y1="234" x2="132" y2="257" class="arch-edge-teal" marker-end="url(#wire-arr-teal)"/>
  <line x1="348" y1="234" x2="348" y2="257" class="arch-edge-amber" marker-end="url(#wire-arr-amber)"/>

  <rect x="494" y="14" width="452" height="420" rx="5" class="arch-band-teal"/>
  <text x="508" y="38" class="arch-t-band-teal">2. AKKA RUNTIME BOOTSTRAP &amp; REACTIVE LOOP (DYNAMIC)</text>

  <rect x="510" y="54" width="420" height="82" rx="4" class="arch-card-dark"/>
  <text x="720" y="78" text-anchor="middle" class="arch-t-title-dark">ApplicationBootstrap (*Bootstrap Traits)</text>
  <text x="720" y="99" text-anchor="middle" class="arch-t-sub-dark">init&lt;Agg&gt;Aggregate + init&lt;View&gt;ReadsideProjection</text>
  <text x="720" y="117" text-anchor="middle" class="arch-t-sub-dark">+ initPolicyOn&lt;Cmd&gt;Projection</text>

  <rect x="510" y="160" width="202" height="106" rx="4" class="arch-card-teal"/>
  <text x="611" y="184" text-anchor="middle" class="arch-t-title">ClusterSharding Write</text>
  <text x="611" y="206" text-anchor="middle" class="arch-t-sub">EventSourcedBehavior</text>
  <text x="611" y="225" text-anchor="middle" class="arch-t-sub">Behaviors → Rules + Fold</text>
  <text x="611" y="244" text-anchor="middle" class="arch-t-sub">EventAdapter → Protobuf</text>

  <rect x="728" y="160" width="202" height="106" rx="4" class="arch-card-amber"/>
  <text x="829" y="184" text-anchor="middle" class="arch-t-title">ShardedDaemonProcess</text>
  <text x="829" y="206" text-anchor="middle" class="arch-t-sub">eventsByTag(ReadJournal)</text>
  <text x="829" y="225" text-anchor="middle" class="arch-t-sub">① ReadSide → ViewTable</text>
  <text x="829" y="244" text-anchor="middle" class="arch-t-sub">② PolicyMachine → ask</text>

  <rect x="510" y="292" width="420" height="120" rx="4" class="arch-card"/>
  <text x="720" y="317" text-anchor="middle" class="arch-t-title">PlayHttpBridge → StoryController → StoryImpl</text>
  <text x="720" y="340" text-anchor="middle" class="arch-t-sub">5-Layer Authz (PEP/PDP + RowScope) → ExternPorts</text>
  <text x="720" y="359" text-anchor="middle" class="arch-t-sub">→ EffectsPort → AggregateProtocol</text>
  <text x="720" y="384" text-anchor="middle" class="arch-t-mono">SagaCoordinatorBootstrap + #46 ExternalAuthority</text>

  <line x1="611" y1="136" x2="611" y2="157" class="arch-edge-teal" marker-end="url(#wire-arr-teal)"/>
  <line x1="829" y1="136" x2="829" y2="157" class="arch-edge-amber" marker-end="url(#wire-arr-amber)"/>
  <line x1="712" y1="213" x2="725" y2="213" class="arch-edge" marker-end="url(#wire-arr-ink)"/>
  <line x1="450" y1="95" x2="507" y2="95" class="arch-edge-teal" marker-end="url(#wire-arr-teal)"/>
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
// application/projection/policy/PolicyMachine.scala (metarch-truthsrc scala-cqrs-play-service:2 @ 8950ba3)
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
