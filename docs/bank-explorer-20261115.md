# Bank Explorer source snapshot · 2026-11-15

## Scope / 范围

This is a **matched source/anchor snapshot**, not a new bank runtime acceptance.
The installed Graph / Code view was observed in Chromium and WebKit using the
actual exported bank bytes, without fixture substitution.

这是经过完整来源/回锚验证的配对快照，不是新的银行运行验收。真实银行导出已在
Chromium、WebKit 中完成知识 → 代码 → 知识的浏览器闭环；快照捕获时没有运行 Scala
编译或银行服务。后续本机重建与编译结果在下方单独说明，不改写这份快照的证据。

**Experimental sample:** the sample business logic and code generator are still
being upgraded, and current generated code quality is poor. This code illustrates
bidirectional knowledge/code traceability; it is not production-ready or a
best-practice reference. Source/anchor checks and successful compilation do not
certify design quality or business correctness.

**实验样例：**样例业务逻辑与代码生成器仍在升级，当前生成代码质量较低。代码仅用于
展示知识与代码的双向追溯，不用于生产，也不作为最佳实践参考。来源/回锚验证和编译
通过不等于设计质量或业务正确性得到认证。

- Public snapshot: `cfc3fb229a0390922eaaea3ffc6604503b340add7fdcd0b1cf3d2b781ca3149d`.
- Bank input commit: `f8ac7ca`; tool commit: `86c525e`.
- Tool content SHA-256: `261acd4182e063a502355efba099c0f948c45cd8bb32565d70c6147cdab7981c`.
- Source snapshot: `sha256:ebcce0008390d6009d7acb33195c66ef4b71db0df90af24a56bd71174e6d3e89`.
- Source code digest: `sha256:9341dc89eaaa039c5e0c853fd8e5c674e342b95b0af6d4d5507e5034c6f37bba`.
- [Manifest](../assets/data/explorer/snapshots/cfc3fb229a0390922eaaea3ffc6604503b340add7fdcd0b1cf3d2b781ca3149d/manifest.json).
- [Index](../assets/data/explorer/snapshots/cfc3fb229a0390922eaaea3ffc6604503b340add7fdcd0b1cf3d2b781ca3149d/index.json).

## Capture and checks / 捕获与核验

The active shared output did not match the current tool fingerprint. It was not
repaired. Instead, an isolated non-Git candidate copied the current project config,
157 author YAML files and remaining tree files, eight configured bindings and
handwritten source bytes without edits. Three local runtime 0.3.0 JARs were
checked against their recorded SHA-256 pins. No JVM, service, old journal or shared
knowledge database was used. The candidate had its own generated output and
project knowledge database.

Public CLI validate reported zero hard findings and 37 notices; roundtrip retained
157 atoms and identical canonical bytes. Generation used the existing public
pipeline. Full `verify-project` passed all twelve checks, including exact file and
anchor membership, final bytes, graph associations and unchanged inputs.

The whole original input inventory was rehashed after capture and remained
unchanged. Source/anchor evidence is not a business correctness proof.

## Counts / 计数（F-30）

| Scope | Count |
|---|---:|
| Canonical Graph nodes / edges | 389 / 413 |
| Knowledge identities in public index | 866 |
| Anchor keys / locations | 792 / 2,898 |
| Span locations / file-level locations | 669 / 2,229 |
| Generated source/configuration files | 229 |
| Public generated / author files | 228 / 157 |
| Withheld files | 1: `build.sbt`, containing machine-local paths |
| Graph nodes with identity bridge | 374 |
| Unmapped Graph nodes | 15 |
| Bridge records retaining ambiguity | 4 |

The 866 public identities and 389 graph nodes are different scopes. Unsupported
synthetic nodes remain unmapped; ambiguous occurrences are not merged. Files,
spans and aliases retain their exact evidence. Generated source fields such as
`authorization: String` and protobuf field numbers are not secret values;
literal credentials and local paths still fail publication scanning.

## Actual browser observations / 实际浏览器观察

Both Chromium and WebKit:

1. Original CreditBalance URL showed real code locations.
2. ReserveFunds opened `CreditBalanceBehaviors.scala:26`; clicking the line returned
   `knowledge:bank-wealth/bankwealth/command/CreditBalance/ReserveFunds`.
3. The author link opened the real `outgoing-funds.structure.yaml` at
   `/payload/atoms/2/doc/payload`, not a virtual slice filename.
4. LEDGER_SUFFICIENT opened `CreditBalanceRules.scala:33`, showing the actual balance
   comparison and refusal code; clicking it returned the same guard identity.
5. Refresh, EN/ZH switching and 375px layout retained the snapshot and selection.
6. `build.sbt` displayed a withheld state, never redacted source with old span claims.
7. No page errors or external runtime requests were observed.

The public payload gate also checked the installed assets. The older Workshop
HTML remains its 2026-11-06 truncated snapshot; only its two local verification
paths were removed from the public copy. Its code, mapping and historical result
were not re-signed.

## Which generated directory?

**网站展示的是独立验证候选的打包快照，不是实时挂载银行工作区目录。**

| Location | Meaning |
|---|---|
| Former bank `generated/` root and nested `current/` | Archived together outside the workspace on 2026-11-15; no longer active outputs |
| Bank `generated/current/` after rebuild | The sole active output, freshly generated from current author inputs; current-input and complete anchor verification passed at rebuild |
| Website export candidate `bank-explorer-20261115-uevvblfc/generated/` | Independently generated and verified under the tool fingerprint recorded above; the source of this website snapshot |
| Site `assets/data/explorer/snapshots/cfc3fb229a0390922eaaea3ffc6604503b340add7fdcd0b1cf3d2b781ca3149d/` | The actual public files fetched by the browser; independent of either bank output directory |

The relative path shown in Code is the captured generated/author path. “File
details” gives the exact site asset path and hash. It is not an instruction to
find that relative file in an arbitrary local generated directory.

After the 2026-11-15 archive and rebuild, every public generated file in the website
snapshot matched the newly generated `generated/current` source bytes. Its withheld
`build.sbt` contained different machine-local paths. Current source and complete
anchor checks passed; a separate JDK 11 / sbt offline compilation also passed using
current local artifact caches, without extracting the historical distribution tar.
Actual compiler staging sources were checked against the new output. Business
tests and services were not run.

The website's immutable snapshot and original receipt were not replaced or re-signed.
This byte agreement does not mean the website is live-linked to `current`, certified
against every later tool version, or approved as a model implementation.

Deleting local bank output cannot erase the website snapshot, but the website is
**not a recovery archive**: it omits build configuration, handwritten implementation,
JAR supply and full project receipts. Retained output is Git-ignored; cleanup must
preserve any required historical evidence and account for scripts still targeting
`generated/current`. Do not infer “safe to delete” from the directory name.

## Licensing and boundaries

Bank author and generated source materials retain the bank project's Apache-2.0
license: [license text](../downloads/bank-source-LICENSE.txt).
The generated output contains no copied external runtime JARs in this public
snapshot. Handwritten implementation files are outside this browser's source set.

Downloading this source snapshot does not claim a complete runnable distribution:
`build.sbt` is withheld, external implementation sources and runtime supply are
separate, and this capture did not execute the service. The older runtime facts
remain dated independently.
