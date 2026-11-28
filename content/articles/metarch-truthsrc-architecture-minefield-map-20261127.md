# metarch-truthsrc 战略架构地图与地下暗道排雷手册（v2.0.0 源码级全解）

> **文档定位与源码基线**：本文对照 [`metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) **v2.0.0**（锁定提交 [`ab207e7`](https://github.com/co-arising/metarch-truthsrc/commit/ab207e7d2fae55feffafd9c9a13d61ccd6b9d829)，`bank-wealth-demo` @ `b5cadc0`）全部核心源码撰写，是一份**从粗到细、从宏观主干到源码接缝**的工程作战地图。与介绍设计理念的 [co-arising 2.0 长期架构蓝图](https://co-arising.github.io/zh/articles/co-arising-v2-ears-native-architecture-20261126/) 以及面向用户的 [GA 完整指南](https://co-arising.github.io/zh/articles/co-arising-v2-ga-prd-to-running-guide-20261126/) 不同，本文把整个编译器切开，标注**模块边界、数据流向、14 条跨文件隐蔽耦合（地下暗道）**，以及一套已被八波实证的**探针排雷法、36 项已清零缺陷（含 Wave-1..8 实锤与连带修复，锁入 `SPEC-S13..S31`）与下一波 Wave-9 诚实靶点**，并通过 `artifact-maps.lock.json` 与仓库提交哈希机读绑定。

<div class="co-kpi-strip" role="region" aria-label="metarch-truthsrc v2.0.0 源码规模与排雷基线">
<div><div class="kpi-num">34.5k + 14.1k</div><div class="kpi-label">v2 主干与 EARS/Play 生成器 34.5k+ LOC + 1.0 精选 24 家族发射器 14,125 LOC</div></div>
<div><div class="kpi-num">44 / 32 / 159</div><div class="kpi-label">surface-registry 锁定的 44 个 CLI 命令、32 个 MCP 工具与 159 个诊断错误码</div></div>
<div><div class="kpi-num red">14 条暗道</div><div class="kpi-label">横跨类型系统、1.0/2.0 桥接、测试预言机与门禁断层的隐蔽耦合拓扑</div></div>
<div><div class="kpi-num">八波 36 雷清零</div><div class="kpi-label">Waves 1–6(29 @ 8950ba3) + Wave-7(5 @ cf4545a) + Wave-8(2 @ ab207e7)，锁定 SPEC-S13..S31</div></div>
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

截至 `8950ba3`，整个 v2 工程核心分布于六大战区。下表精确标注每个关键文件的职责边界、基准体量（LOC）及读写契约，排雷时可直接按图索骥：

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
   - [`tools/lint.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/tools/lint.mjs) 用正则静态扫描全部 626 个 JS/MJS 文件：严禁在通用核心出现业务专有名词（如 `CreditBalance`、`FundOrder`、`bankwealth`），严禁在 `lib/runtime-profile.mjs` 之外硬编码 `net.imadz`，严禁活跃 `emitter/families/` 拼接硬编码 `'app/'` 路径。

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

## 五、实战复盘（Level 4A）：八波「按图排雷」战报（`SPEC-S13..S31`）

