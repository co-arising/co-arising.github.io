# metarch-truthsrc 战略架构地图与地下暗道排雷手册（v2.0.0 源码级全解）

> **文档定位与源码基线**：本文对照 [`metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) **v2.0.0**（提交 [`0b925ad`](https://github.com/co-arising/metarch-truthsrc/commit/0b925ad387d2603f1d3e248a31a71831c13c112f)）全部核心源码撰写，是一份**从粗到细、从宏观主干到源码接缝**的工程作战地图。与介绍设计理念的 [co-arising 2.0 长期架构蓝图](https://co-arising.github.io/zh/articles/co-arising-v2-ears-native-architecture-20261126/) 以及面向用户的 [GA 完整指南](https://co-arising.github.io/zh/articles/co-arising-v2-ga-prd-to-running-guide-20261126/) 不同，本文把整个编译器切开，标注**模块边界、数据流向、14 条跨文件隐蔽耦合（地下暗道）**，以及一套已被实证的**探针排雷法与下一波 8 个高危靶点**，用于系统性地提前发现并消灭生成器与门禁 Bug。

<div class="co-kpi-strip" role="region" aria-label="metarch-truthsrc v2.0.0 源码规模与排雷基线">
<div><div class="kpi-num">34.5k + 14.1k</div><div class="kpi-label">v2 主干与 EARS/Play 生成器 34,486 LOC + 1.0 精选 24 家族发射器 14,125 LOC</div></div>
<div><div class="kpi-num">44 / 32 / 158</div><div class="kpi-label">surface-registry 锁定的 44 个 CLI 命令、32 个 MCP 工具与 158 个诊断错误码</div></div>
<div><div class="kpi-num red">14 条暗道</div><div class="kpi-label">横跨类型系统、1.0/2.0 桥接、测试预言机与门禁断层的隐蔽耦合拓扑</div></div>
<div><div class="kpi-num">7 战 7 中</div><div class="kpi-label">上一轮按图推演并实锤修复的 7 个真实 Bug（锁定 SPEC-S13..S17）+ 8 个待排靶点</div></div>
</div>

## 一、战略俯瞰（Level 0）：整座城池的宏观地形图

想在 `metarch-truthsrc` 里精准排雷，先要破除一个常见错觉：**它不是一个“读 YAML 填模板”的脚手架工具，而是一座叠加了两个历史地层的五段式领域编译器**。

- **地层一（v1 严格治理遗产层，`emitter/families/`）**：24 个经过 [`emitter/parity.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/emitter/parity.mjs) 金文件锁死的 Scala CQRS/Play 确定性代码发射器（值对象、聚合协议、Akka 持久化、Protobuf 编解码、Play 运行时等）。
- **地层二（v2 EARS-Native 主干层，`lib/ears/` + `lib/v2/`）**：正交 YAML 结构加载器、EARS 1.0 词法/语法/绑定/Z3 SMT 求解器、DMN First-Hit 见证合成器、`Canonical Model v2`、本地 SQLite 知识图谱、TS/Scala 双栈与 Scala 单栈生成器、锁定 BDD 测试发射器、变异测试与防作弊门禁。

**绝大多数真实 Bug 并不藏在某个函数内部的算法里，而是藏在“地层交界处”与“同一语义被多个下游独立翻译”的接缝上。**下面这张战略地形图标出了从真源到运行时的六大主战区，以及红色虚线标注的四大高危断层带：

