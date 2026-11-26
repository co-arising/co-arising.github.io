# How to Extend a New Code Generator in metarch-truthsrc: Pipeline Artifacts, Contract Boundaries, and a Rust Blueprint

> **Version & scope note**: Every command, artifact filename, schema version, and source seam in this guide is verified against [`metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) **0.5.0** (Node ≥ 22.13.0, zero npm runtime dependencies, built-in `node:sqlite`) and the [`bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo) reference repository. While the [Pipeline page](https://co-arising.github.io/pipeline/) explains the six-stage division of responsibilities and the [bank-wealth-demo Complete Guide](https://co-arising.github.io/articles/bank-wealth-quickstart-architecture-extensibility-20261125/) unpacks the generated Scala Onion Architecture and AI-Agent material pack, **this article focuses on the exact on-disk artifacts and source-level extension workflow** — showing precisely where a new target stack (Rust, Go, TypeScript, Java, etc.) forks off, which files to create, the single core wiring seam to touch, and the subtle traps in the codebase to avoid.

## 1. The Artifact-Level Pipeline Map: Where Does a New Generator Fork?

Before writing a single line of generator code, map out **which exact file lands on disk at each step** from the author YAML truth tree to the target project. One foundational invariant governs everything (see [`SCHEMA.md`](https://github.com/co-arising/metarch-truthsrc/blob/main/SCHEMA.md)):

> The YAML atom tree is the **only edit surface**. `canonical.json`, derived semantic products, `knowledge.sqlite`, and generated code are all disposable, deterministic projections — never hand-edited.

```text
Step 0   Author YAML Tree (truth/<system>/system.yaml + contexts/<id>/*.yaml)  ← Only edit surface
           │
Step 1   validate / roundtrip                                                  ← Two gates: verdict only, no writes
           │  • validate: V* structural + R* relational + ES/CS/AG/RF/SM rules (0 hard to pass)
           │  • roundtrip: compile ∘ decompose ∘ compile byte-identical inverse
           ▼
Step 2   compile ──► canonical.json                                            ← Sole canonical IR
           │          (stable atom identities + content hashes; shared across Scala/Rust/Go)
           │
           ├──────────────────────────────────────────────────┐
           ▼                                                  ▼
Step 3   compile-project                             Step 4   graph ──► .truthsrc/knowledge.sqlite
           │  • captureProject snapshots SHA-256 of all inputs • Pure cache SQLite graph of canonical.json
           │  • Derives request.json (typed source plan)       • Nodes = atoms, edges = 22 typed relations
           │  • compileProductSet ──► compilation              • blast_radius / query-project / 26 MCP tools
           │    (versioned semantic product set)               • Products attach only via compiles-to edges
           ▼
       ══════════════ ★ Architectural Fork Point (no truth-tree edits, no Knowledge rewrite) ★ ══════════════
           │
Step 5   generate-project --project truthsrc.project.json --out <owned-dir> [--plan | --update]
           │  • registeredProductProducer() looks up the static registry for the target generator
           │  • planProductSet() enforces double-run determinism + strict entry contracts
           │  • annotateProjectEntries() stamps @generated / @knowledge-release / @knowledge headers
           │  • applyEntries() writes target project + 4 evidence files (.truthsrc/{canonical,request,compiled,inputs}.json)
           │    + truthsrc.ledger.json + anchors.json, and publishes anchors to SQLite
           ▼
Step 6   status-project / query-project / verify-project                       ← Drift, bidirectional trace, byte recheck
           ▼
Step 7   Target toolchain build & tests (sbt / cargo / go test / tsc)          ← Outside truthsrc
```

This artifact map answers the three architectural questions teams most often get wrong when adding a second language stack:

1. **Does the Knowledge Graph need to be rebuilt for a new target language? No.**
   `.truthsrc/knowledge.sqlite` is a pure cache projection of `canonical.json` (deletable and rebuildable at any time); source node payloads are read directly by JSON Pointer from `canonical.json`. Compiled semantic products appear in the graph only as `semantic-product` nodes linked by `compiles-to` edges for provenance. As long as `compilation` succeeds cleanly, graph construction, bidirectional anchoring, and Explorer exports work out of the box.
2. **How do change detection and incremental updates work? Full derivation, incremental write-back.**
   `truthsrc` has no background watch daemon. On every `compile-project` or `generate-project` run, `captureProject()` in [`lib/project/cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/cli.mjs) hashes the project manifest, every file in the YAML tree, any explicit technical binding documents, and the tool's own source files, then verifies `assertUnchanged()` before writing (aborting with `PROJECT_CHANGED` on any concurrent edit). Derivation always recomputes from the full truth tree; passing `--update` writes only files whose output bytes changed while leaving unchanged files and the handwritten zone untouched.
3. **What does a generator actually consume? Never raw YAML — always typed compiled products.**
   A production generator should never re-parse YAML or guess ad-hoc fields out of `canonical.json`. It consumes a validated, version-pinned **semantic product set (`truthsrc.semantic-product-set/v1`)** produced by `compileProductSet()`.

## 2. Two Generator Contracts Compared: Why Production Extensions Use Formal Product Generators

Inspecting [`metarch-truthsrc/generators/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators) (55 directory entries today), you will encounter two distinct `generator.json` formats. Picking the wrong starting template is the most common false start:

| Dimension | Lightweight / Legacy Plugin (`generators/_template/`) | Formal Product Generator (`truthsrc.product-generator/v1`) |
|---|---|---|
| **Reference examples** | [`generators/_template/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/_template) | [`generators/product-design-review/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/product-design-review) (minimal non-Scala reference), [`generators/scala-cqrs-play-service/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/scala-cqrs-play-service) (full service reference) |
| **Manifest schema** | `inputSchema: "truthsrc/v0.3"` + loose `products: ["template"]` | `schemaVersion: "truthsrc.product-generator/v1"`, pinning exact `products[]` (`id`, `version`, `payloadSchemaVersion`, `capabilities`), `producers[]`, `artifactKinds[]`, and `options[]` |
| **Input delivery** | Receives raw `canonical` directly | Receives deep-frozen `products` (wrapped in a `Proxy` that blocks reading undeclared products) and `options` via `planProductSet()` in [`src/core/product-plan.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/src/core/product-plan.mjs) |
| **CLI entry** | `truthsrc generate --generator <dir>` | `truthsrc generate-project --project truthsrc.project.json --out <dir>` (full integration with `generate-products`, `status-project`, `query-project`, `verify-project`) |
| **Core gates** | Basic double-run check + `artifactKinds` check | Live recompile equality check, per-producer detached double-run determinism gate, `???` placeholder ban, `deps` closure check, UTF-8 `codeMappings` span verification, `.truthsrc/*.json` evidence bundle, SQLite anchor publication |
| **Best suited for** | Quick Markdown reports or exploratory prototypes | **Every real target architecture/language generator (Rust, Go, TypeScript, Java, etc.)** |

**Rule of thumb**: Fork `generators/_template/` only for quick documentation prototypes. For any real target-stack code generator that plugs into `truthsrc.project.json`, `generate-project`, bidirectional anchoring, and `verify-project`, start from [`generators/product-design-review/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/product-design-review) (just a 15-line `generator.json`, 9-line `generate.mjs`, and 64-line `produce.mjs`), and scale up into composable `producers[]` following `scala-cqrs-play-service`.

## 3. Project Inputs & the 21-Product Registry: What to Reuse vs. Extend

At the CLI, `generate-project` takes a single entry file: `--project truthsrc.project.json`. In [`lib/project/derive.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/derive.mjs), its schema is split into four input groups (`CONFIG_INPUTS` and `CONFIG_IO`):

| Group | Fields | Role |
|---|---|---|
| **Knowledge origin** | `tree`, `context`, `canonicalId` | Points to the single YAML truth tree, bounded context, and canonical document identifier |
| **Products & exact values** | `products`, `exactTypes`, `exactCodecs` | Selects exact semantic product versions plus exact numeric/value representations (e.g., `Money`, `AmountDecimal`) and wire/PO codecs (`minor-units-text`) |
| **Technical bindings** | `documents`, `assemblies`, `roles` | Supplies technical runtime bindings for technical products. Note: for `sagaBinding`, `runtimeBinding`, and `executionBinding`, [`lib/project/derive-bindings.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/derive-bindings.mjs) now performs **convention-over-configuration auto-derivation** (so [`bank-wealth-demo/truthsrc.project.json`](https://github.com/co-arising/bank-wealth-demo/blob/main/truthsrc.project.json) leaves these three empty). When targeting a custom runtime (such as a Rust workflow or persistence engine), you can still pass explicit `documents`/`assemblies`/`roles` or add auto-derivation support for your stack |
| **Generator & options** | `generator`, `options` | `generator` selects a shipped directory under `generators/`; `options` must match the exact keys declared in `generator.json`'s `options[]` array (missing or extra keys fail closed during `captureProject`) |

### The 21 Registered Product Kinds: Reuse Language-Agnostic Semantics First

[`lib/products/registry.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/products/registry.mjs) and `lib/project/derive.mjs` register **21 product kinds** (14 `DERIVED` products + 7 `TECHNICAL_PRODUCTS`, alongside the `classic-architecture@1..5` scaffold series):

| Category | Product IDs (and current versions) | Cross-language reuse strategy (Rust Onion Architecture example) |
|---|---|---|
| **Core domain & exact values (reuse verbatim)** | `reference-layout@1`, `exact-value-types@1`, `exact-value-codecs@1`, `domain-decision@4`, `domain-dependencies@6`, `domain-folds@6`, `domain-external-events@2` | **100% language-agnostic — reuse with zero changes.** Aggregates, state fields, commands, ordered guards, event bindings, state folds, exact decimal precision, and codec contracts are already compiled |
| **Contracts, APIs & design planes (reuse as needed)** | `artifact-contract@3`, `api-contract@1`, `workflow-contract@1`, `module-seams-contract@1`, `product-design@1` | **Language-agnostic contract layer — reuse first.** Service boundaries, HTTP API contracts, module seam signatures, and five-plane designs carry no Scala syntax |
| **Host & orchestration contracts (reuse or omit by runtime)** | `saga-host-contract@2/3`, `effect-host-contract@2`, `saga-contract@1/2`, `saga-runtime-contract@1/2`, `execution-contract@1/2`, `child-plan-contract@1` | Reuse `saga-contract` / `execution-contract` semantic models with your target runtime bindings if your stack runs TCC sagas and staged pipelines; omit them if your target service uses a simpler request/event architecture |
| **Composition & persistence contracts (extend only if needed)** | `module-seams-composition@1`, `persistence-readside-contract@1`, `application-composition@1` | If a new target architecture needs its own declarative layout or persistence contract product, register it in `registry.mjs` and `derive.mjs` — **hard rule: products express architectural contracts only, never target-language syntax** |

## 4. Directory Layout & the Single Core Wiring Seam: Keep `lib/` Language-Agnostic

The repository layout of `metarch-truthsrc` enforces one crisp architectural boundary:

- **`lib/` is strictly language-agnostic core**: validation (`validate.mjs`), compilation (`compile.mjs`), decomposition (`decompose.mjs`), SQLite graph store (`knowledge-sqlite.mjs`), product registry and derivation (`products/`, `domain-products/`, `value-products/`, `project/`, `derivation/`).
- **Historical lesson (`lib/scala-target/`)**: Earlier Scala naming and profile helpers ended up inside `lib/scala-target/`. **Do not repeat this mistake for Rust, Go, TypeScript, or Java — never create `lib/rust-target/`!** All target-language naming (`snake_case` / `PascalCase`), type mappings, renderers, and templates belong strictly inside `generators/<your-generator>/`.
- **`generators/` follows "one target architecture, one isolated directory"**:
  - Top-level service generators (like `generators/scala-cqrs-play-service/`) compose multiple focused `producers[]`, each declaring the exact subset of `products` it reads and `artifactKinds` it emits.
  - Retired generators live isolated in `generators/_deprecated/`.

### The Single Required Core Edit: `registeredProductProducer`

When `truthsrc.project.json` specifies `"generator": "rust-onion-service"`, [`lib/project/cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/cli.mjs) resolves `generators/rust-onion-service/` and passes it to `registeredProductProducer()` in [`lib/products/generate-cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/products/generate-cli.mjs):

```javascript
// lib/products/generate-cli.mjs (the single core wiring seam)
import { generate as generateRustOnion } from '../../generators/rust-onion-service/generate.mjs';

const rustOnion = new URL('../../generators/rust-onion-service/', import.meta.url);

export function registeredProductProducer(generatorDir) {
  const directory = realpathSync(generatorDir);
  const generate = [
    // ... existing shipped generator entries
    [rustOnion, generateRustOnion],
  ].find(([path]) => directory === realpathSync(path))?.[1];
  if (!generate) fail('PRODUCT_PRODUCER', 'generator must be a shipped registered source producer');
  return Object.freeze({ directory, generate, ...implementationProducers.get(generate) });
}
```

If the directory exists on disk without a matching entry in this static table, `truthsrc` fails closed with `PRODUCT_PRODUCER: generator must be a shipped registered source producer`. **This static table is an intentional trust boundary**: the CLI never dynamically `import()`s arbitrary code paths supplied by untrusted JSON. Adding a brand-new code generator requires **one `import`, one URL constant, and one table entry in `lib/products/generate-cli.mjs`** (plus an optional `implementationProducers` entry if you want implementation-source verification).

## 5. Step-by-Step Blueprint: Building a `rust-onion-service` Generator

Here is the end-to-end blueprint for a new Rust Onion Architecture generator under `generators/rust-onion-service/`, aligned line-for-line with the real core contracts.

### Step 1: Create the Isolated Generator Directory

```text
generators/rust-onion-service/
├── generator.json            # Formal truthsrc.product-generator/v1 manifest
├── generate.mjs              # Entrypoint: validates targetProfile and calls planProductSet()
├── naming.mjs                # Rust-specific naming & type mapping (never inside lib/)
├── producers/
│   ├── domain-model.mjs      # Consumes reference-layout + exact-value-types + domain-decision + domain-folds → domain crate
│   ├── ports-adapters.mjs    # Consumes domain-dependencies + domain-external-events + exact-value-codecs → ports & serde codecs
│   └── workspace-cargo.mjs   # Consumes reference-layout → Cargo.toml workspace scaffold
└── templates/                # Optional pure rendering helpers
```

### Step 2: Author a Strict, Version-Pinned `generator.json`

`src/core/product-plan.mjs` strictly validates every field of `generator.json` (unknown keys are rejected) and verifies every `products[]` entry against `profileFor()` in `lib/products/registry.mjs`:

```json
{
  "schemaVersion": "truthsrc.product-generator/v1",
  "name": "rust-onion-service",
  "version": "1",
  "targetProfile": "rust-onion-service@1",
  "products": [
    {
      "id": "reference-layout",
      "version": "1",
      "payloadSchemaVersion": "truthsrc.reference-layout/v1",
      "capabilities": [{ "id": "qualified-reference-layout", "version": "1" }]
    },
    {
      "id": "exact-value-types",
      "version": "1",
      "payloadSchemaVersion": "truthsrc.exact-value-types/v1",
      "capabilities": [{ "id": "exact-value-types", "version": "1" }]
    },
    {
      "id": "exact-value-codecs",
      "version": "1",
      "payloadSchemaVersion": "truthsrc.exact-value-codecs/v1",
      "capabilities": [{ "id": "exact-value-codecs", "version": "1" }]
    },
    {
      "id": "domain-decision",
      "version": "4",
      "payloadSchemaVersion": "truthsrc.domain-decision/v4",
      "capabilities": [{ "id": "ordered-domain-decision", "version": "4" }]
    },
    {
      "id": "domain-dependencies",
      "version": "6",
      "payloadSchemaVersion": "truthsrc.domain-dependencies/v6",
      "capabilities": [{ "id": "domain-dependencies", "version": "6" }]
    },
    {
      "id": "domain-folds",
      "version": "6",
      "payloadSchemaVersion": "truthsrc.domain-folds/v6",
      "capabilities": [{ "id": "domain-folds", "version": "6" }]
    }
  ],
  "producers": [
    {
      "id": "rust-domain-model",
      "version": "1",
      "products": ["reference-layout", "exact-value-types", "domain-decision", "domain-folds"],
      "artifactKinds": ["rust-value-object", "rust-aggregate", "rust-rules"]
    },
    {
      "id": "rust-ports-adapters",
      "version": "1",
      "products": ["reference-layout", "exact-value-types", "exact-value-codecs", "domain-dependencies"],
      "artifactKinds": ["rust-port", "rust-codec"]
    },
    {
      "id": "rust-workspace",
      "version": "1",
      "products": ["reference-layout"],
      "artifactKinds": ["cargo-manifest"]
    }
  ],
  "artifactKinds": [
    "rust-value-object",
    "rust-aggregate",
    "rust-rules",
    "rust-port",
    "rust-codec",
    "cargo-manifest"
  ],
  "options": ["cratePrefix", "handwrittenRoots"]
}
```

Note how `options` works: `planProductSet()` runs `object(o, m.options, at('options'))`, requiring `truthsrc.project.json`'s `options` object to contain **the exact set of keys** declared here.

### Step 3: Implement `generate.mjs` and the 8-Field Entry Contract

The entrypoint delegates all validation, determinism checking, and plan sorting to [`planProductSet`](https://github.com/co-arising/metarch-truthsrc/blob/main/src/core/product-plan.mjs):

```javascript
// generators/rust-onion-service/generate.mjs
import { planProductSet } from '../../src/core/product-plan.mjs';
import { fail } from '../../lib/products/request.mjs';
import * as domainModel from './producers/domain-model.mjs';
import * as portsAdapters from './producers/ports-adapters.mjs';
import * as workspaceCargo from './producers/workspace-cargo.mjs';

export const producerRegistry = Object.freeze({
  'rust-domain-model': Object.freeze({ version: domainModel.version, produce: domainModel.produce }),
  'rust-ports-adapters': Object.freeze({ version: portsAdapters.version, produce: portsAdapters.produce }),
  'rust-workspace': Object.freeze({ version: workspaceCargo.version, produce: workspaceCargo.produce }),
});

export function generate({ compilation, manifest, options }) {
  if (manifest?.targetProfile !== 'rust-onion-service@1') {
    fail('RUST_PROFILE', 'explicit rust-onion-service@1 profile required');
  }
  return planProductSet({ compilation, manifest, options }, producerRegistry);
}
```

Inside each `producer.produce({ products, options })`, six non-negotiable invariants are enforced by `planProductSet()`:

1. **Scoped read-only inputs**: `products` is wrapped in a `Proxy`; reading any product ID not declared in that producer's `products[]` throws `PRODUCT_UNDECLARED`.
2. **Byte-identical double-run determinism**: `planProductSet()` invokes every `produce()` **twice** on independently cloned frozen inputs. Any clock read, randomness, environment lookup, or unstable iteration order triggers `PRODUCT_NONDETERMINISTIC`.
3. **Exact 8-field entry shape** (`codeMappings` optional; the other 7 required):

```javascript
{
  path: 'crates/domain/src/value_objects/money.rs',     // Canonical relative POSIX path; no ../ or receipt collisions
  content: renderedRustSource,                          // UTF-8 text; must not contain "???" placeholders
  kind: 'rust-value-object',                            // Declared in this producer's artifactKinds
  deps: ['crates/domain/Cargo.toml'],                   // Every dep must exist in the same complete plan
  knowledgeIds: ['source:bank-v1#/valueObjects/0'],     // Non-empty array of file-level provenance keys
  productFootprint: [                                   // Must exactly match this producer's declared (id, version) list
    { id: 'reference-layout', version: '1' },
    { id: 'exact-value-types', version: '1' },
    { id: 'domain-decision', version: '4' },
    { id: 'domain-folds', version: '6' },
  ],
  merge: null,                                          // Must be explicitly null (default core MANUAL merge policy)
  codeMappings: [                                       // Optional: exact UTF-8 byte spans for symbol/line tracing
    {
      knowledgeKey: 'source:bank-v1#/valueObjects/0',
      span: { start: 120, end: 215, text: 'pub struct Money { ... }' },
      scope: { start: 100, end: 240, text: '// Money domain value object\npub struct Money { ... }\n' },
    },
  ],
}
```

4. **Closed `deps` graph**: Every path listed in `entry.deps` must be emitted by some producer in the same plan (`PRODUCT_ENTRY_DEPENDENCY`).
5. **Case-fold unique paths**: `path.normalize('NFC').toLowerCase()` must be unique across all producers (`PRODUCT_PATH_ALIAS`) to prevent macOS/Windows collisions.
6. **Zero `???` placeholders**: Unimplemented `???` stubs are rejected for all formal product profiles (only the explicit `classic-architecture` scaffold series is exempted).

### Step 4: Wire the Registry and Mind Two Subtle Source Seams

After adding your generator to `registeredProductProducer()` in `lib/products/generate-cli.mjs`, check two real codebase seams that affect non-Scala targets:

#### Seam A: File Extension Whitelist in `lib/project/provenance-annotations.mjs`

Before `applyEntries()` writes files to disk, [`lib/project/provenance-annotations.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/provenance-annotations.mjs) stamps `// @generated by truthsrc ...`, `// @knowledge-release ...`, and order-independent `// @knowledge <stableId>@<elementHash16>` headers while shifting every `codeMappings` UTF-8 byte offset to stay valid. Look at lines 140–142:

```javascript
// lib/project/provenance-annotations.mjs:140-142
function supportsSlashHeader(filePath) {
  return filePath.endsWith('.scala') || filePath.endsWith('.proto');
}
```

Because only `.scala` and `.proto` are currently matched, `.rs`, `.go`, `.ts`, or `.java` outputs will **not** automatically receive the unified provenance headers unless you extend this check into a language-aware comment-prefix map (e.g., `// ` for `.rs`/`.go`/`.ts`/`.java`/`.scala`/`.proto`, `# ` for `.py`/`.toml`) and verify that shifted `codeMappings` still pass `validateCodeMappings()` in [`src/core/code-mappings.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/src/core/code-mappings.mjs).

#### Seam B: Handwritten Isolation & Optional `implementationProducers`

- **Recommended baseline (isolated handwritten zone)**: Declare handwritten directories in `options` (e.g., `handwrittenRoots`), keep them disjoint from `--out`, and reference them from the generated workspace manifest (`Cargo.toml`). Whenever a generated file needs an editable slot, follow the Protected Regions contract in [`generators/README.md`](https://github.com/co-arising/metarch-truthsrc/blob/main/generators/README.md) (`// ==== BEGIN MANUAL ====` / `// ==== END MANUAL ====` and `AI_PROMPT` blocks) so `--update` never overwrites author/agent edits.
- **When to register in `implementationProducers`**: Only if your generator must capture and cryptographically verify specific handwritten implementation files during `--plan` and `generate-project` (mirroring `scala-cqrs-play-application`, `scala-cqrs-module-seams`, and `scala-cqrs-saga-monarch` in `lib/products/generate-cli.mjs`).

### Step 5: Tests & Four Quality Gates

In `metarch-truthsrc`, **tests do not live inside `generators/<name>/`** — they live flat under the root `test/` directory (currently 211 `*.test.mjs` files, named by domain), alongside doc updates in `generators/README.md` and `MIGRATION.md`.

Every new generator should pass four automated gates before merging:

1. **Contract & determinism tests (`test/rust-onion-service.test.mjs`)**:
   - Full lifecycle: `compile-project` → `generate-project --plan` → `generate-project` → `generate-project --update` → `status-project` → `query-project` → `verify-project`.
   - Negative battery: missing required product, wrong version, unknown option key, undeclared product read, residual `???` placeholder, and overlapping output/handwritten paths must all fail closed.
2. **Anti-hardcoding static gate ([`tools/lint.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/tools/lint.mjs))**:
   - Run `node tools/lint.mjs` to enforce clean JS syntax, zero `console.log`/`debugger`/duplicate imports, and **zero hardcoded business identifiers** (`bankwealth`, `FundOrder`, `CreditBalance`, etc.).
3. **Second unrelated domain smoke proof**:
   - Never validate only on the bank fixture. Run `generate-project` + `verify-project` on an independent non-financial tree (e.g., a minimal `commerce` or `Counter` domain) to prove domain generality.
4. **Native target toolchain compile & test**:
   - Run the real target build (`cargo check --workspace && cargo test --workspace`) on the generated output and record those receipts separately from `truthsrc`'s own contract suite.

## 6. Five Source-Level Pitfalls & the Minimum AI-Agent Material Pack

### Five Red-Line Pitfalls (Directly from the Codebase)

1. **Never put target-language code under `lib/<lang>-target/`**: Do not follow `lib/scala-target/`; keep all target-language naming, type mapping, and rendering inside `generators/<name>/`.
2. **Never add non-JVM generators to `planCompiledProducts`'s Maven JAR allowlist**: Lines 125–139 of [`lib/products/generate-cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/products/generate-cli.mjs) hardcode 7 Scala application/service generators that require `options.runtimeArtifact.repository` (`file:///`) and verify SHA-256 hashes of `saga-core` and `monarch` JARs. A Rust/Go/TS generator must **not** enter that list — validate your own lockfile/crate pins if needed, or omit runtime pinning altogether when emitting zero-dependency domain crates.
3. **Never bypass compiled products to re-parse `canonical.json`**: Consuming `domain-decision@4`, `domain-folds@6`, and `exact-value-types@1` guarantees identical guard ordering, type resolution, and decimal precision semantics across every target language.
4. **Never embed plaintext credentials or non-portable absolute paths in templates**: Use environment placeholders for secrets/DB configs, and emit portable relative paths (as `portableBuildSbt()` does in `scala-cqrs-play-service/generate.mjs`).
5. **Never convert the static registry into implicit directory auto-loading as a side effect**: Keeping `registeredProductProducer()` static is an explicit security boundary; dynamic external plugin loading is a separate architectural decision.

### Minimum 6-Piece Material Pack for Delegating a New Generator to an AI Agent

If you want an AI Agent to design and implement a new target-stack generator in `metarch-truthsrc` without drifting or polluting `lib/`, supply these six artifacts upfront:

1. **Exact target semantic product list (with pinned versions)**: Decide whether v1 covers the pure domain core (`reference-layout@1`, `exact-value-types@1`, `exact-value-codecs@1`, `domain-decision@4`, `domain-dependencies@6`, `domain-folds@6`) or also orchestration/host contracts.
2. **Target Onion/Hexagonal layer & path mapping table**: Which `artifactKinds` belong to each layer (Domain, Application, Ports, Adapters, Composition Root) and how dependency direction points strictly inward (see [Sections 3–4 of the bank-wealth-demo Complete Guide](https://co-arising.github.io/articles/bank-wealth-quickstart-architecture-extensibility-20261125/#section-3)).
3. **Type & codec mapping specification**: Exact target types for scalars, `unit-decimal` / `decimal` exact types, `minor-units-text` wire/PO codecs, and collections (e.g., `rust_decimal::Decimal` or minor-unit `i128` newtypes in Rust).
4. **One minimal handwritten golden sample** (1 aggregate + 1 value object + 1 port trait + 1 unit test): Anchors idiomatic target style far better than prose instructions alone.
5. **Exact core source pointers**: `generators/product-design-review/`, `src/core/product-plan.mjs`, `lib/products/generate-cli.mjs`, and `lib/project/provenance-annotations.mjs`.
6. **Hard acceptance command list**: `node tools/lint.mjs`, `node --test test/<your-gen>.test.mjs`, cross-domain non-bank `generate-project` + `verify-project`, and native target compilation/tests.

## 7. Reference Repositories & Further Reading

- **Core compiler & generator repo**: [`co-arising/metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) ([SCHEMA.md](https://github.com/co-arising/metarch-truthsrc/blob/main/SCHEMA.md) · [CODEGEN.md](https://github.com/co-arising/metarch-truthsrc/blob/main/CODEGEN.md) · [generators/README.md](https://github.com/co-arising/metarch-truthsrc/blob/main/generators/README.md))
- **Key source entrypoints**:
  - Project pipeline & input capture: [`lib/project/cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/cli.mjs) · [`lib/project/derive.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/derive.mjs) · [`lib/project/derive-bindings.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/derive-bindings.mjs)
  - Product registry & generator admission: [`lib/products/registry.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/products/registry.mjs) · [`lib/products/generate-cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/products/generate-cli.mjs)
  - Plan orchestration, apply & provenance anchoring: [`src/core/product-plan.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/src/core/product-plan.mjs) · [`src/core/generate.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/src/core/generate.mjs) · [`src/core/code-mappings.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/src/core/code-mappings.mjs) · [`lib/project/provenance-annotations.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/provenance-annotations.mjs)
  - Minimal & full reference generators: [`generators/product-design-review/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/product-design-review) · [`generators/scala-cqrs-play-service/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/scala-cqrs-play-service) · [`tools/lint.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/tools/lint.mjs)
- **Reference demo project**: [`co-arising/bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo) ([`truthsrc.project.json`](https://github.com/co-arising/bank-wealth-demo/blob/main/truthsrc.project.json))
- **Related site reading**:
  - [Pipeline: six-stage lifecycle & anchor boundaries](https://co-arising.github.io/pipeline/)
  - [bank-wealth-demo Complete Guide: Quick Start, Onion Architecture Deep Dive, and Extending New Code Generators](https://co-arising.github.io/articles/bank-wealth-quickstart-architecture-extensibility-20261125/)
  - [co-arising EARS 1.0 Technical Specification (v1.2 Bilingual Edition)](https://co-arising.github.io/articles/co-arising-ears-spec-20261123/)
  - [Status & Facts Ledger (with latest snapshot verification evidence)](https://co-arising.github.io/status/)
