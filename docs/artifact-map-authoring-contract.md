# Artifact Type Map Authoring & Upgrade Sync Contract

Every product target registered under `metarch-truthsrc/generators/*/generator.json` with `schemaVersion: "truthsrc.product-generator/v2"` must maintain an up-to-date, bilingual (`zh` + `en`) Artifact Type Architecture Map on `co-arising.github.io`.

## 1. Sync Triggers

Update the target's Artifact Type Map article, `assets/data/facts.lock.json`, and `assets/data/artifact-maps.lock.json` whenever any of the following occurs in `metarch-truthsrc`:

1. A new `artifactKind`, `producer`, or `emitterFamily` is added or renamed in `generators/*/generator.json` (which changes `catalogSha256` in `lib/v2/surface-registry.mjs`).
2. An existing Artifact Type changes ownership (`generated-scaffold/` vs `handwritten/`), DI wiring (`BootstrapModule` / `GeneratedBindingsModule` / `ApplicationBootstrap`), or Onion layer placement.
3. A new v2 target stack generator is introduced (for example, a future `rust-cqrs-axum-service:2` generator targeting Rust/Axum/SQLx/Prost).

## 2. Mandatory Structure for Any Target Map (Including Future Rust Targets)

1. **Architecture Philosophy First**: Explain why fine-grained decomposition + Onion DIP + outer-edge DI re-assembly is used, and classify every artifact as **Kernel**, **Seam**, or **Glue**.
2. **Interactive Clickable Onion Architecture SVG Map + Re-Assembly Wiring Diagram**: Theme-aware SVGs using `.co-arch-fig` styling with `<a class="arch-node" href="#section-...">` deep links matching heading IDs.
3. **2-Level Collapsible Layer Sidebar**: Register the slug in `tools/build-articles.py` (`NESTED_TOC_SLUGS`) so Onion layers appear as collapsible `<details class="toc-group">` groups in the sidebar with individual Artifact Types nested underneath.
4. **Inward Onion Layer Walkthrough (`##` Layers → `###` Artifact Types)**:
   - Layer 1: Domain Core (zero framework dependencies)
   - Layer 2: Application (protocols, handlers, readside projections, reactive policies, orchestration)
   - Layer 3: Infrastructure (wire serialization, storage, connectors, bootstrap & DI re-assembly)
   - Layer 4: Interfaces & Service Runtime (HTTP/Authz/scaffold)
   - Layer 5: Verification & BDD Oracle Gates (locked tests, mutation & DIP checks)
5. **Real Target Code Examples & End-to-End Trace**: Concrete snippets anchored to the pinned commits, plus a full request/event/policy flow walkthrough.
6. **Commit & Catalog Fingerprints**: Embed both `metarch-truthsrc` short SHA and the 12-char `catalogSha256` prefix in both `.md` and `.en.md` sources.

## 3. Automated CI Gate

`node tools/sync-site-facts.mjs --check` verifies that every entry in `facts.lock.json -> capabilities.targetArtifactCatalogs` has a matching entry in `assets/data/artifact-maps.lock.json`, matching `catalogSha256`, registered EN/ZH articles in `content/articles/manifest.json`, and matching commit/catalog fingerprints in both Markdown files.