<figure class="co-arch-fig">
<div class="arch-caption-head">FIGURE 01 · METARCH-TRUTHSRC V2.0.0 STRATEGIC TERRAIN &amp; FAULT LINES</div>
<svg viewBox="0 0 840 500" width="100%" role="img" aria-label="metarch-truthsrc v2.0.0 宏观六段编译主干与四大高危断层带战略地图">
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
  <text x="24" y="30" class="arch-t-band">STAGE 1–2 · 正交真源前端与形式化硬闸门（lib/v2/structure-loader + lib/ears/* + lib/v2/compiler）</text>
  <rect x="24" y="42" width="176" height="52" rx="4" class="arch-card"/>
  <text x="112" y="63" text-anchor="middle" class="arch-t-title">正交真源输入</text>
  <text x="112" y="81" text-anchor="middle" class="arch-t-sub">YAML 结构 + .ears 行为</text>
  <rect x="226" y="42" width="194" height="52" rx="4" class="arch-card-teal"/>
  <text x="323" y="63" text-anchor="middle" class="arch-t-title">解析 · 绑定 · 血缘校验</text>
  <text x="323" y="81" text-anchor="middle" class="arch-t-sub">structure-loader / binder / lineage</text>
  <rect x="446" y="42" width="184" height="52" rx="4" class="arch-card-teal"/>
  <text x="538" y="63" text-anchor="middle" class="arch-t-title">Z3 SMT + First-Hit</text>
  <text x="538" y="81" text-anchor="middle" class="arch-t-sub">5 项证明 + k-BMC + 见证合成</text>
  <rect x="656" y="42" width="160" height="52" rx="4" class="arch-card-dark"/>
  <text x="736" y="63" text-anchor="middle" class="arch-t-title-dark">Canonical v2</text>
  <text x="736" y="81" text-anchor="middle" class="arch-t-sub-dark">+ knowledge.sqlite</text>
  <line x1="200" y1="68" x2="223" y2="68" class="arch-edge-teal" marker-end="url(#map1-arr-teal)"/>
  <line x1="420" y1="68" x2="443" y2="68" class="arch-edge-teal" marker-end="url(#map1-arr-teal)"/>
  <line x1="630" y1="68" x2="653" y2="68" class="arch-edge-teal" marker-end="url(#map1-arr-teal)"/>

  <rect x="12" y="126" width="816" height="148" rx="4" class="arch-band-teal"/>
  <text x="24" y="146" class="arch-t-band-teal">STAGE 3–4 · 双通道代码生成与 1.0/2.0 桥接层（generators/scala-cqrs-play-service-v2 + lib/v2/bridge + codegen）</text>
  <rect x="24" y="160" width="214" height="98" rx="4" class="arch-card"/>
  <text x="131" y="181" text-anchor="middle" class="arch-t-title">多域打包与目标路由</text>
  <text x="131" y="200" text-anchor="middle" class="arch-t-sub">mergeCanonicalsForBc (单体)</text>
  <text x="131" y="218" text-anchor="middle" class="arch-t-sub">target-resolution (双栈 / Scala 单栈)</text>
  <text x="131" y="236" text-anchor="middle" class="arch-t-mono">onion-routes 共享路由派生</text>
  <rect x="264" y="160" width="276" height="98" rx="4" class="arch-card-teal"/>
  <text x="402" y="181" text-anchor="middle" class="arch-t-title">v2 -&gt; 1.0 严格治理桥接群 (Block A–D)</text>
  <text x="402" y="200" text-anchor="middle" class="arch-t-sub">v1-strict-scala · block-cd · readside</text>
  <text x="402" y="218" text-anchor="middle" class="arch-t-sub">api-auth (Play 5层鉴权) · policy · orchestration</text>
  <text x="402" y="236" text-anchor="middle" class="arch-t-teal">复用 emitter/families/* 24 个 1.0 精选家族</text>
  <rect x="566" y="160" width="250" height="98" rx="4" class="arch-card-amber"/>
  <text x="691" y="181" text-anchor="middle" class="arch-t-title">双通道物理落盘领地</text>
  <text x="691" y="200" text-anchor="middle" class="arch-t-sub">4A 只读锁定：generated-scaffold/</text>
  <text x="691" y="218" text-anchor="middle" class="arch-t-sub">4B 永不覆写：handwritten/ (@cloze)</text>
  <text x="691" y="236" text-anchor="middle" class="arch-t-amber">ServerSnapshotProviderImpl · Bindings</text>
  <line x1="238" y1="209" x2="261" y2="209" class="arch-edge-teal" marker-end="url(#map1-arr-teal)"/>
  <line x1="540" y1="209" x2="563" y2="209" class="arch-edge-teal" marker-end="url(#map1-arr-teal)"/>

  <rect x="12" y="294" width="816" height="114" rx="4" class="arch-band-amber"/>
  <text x="24" y="314" class="arch-t-amber">STAGE 5–6 · 锁定 BDD 预言机发射与五重验证门禁（lib/v2/test-emitter + verify-gate + mutation-gate + guard-write）</text>
  <rect x="24" y="328" width="236" height="66" rx="4" class="arch-card"/>
  <text x="142" y="350" text-anchor="middle" class="arch-t-title">锁定测试预言机发射器</text>
  <text x="142" y="368" text-anchor="middle" class="arch-t-sub">witness-materialize -&gt; TS/Scala/HTTP</text>
  <text x="142" y="384" text-anchor="middle" class="arch-t-mono">generated-tests/ + manifest.sha256</text>
  <rect x="286" y="328" width="254" height="66" rx="4" class="arch-card-teal"/>
  <text x="413" y="350" text-anchor="middle" class="arch-t-title">verify-gate + mutation-gate</text>
  <text x="413" y="368" text-anchor="middle" class="arch-t-sub">SHA-256 防篡改 · 离线 scalac · Onion DIP</text>
  <text x="413" y="384" text-anchor="middle" class="arch-t-teal">Domain 变异杀灭率 100% + 溯源写回</text>
  <rect x="566" y="328" width="250" height="66" rx="4" class="arch-card-red"/>
  <text x="691" y="350" text-anchor="middle" class="arch-t-red">终极交付与运行时验收</text>
  <text x="691" y="368" text-anchor="middle" class="arch-t-sub">sbt -batch stage + Play 2.8.18 HTTP 路演</text>
  <text x="691" y="384" text-anchor="middle" class="arch-t-mono">tasks-v2 盲审 · view-v2 / atlas-v2</text>
  <line x1="260" y1="361" x2="283" y2="361" class="arch-edge-teal" marker-end="url(#map1-arr-teal)"/>
  <line x1="540" y1="361" x2="563" y2="361" class="arch-edge-red" marker-end="url(#map1-arr-red)"/>

  <path d="M 736 94 L 736 114 L 131 114 L 131 157" class="arch-edge" marker-end="url(#map1-arr-ink)"/>
  <path d="M 736 94 L 736 114 L 402 114 L 402 157" class="arch-edge" marker-end="url(#map1-arr-ink)"/>
  <path d="M 691 258 L 691 282 L 142 282 L 142 325" class="arch-edge-amber" marker-end="url(#map1-arr-amber)"/>
  <path d="M 691 258 L 691 282 L 413 282 L 413 325" class="arch-edge-amber" marker-end="url(#map1-arr-amber)"/>

  <rect x="12" y="424" width="816" height="64" rx="4" class="arch-band-red"/>
  <text x="24" y="445" class="arch-t-band-red">FOUR HIGH-RISK SEAM FAULT LINES（四大高危断层带 — 90% 真实 Bug 落点）</text>
  <text x="24" y="466" class="arch-t-sub">① 类型归一化断层 (record/ExactType/VO 多端重复翻译)   ② 1.0/2.0 桥接与离线 scalac 过滤断层 (SBT_FRAMEWORK_IMPORT_RE)</text>
  <text x="24" y="481" class="arch-t-sub">③ 见证物化与 5 层 Authz 四端镜像断层 (TS/Scala/Play/HTTP)   ④ 多域单体 dedupBy 与永不覆写手写区的跨版本漂移断层</text>
</svg>
<figcaption>图 1：metarch-truthsrc v2.0.0 的六段式主干地形与四大高危断层带。主干看似线性，实则由 Canonical v2 扇出到代码桥接、测试发射、离线校验与 Play 运行时四条平行线，任何一端语义偏移都会在集成期引爆。</figcaption>
</figure>

### 必须先建立的两个顶层心智模型

1. **双栈（Dual-Stack）与 Scala 单栈（Single-Stack）的定位分工**：
   - `typescript` 目标提供毫秒级 Node 22 零编译反馈、浏览器友好验证与教学演示；`scala-cqrs-play-service-v2` 是面向生产的 Akka/Play/Protobuf/ScalikeJDBC 完整服务交付栈。
   - 在 `0b925ad` 引入 [`lib/v2/target-resolution.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/target-resolution.mjs) 后，Scala 生产项目不再被迫维护“双槽”（`*.cloze.ts` + `*Impl.scala`）——只要项目仅存在 `generated-scaffold/scala`（或 `.truthsrc/generated-scala-manifest.json`）而无 `generated-scaffold/ts`，`tasks-v2`、`verify-v2` 与 `check-v2` 会自动收敛为 Scala 单栈模式。
2. **离线 `scalac` 与真实 `sbt stage` 的两层盲区差**：
   - `verify-v2` 为了在秒级完成 TDD 闭环，走的是**离线裸 `scalac` + ScalaTest**，并主动剥离了依赖 Akka/Play/ScalaPB/ScalikeJDBC 的框架文件。
   - 这意味着**离线 `verify-v2` 全绿 ≠ `sbt -batch stage` 能编过 ≠ Play HTTP 路演返回 200**。Play 控制器、ReadSide 投影仓储、Protobuf Converter、Guice DI 模块与 `conf/routes` 只有在真实 `sbt -batch stage` + 启动 Play 进程时才会接受编译器与运行时的终极检验。

---

## 二、战区与目录地图（Level 1）：六大模块与源码索引

截至 `0b925ad`，整个 v2 工程核心分布于六大战区。下表精确标注每个关键文件的职责边界、体量（LOC）及读写契约，排雷时可直接按图索骥：

| 战区 | 核心文件（点击直达源码） | LOC | 核心职责 | 关键输入 / 输出契约 |
|---|---|---:|---|---|
| **A · 入口与契约锁** | [`bin/truthsrc.js`](https://github.com/co-arising/metarch-truthsrc/blob/main/bin/truthsrc.js) / [`lib/v2/cli.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/cli.mjs) | 559 / 517 | 44 个 CLI 命令总路由与 v2 子命令分发（含 `--bc` / `--packaging monolith`） | `BOOL_FLAGS` 严格白名单解析；缺失或误拼 flag 直接失败 |
| **A · 入口与契约锁** | [`mcp/server.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/mcp/server.mjs) / [`lib/v2/surface-registry.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/surface-registry.mjs) | 370 / 300 | 32 个 MCP 工具（含 6 个 `v2_*`）与能力面单一真源校验 | `npm run check:contracts` 锁死 CLI、MCP、Skills、错误码总数 |
| **A · 入口与契约锁** | [`tools/lint.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/tools/lint.mjs) / [`lib/runtime-profile.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/runtime-profile.mjs) | 168 / — | 零业务硬编码静态架构门禁与运行时包坐标唯一入口 | 禁止 `lib/`、`bin/`、活跃 `emitter/` 出现业务名或 `net.imadz` 字面量 |
| **B · 前端与 SMT** | [`lib/v2/structure-loader.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/structure-loader.mjs) | **2,378** | **全仓最大单体模块**：加载 YAML 结构、拒绝旧 `@guard`、归一化 `resolvedType`、校验 5 层 Authz/PII/ReadModel | 产出 `structures` + `symbolTable` + `resolveCanonicalEventFields` |
| **B · 前端与 SMT** | [`lib/ears/parser.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/ears/parser.mjs) / [`lib/ears/binder.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/ears/binder.mjs) | 772 / 1,146 | EARS 1.0 双语同构语法解析、规范化（`normalize.mjs`）与强类型符号绑定 | 绑定所有 state/param/event/extern 引用，产出理论层级 `L1/L2/L3` |
| **B · 前端与 SMT** | [`lib/ears/smt-encoder.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/ears/smt-encoder.mjs) / [`lib/v2/first-hit-witness.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/first-hit-witness.mjs) | 847 / 467 | EARS → SMT-LIB 2 单跳编码、Z3 五项体检 + `k`-BMC、DMN First-Hit 精确见证合成 | 任何不可达/冲突/遮蔽规则阻断 `Canonical v2` 产出 |
| **B · 前端与 SMT** | [`lib/v2/compiler.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/compiler.mjs) / [`lib/v2/lineage.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/lineage.mjs) | 594 / 1,061 | v2 编译总控、全链路字段血缘、Event Sourcing `post:` 折叠一致性与双语等价检查 | 写出 `canonical-v2.json`、`knowledge.sqlite`、Style E/B 签核文档 |
| **C · 图谱与任务** | [`lib/v2/knowledge-db.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/knowledge-db.mjs) / [`lib/v2/tasks-v2.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/tasks-v2.mjs) | 401 / 294 | Node 22 内置 `node:sqlite` 图谱存储与零漂移 `@cloze` 任务队列派生 | 重建图谱时保留已有 `cloze_slots.provenance` 盲审记录 |
| **C · 图谱与任务** | [`lib/v2/atlas-viewer.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/atlas-viewer.mjs) / [`lib/v2/diagrams.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/diagrams.mjs) / [`lib/v2/view-v2.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/view-v2.mjs) | 1,474 / 1,283 / 1,077 | 11 张离线全景图谱 `atlas.html` 与交互式 Workshop HTML 渲染器 | 纯只读消费 `canonical-v2.json` + SQLite，不参与运行时 |
| **D · 生成与桥接** | [`generators/scala-cqrs-play-service-v2/generate.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/generators/scala-cqrs-play-service-v2/generate.mjs) | 396 | `scala-cqrs-play-service:2` 总装配器、头章打标、多子域单体合并（`mergeCanonicalsForBc`） | 串联 Block A/B/C/D 桥接器，写 `.truthsrc/generated-scala-manifest.json` |
| **D · 生成与桥接** | [`lib/v2/bridge/v1-strict-scala.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-scala.mjs) / [`ears-simplify.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/ears-simplify.mjs) | 1,231 / 298 | Block A 领域核心桥接：驱动 1.0 `#1/#2/#3/#45` 家族 + EARS NNF 表达式化简 + `@cloze` 槽位骨架 | 输出 `domain/values`、`entities`、`invariants`、`Computations`、`*Impl.scala` |
| **D · 生成与桥接** | [`lib/v2/bridge/v1-strict-block-cd.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-block-cd.mjs) | 1,354 | Block C/D 总调度：驱动 1.0 协议/聚合/仓储/Protobuf/序列化/Play 运行时/sbt 脚手架 + Authz PEP/DI | 内部调用 `readside`、`policy`、`api-auth`、`orchestration` 四个子桥接器 |
| **D · 生成与桥接** | [`v1-strict-readside.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-readside.mjs) / [`v1-strict-api-auth.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-api-auth.mjs) / [`v1-strict-policy.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-policy.mjs) / [`v1-strict-orchestration.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-orchestration.mjs) | 709 / 576 / 569 / 702 | Play 完整垂直切面四件套：CQRS 读侧投影+JDBC、auth-core Play 控制器+`ServerSnapshotProvider`、事件 PolicyMachine、Saga/Effect/ToolGate | **Play `sbt stage` 编译错误的最高发区** |
| **D · 生成与桥接** | [`lib/v2/codegen/onion-routes.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/codegen/onion-routes.mjs) / [`typescript.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/codegen/typescript.mjs) / [`onion-ts.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/codegen/onion-ts.mjs) / [`onion-scala.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/codegen/onion-scala.mjs) | 120 / 1,085 / 761 / 603 | HTTP 路由唯一派生源（`deriveStoryHttpRoutes`）与 TS / Scala 洋葱接口层代码生成 | 必须与 `v1-strict-api-auth` 和 `interfaces-http` 保持严格同构 |
| **E · 测试发射器** | [`lib/v2/test-emitter/witness-materialize.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/witness-materialize.mjs) | 686 | 把 Z3 稀疏见证补全为完整 TS/Scala 强类型命令、状态、快照与可信上下文 | **应用层 41 项测试成片失败的核心控制点** |
| **E · 测试发射器** | [`scala-strict-scalatest.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/scala-strict-scalatest.mjs) / [`typescript-node-test.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/typescript-node-test.mjs) / [`interfaces-http.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/interfaces-http.mjs) | 427 / 342 / 796 | 发射领域/应用 ScalaTest、Node 22 TS 套件与 5 层 Authz/CSRF/PDP HTTP 锁定测试 | 生成 `generated-tests/manifest.sha256.json` 哈希锁 |
| **F · 门禁与防作弊** | [`lib/v2/verify-gate.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/verify-gate.mjs) / [`mutation-gate.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/mutation-gate.mjs) / [`guard-write.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/guard-write.mjs) | 843 / 381 / 232 | 篡改检测、TS/离线 `scalac` 执行、Onion DIP 检查、Domain 变异测试与 `PreToolUse` 写守卫 | 隔离区只允许编辑 `@cloze:start..end` 内行段，其余物理阻断 |

---

## 三、核心数据流与状态机（Level 2）：一条规则如何穿越全链路？

从宏观落到中观，要看清**两条最关键的纵向数据通道**和一个**横向状态机**——排雷时只要发现某条数据在不同节点被重新解析或重新推导，那里几乎必定存在分叉风险：

<figure class="co-arch-fig">
<div class="arch-caption-head">FIGURE 02 · DUAL VERTICAL DATAFLOWS &amp; CLOZE TASK STATE MACHINE</div>
<svg viewBox="0 0 840 430" width="100%" role="img" aria-label="领域规则与 HTTP 路由两条纵向数据流及 Cloze 任务状态机">
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
  <text x="24" y="30" class="arch-t-band-teal">FLOW A · 领域规则纵向流（Domain Slice / L1 &amp; L2）</text>
  <rect x="24" y="44" width="136" height="78" rx="4" class="arch-card"/>
  <text x="92" y="66" text-anchor="middle" class="arch-t-title">YAML + .ears</text>
  <text x="92" y="84" text-anchor="middle" class="arch-t-sub">ExactType / VO</text>
  <text x="92" y="101" text-anchor="middle" class="arch-t-mono">aliases · rules · post</text>
  <rect x="186" y="44" width="150" height="78" rx="4" class="arch-card"/>
  <text x="261" y="66" text-anchor="middle" class="arch-t-title">binder + Z3</text>
  <text x="261" y="84" text-anchor="middle" class="arch-t-sub">resolvedType 归一化</text>
  <text x="261" y="101" text-anchor="middle" class="arch-t-mono">first-hit 稀疏见证</text>
  <rect x="362" y="44" width="144" height="78" rx="4" class="arch-card-dark"/>
  <text x="434" y="66" text-anchor="middle" class="arch-t-title-dark">Canonical v2</text>
  <text x="434" y="84" text-anchor="middle" class="arch-t-sub-dark">behaviors + testIr</text>
  <text x="434" y="101" text-anchor="middle" class="arch-t-sub-dark">eventFolds + lineage</text>
  <rect x="532" y="44" width="136" height="78" rx="4" class="arch-card-teal"/>
  <text x="600" y="66" text-anchor="middle" class="arch-t-title">v1-strict-scala</text>
  <text x="600" y="84" text-anchor="middle" class="arch-t-sub">RuleParams / Rules</text>
  <text x="600" y="101" text-anchor="middle" class="arch-t-mono">Computations / Impl</text>
  <rect x="692" y="44" width="124" height="78" rx="4" class="arch-card-amber"/>
  <text x="754" y="66" text-anchor="middle" class="arch-t-title">ScalaTest 预言机</text>
  <text x="754" y="84" text-anchor="middle" class="arch-t-sub">witness-materialize</text>
  <text x="754" y="101" text-anchor="middle" class="arch-t-amber">scalac + 变异门禁</text>
  <line x1="160" y1="83" x2="183" y2="83" class="arch-edge-teal" marker-end="url(#map2-arr-teal)"/>
  <line x1="336" y1="83" x2="359" y2="83" class="arch-edge-teal" marker-end="url(#map2-arr-teal)"/>
  <line x1="506" y1="83" x2="529" y2="83" class="arch-edge-teal" marker-end="url(#map2-arr-teal)"/>
  <line x1="668" y1="83" x2="689" y2="83" class="arch-edge-amber" marker-end="url(#map2-arr-amber)"/>

  <rect x="12" y="156" width="816" height="132" rx="4" class="arch-band-amber"/>
  <text x="24" y="176" class="arch-t-amber">FLOW B · 应用层与 5 层 Authz 扇出流（1 个源头 -&gt; 4 个平行消费者，必须严格镜像！）</text>
  <rect x="24" y="192" width="184" height="82" rx="4" class="arch-card-dark"/>
  <text x="116" y="214" text-anchor="middle" class="arch-t-title-dark">onion-routes.mjs</text>
  <text x="116" y="233" text-anchor="middle" class="arch-t-sub-dark">deriveStoryHttpRoutes</text>
  <text x="116" y="251" text-anchor="middle" class="arch-t-sub-dark">mode/roles/pdp/rowScope</text>
  <rect x="244" y="192" width="132" height="82" rx="4" class="arch-card"/>
  <text x="310" y="216" text-anchor="middle" class="arch-t-title">① onion-ts</text>
  <text x="310" y="236" text-anchor="middle" class="arch-t-sub">TS HTTP Router</text>
  <text x="310" y="254" text-anchor="middle" class="arch-t-mono">Node 22 运行时</text>
  <rect x="392" y="192" width="132" height="82" rx="4" class="arch-card"/>
  <text x="458" y="216" text-anchor="middle" class="arch-t-title">② onion-scala</text>
  <text x="458" y="236" text-anchor="middle" class="arch-t-sub">Scala HttpRouter</text>
  <text x="458" y="254" text-anchor="middle" class="arch-t-mono">离线 scalac 校验</text>
  <rect x="540" y="192" width="134" height="82" rx="4" class="arch-card-red"/>
  <text x="607" y="216" text-anchor="middle" class="arch-t-red">③ v1-strict-api-auth</text>
  <text x="607" y="236" text-anchor="middle" class="arch-t-sub">PlayController</text>
  <text x="607" y="254" text-anchor="middle" class="arch-t-mono">auth-core + Snapshot</text>
  <rect x="690" y="192" width="126" height="82" rx="4" class="arch-card-teal"/>
  <text x="753" y="216" text-anchor="middle" class="arch-t-title">④ interfaces-http</text>
  <text x="753" y="236" text-anchor="middle" class="arch-t-sub">TS + Scala HTTP</text>
  <text x="753" y="254" text-anchor="middle" class="arch-t-teal">锁定鉴权预言机</text>
  <line x1="208" y1="233" x2="241" y2="233" class="arch-edge-amber" marker-end="url(#map2-arr-amber)"/>
  <path d="M 208 212 L 226 212 L 226 184 L 458 184 L 458 189" class="arch-edge-amber" marker-end="url(#map2-arr-amber)"/>
  <path d="M 226 184 L 607 184 L 607 189" class="arch-edge-red" marker-end="url(#map2-arr-red)"/>
  <path d="M 226 184 L 753 184 L 753 189" class="arch-edge-teal" marker-end="url(#map2-arr-teal)"/>

  <rect x="12" y="306" width="816" height="112" rx="4" class="arch-band"/>
  <text x="24" y="326" class="arch-t-band">STATE MACHINE · tasks-v2 派生队列状态机（由磁盘 @cloze 文件 + knowledge.sqlite provenance 实时计算）</text>
  <rect x="24" y="346" width="124" height="52" rx="4" class="arch-card-amber"/>
  <text x="86" y="368" text-anchor="middle" class="arch-t-title">PENDING</text>
  <text x="86" y="385" text-anchor="middle" class="arch-t-mono">含 NOT_IMPLEMENTED</text>
  <rect x="184" y="346" width="142" height="52" rx="4" class="arch-card-red"/>
  <text x="255" y="368" text-anchor="middle" class="arch-t-red">UNVERIFIED</text>
  <text x="255" y="385" text-anchor="middle" class="arch-t-mono">已填空但 verify 未全绿</text>
  <rect x="362" y="346" width="176" height="52" rx="4" class="arch-card-teal"/>
  <text x="450" y="368" text-anchor="middle" class="arch-t-title">GREEN_NEEDS_REVIEW</text>
  <text x="450" y="385" text-anchor="middle" class="arch-t-mono">verify-v2 全绿待盲审</text>
  <rect x="574" y="346" width="112" height="52" rx="4" class="arch-card-dark"/>
  <text x="630" y="368" text-anchor="middle" class="arch-t-title-dark">VERIFIED</text>
  <text x="630" y="385" text-anchor="middle" class="arch-t-sub-dark">盲审 PASS 锁定</text>
  <rect x="716" y="346" width="100" height="52" rx="4" class="arch-card-red arch-dash"/>
  <text x="766" y="368" text-anchor="middle" class="arch-t-red">STALE</text>
  <text x="766" y="385" text-anchor="middle" class="arch-t-mono">SHA 漂移重做</text>
  <line x1="148" y1="372" x2="181" y2="372" class="arch-edge-amber" marker-end="url(#map2-arr-amber)"/>
  <line x1="326" y1="372" x2="359" y2="372" class="arch-edge-teal" marker-end="url(#map2-arr-teal)"/>
  <line x1="538" y1="372" x2="571" y2="372" class="arch-edge-teal" marker-end="url(#map2-arr-teal)"/>
  <line x1="686" y1="372" x2="713" y2="372" class="arch-edge-red" marker-end="url(#map2-arr-red)"/>
</svg>
<figcaption>图 2：两条核心数据通道与 Cloze 派生状态机。注意 Flow B 中 onion-routes.mjs 同时扇出给四个平行消费者——任何鉴权、状态码或参数形态只改三家漏一家，就会立刻制造线上/测试分叉。</figcaption>
</figure>

### 磁盘三域所有权边界（物理隔离铁律）

| 磁盘领地 | 所有者 | 生成器行为 | `guard-write.mjs` 写守卫策略 |
|---|---|---|---|
| `truth/`（YAML + `.ears` + bindings） | 领域作者 / 架构师 | 只读输入，绝不回写 | 允许编辑（变更后须重跑 `compile-v2`） |
| `generated-scaffold/`、`generated-tests/`、`projections/` | 编译器与生成器 | 全量确定性覆写 | **物理阻断（`TERRITORY_LOCKED`，exit 2）** |
| `handwritten/`（`*Impl.scala`、`*.cloze.ts`、`ServerSnapshotProviderImpl.scala`、`HandwrittenBindingsModule.scala`） | 人类 / 隔离区 AI Agent | 仅首次创建，**已存在永不覆写（`overwrite: false`）** | 仅允许在 `@cloze:start(<id>)..@cloze:end(<id>)` 之间局部编辑，禁止整文件覆盖或修改标记 |
| `.truthsrc/`（`canonical-v2.json`、`knowledge.sqlite`、manifests） | 派生状态缓存 | 编译/验证阶段更新（重建 SQLite 时保留 `provenance`） | 可清理重建，但 `cloze_slots.provenance` 记录验证与盲审凭证 |

---

## 四、地下暗道图（Level 3）：14 条最容易踩爆的跨文件隐蔽耦合

地面上的主干看起来井然有序，但真正让大项目（例如 6 子域、50 领域行为、23 个 `@cloze` 槽位的考试平台）在集成期撞墙的，是埋在地下的 **14 条隐蔽暗道（T01–T14）**。每一条暗道都对应一对“**表面上互不调用、实则共享隐式不变量**”的源码模块：

<figure class="co-arch-fig">
<div class="arch-caption-head">FIGURE 03 · UNDERGROUND TUNNELS MAP（T01–T14 跨模块隐蔽耦合拓扑）</div>
<svg viewBox="0 0 840 460" width="100%" role="img" aria-label="14 条地下暗道（T01-T14）分属四大暗道网的跨文件耦合拓扑图">
  <defs>
    <marker id="map3-arr-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-red"/>
    </marker>
    <marker id="map3-arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-amber"/>
    </marker>
  </defs>
  <rect x="12" y="10" width="398" height="210" rx="4" class="arch-band-red"/>
  <text x="24" y="30" class="arch-t-band-red">暗道网 A · 类型与名义系统断层（T01–T03）</text>
  <rect x="24" y="42" width="374" height="50" rx="4" class="arch-card"/>
  <text x="34" y="61" class="arch-t-red">T01 · record(ExactType/VO) 六端独立翻译</text>
  <text x="34" y="79" class="arch-t-sub">structure-loader -&gt; readside / block-cd / policy / witness 漏一处即降级 String</text>
  <rect x="24" y="100" width="374" height="50" rx="4" class="arch-card"/>
  <text x="34" y="119" class="arch-t-red">T02 · SPEC-S10 原始集合 Json.toJson vs 名义递归编解码</text>
  <text x="34" y="137" class="arch-t-sub">v1-strict-readside 须区分 typeUsesNominal 避免破坏惯用序列化</text>
  <rect x="24" y="158" width="374" height="50" rx="4" class="arch-card"/>
  <text x="34" y="177" class="arch-t-red">T03 · aliases 缺 'state' 导致 state.state.copy 递归错</text>
  <text x="34" y="195" class="arch-t-sub">binder / smt-encoder / v1-strict-scala / witness 四处隐式要求含 'state'</text>

  <rect x="430" y="10" width="398" height="210" rx="4" class="arch-band-amber"/>
  <text x="442" y="30" class="arch-t-amber">暗道网 B · 1.0/2.0 桥接与离线 scalac 断层（T04–T07）</text>
  <rect x="442" y="42" width="374" height="40" rx="4" class="arch-card"/>
  <text x="452" y="59" class="arch-t-amber">T04 · SBT_FRAMEWORK_IMPORT_RE 双份拷贝（verify + mutation）</text>
  <text x="452" y="74" class="arch-t-mono">新文件若引用被剥离 trait 却漏框架 import -&gt; 离线 scalac 必炸</text>
  <rect x="442" y="88" width="374" height="40" rx="4" class="arch-card"/>
  <text x="452" y="105" class="arch-t-amber">T05 · emitter/families 24 家族 parity 负例不可破</text>
  <text x="452" y="120" class="arch-t-mono">零 VO 等 2.0 兜底必须在 lib/v2/bridge 侧实现，严禁破 1.0 parity</text>
  <rect x="442" y="134" width="374" height="38" rx="4" class="arch-card"/>
  <text x="452" y="150" class="arch-t-amber">T06 · 混合 L1+L2 聚合 RuleParams 统一 + SPEC-S4 零 Noop</text>
  <text x="452" y="165" class="arch-t-mono">非空 Computations 禁 val Noop；L1 测试用 null.asInstanceOf</text>
  <rect x="442" y="178" width="374" height="34" rx="4" class="arch-card"/>
  <text x="452" y="199" class="arch-t-amber">T07 · lint.mjs 禁业务名/禁 net.imadz 字面量 -&gt; runtime-profile</text>

  <rect x="12" y="238" width="398" height="210" rx="4" class="arch-band-teal"/>
  <text x="24" y="258" class="arch-t-band-teal">暗道网 C · 见证物化与测试预言机断层（T08–T10）</text>
  <rect x="24" y="272" width="374" height="52" rx="4" class="arch-card"/>
  <text x="34" y="291" class="arch-t-teal">T08 · Z3 稀疏见证 -&gt; witness-materialize 具象填充失真</text>
  <text x="34" y="309" class="arch-t-sub">isRejected 须保 []；accepted 须填非空集合、bindPrincipal、快照</text>
  <rect x="24" y="332" width="374" height="50" rx="4" class="arch-card"/>
  <text x="34" y="351" class="arch-t-teal">T09 · 事件字段解析双口径（显式 fields vs 血缘推导）</text>
  <text x="34" y="369" class="arch-t-sub">生成代码与 [POSTCOND] 测试必须共用 resolveCanonicalEventFields</text>
  <rect x="24" y="390" width="374" height="48" rx="4" class="arch-card"/>
  <text x="34" y="409" class="arch-t-teal">T10 · 5 层 Authz 四端镜像（public / PDP / GET / PlayController）</text>
  <text x="34" y="426" class="arch-t-sub">ownerField · requiresEntitlement · rowScope · HttpStatusMapper · JsNull</text>

  <rect x="430" y="238" width="398" height="210" rx="4" class="arch-band"/>
  <text x="442" y="258" class="arch-t-band">暗道网 D · 单体打包、单栈与门禁断层（T11–T14）</text>
  <rect x="442" y="272" width="374" height="38" rx="4" class="arch-card-red"/>
  <text x="452" y="288" class="arch-t-red">T11 · mergeCanonicalsForBc 短名 dedupBy 静默吞并 + 旧文件残留</text>
  <text x="452" y="303" class="arch-t-mono">多子域同名 VO/ReadModel 后者静默丢失；增量生成不删旧包路径</text>
  <rect x="442" y="316" width="374" height="38" rx="4" class="arch-card"/>
  <text x="452" y="332" class="arch-t-title">T12 · target-resolution 双栈/单栈探测与 forbiddenImports</text>
  <text x="452" y="347" class="arch-t-mono">tasks/verify/check 自动切单栈；init-v2 禁误伤 controllers/</text>
  <rect x="442" y="360" width="374" height="38" rx="4" class="arch-card"/>
  <text x="452" y="376" class="arch-t-title">T13 · verify-gate 短路跳过 mutation-gate + HTTP 句柄残留</text>
  <text x="452" y="391" class="arch-t-mono">基础套件有 1 项失败即不跑变异门禁，掩盖超时与杀灭盲区</text>
  <rect x="442" y="404" width="374" height="36" rx="4" class="arch-card-amber"/>
  <text x="452" y="420" class="arch-t-amber">T14 · overwrite:false 永不覆写文件跨版本签名漂移</text>
  <text x="452" y="434" class="arch-t-mono">HandwrittenBindingsModule / ServerSnapshotProviderImpl 升级失配</text>
</svg>
<figcaption>图 3：metarch-truthsrc 14 条地下暗道（T01–T14）全景图。红框与琥珀框标注了历史已爆雷和下阶段最高危的跨模块耦合接缝。</figcaption>
</figure>

### 暗道网 A · 类型与名义系统断层（T01–T03）

1. **T01 · `resolvedType.kind === 'record'` 的六端重复翻译**：
   - [`structure-loader.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/structure-loader.mjs) 把 `ExactType`（如 `Money`、`Score`）与 `ValueObject` 统一编码为 `{ kind: 'record', typeName }`。
   - 但下游至少 **6 个文件**各自写了一套 `scalaTypeOf` / `defaultScalaExpr` / `buildNominalIndex`：`v1-strict-scala.mjs`、`v1-strict-block-cd.mjs`、`v1-strict-readside.mjs`、`v1-strict-policy.mjs`、`v1-strict-api-auth.mjs`、`witness-materialize.mjs`。
   - **爆雷机理**：只要任意一端漏掉 `case 'record'` 的 `exactByName` / `voByName` 查找，就会走 `default: return 'String'`——直接导致 **Play ReadSide 把 `String` 赋给 `BigDecimal`/`Long`（[Issue #2](https://github.com/co-arising/metarch-truthsrc/issues/2)）** 或 **ReadModel 含 VO/ExactType 字段无法编译（Bug #4）**。
2. **T02 · ReadSide 集合编解码的 `SPEC-S10` 双轨约束**：
   - [`v1-strict-readside.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-readside.mjs) 在生成 ScalikeJDBC 读写代码时，对于原始类型序列（如 `Vector[String]`）必须保留 `Json.stringify(Json.toJson(row.topics))` 与 `Json.parse(...).as[Vector[String]]`（受 `SPEC-S10` 锁定）；而当元素嵌套了 `ExactType` 或 `ValueObject`（无自动隐式 Play `Format`）时，必须通过 `typeUsesNominal` 分流到递归 `jsEncodeExpr` / `jsDecodeExpr`。
3. **T03 · `aliases` 必须恒含 `'state'` 的四处隐式假设**：
   - 当 YAML 给聚合手写自定义 `aliases: [bal]` 而未显式列出 `'state'` 时，[`v1-strict-scala.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-scala.mjs) 和 [`witness-materialize.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/witness-materialize.mjs) 在展开 `state.field` 时会误把它当成嵌套记录成员，拼出 `state.copy(state = state.state.copy(...))`（Bug #7）。因此所有读取 `agg.aliases` 的位置都必须强归一化为 `new Set(['state', ...])`。

### 暗道网 B · 1.0 遗产家族与 2.0 桥接层断层（T04–T07）

4. **T04 · `SBT_FRAMEWORK_IMPORT_RE` 双份正则与离线 `scalac` 剥离暗道**：
   - [`verify-gate.mjs:359`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/verify-gate.mjs#L359) 与 [`mutation-gate.mjs:210`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/mutation-gate.mjs#L210) 各维护了一份框架 import 正则，把依赖 `akka.*`、`play.*`、`scalapb.*`、`scalikejdbc.*`、`infrastructure.{proto,persistence.converters,...}` 的文件从离线 `scalac` 中过滤掉。
   - **排雷铁律**：每当新增或改造一个生成的 Scala 文件，如果它继承或引用了某个会被过滤掉的 trait（如零 VO 场景下的 `DomainConverters.scala` 继承 `<Agg>ProtoConverters`），它自身也**必须**携带匹配该正则的 import，否则 `sbt stage` 过了，离线 `verify-v2` 却会报 `not found: type`！同时改正则必须**两处同步改**。
5. **T05 · 1.0 `emitter/families/` 24 家族金文件红线**：
   - [`emitter/parity.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/emitter/parity.mjs) 锁死了全部 24 个 1.0 家族的正例字节输出与 `runNegatives` 负例契约（例如 `proto-converter.mjs` 明确断言 `valueObjects.length === 0` 必须抛错）。
   - **工程红线**：遇到 v2 特有的退化形态（如全项目零 VO/ExactType），绝不能通过放宽 1.0 家族断言来迁就，而要在 [`v1-strict-block-cd.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-block-cd.mjs) 的 2.0 桥接层发射兜底实现，保住 1.0 `24/24 allGreen`。
6. **T06 · 混合 L1+L2 聚合的 `RuleParams` 统一与 `SPEC-S4` 零 `Noop` 铁律**：
   - 同一个聚合若同时拥有 L1 纯规则与 L2 `@cloze` 计算规则，参数必须全部统一生成在 `<Agg>RuleParams` 下，不能分裂出 `<Agg>DomainServiceRuleParams`。
   - 同时，`SPEC-S4` 严禁非空 L2 `<Agg>Computations` trait 在生产代码提供 `val Noop`（防止线上误绑定空实现）。因此在 [`scala-strict-scalatest.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/scala-strict-scalatest.mjs) 中，L1 规则测试针对混合聚合必须传入 `null.asInstanceOf[<Agg>Computations]`（安全，因为 L1 分支永不调用宿主计算方法）。
7. **T07 · `tools/lint.mjs` 架构防污染门禁**：
   - [`tools/lint.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/tools/lint.mjs) 用正则静态扫描全部 625 个 JS/MJS 文件：严禁在通用核心出现业务专有名词（如 `CreditBalance`、`FundOrder`、`bankwealth`），严禁在 `lib/runtime-profile.mjs` 之外硬编码 `net.imadz`，严禁活跃 `emitter/families/` 拼接硬编码 `'app/'` 路径。

### 暗道网 C · 见证物化与测试预言机断层（T08–T10）

8. **T08 · Z3 稀疏见证 → `witness-materialize` 具象填充语义失真**：
   - [`first-hit-witness.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/first-hit-witness.mjs) 只向 Z3 查询守卫表达式中实际出现的变量；其余字段全靠 [`witness-materialize.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/witness-materialize.mjs) 补全。
   - **两大陷阱**：① 给接受规则构造有效集合需要非空样本，但若对拒绝规则（`isRejected`）也强制覆盖空数组 `[]`，就会把 `len(items) == 0` 的拒绝见证彻底篡改失效（Bug #1）；② 应用层成功用例若缺少 `bindPrincipal` 注入、服务端 `stateSnapshot` 或给序列字段传了标量，就会引发批量失败（[Issue #3](https://github.com/co-arising/metarch-truthsrc/issues/3)）。
9. **T09 · 事件字段解析双口径**：
   - 聚合事件可以显式声明 `fields:`，也可以由命令参数与数据血缘自动推导。若 [`v1-strict-scala.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-scala.mjs) 用 `resolveCanonicalEventFields(agg, ev)` 产出 `case class`，而测试发射器只读 `ev.fields`，`[POSTCOND]` 测试就会与真实事件构造器签名错位（Bug #6）。
10. **T10 · 5 层 Authz PEP/PDP 的四端镜像暗道**：
    - `onion-routes.mjs` 派生路由后，[`onion-ts.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/codegen/onion-ts.mjs)、[`onion-scala.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/codegen/onion-scala.mjs)、[`v1-strict-api-auth.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-api-auth.mjs)（真实 Play 控制器）与 [`interfaces-http.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/test-emitter/interfaces-http.mjs)（HTTP 预言机）必须逐项对齐：
      - 首条路由是 `public` 时，401/403 测试必须挑第一条非 `public` 路由；
      - `external-pdp` 与 `resource-policy` 两种模式都必须向测试注入 allow-PDP；
      - `GET` 路由在 `AUTHZ_*` 用例中必须拼装 query string；
      - Play 控制器必须走 `HttpStatusMapper.statusForRejection(err.code)` 而非硬编码 400，递归转换 `JsNull => null`（`PlayHttpBridge.scala`），解析 `X-Entitlements` / `X-Principal-Attr-*`，并在服务端执行 `ownerField`（403）、`requiresEntitlement`（403）与 `rowScope`（403）及 `ServerSnapshotProvider.load`。

### 暗道网 D · 多域单体打包、目标解析与门禁断层（T11–T14）

11. **T11 · 单体打包 `mergeCanonicalsForBc` 的静默 `dedupBy` 吞并与旧文件残留**：
    - 翻开 [`generators/scala-cqrs-play-service-v2/generate.mjs:135`](https://github.com/co-arising/metarch-truthsrc/blob/main/generators/scala-cqrs-play-service-v2/generate.mjs#L135)：合并多子域时，`valueObjects`、`exactTypes`、`readModels`、`aggregates`、`ports`、`stories` 全都用 `dedupBy(..., x => x.name)` 按短名去重。一旦两个子域定义了同名不同结构的 `ValueObject` 或 `ReadModel`，后者会被**静默丢弃**而非报冲突！此外，目录增量重生成不会删除旧包名/旧路由留下的孤立 `.scala` 文件（[Issue #4](https://github.com/co-arising/metarch-truthsrc/issues/4)）。
12. **T12 · `target-resolution.mjs` 双栈/单栈联动与 `init-v2` 规则分叉**：
    - [`lib/v2/target-resolution.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/target-resolution.mjs) 统一了 `tasks-v2`、`verify-gate`、`check-v2` 与 `cli.mjs` 的目标推断逻辑；但 [`init-v2.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/init-v2.mjs) 里的 `forbiddenImports` 架构约束也必须随单栈/双栈切换（例如 Scala 单栈若误写全局禁止 `play.api.mvc.` 会立刻误伤自己生成的 `controllers/`，必须精确约束为禁止生成层反向 import `.handwritten.`）。
13. **T13 · `verify-gate` 门禁短路与 HTTP 测试句柄驻留**：
    - `verify-gate.mjs` 在基础 TS/Scala 测试未全绿时会直接跳过内置 `mutation-gate`——导致大规模项目在修完业务失败前，完全看不到变异测试的耗时、内存或存活突变体问题。同时 `interfaces-http.ears.spec.ts` 若在异常路径未关闭 HTTP listener，独立 `node --test` 会在打印完统计后挂起进程。
14. **T14 · `overwrite: false` 永不覆写文件的跨版本签名漂移**：
    - `HandwrittenBindingsModule.scala`、`ServerSnapshotProviderImpl.scala` 与全部 `@cloze` `*Impl.scala` 文件一旦落盘就永不覆写。当上游生成器新增 DI 参数（例如控制器新增 `ServerSnapshotProvider` 注入）或更新 `AuthEndpointDsl` 签名时，全新目录能过，**存量老项目原地重生成却会因旧手写绑定文件缺新绑定而编译失败**。

---

## 五、实战复盘（Level 4A）：上一波「按图排雷」如何 7 战 7 中？

在 6 子域考试平台首轮反馈（[Issue #2](https://github.com/co-arising/metarch-truthsrc/issues/2)、[#3](https://github.com/co-arising/metarch-truthsrc/issues/3)、[#4](https://github.com/co-arising/metarch-truthsrc/issues/4)）落地修复后，我们正是顺着上述暗道图反推 6 个疑似雷区，写出真实端到端探针（跑完整 `compileCanonicalV2` + `node --test` + 真实 `sbt -batch compile`），结果**6 个预测全中，还顺藤摸瓜多抓出 1 个编译级 Bug（共 7/7 实锤）**：

| 序号 | 实锤 Bug 症状 | 命中的暗道 | 最小对抗探针特征 | 最终修复与锁定验收 |
|---|---|---|---|---|
| **#1** | `len(items) == 0` 的拒绝规则测试失败 | **T08** | 聚合命令带 `Seq[String]`，规则要求空集合拒绝 | `witness-materialize` 增加 `allowEmptySeq`，`isRejected` 保留 `[]`（`SPEC-S13`） |
| **#2** | 混合 L1+L2 聚合编译报错 `DomainServiceRuleParams` 未定义 | **T06** | 同一聚合同时含 1 条 L1 规则 + 1 条 L2 `extern` 规则 | 参数统一归入 `<Agg>RuleParams`；保 `SPEC-S4` 零 Noop，L1 测试传 `null.asInstanceOf`（`SPEC-S14`） |
| **#3** | 首条路由为 `public` 时 401/403 测试误打公开接口；`resource-policy` 缺 PDP；`GET` 缺 query 参数 | **T10** | 首条路由 `mode: public`，另有 `resource-policy` 与 `GET` 路由 | `interfaces-http` 选首条非 `public` 路由、`routeNeedsPdp` 涵盖两模式、补 `buildQuerySuffix`（`SPEC-S16`） |
| **#4** | ReadModel 含 `ExactType` / `ValueObject` 字段时 `sbt compile` 类型错 | **T01 + T02** | ReadModel 含 `Money`（`unit-decimal`）与自定义 VO | `v1-strict-readside` 接入 `nominalIdx` 与 `typeUsesNominal` 递归编解码，保 `SPEC-S10`（`SPEC-S15`） |
| **#5** | Play 控制器硬编码 400、漏 `X-Entitlements`/`ownerField`/`rowScope`、`JsNull` 映射不一致 | **T10** | 带资源归属与权益约束的 Play 路由 | `v1-strict-api-auth` 对齐 `HttpStatusMapper`、三层 403 检查与 `PlayHttpBridge` 递归 `JsNull`（`SPEC-S16`） |
| **#6** | 零 VO/ExactType 项目缺 `ProtoConverters`；`[POSTCOND]` 构造器与派生事件字段错位 | **T04 + T05 + T09** | 全项目仅用基础类型 + 血缘派生事件字段 | `v1-strict-block-cd` 发射零 VO 兜底并附框架 import 保 `SBT_FRAMEWORK_IMPORT_RE`；测试改用 `resolveCanonicalEventFields`（`SPEC-S15`） |
| **#7** | 自定义 `aliases: [bal]` 不含 `'state'` 时生成 `state.state.copy(...)` 编译失败 | **T03** | YAML 聚合声明自定义 `aliases` 且省略 `state` | `v1-strict-scala` 与 `witness-materialize` 强制把 `'state'` 并入别名集合（`SPEC-S14`） |

全量回归结果已锁入 [`test/scala-cqrs-play-service-v2-acceptance.spec.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/test/scala-cqrs-play-service-v2-acceptance.spec.mjs)（`SPEC-S1..S17` 17/17 PASS），并通过真实 `sbt -batch stage` + Play 2.8.18 活体 HTTP 路演与 `bank-wealth-demo` 100% 变异门禁复核（详见 [状态页](https://co-arising.github.io/zh/status/)）。

---

## 六、下一波排雷手册（Level 4B）：四步探针法与 8 个高危靶点雷达

为了让后续每一轮排雷都像上一波一样“**发发命中、不靠玄学**”，固化以下四步标准作战流程：

### 四步对抗探针排雷法

1. **选暗道**：从图 3 的 `T01–T14` 暗道中挑一个尚未被极端组合打过的跨模块接缝。
2. **造最小对抗真源**：只写 10–40 行最小 YAML + `.ears`，专门构造**合法但反常规的边界组合**（例如：零 VO、混合 L1+L2、嵌套 `Option[ExactType]`、Scala 保留字字段、两子域同名不同结构 VO）。
3. **跑全链路真编译（严禁只跑正则单测）**：在临时目录完整串跑：
   - `compileCanonicalV2`（Z3 真求解）
   - `generateScalaCqrsPlayServiceV2` / `generateScalaCqrsPlayServiceV2ForBc`
   - `emitV2ExecutableTests`
   - `node --test` + 离线 `scalac` + **真实 `sbt -batch stage` + 启动 Play 进程发真实 HTTP 请求**
4. **实锤即上锁**：确认 Bug 后先修通用推导（守 `npm run lint:arch` 0 违规 + `emitter/parity.mjs` 24/24 全绿），再把对抗样例固化为 `SPEC-S18+`，绝不靠人眼审查结案。

### 下一波 8 个高危潜在地雷雷达（M01–M08）

以下 8 个靶点是我们对照当前 `0b925ad` 源码标出的**下一轮优先探测清单**，按命中概率与杀伤半径排序：

| 雷达编号 | 疑似地雷点 | 关联暗道 | 建议对抗探针设计 | 预期杀伤面 |
|---|---|---|---|---|
| **M01** | **多子域单体同名碰撞**：两子域定义同名但字段不同的 VO / ExactType / ReadModel / Port，被 `dedupBy` 静默吞并 | **T11** | 两子域各定义 `StatusVO`（字段不同），跑 `mergeCanonicalsForBc` + `sbt compile` | 6+ 域单体静默丢字段或编译失败 |
| **M02** | **`stateSnapshot` 严格等值误杀**：手写应用层 handler 对快照衍生字段做归一化或重算时，测试里的严格 `assert(res == expected)` / `deepStrictEqual` 误报失败 | **T08** | 手写 `*Impl.scala` 返回合理派生值而非原样透传快照字段，跑 `verify-v2` | 应用层测试成批红灯 |
| **M03** | **Scala / Play / Protobuf 保留字字段名**：YAML 出现 `type`、`match`、`object`、`val`、`case`、`package`、`sealed`、`implicit` 字段或参数名未反引号转义 | **T01 + T05** | 聚合/命令/ReadModel 声明 `type: String`、`match: Boolean`，跑 `sbt stage` | 生成 `.scala` / `.proto` 语法直接炸裂 |
| **M04** | **大规模项目内置 `mutation-gate` 超时**：6 域全绿后首次触发内置变异门禁，[`verify-gate.mjs:426`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/verify-gate.mjs#L426) 90s `scalac` 与 `mutation-gate.mjs` 逐突变体编译超时 | **T13** | 合成 20+ 聚合、50+ 行为的压测项目，实测 `verify-v2 --strict --mutation-gate` 耗时 | CI 严格门禁超时退出 |
| **M05** | **存量手写项目升级 DI 签名漂移**：旧版本生成的 `HandwrittenBindingsModule.scala` 缺新版本引入的 `ServerSnapshotProvider` 等绑定 | **T14** | 用旧版手写绑定文件 + 新版 `generate-v2` 原地重生成，跑 `sbt stage` + Play 启动 | 老项目升级后 Guice 运行时 500 |
| **M06** | **Policy 与 Orchestration 桥接层的名义类型缺口**：[`v1-strict-policy.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-policy.mjs) 与 [`v1-strict-orchestration.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/v2/bridge/v1-strict-orchestration.mjs) 对事件/Saga 携带的 `ExactType`、`Option[VO]`、`Map` 类型映射未完全对齐 | **T01** | 事件驱动 Policy + Saga 步骤参数包含 `Money`、`Option[AddressVO]`，跑 `sbt stage` | Play 事件策略与 Saga 编译报错 |
| **M07** | **ReadSide 复合嵌套 JDBC 编解码边界**：`Option[ExactType]`、`Option[VO]`、`Map[String, VO]`、`Vector[Decimal]` 在 `rsGetterExpr` / `sqlBindExpr` 下的空值与 JSON 解析边界 | **T01 + T02** | ReadModel 塞满 4 种复合嵌套类型，跑 `sbt stage` + 内存 H2 读写单测 | 读侧仓储编译或运行时抛解析异常 |
| **M08** | **`ears-simplify.mjs` 复杂布尔与 Decimal 精度化简偏差**：深度嵌套否定 `NOT (a AND (b OR c))`、`Option` 判空、不同 scale Decimal 比较在 NNF 化简后的括号优先级与 TS/Scala 语义一致性 | **T01 + T08** | 构造 3 层嵌套布尔 + 2/4 位 scale 混算的 `.ears`，对照 Z3 见证双跑 TS 与 Scala | 罕见逻辑反转或编译类型不匹配 |

### 故障归因三方速查协议（防错怪、防越界）

当外部项目跑出红灯时，按以下顺序 30 秒完成归因，再决定修哪里：

| 现象特征 | 归因归属 | 正确动作 |
|---|---|---|
| `compile-v2` 报 `V2_SMT_GATE_FAILED`、`V2_FIRST_HIT_SHADOWED_RULE`、`V2_LINEAGE_*`、`EARS_*` | **真源层（Truth Source）** | 修正业务 YAML 或 `.ears` 规约，严禁放宽 Z3 闸门 |
| `generated-tests/` 锁定用例期望与真源一致，仅 `@cloze` 槽位行为不达标，或 `ServerSnapshotProviderImpl` 返回空快照 | **手写隔离区（Handwritten）** | 仅在 `@cloze:start..end` 或手写 provider 内修复业务实现 |
| 生成代码自身 `sbt stage` 报类型/语法错；或锁定测试传参违反真源结构/Authz 协议；或增量生成路径/清理缺陷 | **编译器 / 生成器（`metarch-truthsrc`）** | 提上游 Issue 附精确文件行号与最小复现 → 按四步探针法修复并锁入 `SPEC-S*` |

> **结语**：这份地图的价值不在一次性读完，而在**每次准备交付新特性或接入新多域项目前，拿出图 3 的 14 条暗道与雷达表 M01–M08，挑出最危险的 3–5 个接缝写 100 行对抗探针跑一遍真实 `sbt stage` + Play HTTP**。把暗道变成亮路，把踩坑变成探针，这就是 `metarch-truthsrc` 持续逼近工业级确定性的核心打法。
