# bank-wealth-demo 实战全景指南：从真源到运行时试玩、洋葱架构拆解与 AI 时代代码生成器扩展规范

本文是一份面向架构师、领域工程师与 AI Agent 协作团队的端到端实战手册，完整串起 [`bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo) 与 [`metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) 的四条核心主线：

1. **Quick Start 全链路试玩**：从真源树校验、形式化产物编译、自动推导技术绑定、生成 Play/Akka CQRS 工程、12 项回锚核验，到 Docker 拉起 MongoDB 4.4 + MySQL 8.0 亲手演练五大金融协作剧本。
2. **生成代码洋葱架构深度拆解**：逐层列出 `domain`、`application`、`interfaces`、`infrastructure`、`modules` 中的全部 Artifact Type，阐明外层如何单向依赖内层、手写与基础设施实现如何通过接口依赖注入进内层，以及每一处设计背后的 DDD 原则依据。
3. **扩展其他代码生成器规范**：指明从真源流水线哪一步的编译产物切入、扩展者必须履行的七项契约义务，以及**凑齐哪六类物料后即可交给 AI Agent 完成新语言/新框架代码生成器的高质量推理与落地**。
4. **衔接下一个大故事**：说明这套下游确定性生成体系如何与上游的[《co-arising EARS 1.0 技术规格说明书》](https://co-arising.github.io/zh/articles/co-arising-ears-spec-20261123/)拼装成“数学验证上游 + 确定性洋葱架构下游”的完整闭环。

> **诚实边界说明**：`bank-wealth-demo` 是一个**本地教学与架构验证示例**，使用内置 Mock TA 模拟器与固定本地演示凭据，不移动真实资金，不代表生产级银行认证；关于历史采集、移址技术验收与尚未关闭的公开交付事项，请始终以[状态台账](https://co-arising.github.io/zh/status/)为准。

## 1. 为什么从 bank-wealth-demo 入手：一条完整可验证的工程闭环

在常规开发中，“需求文档”、“领域模型”、“服务代码”、“分布式事务脚本”和“测试用例”往往各自演进、彼此漂移。`co-arising` 采用的工程闭环把它们收敛到一条确定性流水线中：

```text
  [1. 业务真源树 truth/bank-wealth/]     161 个可读 YAML 原子（3 聚合 · 2 Saga · 4 Pipeline · 149 条 @rule）
                │
                ▼  truthsrc validate + roundtrip（结构与往返零损耗闸门）
  [2. 规范模型 & 知识图谱]               canonical.json + SQLite 知识图谱（392 节点 / 413 边，可查影响半径）
                │
                ▼  deriveProjectRequest（含 Saga / Runtime / Execution 技术绑定自动推导）+ compileProductSet
  [3. 14 个强类型形式化语义产物]         reference-layout / domain-decision / domain-folds / saga-runtime / execution ...
                │
                ▼  scala-cqrs-play-service（16 个统一 Emitter Family + ReadSide 推导）
  [4. 161 个洋葱架构生成文件]            + 36 个手写隔离区文件（unmanagedSourceDirectories，重生成绝不覆盖）
                │
                ▼  truthsrc verify-project（12 项一致性检查 + 5,090 个回锚位置 / 629 个精确字节 Span）
  [5. 编译、单测与 Docker 运行时试玩]    sbt Compile/compile test（370 源文件 0 错误 · 24/24 单测）+ 浏览器五大剧本
```

值得特别注意的是最新一次架构收敛：**作者不再需要手写冗长的低层 JSON 绑定文件**。早期的 `bindings/implementation/*.json`（8 个文件、超 2,100 行样板配置）已由 [`metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) 中的 [`lib/project/derive-bindings.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/derive-bindings.mjs) 实现全自动推导——如今 [`bank-wealth-demo/truthsrc.project.json`](https://github.com/co-arising/bank-wealth-demo/blob/main/truthsrc.project.json) 只需声明真源路径、精确十进制类型、运行时坐标与手写源码根目录即可。

## 2. Quick Start：从真源、生成代码、回锚到 Docker 运行时试玩

### 2.1 环境准备与仓库就位

| 组件 | 要求 | 作用 |
|---|---|---|
| **Node.js** | **Node ≥ 22.13.0**（内置 `node:sqlite`） | 真源校验、图谱构建、代码生成、回锚验证与一键启动器 |
| **JDK** | **JDK 11**（如 Eclipse Temurin / AdoptOpenJDK 11） | Play 2.8 / Scala 2.13 编译与运行 |
| **sbt** | **sbt 1.x** | 编译 ScalaPB `.proto`、Scala 源码并打包 `stage` 可执行分发 |
| **Docker** | Docker Desktop / Engine（支持 `docker compose`） | 拉起隔离的 `mongo:4.4`（事件库）与 `mysql:8.0`（读侧投影库） |
| **配对仓库** | 同级目录下存在 `metarch-truthsrc` 与 `bank-wealth-demo` | 保持工具链与示例项目版本配对 |

在同一工作区父目录检出两个仓库：

```bash
export CO_ARISING_WS="$PWD"
git clone https://github.com/co-arising/metarch-truthsrc.git
git clone https://github.com/co-arising/bank-wealth-demo.git
export TRUTHSRC_CLI="$CO_ARISING_WS/metarch-truthsrc/bin/truthsrc.js"
cd "$CO_ARISING_WS/bank-wealth-demo"
```

> **为何 MongoDB 固定为 4.4？** 事件库驱动 `akka-persistence-mongo-rxmongo 3.0.8`（ReactiveMongo 1.0.10）依赖 MongoDB 4.4 线协议。仓库根目录的 [`docker-compose.demo.yml`](https://github.com/co-arising/bank-wealth-demo/blob/main/docker-compose.demo.yml) 已将容器端口隔离映射到 `127.0.0.1:19001`（MongoDB）与 `127.0.0.1:19002`（MySQL），不会与本机默认 `27017`/`3306` 冲突。

### 2.2 第一步：校验真源树并构建知识图谱

在进入任何代码生成或 JVM 构建之前，仅需 Node.js 即可验证整个业务真源树的语法、语义约束与往返无损性：

```bash
# 1. 真源校验（0 hard findings）+ 往返测试（160 个业务原子逐字节一致）
npm run validate

# 2. 编译全部 14 个形式化语义产物（Saga / Runtime / Execution 绑定自动推导）
npm run compile

# 3. 导出本地 SQLite 知识图谱（可在 CLI、MCP 或浏览器 Explorer 中查询）
node "$TRUTHSRC_CLI" graph --tree truth/bank-wealth --out bank.graph.sqlite
```

你也可以免安装直接在在线 [Explorer 图谱视图](https://co-arising.github.io/zh/explorer/) 中探索同一份真源快照的影响半径（如 `SipInstallmentFailed`）、数据血缘与不变量清单。

### 2.3 第二步：自动推导绑定、生成代码并编译测试

```bash
# 1. 准备固定 0.3.0 运行时引擎（saga-core / monarch-persistence / common-core）并生成到 generated/current/
npm run project

# 2. 编译全部 12 份 .proto + 370 份 Scala 源码，执行 5 套件 / 24 项生成单元测试，并打 stage 分发包
(cd generated/current && sbt --batch "Compile/compile" test stage)
```

执行完成后，你可以观察到两个关键事实：

- **生成区与手写区物理隔离**：`generated/current/` 下共生成 **161 个文件**；36 个手写实现文件位于仓库根 [`handwritten/scala/`](https://github.com/co-arising/bank-wealth-demo/tree/main/handwritten/scala)，通过 `build.sbt` 的 `unmanagedSourceDirectories` 挂载参与编译，重新执行 `npm run project` 绝不会覆盖手写代码。
- **测试套件全绿**：`UnitTestMain` 验证测试隔离配置（`journal=testkit`, `snapshot=testkit`, `network=denied`），随后 5 个 ScalaTest 套件（`GeneratedActorStateSpec`、`GeneratedDomainRoundtripSpec`、`GeneratedFiniteHostSpec`、`GeneratedServiceConfigurationSpec`、`GeneratedUnitStorageSpec`）共 **24/24 项测试全部通过**。

### 2.4 第三步：验证双向回锚与源码血缘

代码生成之后，如何证明“每一段生成的规则/事件/端口代码确实来自某条真源声明，且未被悄悄篡改”？运行 12 项门禁回锚验证：

```bash
# 1. 全量 12 项项目回锚校验（检查输入指纹、图谱一致性、文件归属、1310 条知识键、629 个精确 Span、0 未解析键）
node "$TRUTHSRC_CLI" verify-project \
  --project truthsrc.project.json \
  --out generated/current

# 2. 正向查询：从业务命令 ReserveFunds 定位所有生成代码位置与精确字节区间
node "$TRUTHSRC_CLI" query-project \
  --project truthsrc.project.json \
  --out generated/current \
  --knowledge ReserveFunds \
  --format human

# 3. 反向查询：从真实生成文件行号反查对应的业务真源声明与原子路径
node "$TRUTHSRC_CLI" query-project \
  --project truthsrc.project.json \
  --out generated/current \
  --file app/example/bankwealth/domain/invariants/CreditBalanceRules.scala \
  --line 18 \
  --format human
```

若想在浏览器里直观体验“点击真源 → 高亮生成 Scala 代码 → 点击任意代码行反查真源”，直接打开 [Explorer 代码视图](https://co-arising.github.io/zh/explorer/?view=code#code)。当前已发布的公开快照包含 **358 个文件**（161 个纯业务 YAML 真源 + 161 个生成文件 + 36 个手写实现，0 隐藏文件），每一处 `@knowledge` 注释都带着确定性内容哈希与精确字节区间的双重核验。

### 2.5 第四步：Docker 拉起运行时并执行一键 Smoke 自检

```bash
# 1. 拉起 MongoDB 4.4 + MySQL 8.0 容器（等待约 10–15 秒至两者均为 healthy）
docker compose -f docker-compose.demo.yml up -d
docker compose -f docker-compose.demo.yml ps

# 2. 一键全链路端到端 Smoke 自检（自动分配隔离 namespace，完成后自动清理）
npm run demo:smoke
```

`npm run demo:smoke` 会在真实的 Play HTTP 服务 + MongoDB + MySQL + 内置 Mock TA 子进程上执行：

- 浏览器入口 `/bank/v1` 与客户端脚本 `/bank/v1/client-script` 健康校验；
- **21 项安全负例检查**（未登录、越权角色、缺失/错误 CSRF、非法 Origin、防客户端注入内部字段）；
- **51 次完整业务流 HTTP 请求**（100 元现金申购 + 相同 `clientRequestId` 幂等重放 + 同 ID 异参数 `409 Conflict` + 业务时钟推进后 TA 确认 `80.0000` 份 + SIP 定投创建/暂停/恢复/2 期触发 + 最终账户资金守恒核对：`customer=88000` 分、`collection=12000` 分，总和恒等于 `100000` 分）。

### 2.6 第五步：浏览器交互式试玩——五大核心业务剧本

```bash
# 启动交互式演示服务（默认 confirmed 场景，监听 http://127.0.0.1:19000/bank/v1）
npm run demo:start
```

打开 **`http://127.0.0.1:19000/bank/v1`**（建议开两个标签页分别登录客户与运营角色）：

- **Customer 凭据**：Bearer `demo-customer-token` / CSRF `demo-customer-csrf`（初始种子资金 `100000` 分 = `1,000.00 CNY`）
- **Operator 凭据**：Bearer `demo-operator-token` / CSRF `demo-operator-csrf`（负责推进业务时钟与查看待处理操作）

| 玩法剧本 | 启动命令与操作路径 | 核心观察点（验证哪条业务真源） |
|---|---|---|
| **剧本 A · 现金申购与 TA 份额确认** | 默认 `npm run demo:start` → 客户提交 `clientRequestId=demo-cash-001`, `fundCode=fund`, `minorUnits=10000` → 查询 **Fund order** → 运营推进 `slot=1` → 再次查询 **Fund order** | **付款成功 ≠ 投资成功**：推进时钟前 `paymentStatus=succeeded`、`taStatus=accepted`（已扣 100 元但未得份额）；推进后 `taStatus=confirmed`，获得 `shares="80.0000"`, `nav="1.2345"`。 |
| **剧本 B · TA 拒绝与独立退款 Saga** | `Ctrl+C` 停止后执行 `node tools/demo-start.mjs --scenario rejected --namespace demo_refund` → 客户申购 `10000` 分 → 运营推进 `slot=1` → 查询订单与余额 | **独立退款 ≠ 补偿已提交付款**：`paymentStatus=succeeded`、`taStatus=rejected`、`refundStatus=succeeded`，且生成全新的 `refundOperationId`（独立事务），客户余额完整退回 `100000` 分。 |
| **剧本 C · 有限定投计划（SIP）** | `confirmed` 场景下客户 **Create SIP plan**（`minorUnits=1000`, `effectiveSlot=0`, `dueSlots=10, 20`）→ 尝试 **Pause / Resume** → 运营依次推进 `slot=10, 20, 21` | **复用同一条现金规则**：SIP 绝不另起第二套扣款路径；暂停期间命中的时隙按显式规则分类跳过；恢复后两期均成功扣款并获得 TA 确认（`successTotal=2`）。 |
| **剧本 D · 未知结果与重复提交对抗** | 启动 `--scenario unknown` 或 `--scenario duplicate-conflicting`；或在页面用同一个 `clientRequestId` 改金额再次提交 | **绝不把 Unknown 改写成失败或成功**：未知态保持显式待人工核对，绝不隐式重试扣款；相同 `clientRequestId` + 相同参数幂等重放，改参数直接 `409 Conflict` 拒绝。 |
| **剧本 E · 多命名空间并行实验与清理** | 追加 `--namespace exp_a` / `--namespace exp_b` 随时开全新实验空间；完成后 `docker compose -f docker-compose.demo.yml down -v` | 隔离实验互不污染；更多命令行选项详见仓库内的 [`DEMO-QUICK-START.md`](https://github.com/co-arising/bank-wealth-demo/blob/main/docs/DEMO-QUICK-START.md)。 |

## 3. 生成代码的洋葱架构全景：分层、Artifact Type 与依赖倒置

`metarch-truthsrc` 当前的 `scala-cqrs-play-service` 生成器不是把所有类平铺在一个包里，而是严格按照 **洋葱架构（Onion Architecture / Hexagonal Ports & Adapters）+ 经典 CQRS/ES** 拓扑生成代码，并由 [`lib/conformance/audit.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/conformance/audit.mjs) 中的四道静态一致性闸门守护。

### 3.1 四层洋葱同心圆与组合根全景

```text
  ┌───────────────────────────────────────────────────────────────────────────────────┐
  │  第 5 层 · modules（组合根 Composition Root — 唯一把接口与实现连线的装配层）       │
  │    • BootstrapModule (生成)：绑定生成仓储实现 + 反射加载可选 HandwrittenBindings  │
  │    • HandwrittenBindingsModule (手写)：注入领域计算、读侧仓储、DataSource、外部权 │
  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │
  │  │  第 4 层 · infrastructure（基础设施适配层）   │  第 3 层 · interfaces（入口）│  │
  │  │    • repositories.{aggregate,projection}      │    • interfaces.api (生成)  │  │
  │  │    • persistence / converters / protobuf      │      ApiCommands/Wire/Keys  │  │
  │  │    • process (Host/HostIO) & connectors       │    • interfaces.web (手写)  │  │
  │  │    • bootstrap (Sharding/Daemon/PlayLoader)   │      Controllers/Pages/Json │  │
  │  │  ┌───────────────────────────────────────────────────────────────────────┐  │  │
  │  │  │  第 2 层 · application（应用编排与端口层 — 零 infrastructure/protobuf）│  │  │
  │  │  │    • aggregates.{Protocol,Aggregate,Behaviors,CommandHelpers,Repo端口} │  │  │
  │  │  │    • process.<flow>.{SagaDefinition,Execution,Ports端口} & protocol    │  │  │
  │  │  │    • connectors.{Gateway端口,EffectProtocol}                           │  │  │
  │  │  │    • readmodels.{Views,Projection,ProjectionHandler,ReadsideRepo端口}  │  │  │
  │  │  │  ┌─────────────────────────────────────────────────────────────────┐  │  │  │
  │  │  │  │  第 1 层 · domain（领域内核 — 零 Akka/Play/IO · 纯函数无异常）   │  │  │  │
  │  │  │  │    • domain.values（名义值对象 + 精确十进制 Money / Amount）    │  │  │  │
  │  │  │  │    • domain.entities & behaviors（State/Event ADT + 纯 Fold）   │  │  │  │
  │  │  │  │    • domain.invariants & params（InvariantRule + @knowledge）   │  │  │  │
  │  │  │  │    • domain.services（纯计算端口 trait *Computations）          │  │  │  │
  │  │  │  └─────────────────────────────────────────────────────────────────┘  │  │  │
  │  │  └───────────────────────────────────────────────────────────────────────┘  │  │
  │  └─────────────────────────────────────────────────────────────────────────────┘  │
  └───────────────────────────────────────────────────────────────────────────────────┘
      依赖箭头严格向内：modules ──▶ infrastructure & interfaces ──▶ application ──▶ domain
```

同时，物理目录布局与逻辑包布局通过 [`lib/layout/layout-strategy.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/layout/layout-strategy.mjs) 正交解耦：同一套逻辑洋葱包结构既可以落盘为单模块 Play 目录（`app/example/<ctx>/...`），也可以切换为五模块 SBT 目录（`domain/`、`application/`、`interfaces/`、`infrastructure/`、`bootstrap/`）而保持每一行 `package` 与 `import` 不变。

### 3.2 逐层 Artifact Type 清单与职责边界

以 `bank-wealth-demo/generated/current` 实际产出的 161 个文件与 36 个手写文件为例，每一层的 Artifact Type 及其归属如下：

| 层次 | 包路径 | Artifact Type | 示例文件 | 来源 | 核心职责 |
|---|---|---|---|---|---|
| **Domain（内核）** | `domain.values` | `value-object` | `Money.scala`, `AccountId.scala`, `FundOrderId.scala` | 生成 | 不可变名义值对象；精确十进制类型携带 `scale/precision/SupportedUnits` 与无损算术，返回 `Either[iMadzError, T]` |
| **Domain（内核）** | `domain.entities` | `domain-entity` | `CreditBalanceEntity.scala`, `FundOrderEntity.scala`, `SipPlanEntity.scala` | 生成 | 聚合的纯 `State` case class、`Event` sealed trait（继承 `CborSerializable`）与 `empty` 初始态 |
| **Domain（内核）** | `domain.entities.behaviors` | `event-handler` | `*EventHandler.scala` | 生成 | 纯事件折叠函数 `applyEvent(state, event): State`，只读事件字段，绝不访问外部时钟或 IO |
| **Domain（内核）** | `domain.invariants` & `.params` | `invariant-rule`, `rule-params` | `*Rules.scala`, `*RuleParams.scala` | 生成 | 继承 `InvariantRule` 的命令前置守卫与事件后置不变量，每条规则携带精确 `@knowledge` 锚点 |
| **Domain（内核）** | `domain.services` | `domain-service`（端口） | `CreditBalanceComputations.scala`, `FundOrderComputations.scala` | 生成接口 / 手写实现 | 继承 `DomainService` 的纯领域计算端口 trait，只声明 `Either[iMadzError, T]` 契约，具体实现放在手写隔离区 |
| **Application（用例）** | `application.aggregates` | `aggregate-protocol`, `aggregate-root`, `aggregate-factory` | `*Protocol.scala`, `*Aggregate.scala`, `*AggregateFactory.scala` | 生成 | 命令/回复协议 ADT、Akka Typed `EntityTypeKey` 与分片事件标签（`tags`）、聚合工厂 |
| **Application（用例）** | `application.aggregates.behaviors` | `command-helper`, `aggregate-behavior`, `external-event-bridge` | `*CommandHelpers.scala`, `*Behaviors.scala`, `FundOrderExternalEvents.scala` | 生成 | 通过 `CommandHelper` + `runReplyingPolicy` 编排“校验不变量 → 产出事件 → 折叠回复”；外部事件桥接校验权威来源 |
| **Application（用例）** | `application.aggregates.repository` | `aggregate-repository-port` | `CreditBalanceRepository.scala`, `FundOrderRepository.scala` | 生成接口 | 聚合仓储**端口 trait**（`find(id): EntityRef[Command]`），应用层只面向该接口编程 |
| **Application（用例）** | `application.process.<flow>` & `.protocol` | `saga-definition`, `execution-plan`, `process-ports`, `process-messages` | `BankPaymentSagaDefinition.scala`, `BankCashPaymentExecution.scala`, `BankPaymentPorts.scala`, `BankPaymentMessages.scala`, `*Step.scala` | 生成 | 跨聚合 TCC Saga 定义（固定版本与摘要）、Monarch 有限状态机执行计划、阶段端口接口及协议消息伴生模块 |
| **Application（用例）** | `application.connectors` | `connector-gateway-port`, `connector-protocol` | `BankTaGateway.scala`, `BankTaEffectProtocol.scala`, `BankSipDispatchGateway.scala` | 生成接口 | 外部副作用（TA 提交、SIP 派发）的纯应用端口与观察/对账协议 DTO |
| **Application（用例）** | `application.readmodels` | `readmodel-views`, `projection`, `projection-handler`, `readside-repo-port` | `ReadModelViews.scala`, `BankJournalReadsideProjection.scala`, `*ProjectionHandler.scala`, `*Repository.scala` | 生成 | 读侧视图 DTO、Akka `JdbcProjection.exactlyOnce` 事件投影编排与读侧仓储**端口 trait** |
| **Interfaces（接口）** | `interfaces.api` | `api-dto-modules` | `ApiCommands.scala`, `ApiWire.scala`, `ApiResponses.scala`, `ApiAcknowledgements.scala`, `ApiKeys.scala` | 生成 | 按角色聚合的伴生对象 DTO 模块，避免几十个零散 DTO 文件造成目录膨胀 |
| **Interfaces（接口）** | `interfaces.web` | `http-controller`, `page-renderer`, `http-json` | `BankPagesController.scala`, `BankQueryController.scala`, `BankServiceEndpoints.scala`, `BankBrowserPages.scala` | 手写 | Play HTTP 控制器、认证/CSRF 守卫、JSON 编解码与交互式浏览器页面 |
| **Infrastructure（设施）** | `infrastructure.repositories.*` | `aggregate-repository-impl`, `readside-repository-impl` | `*RepositoryImpl.scala`, `BankJournalReadsideRepositoryImpl.scala`, `*Schema.scala`, `*Domain.scala` | 生成 | 仓储端口的具体实现：聚合侧委托 `ClusterSharding.entityRefFor`，读侧委托 ScalikeJDBC/MySQL 读写 |
| **Infrastructure（设施）** | `infrastructure.persistence` & `app/protobuf/` | `proto-schema`, `proto-converter`, `event-adapter`, `snapshot-adapter`, `serializer`, `state-codec` | `shared_value_objects.proto`, `fund_order.proto`, `*ProtoConverters.scala`, `*EventAdapter.scala`, `DomainProtoSerializer.scala`, `*StateCodec.scala` | 生成 | ScalaPB 持久化线协议、领域对象 ↔ Proto 双向转换、Akka Persistence 事件/快照适配器与 Monarch/Saga 状态编解码 |
| **Infrastructure（设施）** | `infrastructure.process` & `.connectors` | `saga-host`, `effect-host`, `connector-impl` | `BankPaymentHost.scala`, `BankTaEffectHost.scala`（生成）；`MockTAClient.scala`, `BankPaymentBindings.scala`（手写） | 生成宿主 + 手写适配器 | 持久化事件溯源宿主 Actor（驱动重试、coalescing、恢复）以及连接真实/模拟外部系统的手写适配器 |
| **Infrastructure（设施）** | `infrastructure.bootstrap` | `application-bootstrap`, `aggregate-bootstrap`, `projection-bootstrap`, `service-loader` | `ApplicationBootstrap.scala`, `*Bootstrap.scala`, `BankServiceContract.scala`, `BankServiceLoader.scala` | 生成 | 初始化 ClusterSharding、ShardedDaemonProcess、持久化策略（tagger/retention/backoff）与 Play 服务装载器 |
| **Modules（组合根）** | `modules` | `bootstrap-module`, `handwritten-bindings-module` | `BootstrapModule.scala`（生成）、`HandwrittenBindingsModule.scala`（手写） | 生成 + 手写 | Guice DI 装配根：将所有外层与手写实现类绑定到内层 trait 接口 |

### 3.3 依赖方向与静态门禁：外层如何依赖内层

洋葱架构不是画在 PPT 里的口号，而是由 [`lib/conformance/audit.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/conformance/audit.mjs) 在每次构建中做静态代码审计的硬门禁：

- **向内唯一依赖**：`modules` → `infrastructure` & `interfaces` → `application` → `domain`。
- **Domain 层零污染闸门（Gate 1 `domain-dip` & `domain-purity`）**：扫描 `domain/**` 下全部 Scala 文件，只要出现 `akka.`、`play.`、`.application.`、`.infrastructure.`、`.interfaces.` 任一引用，或出现 `throw`、`require(`、`return`、`null`、`Future.failed`、`new *Exception`，审计直接报 P0 违规。
- **Application 层持久化隔离闸门（Gate 1 `application-dip`）**：扫描 `application/**`，严禁 import `.infrastructure.` 或 `com.google.protobuf.*`，确保业务用例和 Saga/ReadSide 定义绝不耦合数据库表结构或 Protobuf 线格式。
- **包内聚与防文件爆炸闸门**：`interfaces.api`、`application.process.protocol`、`application.readmodels`、`application.connectors` 中的 DTO 统一收拢到角色伴生对象模块（由 [`value-object-package.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/derivation/value-object-package.mjs) 基于结构后缀自动路由，零业务词硬编码）。

### 3.4 实现如何变成接口并依赖注入进内层

很多团队落地 DDD/洋葱架构时最容易困惑：“外层实现怎么反向给内层用？”在 `bank-wealth-demo` 生成的工程里，依赖倒置（DIP）通过**三条标准注入链路**完成，全过程不靠全局静态单例，也不靠在生成文件里写 `BEGIN MANUAL` 注释块：

1. **链路一 · 领域纯计算端口（`domain.services` ← `handwritten/scala/.../domain/services/impl/`）**：
   - 生成器在 `domain.services` 生成纯接口 `trait CreditBalanceComputations extends DomainService`。
   - 领域规则 `CreditBalanceRules` 与应用行为 `CreditBalanceBehaviors` **只依赖该 trait 接口**。
   - 开发者在手写隔离区编写 `BankBalanceComputations extends CreditBalanceComputations`，并在手写 [`HandwrittenBindingsModule.scala`](https://github.com/co-arising/bank-wealth-demo/blob/main/handwritten/scala/example/bankwealth/modules/HandwrittenBindingsModule.scala) 中用 Guice 绑定：`bind(classOf[CreditBalanceComputations]).toInstance(BankBalanceComputations)`。
2. **链路二 · 聚合与读侧仓储端口（`application.*.repository` ← `infrastructure.repositories.*`）**：
   - 应用层声明端口 `trait CreditBalanceRepository` 与 `trait BankJournalReadsideRepository`。
   - 基础设施层实现 `CreditBalanceRepositoryImpl`（注入 `ClusterSharding`）与 `BankJournalReadsideRepositoryImpl`（注入 `DataSource`）。
   - 生成的组合根 `BootstrapModule` 自动完成 `bind(classOf[CreditBalanceRepository]).to(classOf[CreditBalanceRepositoryImpl])`，并通过 `installOptionalModule("example.bankwealth.modules.HandwrittenBindingsModule")` 自动发现并装载手写模块中的读侧仓储、JDBC `DataSource` 与外部权威绑定。
3. **链路三 · 跨聚合 Saga 与外部效应端口（`application.process` / `application.connectors` ← `infrastructure.bootstrap.*PortBindings`）**：
   - 生成的 `BankPaymentPorts` 与 `BankTaGateway` 定义了强类型的阶段执行/查询/对账接口（如 `OperationBinding[Input, Receipt]`、`CompletionBinding[Original, Result]`）。
   - 生成的 `BankPaymentPortBindings` 强制校验每一个义务端口都携带匹配的 `implementation.id` 与 `version`（防漏绑、防错绑）。
   - 手写层在 `BankPaymentBindings` / `BankTaEffectBindings` 中提供具体实现（调用聚合 `EntityRef` 或 `MockTAClient`），由组合根注入进事件溯源宿主 Actor，业务流程编排层全程无感知。

### 3.5 背后的 DDD 与整洁架构原则依据

| 架构设计选择 | 对应的 DDD / 整洁架构原则 | 解决的实际工程痛点 |
|---|---|---|
| `domain.values` 强制名义值对象与精确十进制 `Money` | **统一语言（Ubiquitous Language）与值对象不变性** | 消灭 `String`/`Double` 原始类型偏执；编译期阻止把 `AccountId` 错传给 `FundOrderId`，杜绝浮点金额精度丢失。 |
| `Entity` + `EventHandler` + `InvariantRule` 纯函数内核 | **聚合作为一致性边界（Aggregate as Consistency Boundary）** | 单聚合所有业务规则无需启动 JVM 集群或数据库即可确定性单测；事件回放与在线命令共享同一套纯折叠逻辑。 |
| `Saga`（[`saga-core`](https://github.com/MadPolaris/saga-core)）与 `Pipeline`（[`monarch-core`](https://github.com/MadPolaris/monarch-core) + [`monarch-persistence`](https://github.com/MadPolaris/monarch-persistence)）严格分离 | **最终一致性与显式流程边界** | **Saga 管事务边界，Pipeline 管步骤顺序**；避免把分布式事务写死在 HTTP Controller 或隐式事件回调里导致资金双扣。 |
| 内层声明端口 trait + `modules` 组合根注入外层实现 | **依赖倒置原则（DIP）与六边形架构（Ports & Adapters）** | 更换数据库、消息序列化或外部 TA 客户端只需替换外层适配器，领域规则与生成代码一行不动。 |
| 写侧事件溯源 + 读侧 `Akka Projection` 物化视图 | **CQRS 读写分离** | 写侧专注强不变量与高吞吐追加日志，读侧专注分页、聚合统计与客户/运营查询视图，互不拖累。 |
| 手写代码物理目录隔离（`unmanagedSourceDirectories`） | **开闭原则与清晰所有权边界** | 告别脆弱的“代码合并标记”；真源变更随时全量重新生成 161 个文件，36 个手写实现零冲突保留，且由编译器立即检查接口兼容性。 |

## 4. 扩展新代码生成器指南：切入点、契约义务与 AI Agent 物料规范

如果你想基于 `co-arising` 的同一套业务真源，扩展出 **Java Spring Boot**、**Kotlin/Ktor**、**Go**、**Rust** 或 **TypeScript/NestJS** 的代码生成器，应该从哪里下手？

### 4.1 精确切入点：从 14 个编译语义产物切入，而非解析原始 YAML

**切忌直接解析 `truth/` 目录下的原始 YAML 文件！** 原始 YAML 包含结构展开微语法、多文件归属与跨文件引用。`metarch-truthsrc` 已经把前端编译做成了语言无关的稳定契约层——新代码生成器的**唯一正确切入点**是 `compileProductSet` 产出的 **14 个强类型、已通过静态语义校验的编译产物（Compiled Semantic Product Set）**：

```text
  truth/ (YAML 真源)
     │  [共享前端：无需重写]  validateTree → roundtrip → compileTreeWithSources
     ▼
  canonical.json + sourceIndex
     │  [共享契约编译：无需重写]  deriveProjectRequest (含自动绑定推导) → compileProductSet
     ▼
  ═══════════════════ 稳定切入面：14 个编译语义产物（JSON）═══════════════════
  • reference-layout@1        全部名义类型、聚合、命令、事件、端口的限定符号表与依赖
  • exact-value-types@1       精确十进制的 precision / scale / unit 约束
  • exact-value-codecs@1      Wire / 持久化最小单位无损编解码规范
  • domain-decision@4         每个命令的有序前置守卫 AST、拒绝码、事件载荷绑定与计算调用
  • domain-dependencies@6     聚合状态、命令、事件与纯计算端口的完整依赖图
  • domain-folds@6            每个事件到状态字段的确定性折叠语句 AST
  • domain-external-events@2  外部事件生产者与权威校验契约
  • saga-contract@1           跨聚合 TCC 参与者、步骤、阶段与补偿静态 IR
  • saga-runtime-contract@1   运行时版本、摘要、参数与回执编解码 pin
  • execution-contract@1      Monarch 有限流程计划、输入输出槽与恢复策略
  • saga-host-contract@2      Saga 宿主入口、关联键、结果分类与技术端口义务
  • effect-host-contract@2    外部副作用的幂等键、观察状态机与人工对账义务
  • artifact-contract@3       服务部署边界、HTTP 端点、投影存储与实现版本 pin
  • product-design@1          五平面产品设计视图
  ═════════════════════════════════════════════════════════════════════════════
     │  [你的新生成器只写这两层]
     ├──▶ Layer A · Derivation（lib/derivation/<target>/）：把语义产物映射为目标家族输入契约
     └──▶ Layer B · Emitter Families（emitter/families/ & generators/<target>/）：纯函数确定性渲染
```

从这个切入面开始扩展，你的新生成器自动免费获得：**YAML 解析、往返检验、类型解析、守卫与折叠 AST 校验、自动技术绑定推导、SQLite 知识图谱、MCP 查询以及 12 项回锚验证框架**。

### 4.2 新代码生成器必须履行的七项工程义务

在 `metarch-truthsrc` 的工程纪律下，任何新注册的代码生成器（`generators/<target-name>/`）都不是随意的字符串模板脚本，而必须履行以下七项硬性义务：

1. **显式 Manifest 与最小产物声明义务（`generator.json`）**：参考 [`generators/scala-cqrs-play-service/generator.json`](https://github.com/co-arising/metarch-truthsrc/blob/main/generators/scala-cqrs-play-service/generator.json)，声明每个子 Producer 消费的精确 `products` 列表与版本、产出的 `artifactKinds` 及允许的 `options`。运行时严格 Proxy 会**当场拦截**任何未声明产品的越权读取（`PRODUCT_UNDECLARED`）。
2. **纯函数推导与 Fail-Closed 校验义务**：每个 Emitter Family 必须实现 `checkInput(input)`，对不合法标识符、未知类型、未绑定上下文或目标语言尚未支持的语义特性抛出带错误码的诊断，**严禁静默降级、跳过规则或生成 `// TODO` 占位实现**。
3. **字节级双跑确定性与黄金对账义务**：通过 [`emitter/registry.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/emitter/registry.mjs) 注册 `id`、`familyNumber`、`inputSchema`、`goldenRoot`、`fixtureDir`、`checkInput`、`renderAll` 及 `runNegatives`（负例拒绝电池）。连跑两次必须逐字节完全一致，且与 `goldenRoot` 黄金样本零差异。
4. **全链路回锚与依赖边义务**：每个生成条目必须携带真实 `knowledgeIds`（`source:<doc>#<pointer>`）、精确 UTF-8 字节区间 `codeMappings` 与模块间文件依赖 `deps`，确保 `truthsrc verify-project` 12 项检查与 Explorer 双向点击 100% 通过。
5. **布局正交与运行时参数化义务**：目录与包路径必须通过 [`lib/layout/layout-strategy.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/layout/layout-strategy.mjs) 解析；目标框架坐标与包前缀必须通过 [`lib/runtime-profile.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/runtime-profile.mjs) 参数化，严禁在生成器中写死任何业务词（如 `bankwealth`/`FundOrder`）或单一公司包名。
6. **清晰手写隔离边界与组合根义务**：明确生成代码与手写实现的物理目录隔离机制（如 Java/Maven 的 `target/generated-sources` 或独立模块、Go 的 `gen/` 包与 `internal/` 实现），严禁让手写逻辑混入生成文件。
7. **反硬编码四层门禁义务**：必须接入 [`tools/lint.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/tools/lint.mjs) 静态扫描 + 异域双盲单测（如 [`non-bank-unified-generation.test.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/test/non-bank-unified-generation.test.mjs)）+ 真实非银行领域项目全链路生成并过目标编译器与单测。

### 4.3 交给 AI Agent 推理新生成器的“六件套物料包”

在 AI Agent 时代，写一个新语言/新框架代码生成器最容易翻车的原因，不是 Agent 不会写模板，而是**架构风格与语义边界没有事先钉死**，导致 Agent 自由发挥、漂移和暗藏业务硬编码。

只要团队提前凑齐下面这份 **“六件套物料包”**，就可以直接交给 AI Agent（如 Claude Code / Antigravity / Codex）高质量推理并逐族交付一个新的生产级代码生成器：

| 序号 | 物料名称 | 具体内容 | 为什么缺少它 Agent 会漂移 |
|---|---|---|---|
| **01** | **黄金参考样板工程（Golden Reference App）** | 一个用**非银行域**（如 `order`/`inventory`）手写好的最小可编译目标栈项目：含 1 个聚合、值对象、精确金额、守卫规则、事件折叠、仓储端口与实现、读侧投影、DI 组合根及 1 个通过的单测。 | 没有可编译黄金样本，Agent 会不断在惯用法、命名风格、依赖版本上摇摆；黄金样本就是最精确的 Family Spec（F3）。 |
| **02** | **洋葱架构一致性契约（Conformance Contract JSON）** | 参照 [`classic-cqrs-contract.json`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/conformance/classic-cqrs-contract.json)，机读声明允许的顶层包、禁止的跨层依赖正则（DIP）、每种 artifact 的文件后缀、必选基类与禁用语法（如禁用 `throw`/反射）。 | 把“架构审阅”变成秒级自动门禁，Agent 每写完一族就能自测拓扑与纯净度，不靠人工逐行 Code Review。 |
| **03** | **语义到目标语言映射表（Semantic Mapping Spec）** | 逐项定义 `primitive / exact / record / optional / sequence / map`、`domain-decision@4` 守卫表达式、`domain-folds@6` 折叠语句、`exact-value-codecs` 精度规则的目标语言写法，以及**显式不支持特性列表**。 | 消除语义猜测，明确哪些特性必须 `fail-closed` 拒绝而不是胡乱生成近似代码。 |
| **04** | **目标运行时抽象档案（Runtime Profile Spec）** | 定义目标技术栈的通用基类、错误容器（如 Java `Result<T, E>` / Go `(T, error)` / Rust `Result`）、序列化方案、DI 容器及可参数化坐标（`organization` / `packagePrefix` / `version`）。 | 避免把某个内部私有库包名或特定版本硬编码散落在几十个模板文件中。 |
| **05** | **双领域编译产物 Fixture + 本地编译沙箱** | 至少准备两套不同业务域的 `compiled-products` JSON（如 `bank` 与 `commerce`），并确保 Agent 沙箱内可直接运行目标构建命令（`mvn test` / `go test ./...` / `cargo test` / `tsc --noEmit`）。 | 单一领域测试藏不住硬编码；双领域 + 真实编译器是唯一能把长类名换行、隐式包路由、泛型边界全逼出来的试金石。 |
| **06** | **Agent Harness 规范与红线清单** | 明确逐族推进顺序、每族的完成定义（DoD）、负例电池最低覆盖要求、禁改测试红线与回锚核验命令。 | 给 Agent 建立确定性的工作节拍与客观完成标准，防止“跳过校验直接报完成”。 |

### 4.4 面向 AI Agent 的开发规范与四层验收门禁

将上述六件套物料交给 AI Agent 后，建议严格按以下工程规范与验收节奏推进：

1. **逐族切分、由内向外实现（Inside-Out Family Rollout）**：
   - **第一批（纯领域内核，0 外部依赖）**：`value-object` → `domain-entity` → `event-handler` → `aggregate-invariant-rules`；立刻用目标语言单测验证纯函数行为。
   - **第二批（应用协议与仓储端口）**：`protocol-layer` → `aggregate-layer` → `aggregate-repository` → `external-event-bridge`。
   - **第三批（基础设施持久化与装配）**：`proto-schema` / `persistence-schema` → `proto-converter` → `serialization-adapter` → `aggregate-bootstrap` → `service-runtime` → `project-scaffold`。
   - **第四批（分布式协作面，按需）**：`effect-face` → `pipeline-invocation-face`。
2. **单族交付的硬性完成定义（Definition of Done）**：
   - 注册到 `emitter/registry.mjs` 且 `node emitter/parity.mjs` 全绿；
   - 包含定向负例测试 `runNegatives`（至少覆盖缺失字段、非法标识符、未知上下文、非法包名与未支持类型）；
   - `npm run lint`（含 `arch/no-business-names`、`arch/no-hardcoded-runtime`、`arch/no-hardcoded-app-path`）0 违规；
   - 异域双盲测试（`commerce` + 自定义 `runtimeProfile`）0 泄漏且能通过目标语言真实编译器与单元测试。
3. **四层反硬编码闭环验证**：
   - **第 1 层**：静态词法与架构 lint 门禁（防已知词回流）；
   - **第 2 层**：宽词表对抗扫描（排查隐式语义路由假设与正则转义绕过）；
   - **第 3 层**：异域双盲家族渲染与自定义 `runtimeProfile` 单测；
   - **第 4 层（终极标准）**：构造零样板词汇的全新业务域项目，端到端跑通 `truthsrc generate-project` → `truthsrc verify-project`（12/12）→ 目标语言全量编译与单测通过。

## 5. 下一个大故事：向受控 EARS 1.0 与 SMT 单跳验证演进

到这里，我们已经把**下游的确定性工程闭环**彻底打通了：给定一份结构化的业务真源，编译器可以自动推导技术绑定、生成符合 DDD 洋葱架构的可编译代码、完成字节级双向回锚，并通过 Docker 运行时验证真实的跨聚合交易、退款与定投行为；且这套下游架构可以按标准契约扩展到任意新语言与新框架。

但还有一个更根本的问题留在上游：**如果业务需求本身在写进真源之前就存在逻辑冲突、边界遗漏或条件重叠怎么办？** 编译器只能忠实地把“写错了的规则”确定性地编译成“同样错的代码”。

这正是 `co-arising` 的下一个大故事——[《co-arising EARS 1.0 技术规格说明书（v1.2 双语对照版）》](https://co-arising.github.io/zh/articles/co-arising-ears-spec-20261123/) 要解决的核心命题：

```text
  [上游：数学验证的唯一真源]                          [下游：本文已打通的确定性洋葱工程闭环]
  ───────────────────────────                        ─────────────────────────────────────────
  受控 EARS 1.0 唯一真源                              14 个编译语义产物（自动推导技术绑定）
     ├──▶ 风格 E（PM 白话 AC 只读投影）                      │
     ├──▶ 风格 B（DMN 决策表只读投影）                       ├──▶ 16+ 统一 Emitter Families（洋葱架构代码）
     ├──▶ SMT-LIB 2 (.smt2) ──▶ Z3/cvc5 求解                ├──▶ 12 项双向回锚验证 + Explorer 代码导航
     │      ├── 冲突/缺口 ──▶ A/B 需求澄清卡                 ├──▶ 手写隔离区 + 组合根 DI 装配
     │      └── 全绿通过  ──▶ 边界证人样本                   └──▶ Docker 运行时试玩 + 多技术栈生成器扩展
     └──▶ TestIR ──▶ 锁定 BDD / ScalaTest ──▶ @cloze TDD
```

当上游的 **受控 EARS 1.0 + SMT 单跳数学验证** 与下游的 **确定性洋葱架构生成 + 双向回锚 + 多技术栈扩展规范** 拼接在一起时，人与 AI Agent 协作软件工程的边界将真正变得清晰：人用自然而严谨的真源定义业务契约，数学求解器在编码前证明规则自洽，确定性生成器产出零漂移的洋葱骨架，AI Agent 在锁定的接口与 BDD 护栏内完成高质量实现与演进。

## 6. 参考仓库与核心源码入口

- **银行财富教学与架构验证仓库**：[`co-arising/bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo)（Docker 快速启动脚本与剧本见 [`docs/DEMO-QUICK-START.md`](https://github.com/co-arising/bank-wealth-demo/blob/main/docs/DEMO-QUICK-START.md)）
- **真源编译器、知识图谱与统一代码生成器**：[`co-arising/metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc)
  - 自动技术绑定推导：[`lib/project/derive-bindings.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/project/derive-bindings.mjs)
  - 正交布局策略（单模块 / 多模块）：[`lib/layout/layout-strategy.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/layout/layout-strategy.mjs)
  - 洋葱架构与 DIP 静态审计器：[`lib/conformance/audit.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/conformance/audit.mjs) & [`classic-cqrs-contract.json`](https://github.com/co-arising/metarch-truthsrc/blob/main/lib/conformance/classic-cqrs-contract.json)
  - 统一 Emitter 注册表与反硬编码门禁：[`emitter/registry.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/emitter/registry.mjs) & [`tools/lint.mjs`](https://github.com/co-arising/metarch-truthsrc/blob/main/tools/lint.mjs)
- **开源运行时引擎家族**：[`MadPolaris/saga-core`](https://github.com/MadPolaris/saga-core)、[`MadPolaris/monarch-core`](https://github.com/MadPolaris/monarch-core)、[`MadPolaris/monarch-persistence`](https://github.com/MadPolaris/monarch-persistence)
- **在线交互式探索器与状态台账**：[Explorer 知识图谱与代码视图](https://co-arising.github.io/zh/explorer/?view=code#code) · [项目实战指南](https://co-arising.github.io/zh/guide/) · [事实与状态台账](https://co-arising.github.io/zh/status/)
- **下一个大故事（设计规范）**：[co-arising EARS 1.0 技术规格说明书（v1.2 双语对照版）](https://co-arising.github.io/zh/articles/co-arising-ears-spec-20261123/)