在 6 子域考试平台首轮反馈（[Issue #2](https://github.com/co-arising/metarch-truthsrc/issues/2)、[#3](https://github.com/co-arising/metarch-truthsrc/issues/3)、[#4](https://github.com/co-arising/metarch-truthsrc/issues/4)）落地修复后，我们顺着上述暗道图持续推进八波对抗探针排雷（均走真实 `compileCanonicalV2` + `node --test` + 离线 `scalac`/ScalaTest/Mutation Gate + 真实 `sbt -batch compile`）。**Wave-1（7/7）** 率先验证了按图推演法的命中率：

| 序号 | 实锤 Bug 症状 | 命中的暗道 | 最小对抗探针特征 | 最终修复与锁定验收 |
|---|---|---|---|---|
| **#1** | `len(items) == 0` 的拒绝规则测试失败 | **T08** | 聚合命令带 `Seq[String]`，规则要求空集合拒绝 | `witness-materialize` 增加 `allowEmptySeq`，`isRejected` 保留 `[]`（`SPEC-S13`） |
| **#2** | 混合 L1+L2 聚合编译报错 `DomainServiceRuleParams` 未定义 | **T06** | 同一聚合同时含 1 条 L1 规则 + 1 条 L2 `extern` 规则 | 参数统一归入 `<Agg>RuleParams`；保 `SPEC-S4` 零 Noop，L1 测试传 `null.asInstanceOf`（`SPEC-S14`） |
| **#3** | 首条路由为 `public` 时 401/403 测试误打公开接口；`resource-policy` 缺 PDP；`GET` 缺 query 参数 | **T10** | 首条路由 `mode: public`，另有 `resource-policy` 与 `GET` 路由 | `interfaces-http` 选首条非 `public` 路由、`routeNeedsPdp` 涵盖两模式、补 `buildQuerySuffix`（`SPEC-S16`） |
| **#4** | ReadModel 含 `ExactType` / `ValueObject` 字段时 `sbt compile` 类型错 | **T01 + T02** | ReadModel 含 `Money`（`unit-decimal`）与自定义 VO | `v1-strict-readside` 接入 `nominalIdx` 与 `typeUsesNominal` 递归编解码，保 `SPEC-S10`（`SPEC-S15`） |
| **#5** | Play 控制器硬编码 400、漏 `X-Entitlements`/`ownerField`/`rowScope`、`JsNull` 映射不一致 | **T10** | 带资源归属与权益约束的 Play 路由 | `v1-strict-api-auth` 对齐 `HttpStatusMapper`、三层 403 检查与 `PlayHttpBridge` 递归 `JsNull`（`SPEC-S16`） |
| **#6** | 零 VO/ExactType 项目缺 `ProtoConverters`；`[POSTCOND]` 构造器与派生事件字段错位 | **T04 + T05 + T09** | 全项目仅用基础类型 + 血缘派生事件字段 | `v1-strict-block-cd` 发射零 VO 兜底并附框架 import 保 `SBT_FRAMEWORK_IMPORT_RE`；测试改用 `resolveCanonicalEventFields`（`SPEC-S15`） |
| **#7** | 自定义 `aliases: [bal]` 不含 `'state'` 时生成 `state.state.copy(...)` 编译失败 | **T03** | YAML 聚合声明自定义 `aliases` 且省略 `state` | `v1-strict-scala` 与 `witness-materialize` 强制把 `'state'` 并入别名集合（`SPEC-S14`） |

全量回归结果已锁入 [`test/scala-cqrs-play-service-v2-acceptance.spec.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/test/scala-cqrs-play-service-v2-acceptance.spec.mjs)（当前累计 `SPEC-S1..S31` 31/31 PASS），并经过真实 `sbt -batch compile` / `stage` 与 100% 变异门禁复核（详见 [状态页](https://co-arising.github.io/zh/status/)）。

### 第二波按图排雷战绩（提交 `2f4d33d` · 6/6 探针全中并清零）

基于最初列出的 M01–M08 雷达表，我们落地了第二波对抗探针（`probe_wave2_mines.mjs`），全部走真实 `compileCanonicalV2` + `generateScalaCqrsPlayServiceV2`/`ForBc` + `emitV2ExecutableTests` + 离线 `scalac` + 真实 **`sbt -batch compile`**，结果 **6 组探针 100% 实锤**（共消灭 10 处底层缺陷，全部锁入 `SPEC-S18..S20`）：

| 雷达编号 | 实锤缺陷与根因 | 最终修复与锁定验收（`2f4d33d`） |
|---|---|---|
| **M01** | 两子域同名不同构 `SharedInfo` VO 被 `dedupBy` 静默吞并，导致 `BetaItemRules.scala` 报 `value score is not a member` | `mergeCanonicalsForBc` 改为 `dedupStructuralChecked`：相同 Shared Kernel 正常去重，异构碰撞立即 `BC_MERGE_CONFLICT` 硬失败（`SPEC-S18`） |
| **M03** | `type`/`match` 等 Scala 保留字通过 `compile-v2`，却在 `generate-v2` 抛 `VO_INPUT` 崩溃 | `structure-loader.mjs` 源头校验全部声明与字段，立即报 `V2_RESERVED_IDENTIFIER`（`SPEC-S18`） |
| **M06** | `v1-strict-orchestration.mjs` 缺名义索引，把 `externContracts` 里的 `Money`/`TagVO` 退化为 `String`（甚至同步抓出 `bank-wealth-demo` 的 `BankCashSubmitPortConnectorPort.payloadMatchesOriginal` 历史退化！） | 接入 `buildNominalIndex` + `domain.values._`，`bank-wealth-demo` 同步升级为强类型 `amount: Money`（`SPEC-S19`） |
| **M07** | ReadSide 嵌套 `Seq[Optional[String]]` / `Map[String, Optional[TagVO]]` / `Optional[Seq[Money]]` 连续引爆 3 个 `sbt` 编译错（缺 `Reads[Option]`、`JsValue` 无 `.toOption`、`Option[JsObject].getOrElse(JsNull)` LUB 退化为 `Object`） | 新增 `needsExplicitJsCodec`、区分 `JsLookupResult.toOption` vs `Option(JsValue)`、显式 `: play.api.libs.json.JsValue` 类型标注与深度lambda变量防遮蔽（`SPEC-S19`） |
| **M08-A/B** | **Pre-Z3**：缺 `len/count >= 0` 公理致 Z3 伪造 `-1` 假缺口；缺量词 Skolem 等价公理；**Scala 桥接**：`ears-simplify` 误给量词变量加 `p.` 前缀（`p.x.score`）；**Post-Z3**：`witness-materialize` 未消费 `@quant` 且标量父键 `x=0` 盖掉子字段 `x.score=1` | `smt-encoder` 补齐非负与量词等价公理、`ears-simplify` 追踪 `boundVars` 与整数比较、`witness-materialize` 优先拼装 `record` 子字段并还原量词元素（`SPEC-S20`） |
| **M05 + M04** | 存量项目先无 ReadModel 后增 ReadModel 时，`HandwrittenBindingsModule` 永不覆写导致漏装 `ProjectionModule`；变异门禁逐突变体跑全量套件在大规模下易超时 | `GeneratedBindingsModule` 自动托管 `ProjectionModule`（兼容已安装的老项目）；`mutation-gate` 改为按聚合定点跑对应测试并提升基线超时至 180s（`SPEC-S19`） |

### 第三波按图排雷战绩（提交 `57e6440` · M02/M09–M12 + 4 项连带隐雷清零）

紧接着 Wave-3 雷达表（M02 + Pre-Z3/Post-Z3 M09–M12），我们在提交 [`57e6440`](https://github.com/co-arising/metarch-truthsrc/commit/57e6440a0f10b6dd94e02d10d23bb1be23b970d7) 落地全量探针并实锤清零 **全部 5 项雷达靶点 + 4 项执行期连带发现的深层隐雷**，经 `node --test` + 离线 `scalac` + 100% Scala Mutation Gate + 真实 Play 2.8.18 `sbt -batch compile`（69 Scala + 2 `.proto` 零错误）验收并锁入 `SPEC-S21..S24`：

| 编号 | 实锤缺陷与根因 | 最终修复与锁定验收（`57e6440`） |
|---|---|---|
| **M02** | 应用层锁定测试对派发命令的快照衍生字段做严格 `toString` 等值断言，手写 handler 合法归一化/重算时误杀 | `scala-strict-scalatest` / `scala-scalatest` / `typescript-node-test` 改为非空与运行时类型合法性断言，保留 `bindPrincipal` 严格相等校验（`SPEC-S21`） |
| **M09 + M10** | **Pre-Z3**：`len == 0` 与 `sum == 0`、`forall` 空真性/`exists` 空假性未联立；同集合复用同一量词变量 `x` 时单 Skolem 冲突；**Post-Z3**：边界见证未替换绑定变量且丢弃 `@qdef(col)` 致 M10 变异杀灭率仅 71.43% | `smt-encoder` 引入 alpha 规范化量词签名、作用域见证 `@qel_N` 与默认元素 `@qdef(col)`、联立集合公理与不同标量见证推 `len >= 2`；`first-hit-witness` 与 `witness-materialize` 对齐边界见证与 `defaultElem` 合并，M10 变异杀灭率拉满至 **100%**（`SPEC-S22`） |
| **M11** | `sum(scores) > 100` 等聚合求和守卫，Z3 已解出 `@agg(sum:scores)` 目标值但 `witness-materialize` 仍填默认小样本未凑足总和 | `witness-materialize` 实现 `BigInt` 精确按比例拆解 `@agg(sum:col)`（同时支持 `Seq[Int]` 与定点数 `Seq[Decimal(scale)]`），并与 `len`/`count` 及量词活跃元素协同分配（`SPEC-S22`） |
| **M12** | `Map[String, ValueObject]` 成员访问（如 `state.entries[key].score`）在 binder、SMT、见证物化、Scala 与 TS 生成器全链路断裂 | 端到端贯通：`binder` 穿透 `index -> member` 推断类型、`smt-encoder` 发射强类型 map 子字段数组并传递 scale/enum、`first-hit-witness` 探测 `map-subfield` 并按 `mapPresence` 门控、`ears-simplify` 生成 `.get(k).map(_.f).getOrElse(...)`、`typescript.mjs` 生成 `?.[f] ?? fallback`（`SPEC-S23`） |
| **连带 #1–#4** | 探针运行期顺藤摸瓜抓出 4 颗深埋真雷：① 多分支 L1 规则在 `v1-strict-scala` 1.0 单 `else` 模板下静默丢弃第二条接受分支；② `typescript.mjs` 量词体漏追踪 `boundVars` 输出 `cmd.x.score`；③ `ExactType` 嵌套 `post:` 更新对 `sealed abstract case class ... private (...)` 发射非法 `.copy(...)`；④ `witness-materialize` 将无约束 `ExactType` 单位字段填 `""` 致 `Money.create` 退回 `Money.Zero` | ① 多分支 L1 自动切完整 First-Hit `if / else if / else`（保 1.0 parity 24/24）；② `typescript.mjs` 补齐 `boundVars`/`boundVarTypes` 与 `sum`/`len`/`count` 数值推导；③ `buildNestedCopy` 对 `ExactType` 改发 `.create(...).getOrElse(...)`；④ 未约束单位字段回退 `resolvedType.units?.[0]`（`SPEC-S22..S24`） |

### 第四波按图排雷战绩（提交 `1e87c6a` · Proto3 嵌套容器 + Play 5 层鉴权对账清零）

Wave-4 针对 **T01/T05（聚合状态嵌套容器 Proto3 持久化）** 与 **T10（PlayController 5 层 Authz 镜像）** 构造 2 子域单体（`orders` + `billing`，含 ReadModels、Stories、Authz 与 Aggregate 级嵌套容器）探针，在提交 [`1e87c6a`](https://github.com/co-arising/metarch-truthsrc/commit/1e87c6a899cc05ffaa265b2b9c89d947975b1c78) 实锤清零 2 项跨层缺陷，真 **`sbt -batch compile`**（111 Scala 源码 + 3 `.proto`，16s 零错误）通过并锁入 `SPEC-S25`：

| 雷达编号 | 实锤缺陷与根因 | 最终修复与锁定验收（`1e87c6a`） |
|---|---|---|
| **M13** | **T01 + T05 · Proto3 嵌套容器非法语法**：当 Aggregate 状态含 `Optional[Seq[String]]`、`Seq[Optional[String]]` 或 `Map[String, Optional[TagVO]]` 时，Proto3 原生禁止 `repeated` / `map` 嵌套 `optional` 或 `repeated`，直接炸毁 `scalapb` / `sbt compile` | `v1-strict-block-cd.mjs` 新增递归 Proto3 `BoxPO` 包装消息合成（`SeqStringBoxPO`、`OptStringBoxPO`、`OptTagVOBoxPO` 等）并自动向 `SharedValueProtoConverters.scala`（含零 VO 兜底）拼接 `encode<BoxPO>` / `decode<BoxPO>`，**零触碰 1.0 `emitter/families/`（24/24 parity 保持全绿）**（`SPEC-S25`） |
| **M15** | **T10 · Play 控制器 `principal` 映射缺键与 HTTP/2 头大小写漂移**：`v1-strict-api-auth.mjs` 生成的 `PlayController` 构造 `principal` Map 时漏掉 `"entitlements"` 与 `"attributes"`（与 `HttpRouter` 分叉），且 `resolvePrincipalBinding` 区分 header 大小写，在 HTTP/2 小写 header 下绑定丢失 | 补齐 `PlayController` 的 `"entitlements" -> ctx.entitlements, "attributes" -> ctx.attributes`，并在 `resolvePrincipalBinding` 增加大小写不敏感 `lookupAttr` 查找，彻底对齐 `HttpRouter` 与 Play 真实运行时（`SPEC-S25`） |

### 第五波按图排雷战绩（提交 `93a6350` · 多维嵌套 Map 递归崩溃 + 手写增量同步 + 改包名清理）

Wave-5 对全部 **M16–M19** 实施真实 `sbt -batch compile` + Z3 + TS/Scala + Mutation Gate 探针验证：实测证实 **M16（`form: decimal` `ExactType`）**（66 Scala + 2 `.proto` 零错误）与 **M18B（`QF_NIA` 非线性 `qty * unitPrice`）** 已在全链路健康工作，同时精准引爆并清零 **3 项高危实锤缺陷（M18A / M17 / M19）**，于提交 [`93a6350`](https://github.com/co-arising/metarch-truthsrc/commit/93a63508caf9f221f39a9a7f04ea9727b7ae1efc) 锁入 `SPEC-S26..S27`：

| 雷达编号 | 实锤缺陷与根因 | 最终修复与锁定验收（`93a6350`） |
|---|---|---|
| **M18A** | **T08 · 嵌套 `Map[String, Map[String, VO]]` 栈溢出崩溃 + 非法 Scala `_.`**：`state.grid[row][col].score` 在 `smt-encoder.mjs` 触发 `encVal <-> encBool` 无限互递归（`RangeError: Maximum call stack size exceeded`）；`ears-simplify` 对嵌套 `index` 输出非法 `_.`；无 `in` 约束的 Map 被 Z3 默认 `present=false` 抹空见证 | 斩断 `encVal`/`encBool` 互递归并泛化 `extractIndexedAccess` 支持任意深度 `(Array Int ...)` 嵌套编码与 `hasPresence` 精确门控；`ears-simplify` / `typescript.mjs` / `first-hit-witness` / `witness-materialize` 全链路支持任意深度 Map；TS + Scala + **100% Mutation Gate** + 真 **`sbt -batch compile`**（54 Scala + 2 `.proto`，15s 零错误）通过（`SPEC-S26`） |
| **M17** | **T14 · 存量项目新增 L2 命令 / `externContract` 致 `sbt` 抽象类编译失败**：`overwrite: false` 跳过已有 `ScorerComputationsImpl.scala` 与 `EnginePortConnectorImpl.scala`，新增 `scoreBeta` / `checkBeta` 后真实 `sbt` 报 `class needs to be abstract` | 新增非破坏性 `syncMissingScalaMethods`（仅在缺方法时于类末尾追加 `override def`，100% 保留手写代码与注释），并在 `HandwrittenBindingsModule` 漏装 `GeneratedBindingsModule` 时输出 `handwrittenDrift` 诊断；真 **`sbt -batch compile`**（62 Scala + 1 `.proto`，14s 零错误）通过（`SPEC-S27`） |
| **M19** | **T11 · 重命名 `packageName` 后旧包 `handwritten/` 残留致 `sbt` 失败**：虽删除了旧包 `generated-scaffold/`，但未修改过的旧包 starter `ServerSnapshotProviderImpl` / `HandwrittenBindingsModule` 留在 `handwritten/scala/<oldPkg>/` 中，导致 `sbt compile` 报 `not found: type` | 在 `.truthsrc/generated-scala-manifest.json` 持久化 `packageName` 与 `starterHandwrittenHashes`：改包名或删聚合时自动清理 SHA 仍与初始 starter 一致的未改文件及旧包 `src_managed` 缓存，对已被人工修改的旧文件绝不删除并上报 `STALE_HANDWRITTEN_FILE`；真 **`sbt -batch compile`**（69 Scala + 2 `.proto`，16s 零错误）通过（`SPEC-S27`） |

### 第六波按图排雷战绩（提交 `8950ba3` · 事件驱动 Policy 血缘误报 + `Optional[VO]` 成员访问崩溃）

Wave-6 深入 **T01/T08/T09** 的响应式 Policy、Map `post:` 变更与 `Optional[ValueObject]` 组合接缝：实测验证 **M21（`state.buckets'[bucket] = ...` + `state.note' = none`）** 全链路健康通过（49 Scala + 1 `.proto` 零错误 + 100% Mutation Gate），同时实锤引爆并清零 **2 项深层缺陷（M20 / M23）**，于提交 [`8950ba3`](https://github.com/co-arising/metarch-truthsrc/commit/8950ba3b390169ef592bee6459e79ec663a937d6) 锁入 `SPEC-S28`：

| 雷达编号 | 实锤缺陷与根因 | 最终修复与锁定验收（`8950ba3`） |
|---|---|---|
| **M20** | **T09 · 事件驱动 Policy Story 血缘误杀数值事件字段**：当响应式 Story 声明 `WHEN event Trade.TradeConfirmed SHALL dispatch Ledger.PostEntry` 时，`lineage.mjs` 的 `verifyDispatchLineage` 已将 `amount: Money` 标记为 `@PROPAGATED`，却漏写入 `consumedEventFields`，导致 `compile-v2` 抛硬错误 `V2_LINEAGE_UNCONSUMED_NUMERIC_FIELD` | 将 `consumedEventFields` 接入 `verifyDispatchLineage`，对所有事件触发式 Story 的 `@PROPAGATED` 字段自动登记消费血缘；完整响应式 Policy 工程（含 `Money` / `TagVO` / `Optional[String]`）真 **`sbt -batch compile`**（87 Scala + 3 `.proto`，22s 零错误）通过（`SPEC-S28`） |
| **M23** | **T01 + T08 · `Optional[ValueObject]` 成员访问炸毁 `scalac` 并存在 TS 空指针隐患**：当规则写 `state.profile is some AND state.profile.score < 50` 时，`ears-simplify` 未展开 `Option[ProfileVO]`，直接输出 `state.profile.score < BigDecimal("50")`，导致 `scalac` 报 `value score is not a member of Option[ProfileVO]`；TS 端在合取重排下同样有空对象解引用风险 | `ears-simplify` 与 `typescript.mjs` 新增 `stepFieldType` + 任意深度链式可选展开：Scala 自动发射 `state.profile.map(_.score).getOrElse(0L)`（多层 `Optional` 自动切 `.flatMap`），TS 自动发射 `(state.profile?.score ?? 0)`；TS + Scala + **100% Mutation Gate** + 真 **`sbt -batch compile`**（52 Scala + 2 `.proto`，20s 零错误）通过（`SPEC-S28`） |

### 第七波按图排雷战绩（提交 `cf4545a` · 标量 `Optional` 窄化与 `OR` 边界见证 + `GET` 查询强转 + `forall+sum` 公理 + `sync` 漂移透出）

Wave-7 对原雷达 **M24–M27** 四发探针 **4/4 全中**，并在 100% 变异门禁实战中额外连带抓出 **M24B**（`OR` 短路分支掩盖 `<= -> <` 突变体），总计清零 **5 处跨层缺陷**，于提交 [`cf4545a`](https://github.com/co-arising/metarch-truthsrc/commit/cf4545a9a3ea8c85e423282e76f884470d692398) 经 TS + Scala + 100% Mutation Gate + 三套真实 **`sbt -batch compile`**（`M24` 48 Scala + 1 `.proto`、`M25` 48 Scala、`M26` 48 Scala + 1 `.proto`，全部零错误）验收并锁入 `SPEC-S29..S30`：

| 雷达编号 | 实锤缺陷与根因 | 最终修复与锁定验收（`cf4545a`） |
|---|---|---|
| **M24** | **T01 + T08 · 标量 `Optional[Int/Decimal/String]` 守卫被 `binder` 误拒**：即便规则显式写出 `state.optLimit is some AND requested > state.optLimit` 或 `(state.optLimit is none OR requested <= state.optLimit)`，`binder.mjs` 仍按 `Optional[T]` 报 `EARS_TYPE_MISMATCH` | `binder.mjs` 新增流敏感窄化（`extractEmptinessFacts` + `narrowLookupWithSomePaths`）：仅在 `is some` / `!= none` 合取或 `is none` / `== none` 析取保护下将 `Optional[T]` 窄化为 `T`，**无保护比较仍严格拒绝**；`ears-simplify.mjs`、`scala.mjs`、`typescript.mjs` 同步发射安全解包 `.getOrElse(...)` / `(x ?? fallback)`（`SPEC-S29`） |
| **M24B（连带）** | **T08 + T13 · `OR`/Optional 边界见证被短路掩盖致变异门禁仅 60%**：对 `(state.optLimit is none OR requested <= state.optLimit)`，`first-hit-witness` 只加 `(= requested state.optLimit)` 而未强制 `state.optLimit is some`，Z3 选 `None` 短路致边界用例去重被丢，`<= -> <` 突变体存活 | `collectBoundaryEqualityAssertions` 追踪析取路径条件（`OR` 分支强制兄弟分支为假）及 `Optional` 存在性 `.__present = true`，自动合成命中真实等号边界的见证，M24 变异杀灭率从 60% 拉满至 **100%**（`SPEC-S29`） |
| **M25** | **T10 · `GET` 查询参数在 TS/Scala/Play 三端全量退化为 `String` 且 Scala HTTP 测试作弊传 `body`**：`GET ?page=2&onlyActive=true&minPrice=10.00` 在 `onion-ts`、`onion-scala`、`v1-strict-block-cd` 与 `PlayController` 均直接传递字符串，而 `interfaces-http.mjs` 的 Scala 用例绕过 `query` 改塞 `body` 掩盖了缺陷 | `onion-routes.mjs` 按操作声明派生 `queryParamTypes`；`onion-ts`（`coerceQueryParams`）、`onion-scala` / `v1-strict-block-cd`（`QueryParamCoercer`）与 `v1-strict-api-auth`（`PlayController.coerceQueryValue`）四端同步按 `Int`/`Bool`/`Decimal` 强转；`interfaces-http.mjs` Scala 用例改为真实 `query = Map[String, String]`（`SPEC-S30`） |
| **M26** | **T08 · `forall` 与 `sum` 缺线性联立公理致 Z3 假缺口**：`len(scores) > 0 AND forall x in scores: x > 0 AND sum(scores) >= len(scores)` 在完备规则下仍报 `V2_SMT_GATE_FAILED` | `smt-encoder.mjs` 补充纯线性 `QF_AUFLIA` 常量上下界公理（`forall`/`not exists` 推 `sum >= lo * len` / `sum <= hi * len`、单元素 `len == 1 => sum == def` 及活跃见证联立），零非线性开销，TS + Scala + 100% 变异门禁 + 真 `sbt` 全绿（`SPEC-S29`） |
| **M27** | **T14 · `check-v2 --sync` 吞掉手写区漂移/残留诊断**：`generateScalaCqrsPlayServiceV2` 已返回 `syncedHandwrittenMethods` / `prunedHandwrittenFiles` / `staleHandwrittenFiles` / `handwrittenDrift`，但 `check-v2.mjs` 未透出到 `syncSummary` 与人类报告 | `check-v2.mjs` 聚合全部四项字段到 `res.sync`，`renderCheckV2Human` 在 PASS/FAIL 路径均输出可操作 `[WARN] STALE_HANDWRITTEN_FILE` / `HANDWRITTEN_DRIFT` 告警（`SPEC-S30`） |

### 第八波按图排雷战绩（提交 `ab207e7` · Multi-BC 外部事件桥接类型化 + ReadSide 多事件 `Option` 包装）

Wave-8 把真实 **`sbt -batch compile`** 压向多子域 BC 打包（`Saga` + `Effect` + `#46 external-event-bridge` + `ReadModel`）、`Seq[VO]` 含 `Optional` 子字段量词、多事件 ReadSide 部分投影与 `Map` 不变式公理四大深水接缝：实测证实 **M29（`Seq[VO]` 含 `Optional[String]` 子字段量词）**（52 Scala + 2 `.proto` 零错误 + 100% 变异门禁）与 **M31（`Map[String, Decimal(2)]` `ALWAYS` 不变式 + `in` + `post:` 变更）**（48 Scala + 1 `.proto` 零错误 + 100% 变异门禁）全链路健康，同时实锤引爆并清零 **2 处真实 `sbt compile` 硬编译炸弹（M28 / M30）**，于提交 [`ab207e7`](https://github.com/co-arising/metarch-truthsrc/commit/ab207e7d2fae55feffafd9c9a13d61ccd6b9d829) 锁入 `SPEC-S31`：

| 雷达编号 | 实锤缺陷与根因 | 最终修复与锁定验收（`ab207e7`） |
|---|---|---|
| **M28** | **T05 + T11 · Multi-BC `#46 external-event-bridge` 炸毁 `sbt compile`**：当 `domainMap.integrations` 触发跨 BC 桥接时，`v1-strict-orchestration.mjs` 向 1.0 `external-event-bridge` 传入了 `outputType = String` 与空 `slotMembers = []`，导致 `<Agg>ExternalEvents.scala` 生成 `def billingPaid(output: String): OrderPlaced = OrderPlaced()` 与 `Vector(output.orderId)` 双重编译错误 | 2.0 桥接层为未显式指定 `outputType` 的外部集成自动在 `domain/values/` 发射强类型 `<Producer>Payload`（含事件全量字段与 `String` 身份键）并补齐 `slotMembers` / `identityKeys`，**零触碰 1.0 `emitter/families/`（24/24 parity 保持全绿）**；100 Scala + 4 `.proto` 全栈多子域 BC 真 **`sbt -batch compile`** 零错误通过（`SPEC-S31`） |
| **M30** | **T01 · ReadSide 多事件部分投影缺 `T -> Option[T]` 包装导致 `#26` 与 `#28` 双重 `sbt` 编译失败**：当 `ReadModel` 用 `Optional[Decimal(2)]` / `Optional[RiskNote]` 承接后续事件 `LoanApproved` 的非可选字段时，`LoanOverviewApplyEvent.scala`（`#26`）与 `LoanOverviewReadsideProjectionHandler.scala`（`#28`）均直接赋值 `e.rate` / `e.riskNote` 触发 `found: T, required: Option[T]` | `v1-strict-readside.mjs` 通过 `resolveCanonicalEventFields` 精确比对 ReadModel 列类型与事件字段类型：自动发射 `Some(e.field)`（`T -> Option[T]`）或 `e.field.getOrElse(default)`（`Option[T] -> T`），并修复 `#28` 对 `c.value` 的错误前缀拼接与 `domain.values._` 导入；68 Scala + 2 `.proto` 真 **`sbt -batch compile`** 零错误通过（`SPEC-S31`） |

---

## 六、下一波排雷手册（Level 4B）：四步探针法与 Wave-9 诚实边界雷达

### 四步对抗探针排雷法

1. **选暗道**：从图 3 的 `T01–T14` 暗道中挑一个尚未被极端组合打过的跨模块接缝。
2. **造最小对抗真源**：只写 10–40 行最小 YAML + `.ears`，专门构造**合法但反常规的边界组合**（例如：零 VO、混合 L1+L2、嵌套 `Option[ExactType]`、Scala 保留字字段、两子域同名不同结构 VO）。
3. **跑全链路真编译（严禁只跑正则单测）**：在临时目录完整串跑：
   - `compileCanonicalV2`（Z3 真求解）
   - `generateScalaCqrsPlayServiceV2` / `generateScalaCqrsPlayServiceV2ForBc`
   - `emitV2ExecutableTests`
   - `node --test` + 离线 `scalac` + **真实 `sbt -batch stage` + 启动 Play 进程发真实 HTTP 请求**
4. **实锤即上锁**：确认 Bug 后先修通用推导（守 `npm run lint:arch` 0 违规 + `emitter/parity.mjs` 24/24 全绿），再把对抗样例固化为 `SPEC-S32+`，绝不靠人眼审查结案。

### Wave-9 高危潜在地雷雷达（基于 `ab207e7` 诚实盘点）

M01–M31（含 8 波 36 处确认缺陷与 5 处深水接缝实测验真）已于 `2f4d33d` / `57e6440` / `1e87c6a` / `93a6350` / `8950ba3` / `cf4545a` / `ab207e7` 全部闭环并锁入 `SPEC-S13..S31`；下表诚实盘点截至 `ab207e7` 仍待 Wave-9 继续推进的 **4 个真实工程边界（M32–M35）**：

| 雷达编号 | 疑似地雷点 / 已知边界 | 关联暗道 | 建议对抗探针设计 | 预期杀伤面 |
|---|---|---|---|---|
| **M32** | **`Seq[VO]` 字段级聚合（`sum(items.amount)`）与 `post:` 序列增删折叠**：目前标量 `sum(scores)` 与整序列替换 `state.items' = items` 已全链路贯通，但对值对象集合单字段求和及增量 append/remove 折叠尚未覆盖 | **T08 + T09** | 构造 `sum(items.amount) <= limit` 与 `state.items'` 增量更新的 `.ears` 探针，验证 SMT、TS/Scala 与变异门禁 | 复杂明细行聚合与增删状态折叠表达力边界 |
| **M33** | **Play 2.8.18 真实 HTTP 路演下的畸形查询参数与嵌套 `Optional[VO]` JSON 反序列化**：Wave-7 已完成正常类型 `GET` 查询强转，但异常输入（如 `?page=abc` / `?onlyActive=maybe`）及深层 `Optional[VO]` POST JSON 在真实 Play 路由中的 400 vs 500 响应尚待实机压测 | **T10** | `sbt -batch stage` 拉起真实 Play 进程，发送畸形类型查询串与缺省可选嵌套 JSON 请求核验状态码与错误体 | 边缘异常输入返回非预期状态码 |
| **M34** | **人工已改手写区的半自动迁移向导（`migrate-handwritten-v2`）**：Wave-7 已通过 `check-v2 --sync` 精确透出 `staleHandwrittenFiles` 与 `handwrittenDrift`，但大规模改包名后的手工搬迁仍需配套迁移命令 | **T14** | 补齐 dry-run / interactive 迁移脚手架，校验迁移前后 `verify-v2 --strict` 零回归 | 存量仓库大改包名后的手工搬迁成本 |
| **M35** | **ReadSide `#26 projection-apply-event` 高级形态（`updateOnly` / `delete` / `persistenceIdCreate`）与跨子域 ReadModel 联表投影**：目前 v2 桥接统一走 `create` 形态（已在 M30 修复 `Option` 包装），面向删除事件与多聚合联合投影的高级形态尚待打通 | **T01 + T05** | 构造含删除事件与多聚合写入同一 ReadModel 的探针，过真 `sbt -batch compile` 并守 1.0 parity 24/24 | 复杂 CQRS 读模型删除与跨聚合合并投影能力边界 |

### 故障归因三方速查协议（防错怪、防越界）

当外部项目跑出红灯时，按以下顺序 30 秒完成归因，再决定修哪里：

| 现象特征 | 归因归属 | 正确动作 |
|---|---|---|
| `compile-v2` 报 `V2_SMT_GATE_FAILED`、`V2_FIRST_HIT_SHADOWED_RULE`、`V2_LINEAGE_*`、`EARS_*` | **真源层（Truth Source）** | 修正业务 YAML 或 `.ears` 规约，严禁放宽 Z3 闸门 |
| `generated-tests/` 锁定用例期望与真源一致，仅 `@cloze` 槽位行为不达标，或 `ServerSnapshotProviderImpl` 返回空快照 | **手写隔离区（Handwritten）** | 仅在 `@cloze:start..end` 或手写 provider 内修复业务实现 |
| 生成代码自身 `sbt stage` 报类型/语法错；或锁定测试传参违反真源结构/Authz 协议；或增量生成路径/清理缺陷 | **编译器 / 生成器（`metarch-truthsrc`）** | 提上游 Issue 附精确文件行号与最小复现 → 按四步探针法修复并锁入 `SPEC-S*` |

> **结语**：这份地图的价值不在一次性读完，而在**每次准备交付新特性或接入新多域项目前，拿出图 3 的 14 条暗道与雷达表 M32–M35，挑出最危险的 3–5 个接缝写 100 行对抗探针跑一遍真实 `sbt stage` + Play HTTP**。把暗道变成亮路，把踩坑变成探针，这就是 `metarch-truthsrc` 持续逼近工业级确定性的核心打法。
