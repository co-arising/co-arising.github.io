# Bank Explorer source snapshot · 2026-11-25

## Scope / 范围

This is the **2026-11-25 matched Graph / Code public snapshot** (`F-31`) for
`bank-wealth-demo`, following the Onion Architecture refactoring, curated emitter
unification, domain hardcoding elimination, and automatic technical-binding
derivation (removing the 8 handwritten `bindings/implementation/*.json` files).

这是 `bank-wealth-demo` 在 **2026-11-25** 导出的配对 Graph / Code 公开快照（`F-31`），
对应完成洋葱架构五层治理、Curated Emitter 统一、领域硬编码清理以及 8 份
`bindings/implementation/*.json` 技术绑定自动推导之后的最新状态。

Unlike the historical `2026-11-15` snapshot (`F-30`, preserved in
[bank-explorer-20261115.md](bank-explorer-20261115.md)), this snapshot:

- Publishes **all 358 files** (`161` generated + `36` handwritten isolation-zone
  implementations + `161` author files) with **0 withheld files**;
- Carries verified **`sbt "Compile/compile" test`** evidence recorded at export
  (`370` compiled Scala sources, `5` test suites, `24` passed tests);
- Keeps **local compile/unit-test verification distinct from formal workshop
  full-service acceptance**: this export does not replace or re-sign the
  separately scoped 2026-11-12 service run (`F-24`–`F-28`), and remains a local
  teaching reference rather than a production banking system.

与保留为历史档案的 `2026-11-15` 快照（`F-30`，见
[bank-explorer-20261115.md](bank-explorer-20261115.md)）相比，本快照：

- 公开**全部 358 个文件**（`161` 生成代码 + `36` 手写隔离区实现 + `161` 作者文件），
  **0 个未公开文件**；
- 附带导出时记录的 **`sbt "Compile/compile" test`** 编译与单元测试通过证据
  （`370` 编译源码、`5` 个测试套件、`24` 个测试全部通过）；
- 仍严格区分**本地编译与单测通过**与**正式工作坊全服务验收**：本导出不替代或重签
  2026-11-12 的独立服务验收记录（`F-24`–`F-28`），也不构成生产银行系统认证。

## Snapshot Identity / 快照身份

- Public snapshot: `c463eb32bad890f256b89e157dfb9ce4f95234985f25cbc36bf9148f6dcaed6f`
- Verified at: `2026-11-25T15:06:17.127Z`
- Bank input commit: `7e7909e` (`bank-wealth-demo` `main`); tool commit: `113bcda` (`metarch-truthsrc` `main`)
- Tool fingerprint: `20a39b9b7d0e26390a4f694de9921272d5fa98b6a7ab2c1b3fef5b57323b4dd1`
- Source snapshot: `sha256:ad634e2e542fcd65f53123106749f7e3008b65c539b0e47fcee23b4399bbcff3`
- Generation digest: `sha256:1d4e7d46eb7e198a420b3c4f81e552061cebce980c061332c4a50454c2f17f41`
- Knowledge snapshot: `sha256:de633c4f3e9ea10f70dd8dc811e7bae5b598b68626f1cec78aa46b112c72dda5`
- Source code digest: `sha256:d0f58f6b2c0d86ff1129f216e968a00b2b8aac9b7a4545c404b3e3841eac0bb3`
- Canonical digest: `sha256:1e515f58b278b8dd003759e4a1400998d48fdc6581dc4047711a72a230680b9b`
- [Manifest](../assets/data/explorer/snapshots/c463eb32bad890f256b89e157dfb9ce4f95234985f25cbc36bf9148f6dcaed6f/manifest.json)
- [Index](../assets/data/explorer/snapshots/c463eb32bad890f256b89e157dfb9ce4f95234985f25cbc36bf9148f6dcaed6f/index.json)

## Counts / 计数（F-31）

| Scope | Count |
|---|---:|
| Graph nodes / edges | 392 / 413 |
| Knowledge identities in public index | 872 |
| Anchor locations (total) | 5,090 |
| Span locations / file-level locations | 629 / 4,461 |
| Published files (generated / handwritten / author) | 358 (161 / 36 / 161) |
| Withheld files | 0 |
| Graph nodes with identity bridge | 377 |
| Compiled Scala sources (`sbt "Compile/compile" test`) | 370 |
| Passed test suites / unit tests | 5 / 24 |

## Architectural Highlights / 本期重构要点

- **Onion Architecture layout**: Generated and handwritten Scala sources share the
  five-layer layout (`domain`, `application`, `interfaces`, `infrastructure`,
  `modules`), enforcing strict inward dependencies and DIP/DI via Guice
  (`BootstrapModule` + `HandwrittenBindingsModule`). See the
  [bank-wealth-demo Complete Guide](/articles/bank-wealth-quickstart-architecture-extensibility-20261125/#section-3)
  ([中文版](/zh/articles/bank-wealth-quickstart-architecture-extensibility-20261125/#section-3)).
- **Automatic technical-binding derivation**: `derive-bindings.mjs` deterministically
  derives Saga, Saga-Runtime, and Execution bindings from the truth tree at compile
  time, removing all 8 redundant `bindings/implementation/*.json` files from the
  author workspace (`truthsrc.project.json` `documents: []`, `assemblies: []`).
- **Handwritten isolation zone visible in Explorer**: All 36 handwritten files under
  `handwritten/scala/example/bankwealth/` are browsable alongside generated code and
  author YAML so readers can inspect the physical regeneration boundary directly.

## Which generated directory? / 这份代码是从哪个目录来的？

The Explorer always loads the packaged immutable snapshot at
`assets/data/explorer/snapshots/c463eb32bad890f256b89e157dfb9ce4f95234985f25cbc36bf9148f6dcaed6f/`,
never your local workspace's `generated/` or `generated/current/` directory.
Displayed paths are relative to the exported project layout; open **File details**
for the exact site asset path and SHA-256.

To inspect or reproduce locally from your own checkouts, follow the
[bank-wealth-demo Complete Guide](/articles/bank-wealth-quickstart-architecture-extensibility-20261125/#section-2)
([中文版](/zh/articles/bank-wealth-quickstart-architecture-extensibility-20261125/#section-2)).

## Licensing and boundaries / 许可与边界

Bank author, generated, and handwritten source materials retain `bank-wealth-demo`'s
Apache-2.0 license: [license text](../downloads/bank-source-LICENSE.txt).
This public snapshot contains no third-party runtime JARs, does not claim production
certification or real fund-company connectivity, and preserves the historical
`2026-11-15` snapshot (`F-30`) alongside the `2026-11-11` / `2026-11-12` records
separately on the [status page](/status/).
