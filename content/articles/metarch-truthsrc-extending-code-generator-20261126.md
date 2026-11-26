# 如何在 metarch-truthsrc 中扩展一个全新的代码生成器：管线中间产物、契约边界与 Rust 实战蓝图

> **适用版本与口径说明**：本文基于 [`metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) **0.5.0**（Node ≥ 22.13.0，零 npm 运行时依赖，内置 `node:sqlite`）源码与 [`bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo) 参考仓核对撰写。站上 [流水线页面](https://co-arising.github.io/zh/pipeline/) 介绍的是六阶段职责分工，[bank-wealth-demo 实战全景指南](https://co-arising.github.io/zh/articles/bank-wealth-quickstart-architecture-extensibility-20261125/) 拆解了参考生成的 Scala 洋葱架构与 AI Agent 物料规范；**本文聚焦于落盘产物级的管线剖析与源码级接入步骤**——当你决定把同一份领域真源编译到 Rust、Go、TypeScript 或 Java 等全新目标技术栈时，究竟在哪一步分叉、要写哪些文件、接哪一行代码、避开哪些源码里的隐藏坑。

## 一、全链路产物地图：新代码生成器究竟在哪一步分叉？

在动手写第一行生成器代码之前，必须先看清 `truthsrc` 从作者 YAML 真源树到目标工程的**完整磁盘产物链路**。记住一条铁律（见 [`SCHEMA.md`](https://github.com/co-arising/metarch-truthsrc/blob/main/SCHEMA.md)）：

> 真源树（YAML 原子文件）是**唯一的编辑面**；`canonical.json`、派生语义产物、`knowledge.sqlite` 与生成代码全部是可丢弃重建的确定性投影，绝不手改。

```text
第 0 步  作者 YAML 树（truth/<system>/system.yaml + contexts/<id>/*.yaml）  ← 唯一编辑面
           │
第 1 步  validate / roundtrip                                               ← 两道门，只出结论，不落盘
           │  • validate：结构 V* + 关系 R* + ES/CS/AG/RF/SM 规则，0 hard 过门
           │  • roundtrip：compile ∘ decompose ∘ compile 逐字节恒等
           ▼
第 2 步  compile ──► canonical.json                                         ← 唯一规范中间表示（IR）
           │          （含稳定原子身份与内容哈希；Scala/Rust/Go 共享同一份）
           │
           ├──────────────────────────────────────────────┐
           ▼                                              ▼
第 3 步  compile-project                         第 4 步  graph ──► .truthsrc/knowledge.sqlite
           │  • captureProject 抓拍全输入 SHA-256          • canonical.json 的纯缓存 SQLite 图投影
           │  • 派生 request.json（类型化源计划）           • 节点=原子，边=22 种类型化关系
           │  • compileProductSet ──► compilation          • blast_radius / query-project / MCP 26 工具
           │    （多份带版本号的编译语义产物集）               • 语义产物仅挂接 compiles-to 边作溯源
           ▼
       ═══════════════ ★ 新代码生成器的架构分叉点（不改真源树，不重写 Knowledge 本体）★ ═══════════════
           │
第 5 步  generate-project --project truthsrc.project.json --out <owned-dir> [--plan | --update]
           │  • registeredProductProducer() 查静态注册表，路由到目标生成器
           │  • planProductSet() 双跑确定性门禁 + 严格契约校验
           │  • annotateProjectEntries() 加盖 @generated / @knowledge-release / @knowledge 头
           │  • applyEntries() 落盘目标工程 + 4 份证据（.truthsrc/{canonical,request,compiled,inputs}.json）
           │    + truthsrc.ledger.json + anchors.json，并向图库发布锚点
           ▼
第 6 步  status-project / query-project / verify-project                    ← 漂移检测、双向溯源、逐字节重验
           ▼
第 7 步  目标工具链编译与测试（sbt / cargo / go test / tsc）                 ← 已在 truthsrc 之外
```

这张产物图直接回答了扩展新架构时最容易犯错的三个问题：

1. **Knowledge 图谱需要为新语言重写吗？不需要。**
   `.truthsrc/knowledge.sqlite` 是单份 `canonical.json` 的纯缓存投影（可随时删除重建），节点 payload 按 JSON Pointer 直接取自 `canonical.json`。语义产物在图里仅作为 `semantic-product` 节点并通过 `compiles-to` 边关联作溯源；`generate-project` 只要拿到完整干净的 `compilation`，图构建、双向回锚与 Explorer 导出便天然复用。
2. **变化检测与构建模型是什么？全量推导、增量写回。**
   `truthsrc` 没有 watch 守护进程。每次执行 `compile-project` / `generate-project` 时，[`lib/project/cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/cli.mjs) 中的 `captureProject()` 会把项目清单、整棵 YAML 树、显式技术绑定文档以及工具自身源码全部计算 SHA-256 抓拍，落盘前再用 `assertUnchanged()` 复核（任意输入中途变化直接报错 `PROJECT_CHANGED`）。推导始终全量重算；落盘时带上 `--update` 则只重写内容变化的文件，未变文件保持不动，手写隔离区永不触碰。
3. **代码生成器的真实输入是什么？不是原始 YAML，而是类型化编译产物。**
   生成器绝不应自己去重新解析 YAML 或猜测 `canonical.json` 的松散结构——它消费的是经过 `compileProductSet()` 验证后的**版本化语义产物集（`truthsrc.semantic-product-set/v1`）**。

## 二、两类生成器契约对比：为什么正式扩展必须走 Formal Product Generator？

翻开 [`metarch-truthsrc/generators/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators)（当前包含 55 个目录条目），你会同时看到两套不同的 `generator.json` 形态。新手最常踩的第一个坑，就是复制错了起步模板：

| 维度 | 轻量级 / Legacy 插件契约（`generators/_template/`） | 正式产品生成器契约（`truthsrc.product-generator/v1`） |
|---|---|---|
| **典型示例** | [`generators/_template/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/_template) | [`generators/product-design-review/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/product-design-review)（最小非 Scala 范本）、[`generators/scala-cqrs-play-service/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/scala-cqrs-play-service)（完整服务范本） |
| **清单声明** | `inputSchema: "truthsrc/v0.3"` + 宽松 `products: ["template"]` | `schemaVersion: "truthsrc.product-generator/v1"`，严格绑定 `products[]`（含 `id`、`version`、`payloadSchemaVersion`、`capabilities`）、`producers[]`、`artifactKinds[]`、`options[]` |
| **输入形态** | 直接读取原始 `canonical` 对象 | 通过 [`src/core/product-plan.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/src/core/product-plan.mjs) 的 `planProductSet()` 接收深拷贝冻结的 `products`（带 Proxy 防越界读取未声明产品）与 `options` |
| **CLI 入口** | `truthsrc generate --generator <dir>`（独立扫描） | `truthsrc generate-project --project truthsrc.project.json --out <dir>`（同时兼容 `generate-products`、`status-project`、`query-project`、`verify-project`） |
| **核心门禁** | 基础双跑确定性与 `artifactKinds` 校验 | 全量重编译一致校验、每个 `producer` 独立双跑字节确定性门禁、`???` 占位符拦截、`deps` 闭环校验、`codeMappings` UTF-8 字节区间校验、四份 `.truthsrc/*.json` 证据落盘与 SQLite 图谱锚点发布 |
| **适用场景** | 快速写一次性 Markdown 摘要、原型文档 | **所有目标语言/架构的正式代码生成器（Rust / Go / TypeScript / Java 等）** |

**工程结论**：如果你只是想把聚合列表导出成 Markdown 文档，fork `generators/_template/` 即可；但只要你的目标是构建一个接入 `truthsrc.project.json`、`generate-project`、双向回锚与 `verify-project` 的**正式代码生成器**，请直接以 [`generators/product-design-review/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/product-design-review)（仅有 15 行 `generator.json`、9 行 `generate.mjs` 和 64 行 `produce.mjs`）作为最小骨架蓝图，再按复杂度参照 `scala-cqrs-play-service` 拆分多子生产器（`producers[]`）。

## 三、输入总表与 21 种产品注册表：哪些直接复用，哪些需要扩展？

在项目级入口下，命令行只接收一份清单：`--project truthsrc.project.json`。它在 [`lib/project/derive.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/derive.mjs) 中被划分为 `CONFIG_INPUTS` 与 `CONFIG_IO` 四大输入组：

| 输入组 | 字段 | 职责说明 |
|---|---|---|
| **知识来源** | `tree`、`context`、`canonicalId` | 指定唯一真源树路径、当前有界上下文与规范文档标识 |
| **产品与精确值类型** | `products`、`exactTypes`、`exactCodecs` | 点名要编译的语义产品及精确版本号，声明 `Money`、`AmountDecimal` 等精确数值类型与 wire/PO 编解码（如 `minor-units-text`） |
| **技术绑定** | `documents`、`assemblies`、`roles` | 为技术类产品提供运行时绑定文档与角色映射。注：对于 `sagaBinding`、`runtimeBinding`、`executionBinding`，[`lib/project/derive-bindings.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/derive-bindings.mjs) 现已支持**约定优于配置的自动推导**（当前 [`bank-wealth-demo/truthsrc.project.json`](https://github.com/co-arising/bank-wealth-demo/blob/main/truthsrc.project.json) 中这三项已精简为空数组/空对象）；而当你接入自定义运行时（例如 Rust 的自定义工作流或持久化引擎）时，仍可通过显式 `documents`/`assemblies`/`roles` 传入技术绑定，或为新栈补齐自动推导逻辑 |
| **生成器与选项** | `generator`、`options` | `generator` 指向 `generators/` 下的注册目录名；`options` 必须与 `generator.json` 的 `options[]` 声明完全对齐（多余或缺失字段都会在 `captureProject` 阶段 fail-closed 拦截） |

### 21 种已注册产品：语言无关层直接复用，架构特化层按需扩展

[`lib/products/registry.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/products/registry.mjs) 与 `lib/project/derive.mjs` 共注册了 **21 种**语义产品（14 种 `DERIVED` 自动派生产品 + 7 种 `TECHNICAL_PRODUCTS` 技术绑定产品；此外注册表还保留了 `classic-architecture@1..5` 系列脚手架产品）：

| 分类 | 产品 ID（及当前主版本） | 跨语言复用策略（以新建 Rust 洋葱架构生成器为例） |
|---|---|---|
| **核心领域与值类型（直接复用）** | `reference-layout@1`、`exact-value-types@1`、`exact-value-codecs@1`、`domain-decision@4`、`domain-dependencies@6`、`domain-folds@6`、`domain-external-events@2` | **100% 语言无关，零改动直接复用**。聚合、状态字段、命令、守卫优先级、事件绑定、状态折叠、值对象精度与编解码规则全部已结构化编译完毕 |
| **契约、接口与设计面（按需复用）** | `artifact-contract@3`、`api-contract@1`、`workflow-contract@1`、`module-seams-contract@1`、`product-design@1` | **语言无关契约层，优先复用**。服务边界、HTTP API 契约、模块接缝签名与五平面产品设计均不绑定 Scala 语法 |
| **宿主与编排契约（视运行时复用或替换）** | `saga-host-contract@2/3`、`effect-host-contract@2`、`saga-contract@1/2`、`saga-runtime-contract@1/2`、`execution-contract@1/2`、`child-plan-contract@1` | 若新目标栈同样实现 TCC Saga + 有限阶段流水线，可复用 `saga-contract` / `execution-contract` 语义模型并替换运行时绑定；若新栈采用纯同步/事件总线模型，则无需选入这些产品 |
| **组合与持久化技术产品（按需新增）** | `module-seams-composition@1`、`persistence-readside-contract@1`、`application-composition@1` | 若新目标架构需要声明式模块布局或读侧持久化契约，可参考这三类产品在 `registry.mjs` 与 `derive.mjs` 中新增语言无关的**布局契约产品**——**铁律：产品只表达语义与边界契约，绝不推导目标语言语法** |

## 四、目录布局与唯一核心接线点：严守 `lib/` 语言无关边界

检视 `metarch-truthsrc` 的仓库结构，可以归纳出一条必须死守的架构红线：

- **`lib/` 只放语言无关的核心**：校验（`validate.mjs`）、编译（`compile.mjs`）、逆拆（`decompose.mjs`）、图谱（`knowledge-sqlite.mjs`）、产品注册与推导（`products/`、`domain-products/`、`value-products/`、`project/`、`derivation/`）。
- **前车之鉴：`lib/scala-target/`**：历史上 Scala 的部分命名与目标模型曾放进 `lib/scala-target/`。**扩展 Rust、Go、TypeScript 或 Java 生成器时，绝对不要重蹈覆辙——不要建 `lib/rust-target/`！** 所有目标语言专有的命名转换（`snake_case` / `PascalCase`）、类型映射表、AST 渲染器、模块布局器与模板，都必须内聚在 `generators/<your-generator>/` 目录下。
- **`generators/` 遵循「一个目标架构一个独立目录」**：
  - 顶层完整服务生成器（如 `generators/scala-cqrs-play-service/`）可把内部渲染职责拆成多个子生产器（`producers[]`），每个子生产器在 `generator.json` 中显式声明自己消费哪些 `products`、产出哪些 `artifactKinds`。
  - 退役的旧生成器统一挪入 `generators/_deprecated/` 隔离，不干扰新生成器。

### 唯一必须改动的核心接线点：`registeredProductProducer`

当项目在 `truthsrc.project.json` 里写 `"generator": "rust-onion-service"` 时，[`lib/project/cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/cli.mjs) 会定位到 `generators/rust-onion-service/`，并交给 [`lib/products/generate-cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/products/generate-cli.mjs) 中的 `registeredProductProducer()` 准入检查：

```javascript
// lib/products/generate-cli.mjs（唯一核心接线点）
import { generate as generateRustOnion } from '../../generators/rust-onion-service/generate.mjs';

const rustOnion = new URL('../../generators/rust-onion-service/', import.meta.url);

export function registeredProductProducer(generatorDir) {
  const directory = realpathSync(generatorDir);
  const generate = [
    // ... 现有内置生成器表项
    [rustOnion, generateRustOnion],
  ].find(([path]) => directory === realpathSync(path))?.[1];
  if (!generate) fail('PRODUCT_PRODUCER', 'generator must be a shipped registered source producer');
  return Object.freeze({ directory, generate, ...implementationProducers.get(generate) });
}
```

如果目录存在但没登记在这张静态对照表里，CLI 会直接 fail-closed 报错 `PRODUCT_PRODUCER: generator must be a shipped registered source producer`。**这张静态表是刻意设计的安全接缝**：它保证 `truthsrc` 永远不会根据外部 JSON 动态 `import()` 不可信代码。因此，在 `metarch-truthsrc` 中新增一个完整代码生成器，**对核心目录 `lib/` 的唯一必改项就是这里的一行 `import` + 一个 URL 常量 + 一个对照表项**（外加可选的 `implementationProducers` 注册，见下节）。

## 五、手把手实战蓝图：从零扩展一个 Rust 洋葱架构生成器

下面以虚构但完全贴合源码契约的新生成器 `generators/rust-onion-service/` 为例，走完落地全流程。

### 第 1 步：搭建独立目录结构

```text
generators/rust-onion-service/
├── generator.json            # truthsrc.product-generator/v1 正式清单
├── generate.mjs              # 入口：校验 profile，组装 producerRegistry 并调用 planProductSet
├── naming.mjs                # Rust 专有命名与类型映射（绝不放进 lib/）
├── producers/
│   ├── domain-model.mjs      # 消费 reference-layout + exact-value-types + domain-decision + domain-folds → domain crate
│   ├── ports-adapters.mjs    # 消费 domain-dependencies + domain-external-events + exact-value-codecs → ports & serde codecs
│   └── workspace-cargo.mjs   # 消费 artifact-contract + reference-layout → Cargo.toml / workspace scaffold
└── templates/                # 可选纯字符串模板或渲染辅助函数
```

### 第 2 步：编写严格版本锁定的 `generator.json`

`src/core/product-plan.mjs` 会对 `generator.json` 做逐字段白名单检查（多一个未声明字段都会失败），并校验每个 `products[]` 的 `id`、`version`、`payloadSchemaVersion`、`capabilities` 与 `lib/products/registry.mjs` 中的 `profileFor()` **完全一致**：

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

注意 `options` 数组的语义：`planProductSet()` 会执行 `object(o, m.options, at('options'))`，要求 `truthsrc.project.json` 中的 `options` 对象**不多不少正好包含**这些顶层键。

### 第 3 步：实现 `generate.mjs` 与满足 8 字段契约的 `produce()`

入口文件非常精炼——复用核心编排器 [`planProductSet`](https://github.com/co-arising/metarch-truthsrc/blob/main/src/core/product-plan.mjs)：

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

而在每个 `producer.produce({ products, options })` 内部，必须严格遵守 `planProductSet()` 强制执行的 **6 条铁律**：

1. **只读声明产品**：传入的 `products` 被 `Proxy` 包裹，读取任何未列在当前 `producer.products` 中的键会立刻抛 `PRODUCT_UNDECLARED`。
2. **纯函数与字节确定性**：`planProductSet()` 会用两份独立深拷贝的输入**连续调用两次 `produce()`**，逐字段比对输出；只要引入当前时间戳、随机数、未排序 `Set`/`Map` 遍历或环境变量，立即报错 `PRODUCT_NONDETERMINISTIC`。
3. **精确的 Entry 8 字段契约**：每个返回对象只能包含以下键（`codeMappings` 可选，其余 7 个必填）：

```javascript
{
  path: 'crates/domain/src/value_objects/money.rs',     // 相对规范路径，禁止 ../、反斜杠或与 receipts 冲突
  content: renderedRustSource,                          // UTF-8 字符串，禁止出现 "???" 占位符
  kind: 'rust-value-object',                            // 必须在当前 producer.artifactKinds 中声明
  deps: ['crates/domain/Cargo.toml'],                   // 所有依赖路径必须同批生成（闭环校验）
  knowledgeIds: ['source:bank-v1#/valueObjects/0'],     // 非空数组，声明文件级知识溯源身份
  productFootprint: [                                   // 必须与当前 producer.products 的 (id, version) 逐项一致
    { id: 'reference-layout', version: '1' },
    { id: 'exact-value-types', version: '1' },
    { id: 'domain-decision', version: '4' },
    { id: 'domain-folds', version: '6' },
  ],
  merge: null,                                          // 必须显式为 null（使用核心默认 MANUAL 合并策略）
  codeMappings: [                                       // 可选：精确到 UTF-8 字节区间的符号/语句级锚点
    {
      knowledgeKey: 'source:bank-v1#/valueObjects/0',
      span: { start: 120, end: 215, text: 'pub struct Money { ... }' },
      scope: { start: 100, end: 240, text: '// Money domain value object\npub struct Money { ... }\n' },
    },
  ],
}
```

4. **全量 `deps` 闭环**：`entries` 中声明的每一条 `deps` 路径，都必须存在于同一轮生成计划的 `entries` 路径集合内，否则报错 `PRODUCT_ENTRY_DEPENDENCY`。
5. **大小写不敏感路径去重**：`path.normalize('NFC').toLowerCase()` 跨所有子生产器唯一，避免 macOS / Windows 大小写折叠碰撞（`PRODUCT_PATH_ALIAS`）。
6. **无未实现占位符**：正式产品计划禁止 `content` 中残留 `???`（只有显式白名单中的 `classic-architecture` 教学脚手架除外）。

### 第 4 步：接入注册表，并处理 2 处容易漏掉的源码接缝

完成生成器目录并把它加入 `lib/products/generate-cli.mjs` 的 `registeredProductProducer()` 表后，务必检查以下两处与语言特性相关的真实源码接缝：

#### 接缝 A：`lib/project/provenance-annotations.mjs` 的文件后缀白名单

在 [`lib/project/provenance-annotations.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/provenance-annotations.mjs) 中，核心在 `applyEntries()` 写盘前会自动给源码加盖 `// @generated by truthsrc ...`、`// @knowledge-release ...` 与顺序无关的 `// @knowledge <stableId>@<elementHash16>` 头，并自动平移所有 `codeMappings` 的 UTF-8 字节偏移量。但当前的后缀判断函数只认两种后缀：

```javascript
// lib/project/provenance-annotations.mjs:140-142
function supportsSlashHeader(filePath) {
  return filePath.endsWith('.scala') || filePath.endsWith('.proto');
}
```

这意味着，如果你新生成的是 `.rs`、`.go`、`.ts` 或 `.java` 文件，**默认不会被自动加盖统一溯源头**！建议做法是把该函数扩展为语言注释前缀表（例如 `.rs`/`.go`/`.ts`/`.java`/`.scala`/`.proto` 用 `// `，`.py`/`.toml` 用 `# `），并同步在测试里验证 `codeMappings` 字节偏移在加盖头部后仍然通过 [`src/core/code-mappings.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/src/core/code-mappings.mjs) 的 `validateCodeMappings()`。

#### 接缝 B：手写实现区的边界与 `implementationProducers`

- **若只需隔离手写代码目录（推荐起点）**：在 `options` 中声明手写路径（如 `handwrittenRoots`），确保输出目录与手写目录完全不相交，并在生成的 `Cargo.toml`（Workspace members）里引用该外部 crate；如需要在生成文件内部留口子，遵循 [`generators/README.md`](https://github.com/co-arising/metarch-truthsrc/blob/main/generators/README.md) 约定的 Protected Regions（`// ==== BEGIN MANUAL ====` / `// ==== END MANUAL ====` 与 `AI_PROMPT` 块），核心的 `applyEntries()` 会自动保护这些区域在 `--update` 重生成时不丢失。
- **若需把特定手写实现纳入双向哈希证明**：才需要像 `scala-cqrs-play-application`、`scala-cqrs-module-seams`、`scala-cqrs-saga-monarch` 那样，在 `lib/products/generate-cli.mjs` 的 `implementationProducers` Map 中注册 `resolveImplementations` 回调。

### 第 5 步：测试放置与四道质量门禁

在 `metarch-truthsrc` 中，**测试文件不放进 `generators/<name>/` 目录**，而是平铺放在仓根 `test/` 目录下（当前共 211 个 `*.test.mjs` 文件，按领域命名），文档同步更新 `generators/README.md` 与 `MIGRATION.md`。

一个新代码生成器要达到可合入、可信赖的工程水准，建议至少补齐四道自动化验证：

1. **契约与确定性单测（`test/rust-onion-service.test.mjs`）**：
   - 验证 `compile-project` → `generate-project --plan` → `generate-project` → `generate-project --update` → `status-project` → `query-project` → `verify-project` 全链路通过；
   - 验证负例：缺少必填产品、版本不匹配、多余 `options` 字段、读未声明产品、`???` 残留、输出目录与手写区重叠均 fail-closed 报错。
2. **反硬编码静态门禁（[`tools/lint.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/tools/lint.mjs)）**：
   - 运行 `node tools/lint.mjs`，确保所有 `.mjs` 语法合规、无 `console.log` / `debugger` / 重复 import，且**严禁出现任何银行或特定业务域标识符硬编码**（如 `bankwealth`、`FundOrder`、`CreditBalance` 等）。
3. **跨领域第二业务域冒烟证明**：
   - 千万不要只在银行夹具上测通！用一份与金融完全无关的独立小树（例如电商 `commerce`：`Order`、`Inventory`、`Payment`，或最小 `Counter` 树）跑通整条 `generate-project` + `verify-project` 闭环，证明生成器对任意符合 SCHEMA 的领域模型泛化成立。
4. **目标语言编译器与运行时闭环**：
   - 在生成的目标目录执行真实工具链验证（例如 `cargo check --workspace && cargo test --workspace`），并把验证收据与 `truthsrc` 自身契约测试区分记录。

## 六、五条源码级避坑红线与 AI Agent 协作物料清单

### 避坑清单（来自 `metarch-truthsrc` 真实源码）

1. **绝不在 `lib/` 下新建目标语言目录**：不要建 `lib/rust-target/` 或 `lib/go-target/`；目标语言映射与布局全部留在 `generators/<name>/`。
2. **绝不把非 JVM 生成器塞进 `planCompiledProducts` 的 Maven JAR 白名单**：[`lib/products/generate-cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/products/generate-cli.mjs) 第 125–139 行写死了 7 个 Scala 应用/服务生成器，强制要求 `options.runtimeArtifact.repository` 指向本地 `file:///` Maven 仓库并按 SHA-256 校验 `saga-core` 与 `monarch` 的 JAR。Rust/Go/TS 生成器**绝不要**加入那张名单；若需锁定第三方运行时依赖，应在自己的生成器中校验 `Cargo.lock` / `go.sum` / `package-lock.json` 哈希，或在纯零依赖领域层完全省去运行时 pin。
3. **不要绕过编译产物去重解析 `canonical.json`**：消费已编译的 `domain-decision@4`、`domain-folds@6`、`exact-value-types@1` 等产物，才能确保新生成器与既有 Scala 生成器对守卫顺序、类型引用、精度标度拥有 100% 相同的语义解释。
4. **不要把测试夹具里的明文密钥或本地绝对路径写进模板**：目标配置模板（如数据库连接串、HTTP Secret）必须通过环境变量占位符注入；任何路径表达式（参考 `scala-cqrs-play-service/generate.mjs` 中的 `portableBuildSbt()`）必须保持相对可移植。
5. **不要顺手把静态注册表改成“扫描目录自动 dynamic import”**：`registeredProductProducer` 的静态表是安全边界（防不可信路径注入与版本漂移），是否开放外部动态插件是独立的架构决策，不要在新增单个生成器时夹带修改。

### 交给 AI Agent 实现新代码生成器的最小物料包

如果你想直接让 AI Agent 在 `metarch-truthsrc` 中帮你推理并实现一个全新目标栈生成器，把下面 **6 件最小物料**一次性对齐清楚，就能避免 Agent 瞎猜框架约定或污染核心：

1. **已选定的语义产品清单（带精确版本）**：明确本次先覆盖最小领域核心（`reference-layout@1` + `exact-value-types@1` + `exact-value-codecs@1` + `domain-decision@4` + `domain-dependencies@6` + `domain-folds@6`），还是同时包含编排/宿主契约。
2. **目标架构的分层与目录映射表**：每一层（Domain / Application / Ports / Adapters / Composition Root）对应哪些 `artifactKinds`、落到什么路径模式、依赖方向如何单向指向内层（洋葱架构与 DIP 原则可参照 [bank-wealth-demo 实战全景指南第 3–4 节](https://co-arising.github.io/zh/articles/bank-wealth-quickstart-architecture-extensibility-20261125/#section-3)）。
3. **类型与编解码映射规格**：标量类型、精确数值类型（`unit-decimal` / `decimal` + `minor-units-text`）以及 `Option` / `List` / `Map` 在目标语言中的精确映射（例如 Rust 中 `rust_decimal::Decimal` 或 `i128` 分值封装）。
4. **最小手写黄金参考样例（1 个聚合 + 1 个值对象 + 1 个端口 + 1 个单测）**：比千字提示词更有效——把你认可的目标语言惯用写法给 Agent 当作格式与风格锚点。
5. **契约参考源码指针**：直接指向 `generators/product-design-review/`（最小正式生成器）、`src/core/product-plan.mjs`（计划校验器）、`lib/products/generate-cli.mjs`（唯一注册点）与 `lib/project/provenance-annotations.mjs`（注释头后缀表）。
6. **硬验收命令清单**：要求 Agent 交付前必须一次性跑绿 `node tools/lint.mjs`、`node --test test/<your-gen>.test.mjs`、跨领域非银行夹具的 `generate-project` + `verify-project`，以及目标语言的原生编译与单测命令。

## 七、参考源码与延伸阅读

- **核心工具仓**：[`co-arising/metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc)（[SCHEMA.md](https://github.com/co-arising/metarch-truthsrc/blob/main/SCHEMA.md) · [CODEGEN.md](https://github.com/co-arising/metarch-truthsrc/blob/main/CODEGEN.md) · [generators/README.md](https://github.com/co-arising/metarch-truthsrc/blob/main/generators/README.md)）
- **关键源码入口**：
  - 项目管线与抓拍门禁：[`lib/project/cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/cli.mjs) · [`lib/project/derive.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/derive.mjs) · [`lib/project/derive-bindings.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/derive-bindings.mjs)
  - 产品注册与生成器准入：[`lib/products/registry.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/products/registry.mjs) · [`lib/products/generate-cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/products/generate-cli.mjs)
  - 正式计划编排、写盘与精确回锚：[`src/core/product-plan.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/src/core/product-plan.mjs) · [`src/core/generate.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/src/core/generate.mjs) · [`src/core/code-mappings.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/src/core/code-mappings.mjs) · [`lib/project/provenance-annotations.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/provenance-annotations.mjs)
  - 最小与完整参考生成器：[`generators/product-design-review/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/product-design-review) · [`generators/scala-cqrs-play-service/`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/scala-cqrs-play-service) · [`tools/lint.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/tools/lint.mjs)
- **参考示例项目**：[`co-arising/bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo)（[`truthsrc.project.json`](https://github.com/co-arising/bank-wealth-demo/blob/main/truthsrc.project.json)）
- **站内关联阅读**：
  - [流水线：六阶段职责分工与回锚边界](https://co-arising.github.io/zh/pipeline/)
  - [bank-wealth-demo 实战全景指南：从真源到运行时试玩、洋葱架构拆解与 AI 时代代码生成器扩展规范](https://co-arising.github.io/zh/articles/bank-wealth-quickstart-architecture-extensibility-20261125/)
  - [co-arising EARS 1.0 技术规格说明书（v1.2 双语对照版）](https://co-arising.github.io/zh/articles/co-arising-ears-spec-20261123/)
  - [事实与状态台账（含最新快照验证证据）](https://co-arising.github.io/zh/status/)
