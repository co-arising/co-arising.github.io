# bank-wealth-demo Complete Guide: Quick Start, Onion Architecture Deep Dive, and Extending New Code Generators

This end-to-end engineering handbook connects four core threads across [`bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo) and [`metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) for architects, domain engineers, and AI Agent teams:

1. **Full-Loop Quick Start**: Validate the truth tree, compile 14 formal semantic products with auto-derived technical bindings, generate the Play/Akka CQRS Scala project, run 12-gate anchor verification, and launch Docker (MongoDB 4.4 + MySQL 8.0) to play through five real financial scenarios in your browser.
2. **Generated Onion Architecture Deep Dive**: Walk through every Artifact Type across `domain`, `application`, `interfaces`, `infrastructure`, and `modules`, showing how outer layers depend strictly inward, how handwritten and infrastructure implementations are injected behind inner interfaces, and the DDD principles grounding each boundary.
3. **Extending New Code Generators**: Pinpoint the exact seam in the truth pipeline to hook a new target language/framework, list the seven mandatory contract obligations, and specify **the six-piece material pack that enables an AI Agent to infer and deliver a new code generator reliably**.
4. **Bridging to the Next Big Story**: Show how this deterministic downstream architecture connects cleanly with the upstream [co-arising EARS 1.0 Technical Specification](https://co-arising.github.io/articles/co-arising-ears-spec-20261123/) to form a complete "mathematically verified upstream + deterministic onion-architecture downstream" loop.

> **Honest Scope Notice**: `bank-wealth-demo` is a **local teaching and architectural verification demo** using an embedded Mock TA simulator and fixed local demo credentials. It moves no real money and makes no production banking claim. For dated acceptance records and open public-delivery items, always consult the [status ledger](https://co-arising.github.io/status/).

## 1. Why Start with bank-wealth-demo: One Complete Verifiable Engineering Loop

In conventional software delivery, requirements docs, domain models, service code, distributed transaction scripts, and test suites evolve independently and inevitably drift apart. The `co-arising` loop pulls them into a single deterministic pipeline:

```text
  [1. Truth Tree truth/bank-wealth/]     161 readable YAML atoms (3 aggregates · 2 sagas · 4 pipelines · 149 @rules)
                │
                ▼  truthsrc validate + roundtrip (structural + byte-identical roundtrip gate)
  [2. Canonical Model & Knowledge Graph] canonical.json + SQLite graph (392 nodes / 413 edges, blast-radius ready)
                │
                ▼  deriveProjectRequest (auto-derives Saga/Runtime/Execution bindings) + compileProductSet
  [3. 14 Typed Semantic Products]        reference-layout / domain-decision / domain-folds / saga-runtime / execution ...
                │
                ▼  scala-cqrs-play-service (16 unified Emitter Families + ReadSide derivation)
  [4. 161 Generated Onion-Arch Files]    + 36 handwritten isolation-zone files (unmanagedSourceDirectories, never overwritten)
                │
                ▼  truthsrc verify-project (12 consistency checks + 5,090 anchor locations / 629 exact byte spans)
  [5. Build, Unit Tests & Docker Demo]   sbt Compile/compile test (370 sources 0 errors · 24/24 tests) + 5 live playbooks
```

A key recent milestone is **automatic derivation of technical bindings**: authors no longer hand-write verbose low-level JSON binding boilerplate. The former 8 files (2,100+ lines) under `bindings/implementation/*.json` are now derived automatically in memory by [`lib/project/derive-bindings.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/derive-bindings.mjs) inside [`metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) — leaving [`bank-wealth-demo/truthsrc.project.json`](https://github.com/co-arising/bank-wealth-demo/blob/main/truthsrc.project.json) focused solely on the truth tree, exact decimal types, runtime pins, and external handwritten roots.

## 2. Quick Start: From Truth Tree to Generated Code, Line-Back Anchors, and Live Docker Walkthroughs

### 2.1 Prerequisites and Paired Checkouts

| Component | Requirement | Role |
|---|---|---|
| **Node.js** | **Node ≥ 22.13.0** (built-in `node:sqlite`) | Truth validation, graph export, code generation, anchor verification, and demo launcher |
| **JDK** | **JDK 11** (e.g., Eclipse Temurin / AdoptOpenJDK 11) | Compiling and running Play 2.8 / Scala 2.13 |
| **sbt** | **sbt 1.x** | Compiling ScalaPB `.proto` schemas, Scala sources, and building the `stage` distribution |
| **Docker** | Docker Desktop / Engine (`docker compose`) | Running isolated `mongo:4.4` (event journal) and `mysql:8.0` (read-side projection) containers |
| **Paired Repos** | Adjacent `metarch-truthsrc` and `bank-wealth-demo` checkouts | Keeps toolchain and demo project versions aligned |

Clone both repositories into a shared parent workspace:

```bash
export CO_ARISING_WS="$PWD"
git clone https://github.com/co-arising/metarch-truthsrc.git
git clone https://github.com/co-arising/bank-wealth-demo.git
export TRUTHSRC_CLI="$CO_ARISING_WS/metarch-truthsrc/bin/truthsrc.js"
cd "$CO_ARISING_WS/bank-wealth-demo"
```

> **Why is MongoDB pinned to 4.4?** The event journal driver `akka-persistence-mongo-rxmongo 3.0.8` (ReactiveMongo 1.0.10) depends on the MongoDB 4.4 wire protocol. [`docker-compose.demo.yml`](https://github.com/co-arising/bank-wealth-demo/blob/main/docker-compose.demo.yml) maps the containers to `127.0.0.1:19001` (MongoDB) and `127.0.0.1:19002` (MySQL), avoiding any collision with local `27017`/`3306` ports.

### 2.2 Step 1: Validate the Truth Tree and Build the Knowledge Graph

Before generating a single line of Scala or starting a JVM, Node.js alone verifies syntax, semantic integrity, and lossless roundtrip fidelity across the entire truth tree:

```bash
# 1. Truth validation (0 hard findings) + roundtrip check (160 business atoms byte-identical)
npm run validate

# 2. Compile all 14 formal semantic products (Saga / Runtime / Execution bindings auto-derived)
npm run compile

# 3. Export the local SQLite knowledge graph (queryable via CLI, MCP, or browser Explorer)
node "$TRUTHSRC_CLI" graph --tree truth/bank-wealth --out bank.graph.sqlite
```

You can also explore the same verified snapshot in your browser with zero installation using the [Explorer Graph view](https://co-arising.github.io/explorer/) (blast radius for `SipInstallmentFailed`, lineage, orphans, and invariant queries).

### 2.3 Step 2: Auto-Derive Bindings, Generate Code, and Compile/Test

```bash
# 1. Prepare pinned 0.3.0 runtime engines (saga-core / monarch-persistence / common-core) and generate into generated/current/
npm run project

# 2. Compile all 12 .proto files + 370 Scala sources, run 5 suites / 24 unit tests, and package stage binary
(cd generated/current && sbt --batch "Compile/compile" test stage)
```

Two architectural properties are immediately visible:

- **Physical isolation between generated and handwritten code**: `generated/current/` receives **161 generated files**; the 36 handwritten implementation files remain in [`handwritten/scala/`](https://github.com/co-arising/bank-wealth-demo/tree/main/handwritten/scala) and are mounted via `unmanagedSourceDirectories` in `build.sbt`. Re-running `npm run project` never overwrites handwritten code.
- **Full green unit verification**: `UnitTestMain` asserts isolated test configuration (`journal=testkit`, `snapshot=testkit`, `network=denied`), followed by 5 ScalaTest suites (`GeneratedActorStateSpec`, `GeneratedDomainRoundtripSpec`, `GeneratedFiniteHostSpec`, `GeneratedServiceConfigurationSpec`, `GeneratedUnitStorageSpec`) passing **24/24 tests**.

### 2.4 Step 3: Verify Bidirectional Lineage and Source Anchors

How do you prove that every generated rule, event handler, and port contract genuinely originated from a specific truth declaration and has not drifted? Run the 12-gate verification check:

```bash
# 1. Full 12-check verification (input fingerprints, graph parity, ownership, 1,310 knowledge keys, 629 exact spans, 0 unresolved)
node "$TRUTHSRC_CLI" verify-project \
  --project truthsrc.project.json \
  --out generated/current

# 2. Forward query: trace ReserveFunds from business truth to every generated location and byte span
node "$TRUTHSRC_CLI" query-project \
  --project truthsrc.project.json \
  --out generated/current \
  --knowledge ReserveFunds \
  --format human

# 3. Reverse query: map a concrete generated file and line back to its originating truth atom
node "$TRUTHSRC_CLI" query-project \
  --project truthsrc.project.json \
  --out generated/current \
  --file app/example/bankwealth/domain/invariants/CreditBalanceRules.scala \
  --line 18 \
  --format human
```

To try bidirectional navigation right now without local setup, open the [Explorer Code view](https://co-arising.github.io/explorer/?view=code#code). The published snapshot contains **358 files** (161 pure business YAML truth files + 161 generated files + 36 handwritten files, 0 withheld), where every `@knowledge` annotation is verified against both content digests and exact UTF-8 byte spans.

### 2.5 Step 4: Start Docker Databases and Run Automated Smoke Verification

```bash
# 1. Start MongoDB 4.4 + MySQL 8.0 (wait ~10–15s until both report healthy)
docker compose -f docker-compose.demo.yml up -d
docker compose -f docker-compose.demo.yml ps

# 2. Run the one-command end-to-end smoke check (allocates an isolated namespace and cleans up automatically)
npm run demo:smoke
```

`npm run demo:smoke` boots the real Play HTTP service backed by MongoDB, MySQL, and the embedded Mock TA worker, then verifies:

- Browser entry `/bank/v1` and client script `/bank/v1/client-script`;
- **21 negative security checks** (unauthenticated access, wrong role, missing/bad CSRF, disallowed Origin, and client field-injection rejection);
- **51 business HTTP requests** (100.00 CNY cash purchase + idempotent replay on identical `clientRequestId` + `409 Conflict` on conflicting payload + business-clock tick confirming `80.0000` shares from Mock TA + SIP create/pause/resume/2-installment dispatch + strict ledger conservation: `customer=88000` minor units + `collection=12000` minor units = `100000`).

### 2.6 Step 5: Interactive Browser Walkthrough — Five Core Playbooks

```bash
# Start the interactive local demo (default confirmed scenario at http://127.0.0.1:19000/bank/v1)
npm run demo:start
```

Open **`http://127.0.0.1:19000/bank/v1`** (open two tabs to operate Customer and Operator side by side):

- **Customer credentials**: Bearer `demo-customer-token` / CSRF `demo-customer-csrf` (seeded with `100000` minor units = `1,000.00 CNY`)
- **Operator credentials**: Bearer `demo-operator-token` / CSRF `demo-operator-csrf` (drives the manual business clock and inspects pending operations)

| Playbook | Launch Command & Actions | What You Prove Against the Truth Tree |
|---|---|---|
| **Playbook A · Cash Purchase & TA Share Confirmation** | Default `npm run demo:start` → Customer submits `clientRequestId=demo-cash-001`, `fundCode=fund`, `minorUnits=10000` → Inspect **Fund order** → Operator ticks `slot=1` → Re-inspect **Fund order** | **Payment succeeded ≠ investment succeeded**: before the clock tick, `paymentStatus=succeeded` while `taStatus=accepted` (debited 100.00 CNY, zero shares yet); after ticking, `taStatus=confirmed` with `shares="80.0000"`, `nav="1.2345"`. |
| **Playbook B · TA Rejection & Independent Refund Saga** | Stop with `Ctrl+C`, restart with `node tools/demo-start.mjs --scenario rejected --namespace demo_refund` → Customer submits `10000` minor units → Operator ticks `slot=1` → Inspect order & balance | **Independent refund ≠ compensating a committed payment**: `paymentStatus=succeeded`, `taStatus=rejected`, `refundStatus=succeeded`, carrying a distinct `refundOperationId` while restoring customer balance to `100000`. |
| **Playbook C · Bounded Installment Plan (SIP)** | Under `confirmed`, Customer calls **Create SIP plan** (`minorUnits=1000`, `effectiveSlot=0`, `dueSlots=10, 20`) → exercise **Pause / Resume** → Operator ticks `slot=10, 20, 21` | **Every installment reuses the exact cash rules**: no duplicate money path; slots hit while paused are explicitly classified as skipped; active slots trigger payment + TA confirmation (`successTotal=2`). |
| **Playbook D · Unknown Outcomes & Duplicate Adversaries** | Launch `--scenario unknown` or `--scenario duplicate-conflicting`; or resubmit the same `clientRequestId` with a different amount | **Unknown stays unknown**: never rewritten into failure or success and never implicitly re-debited; identical replay is idempotent while conflicting payloads return `409 Conflict`. |
| **Playbook E · Isolated Namespaces & Cleanup** | Pass `--namespace exp_a` / `--namespace exp_b` for fresh experiments without wiping DBs; clean up with `docker compose -f docker-compose.demo.yml down -v` | Full flag reference and troubleshooting live in [`DEMO-QUICK-START.md`](https://github.com/co-arising/bank-wealth-demo/blob/main/docs/DEMO-QUICK-START.md). |

## 3. Inside the Generated Onion Architecture: Layers, Artifact Types, and Dependency Inversion

The `scala-cqrs-play-service` generator does not dump flat files into one package. It emits a disciplined **Onion Architecture (Hexagonal Ports & Adapters) + Classic CQRS/ES** topology guarded by four static conformance gates in [`lib/conformance/audit.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/conformance/audit.mjs).

### 3.1 The Four Concentric Layers and the Composition Root

```text
  ┌───────────────────────────────────────────────────────────────────────────────────┐
  │  Layer 5 · modules (Composition Root — sole place wiring interfaces to impls)     │
  │    • BootstrapModule (generated): binds generated repos + discovers handwritten   │
  │    • HandwrittenBindingsModule (handwritten): binds domain services, JDBC, auth   │
  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │
  │  │  Layer 4 · infrastructure (Adapters)         │  Layer 3 · interfaces (Edge) │  │
  │  │    • repositories.{aggregate,projection}     │    • interfaces.api (gen)    │  │
  │  │    • persistence / converters / protobuf     │      ApiCommands/Wire/Keys   │  │
  │  │    • process (Host/HostIO) & connectors      │    • interfaces.web (manual) │  │
  │  │    • bootstrap (Sharding/Daemon/PlayLoader)  │      Controllers/Pages/Json  │  │
  │  │  ┌───────────────────────────────────────────────────────────────────────┐  │  │
  │  │  │  Layer 2 · application (Orchestration & Ports — zero infra/protobuf)  │  │  │
  │  │  │    • aggregates.{Protocol,Aggregate,Behaviors,CommandHelpers,Repo}    │  │  │
  │  │  │    • process.<flow>.{SagaDefinition,Execution,Ports} & protocol       │  │  │
  │  │  │    • connectors.{Gateway port,EffectProtocol}                         │  │  │
  │  │  │    • readmodels.{Views,Projection,ProjectionHandler,ReadsideRepo}     │  │  │
  │  │  │  ┌─────────────────────────────────────────────────────────────────┐  │  │  │
  │  │  │  │  Layer 1 · domain (Pure Core — zero Akka/Play/IO · zero throw)  │  │  │  │
  │  │  │  │    • domain.values (nominal VOs + exact decimal Money/Amount)   │  │  │  │
  │  │  │  │    • domain.entities & behaviors (State/Event ADT + pure Fold)  │  │  │  │
  │  │  │  │    • domain.invariants & params (InvariantRule + @knowledge)    │  │  │  │
  │  │  │  │    • domain.services (pure computation port trait *Computations)│  │  │  │
  │  │  │  └─────────────────────────────────────────────────────────────────┘  │  │  │
  │  │  └───────────────────────────────────────────────────────────────────────┘  │  │
  │  └─────────────────────────────────────────────────────────────────────────────┘  │
  └───────────────────────────────────────────────────────────────────────────────────┘
      Strict inward dependencies: modules ──▶ infrastructure & interfaces ──▶ application ──▶ domain
```

Logical package topology and physical module layout are orthogonal via [`lib/layout/layout-strategy.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/layout/layout-strategy.mjs): the exact same logical onion packages can emit either a single-module Play tree (`app/example/<ctx>/...`) or a five-module SBT workspace (`domain/`, `application/`, `interfaces/`, `infrastructure/`, `bootstrap/`) without altering a single `package` or `import` statement.

### 3.2 Complete Layer-by-Layer Artifact Type Catalog

Mapped directly from the 161 generated files and 36 handwritten files in `bank-wealth-demo`:

| Layer | Package | Artifact Type | Representative Files | Ownership | Responsibility |
|---|---|---|---|---|---|
| **Domain (Core)** | `domain.values` | `value-object` | `Money.scala`, `AccountId.scala`, `FundOrderId.scala` | Generated | Immutable nominal value objects; exact decimal types carry `scale/precision/SupportedUnits` and safe arithmetic returning `Either[iMadzError, T]` |
| **Domain (Core)** | `domain.entities` | `domain-entity` | `CreditBalanceEntity.scala`, `FundOrderEntity.scala`, `SipPlanEntity.scala` | Generated | Pure `State` case class, `Event` sealed trait (extending `CborSerializable`), and `empty` initial state |
| **Domain (Core)** | `domain.entities.behaviors` | `event-handler` | `*EventHandler.scala` | Generated | Pure event fold `applyEvent(state, event): State` reading only event fields with zero IO or clock access |
| **Domain (Core)** | `domain.invariants` & `.params` | `invariant-rule`, `rule-params` | `*Rules.scala`, `*RuleParams.scala` | Generated | `InvariantRule` command pre-guards and event post-invariants carrying exact `@knowledge` anchors |
| **Domain (Core)** | `domain.services` | `domain-service` (port) | `CreditBalanceComputations.scala`, `FundOrderComputations.scala` | Generated trait / Handwritten impl | Pure `DomainService` port trait declaring `Either[iMadzError, T]` signatures only; implementations stay in the handwritten zone |
| **Application** | `application.aggregates` | `aggregate-protocol`, `aggregate-root`, `aggregate-factory` | `*Protocol.scala`, `*Aggregate.scala`, `*AggregateFactory.scala` | Generated | Command/Reply ADTs, Akka Typed `EntityTypeKey`, sharded event `tags`, and aggregate factories |
| **Application** | `application.aggregates.behaviors` | `command-helper`, `aggregate-behavior`, `external-event-bridge` | `*CommandHelpers.scala`, `*Behaviors.scala`, `FundOrderExternalEvents.scala` | Generated | `CommandHelper` + `runReplyingPolicy` orchestrating guard → emit → fold → reply; external event authority validation |
| **Application** | `application.aggregates.repository` | `aggregate-repository-port` | `CreditBalanceRepository.scala`, `FundOrderRepository.scala` | Generated trait | Aggregate repository **port trait** (`find(id): EntityRef[Command]`) consumed by application orchestration |
| **Application** | `application.process.<flow>` & `.protocol` | `saga-definition`, `execution-plan`, `process-ports`, `process-messages` | `BankPaymentSagaDefinition.scala`, `BankCashPaymentExecution.scala`, `BankPaymentPorts.scala`, `BankPaymentMessages.scala`, `*Step.scala` | Generated | Cross-aggregate TCC Saga definition (version + digest), Monarch finite execution plan, phase port traits, and grouped message modules |
| **Application** | `application.connectors` | `connector-gateway-port`, `connector-protocol` | `BankTaGateway.scala`, `BankTaEffectProtocol.scala`, `BankSipDispatchGateway.scala` | Generated trait | Pure application gateway ports and observation/reconciliation DTOs for external effects (TA, SIP dispatch) |
| **Application** | `application.readmodels` | `readmodel-views`, `projection`, `projection-handler`, `readside-repo-port` | `ReadModelViews.scala`, `BankJournalReadsideProjection.scala`, `*ProjectionHandler.scala`, `*Repository.scala` | Generated | Read-side view DTOs, Akka `JdbcProjection.exactlyOnce` projection wiring, and read-side repository **port trait** |
| **Interfaces** | `interfaces.api` | `api-dto-modules` | `ApiCommands.scala`, `ApiWire.scala`, `ApiResponses.scala`, `ApiAcknowledgements.scala`, `ApiKeys.scala` | Generated | Role-grouped companion-object DTO modules preventing flat file explosion |
| **Interfaces** | `interfaces.web` | `http-controller`, `page-renderer`, `http-json` | `BankPagesController.scala`, `BankQueryController.scala`, `BankServiceEndpoints.scala`, `BankBrowserPages.scala` | Handwritten | Play HTTP controllers, auth/CSRF guards, JSON codecs, and interactive browser pages |
| **Infrastructure** | `infrastructure.repositories.*` | `aggregate-repository-impl`, `readside-repository-impl` | `*RepositoryImpl.scala`, `BankJournalReadsideRepositoryImpl.scala`, `*Schema.scala`, `*Domain.scala` | Generated | Concrete repository adapters: `ClusterSharding.entityRefFor` on the write side, ScalikeJDBC/MySQL on the read side |
| **Infrastructure** | `infrastructure.persistence` & `app/protobuf/` | `proto-schema`, `proto-converter`, `event-adapter`, `snapshot-adapter`, `serializer`, `state-codec` | `shared_value_objects.proto`, `fund_order.proto`, `*ProtoConverters.scala`, `*EventAdapter.scala`, `DomainProtoSerializer.scala`, `*StateCodec.scala` | Generated | ScalaPB wire schemas, domain ↔ proto converters, Akka Persistence event/snapshot adapters, and Monarch/Saga state codecs |
| **Infrastructure** | `infrastructure.process` & `.connectors` | `saga-host`, `effect-host`, `connector-impl` | `BankPaymentHost.scala`, `BankTaEffectHost.scala` (gen); `MockTAClient.scala`, `BankPaymentBindings.scala` (manual) | Generated host + Handwritten adapter | Event-sourced host actors (retry, coalescing, crash recovery) plus handwritten adapters to external/mock systems |
| **Infrastructure** | `infrastructure.bootstrap` | `application-bootstrap`, `aggregate-bootstrap`, `projection-bootstrap`, `service-loader` | `ApplicationBootstrap.scala`, `*Bootstrap.scala`, `BankServiceContract.scala`, `BankServiceLoader.scala` | Generated | ClusterSharding initialization, ShardedDaemonProcess setup, persistence retention/backoff, and Play service loader |
| **Modules (Root)** | `modules` | `bootstrap-module`, `handwritten-bindings-module` | `BootstrapModule.scala` (gen), `HandwrittenBindingsModule.scala` (manual) | Generated + Handwritten | Guice DI composition root wiring every outer/handwritten implementation to its inner port trait |

### 3.3 Dependency Direction and Automated Architectural Gates

Onion architecture here is not slideware — it is mechanically audited by [`lib/conformance/audit.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/conformance/audit.mjs):

- **Strict inward direction**: `modules` → `infrastructure` & `interfaces` → `application` → `domain`.
- **Domain purity gate (Gate 1 `domain-dip` & `domain-purity`)**: Scans every file under `domain/**` and flags a P0 violation if any `akka.`, `play.`, `.application.`, `.infrastructure.`, or `.interfaces.` reference appears, or if imperative escapes (`throw`, `require(`, `return`, `null`, `Future.failed`, `new *Exception`) leak into domain logic.
- **Application persistence-isolation gate (Gate 1 `application-dip`)**: Scans `application/**` and rejects any import of `.infrastructure.` or `com.google.protobuf.*`, keeping use cases, sagas, and projections completely decoupled from SQL tables and Protobuf wire types.
- **Anti-file-explosion modularization**: DTOs in `interfaces.api`, `application.process.protocol`, `application.readmodels`, and `application.connectors` are grouped into role companion-object modules via [`value-object-package.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/derivation/value-object-package.mjs) using purely structural suffix rules with zero business-name hardcoding.

### 3.4 How Implementations Become Interfaces Injected into the Core

Dependency Inversion (DIP) works across **three concrete injection paths** — without global mutable singletons and without fragile `BEGIN MANUAL` comment markers:

1. **Path 1 · Domain Computation Ports (`domain.services` ← `handwritten/scala/.../domain/services/impl/`)**:
   - The generator emits `trait CreditBalanceComputations extends DomainService` in `domain.services`.
   - `CreditBalanceRules` and `CreditBalanceBehaviors` depend strictly on that trait.
   - Handwritten `BankBalanceComputations` implements the trait in the isolation zone, and [`HandwrittenBindingsModule.scala`](https://github.com/co-arising/bank-wealth-demo/blob/main/handwritten/scala/example/bankwealth/modules/HandwrittenBindingsModule.scala) binds `bind(classOf[CreditBalanceComputations]).toInstance(BankBalanceComputations)`.
2. **Path 2 · Aggregate & Read-Side Repository Ports (`application.*.repository` ← `infrastructure.repositories.*`)**:
   - Application code depends only on `trait CreditBalanceRepository` and `trait BankJournalReadsideRepository`.
   - Infrastructure provides `CreditBalanceRepositoryImpl` (wrapping `ClusterSharding`) and `BankJournalReadsideRepositoryImpl` (wrapping `DataSource`).
   - Generated `BootstrapModule` wires the generated repositories and calls `installOptionalModule("example.bankwealth.modules.HandwrittenBindingsModule")` to discover and install handwritten bindings automatically.
3. **Path 3 · Cross-Aggregate Saga & External Effect Ports (`application.process` / `application.connectors` ← `infrastructure.bootstrap.*PortBindings`)**:
   - Generated `BankPaymentPorts` and `BankTaGateway` define typed phase and effect contracts (`OperationBinding[Input, Receipt]`, `CompletionBinding[Original, Result]`).
   - Generated `BankPaymentPortBindings` verifies every obligation's `implementation.id` and `version` at startup (preventing silent mis-wiring).
   - Handwritten `BankPaymentBindings` and `BankTaEffectBindings` supply the live actor/TA bindings and are injected into the event-sourced hosts without leaking into orchestration logic.

### 3.5 DDD and Clean Architecture Principles Behind Every Choice

| Architectural Choice | DDD / Clean Architecture Principle | Engineering Failure Mode Prevented |
|---|---|---|
| Nominal VOs & exact decimal `Money` in `domain.values` | **Ubiquitous Language & Value Object Immutability** | Eliminates primitive obsession (`String`/`Double`); prevents swapping `AccountId` with `FundOrderId` at compile time and bans floating-point rounding drift. |
| Pure `Entity` + `EventHandler` + `InvariantRule` core | **Aggregate as Consistency Boundary** | Every aggregate invariant is deterministically unit-testable with zero cluster or DB; event replay and live commands execute the exact same pure fold. |
| Strict separation of `Saga` ([`saga-core`](https://github.com/MadPolaris/saga-core)) and `Pipeline` ([`monarch-core`](https://github.com/MadPolaris/monarch-core) + [`monarch-persistence`](https://github.com/MadPolaris/monarch-persistence)) | **Eventual Consistency & Explicit Process Boundaries** | **Sagas own transaction boundaries; pipelines own flow order** — preventing ad-hoc distributed transactions hidden inside HTTP handlers or callbacks. |
| Inner port traits + `modules` Composition Root | **Dependency Inversion Principle (DIP) & Hexagonal Architecture** | Swapping DB drivers, serializers, or external TA clients touches only outer adapters while leaving domain rules untouched. |
| Event-sourced write side + `Akka Projection` read side | **CQRS & Event Sourcing** | Write side enforces strict invariants on append-only facts; read side serves pagination and queries independently. |
| Physical handwritten isolation (`unmanagedSourceDirectories`) | **Open/Closed Principle & Explicit Ownership** | Eliminates brittle manual-block merging; truth edits regenerate all 161 files cleanly while preserving all 36 handwritten files and catching contract breaks at compile time. |

## 4. Extending New Code Generators: Integration Seam, Contract Obligations, and AI Agent Specification

If you want to build a new generator targeting **Java Spring Boot**, **Kotlin/Ktor**, **Go**, **Rust**, or **TypeScript/NestJS** from the same truth tree, where do you hook in and what must you provide?

### 4.1 The Exact Seam: Consume the 14 Compiled Semantic Products, Never Raw YAML

**Never parse raw YAML files under `truth/` in a new generator.** Raw YAML includes macro-expansion syntax, split file ownership, and cross-file references. `metarch-truthsrc` exposes a language-agnostic, statically verified seam: the **14 Compiled Semantic Products** produced by `compileProductSet`:

```text
  truth/ (YAML truth tree)
     │  [Shared Frontend — reuse as-is]  validateTree → roundtrip → compileTreeWithSources
     ▼
  canonical.json + sourceIndex
     │  [Shared Contract Compiler — reuse as-is]  deriveProjectRequest (auto-bindings) → compileProductSet
     ▼
  ══════════════ Stable Extension Seam: 14 Compiled Semantic Products (JSON) ══════════════
  • reference-layout@1        Qualified symbol table for all types, aggregates, commands, events, ports
  • exact-value-types@1       Exact decimal precision / scale / supported unit constraints
  • exact-value-codecs@1      Lossless wire & persistence minor-unit codec specs
  • domain-decision@4         Ordered command pre-guards AST, error codes, event bindings, computation calls
  • domain-dependencies@6     Complete dependency graph across state, commands, events, and domain services
  • domain-folds@6            Deterministic event-to-state fold statement ASTs
  • domain-external-events@2  External event producer & authority contracts
  • saga-contract@1           Cross-aggregate TCC participants, steps, phases, and compensation static IR
  • saga-runtime-contract@1   Runtime versions, digests, args & receipt codec pins
  • execution-contract@1      Monarch finite pipeline plans, input/output slots, and recovery policies
  • saga-host-contract@2      Saga host entry, association keys, result kinds, and port obligations
  • effect-host-contract@2    External effect idempotency keys, observation FSM, and reconciliation obligations
  • artifact-contract@3       Service deployment boundary, HTTP endpoints, projection stores, impl pins
  • product-design@1          Five-plane product design projections
  ═════════════════════════════════════════════════════════════════════════════════════════
     │  [Your new generator implements ONLY these two layers]
     ├──▶ Layer A · Derivation (lib/derivation/<target>/): Semantic Products → Family Input Contracts
     └──▶ Layer B · Emitter Families (emitter/families/ & generators/<target>/): Pure Deterministic Renderers
```

By entering at this seam, every new target generator inherits YAML parsing, lossless roundtrip verification, static type/guard/fold checking, automatic technical binding derivation, SQLite knowledge graph generation, MCP querying, and the 12-check anchor verifier for free.

### 4.2 Seven Mandatory Obligations for Any New Code Generator

Under `metarch-truthsrc`'s fail-closed discipline, any new generator under `generators/<target-name>/` must satisfy seven explicit obligations:

1. **Manifest & Minimal Footprint Obligation (`generator.json`)**: Follow [`generators/scala-cqrs-play-service/generator.json`](https://github.com/co-arising/metarch-truthsrc/blob/main/generators/scala-cqrs-play-service/generator.json) to declare exact consumed `products`, versions, `producers`, `artifactKinds`, and `options`. The runtime strict Proxy immediately rejects any undeclared product access (`PRODUCT_UNDECLARED`).
2. **Pure Derivation & Fail-Closed Validation Obligation**: Every emitter family must provide `checkInput(input)` and throw coded diagnostics for invalid identifiers, unbound contexts, or unsupported semantic constructs — **never silently skip a guard or emit `// TODO` stubs**.
3. **Byte-Exact Determinism & Golden Parity Obligation**: Register each family via [`emitter/registry.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/emitter/registry.mjs) with `id`, `familyNumber`, `inputSchema`, `goldenRoot`, `fixtureDir`, `checkInput`, `renderAll`, and `runNegatives`. Double-run output must be byte-identical and match the golden spec tree with zero drift.
4. **Full Provenance, Code Mapping & Dependency Obligation**: Every emitted entry must carry real `knowledgeIds` (`source:<doc>#<pointer>`), exact UTF-8 byte-span `codeMappings`, and file-level `deps` so `truthsrc verify-project` (12/12) and Explorer bidirectional navigation stay unbroken.
5. **Orthogonal Layout & Parameterized Runtime Obligation**: Resolve paths through [`lib/layout/layout-strategy.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/layout/layout-strategy.mjs) and runtime coordinates through [`lib/runtime-profile.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/runtime-profile.mjs); zero business identifiers or hardcoded runtime organization literals are permitted.
6. **Physical Handwritten Boundary & Composition Root Obligation**: Separate generated outputs from handwritten adapters at the filesystem/module level (never via brittle comment blocks), wiring handwritten implementations back via interfaces and a DI composition root.
7. **Four-Layer Anti-Hardcoding Gate Obligation**: Pass [`tools/lint.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/tools/lint.mjs), broad lexical audit, non-bank unit generation ([`non-bank-unified-generation.test.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/test/non-bank-unified-generation.test.mjs)), and full end-to-end compilation & test execution on a zero-bank-vocabulary domain.

### 4.3 The Six-Piece Material Pack Required for AI Agent Generator Inference

When delegating a new code generator to an AI Agent (Claude Code, Antigravity, Codex), failure rarely comes from template syntax — it comes from **underspecified target architecture and missing compilation oracles**. Assemble these **six concrete materials** before handing off to an AI Agent:

| # | Material | Contents | Why Agents Drift Without It |
|---|---|---|---|
| **01** | **Golden Reference Application** | A minimal, compiling target-stack app authored in a **non-bank domain** (e.g., `order` or `inventory`) covering 1 aggregate, VOs, exact decimals, invariant rules, event fold, repository port/impl, read-side projection, DI composition root, and 1 passing test. | Without a compiling golden tree, Agents oscillate across idioms and library versions. The golden tree IS the executable family spec (F3). |
| **02** | **Machine-Readable Conformance Contract** | Modeled on [`classic-cqrs-contract.json`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/conformance/classic-cqrs-contract.json): allowed top-level layers, forbidden cross-layer import regexes (DIP), per-artifact filename suffixes, required base types, and forbidden constructs. | Converts architectural review into an instant automated gate the Agent can run after every single family. |
| **03** | **Semantic-to-Target Mapping Spec** | Exact mappings for `primitive / exact / record / optional / sequence / map`, `domain-decision@4` guard ASTs, `domain-folds@6` fold statements, `exact-value-codecs`, plus an **explicit unsupported-feature rejection list**. | Eliminates guesswork and defines exact `fail-closed` boundaries instead of approximate codegen. |
| **04** | **Target Runtime Profile Spec** | Target base traits/interfaces, error container (`Result<T, E>`, `(T, error)`, `Either`), serializer library, DI container conventions, and parameterizable runtime coordinates (`organization` / `packagePrefix` / `version`). | Prevents scattering hardcoded internal package prefixes or versions across dozens of templates. |
| **05** | **Dual-Domain Compiled Fixtures + Local Compiler Sandbox** | Compiled product JSON fixtures from at least two distinct domains (e.g., `bank` + `commerce`) plus local offline access to the target compiler and test runner (`mvn test` / `go test ./...` / `cargo test` / `tsc --noEmit`). | A single domain hides hardcoded routing and formatting assumptions; dual domains + a real compiler expose every implicit coupling immediately. |
| **06** | **Agent Harness Rules & Redlines** | Family rollout order, per-family Definition of Done, minimum negative-test battery expectations, redlines against editing tests to pass, and exact verification commands. | Keeps the Agent in tight, deterministic verification loops instead of declaring premature completion. |

### 4.4 Engineering Standards and Four-Layer Verification Gates for AI Agents

Once the six-piece material pack is ready, guide the AI Agent with three non-negotiable practices:

1. **Inside-Out Incremental Family Rollout**:
   - **Wave 1 (Pure Domain Core, 0 framework imports)**: `value-object` → `domain-entity` → `event-handler` → `aggregate-invariant-rules`, immediately verified with pure unit tests.
   - **Wave 2 (Application Protocols & Ports)**: `protocol-layer` → `aggregate-layer` → `aggregate-repository` → `external-event-bridge`.
   - **Wave 3 (Infrastructure Persistence & Assembly)**: `proto-schema` / `persistence-schema` → `proto-converter` → `serialization-adapter` → `aggregate-bootstrap` → `service-runtime` → `project-scaffold`.
   - **Wave 4 (Distributed Coordination, when needed)**: `effect-face` → `pipeline-invocation-face`.
2. **Per-Family Definition of Done (DoD)**:
   - Registered in `emitter/registry.mjs` with `node emitter/parity.mjs` green;
   - Includes a directed `runNegatives` rejection battery (missing fields, unsafe identifiers, unbound contexts, unsupported shapes);
   - Passes `npm run lint` (`arch/no-business-names`, `arch/no-hardcoded-runtime`, `arch/no-hardcoded-app-path`) with 0 issues;
   - Passes dual-domain rendering (`commerce` + custom `runtimeProfile`) and compiles cleanly under the real target compiler.
3. **Four-Layer Anti-Hardcoding Verification**:
   - **Layer 1**: Static lint gates blocking known business terms and hardcoded runtime coordinates;
   - **Layer 2**: Broad adversarial lexical audit catching implicit semantic routing regexes and escaped literals;
   - **Layer 3**: Cross-domain black-box unit generation with custom `runtimeProfile`;
   - **Layer 4 (Gold Standard)**: End-to-end `truthsrc generate-project` → `truthsrc verify-project` (12/12) → full target compiler & test suite pass on a brand-new non-bank domain.

## 5. The Next Big Story: Advancing to Controlled EARS 1.0 and Single-Hop SMT Verification

Everything above closes the **downstream deterministic engineering loop**: from a structured truth tree, the compiler auto-derives technical bindings, emits a compiling DDD Onion Architecture service, proves byte-level bidirectional lineage, runs live Docker verification of cross-aggregate transactions, and provides a clean contract for extending new target generators.

Yet one deeper upstream question remains: **what if the business rules written into the truth tree themselves contain hidden logical contradictions, overlapping conditions, or uncovered edge cases?** A faithful deterministic compiler will faithfully compile a flawed rule into flawed code.

That is the exact problem tackled by `co-arising`'s next big story — the [co-arising EARS 1.0 Technical Specification (v1.2 Bilingual Edition)](https://co-arising.github.io/articles/co-arising-ears-spec-20261123/):

```text
  [Upstream: Mathematically Verified Truth]          [Downstream: Deterministic Onion Architecture Loop]
  ─────────────────────────────────────────          ───────────────────────────────────────────────────
  Controlled EARS 1.0 Single Truth Source            14 Compiled Semantic Products (Auto-Derived Bindings)
     ├──▶ Style E (PM-friendly prose AC)                    │
     ├──▶ Style B (DMN decision table view)                 ├──▶ 16+ Unified Emitter Families (Onion Code)
     ├──▶ SMT-LIB 2 (.smt2) ──▶ Z3/cvc5 solver              ├──▶ 12-Gate Bidirectional Anchors & Explorer
     │      ├── Conflict/Gap ──▶ A/B Clarification Card     ├──▶ Handwritten Isolation Zone + DI Root
     │      └── All-Green    ──▶ Boundary Witnesses         └──▶ Live Docker Demo + Multi-Stack Extension
     └──▶ TestIR ──▶ Locked BDD / ScalaTest ──▶ @cloze TDD
```

When upstream **Controlled EARS 1.0 + single-hop SMT verification** meets downstream **deterministic Onion Architecture generation + bidirectional anchoring + multi-stack generator extension**, human-and-Agent software engineering reaches a clean division of labor: humans author concise, reviewable domain truth; SMT solvers prove rule consistency before code exists; deterministic emitters build zero-drift onion skeletons; and AI Agents implement and evolve bounded adapters inside locked interfaces and BDD guardrails.

## 6. Reference Repositories and Key Source Entrypoints

- **Bank Wealth Teaching & Verification Repo**: [`co-arising/bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo) (Docker quick-start script & playbooks in [`docs/DEMO-QUICK-START.md`](https://github.com/co-arising/bank-wealth-demo/blob/main/docs/DEMO-QUICK-START.md))
- **Truth Compiler, Knowledge Graph & Unified Code Generator**: [`co-arising/metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc)
  - Automatic technical binding derivation: [`lib/project/derive-bindings.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/derive-bindings.mjs)
  - Orthogonal layout strategy (single-module / multi-module): [`lib/layout/layout-strategy.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/layout/layout-strategy.mjs)
  - Onion Architecture & DIP static auditor: [`lib/conformance/audit.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/conformance/audit.mjs) & [`classic-cqrs-contract.json`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/conformance/classic-cqrs-contract.json)
  - Unified emitter registry & anti-hardcoding lint gate: [`emitter/registry.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/emitter/registry.mjs) & [`tools/lint.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/tools/lint.mjs)
- **Open-Source Runtime Engines**: [`MadPolaris/saga-core`](https://github.com/MadPolaris/saga-core), [`MadPolaris/monarch-core`](https://github.com/MadPolaris/monarch-core), [`MadPolaris/monarch-persistence`](https://github.com/MadPolaris/monarch-persistence)
- **Interactive Explorer & Status Ledger**: [Explorer Graph & Code View](https://co-arising.github.io/explorer/?view=code#code) · [Hands-On Guide](https://co-arising.github.io/guide/) · [Facts & Status Ledger](https://co-arising.github.io/status/)
- **Next Big Story (Design Specification)**: [co-arising EARS 1.0 Technical Specification (v1.2 Bilingual Edition)](https://co-arising.github.io/articles/co-arising-ears-spec-20261123/)
