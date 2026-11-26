# co-arising 2.0 GA 完整指南：核心特色、从 PRD 到跑起来的全流程与立刻上手（CLI + MCP + Skills）

**发布日期：2026-11-26** · 对应版本：`@madpolaris/truthsrc` `v2.0.0` · `bank-wealth-demo` `v2.0.0`（原始 v1 基线已保留为 tag `v1.0.0-baseline`）

如果你手里正拿着一份充满模糊自然语言的业务 PRD，想让 AI Agent 帮你落地成**数学上无歧义、业务规则不漂移、架构分层不退化、TypeScript 与 Scala 双栈可验证运行**的软件系统——这篇文章就是为你写的。

co-arising 2.0.0 正式发布（GA）之后，整个工具链不再停留在“模型图谱 + 代码骨架”的 v1 阶段，而是打通了**需求蒸馏 → EARS 唯一行为真源 → Z3 编译期数学证明 → 确定性生成与隔离区 AI `@cloze` TDD → 100% 全覆盖审计与混沌 TCK**的完整闭环。本文将依次介绍：

1. co-arising 2.0 的六大核心特色；
2. 从一份原始 PRD 到最终跑起来的七步全流程；
3. 5 分钟立刻上手（`init-v2` → `check-v2 --strict` → `tasks-v2`）；
4. 如何把 **CLI + MCP + Skills + Hooks + Workflow + LSP** 接入 Antigravity（AGY）与 Claude Code；
5. 一段“从 1 页 PRD 到双栈绿灯”的浓缩实战剧本。

---

## 一、为什么是 co-arising 2.0：六大核心特色

在 AI Coding 时代，真正的瓶颈早已不是“写代码的速度”，而是**需求歧义、上下文腐烂、架构退化与不可审计的黑盒修改**。co-arising 2.0 围绕这四个痛点重构了整个编译与协作主干：

### 1. 正交唯一真源：结构、行为、绑定各司其职

v2 彻底告别了“YAML 里混写 DSL 表达式 + Lowering 翻译层”的双轨负担，确立了四类正交目录：

- **`structures/*.yaml`**：只声明纯静态类型、值对象（如 `Money`、`AccountId`）、聚合状态字段、命令/事件/错误枚举，**严禁夹带行为逻辑**；
- **`behaviors/domain/*.ears`**：领域层纯业务规则与状态演进（`slice` / `post:` 状态折叠），使用受控 EARS 1.0 文法（支持英文 `.ears` 与中文 `.zh.ears` 语义漂移门禁）；
- **`behaviors/application/*.story.ears` 与 `*.integration.ears`**：应用层用例编排与外部系统集成规约，显式声明编排状态机、端口调用、`WHEN event` 回调与 `within <dur>` 超时约束；
- **`bindings/*.yaml`**：技术端口与外部副作用适配器绑定（如 `transactional-outbox`、`saga-compensation`、`idempotent-consumer`），把基础设施策略与业务真相解耦。

### 2. 四道领域边界防退化闸门 + Path-to-Layer 物理隔离

v2 编译器内置 **Path-to-Layer 门禁**与**四道领域边界闸门**：领域目录（`behaviors/domain/`）下的文件不能声明 `layer: application`，更不能渗入数据库、HTTP、MQ、重试或分布式锁等基础设施词汇；应用层（`behaviors/application/`）的 `.story.ears` / `.integration.ears` 则禁止越权篡改聚合内部状态字段。任何违例在编译期即报错阻断（带 `file:line:col` 精确源码定位与修复提示）。

### 3. Z3 SMT 编译期数学硬闸门（`--strict` 零静默跳过）

在写第一行实现代码之前，`compile-v2 --strict` 会把所有 EARS 规则、First-Hit 优先级顺序、量词/聚合（`forall` / `exists` / `sum` / `count` / `len`）、可选值谓词（`is some` / `is none`）、时间窗（`within`）以及应用层多步状态机（`k`-step BMC）直接编译为 SMT-LIB2 并送入 Z3 求解器：

- 自动捕获**规则矛盾**、**被前序规则吞噬的死规则（Dead Rule）**、**未覆盖的输入缺口（Gap）**与**不可达终态**；
- 在 `--strict` 模式下，如果环境中未安装 Z3，编译器绝不静默降级跳过，而是直接以 `V2_SOLVER_MISSING` 失败退出；
- 通过证明后，自动导出**边界见证人（Boundary Witnesses）**，为下游测试预言机提供真实边界输入。

### 4. 双通道代码交付：零 Token 确定性生成 × 锁定预言机 AI `@cloze` TDD

co-arising 2.0 按复杂度把行为分成两条正交交付通道，同时支持 **TypeScript** 与 **Scala** 双栈对等产出：

| 通道 | 适用分层 | 生成方式 | 验证与锁定机制 |
| :--- | :--- | :--- | :--- |
| **Channel 4A（L1）** | 纯领域确定性规则（如账户预扣、额度扣减） | **零 Token 确定性编译**直接产出完整业务代码 + 单元测试 | 编译器直接保证源码与规约同构，无需 AI 手写 |
| **Channel 4B（L2 / L3）** | 复杂域计算（L2）与应用层跨端口编排（L3） | 编译器生成 **Port 接口**、带 `@coarising:cloze-start/end` 围栏的骨架文件、以及 **SHA-256 锁定的测试预言机**（Vitest / ScalaTest） | AI Agent 只能在 `@cloze` 围栏内填槽，通过全部锁定预言机后经独立盲审签核 |

### 5. 100% 全覆盖零灰区治理与混沌 TCK

许多“规约驱动”方案的盲区在于只管住了 30% 的核心规则，剩下 70% 的胶水代码、适配器和脚本沦为无人治理的灰区。v2 引入了**问题空间（D1/D2 → E1）**与**解空间（S1/S2/S3 → E2/E3/E4）**的二维分类账：

- **`audit-coverage-v2`** 强制仓库内 **100% 的文件**（在 `bank-wealth-demo` 试点中为 **56 / 56**）都归属明确分区，零未归类灰区、零架构违规；
- 针对 S1 基础设施适配器，工具链内置 **4 套混沌 TCK 测试套件**（通用副作用幂等、`transactional-outbox`、`saga-compensation`、`idempotent-consumer`），并提供 **TypeScript 与 Scala/JVM 双栈 TCK 运行器**，用乱序、重复投递、半成功崩溃等对抗用例检验真实适配器。

### 6. 最后一公里闭环：派生任务队列 + MCP + 双端 Skills + Hooks + LSP

为了让团队在日常研发中真正用顺手，2.0.0 补齐了最后两公里的工程设施：

- **`tasks-v2` 派生任务队列**：不靠容易漂移的人工 `TODO.md`，直接从 `canonical-v2.json` 哈希与 SQLite 溯源记录实时计算每个 `@cloze` 槽位的状态（`PENDING`、`STALE_SPEC_CHANGED`、`GREEN_NEEDS_REVIEW`、`DONE`）；
- **31 个 MCP 工具**：在 v1 的 26 个图谱查询工具之上，新增 5 个 v2 核心工具（`v2_compile`、`v2_query_graph`、`v2_tasks`、`v2_context_pack`、`v2_verify`）；
- **跨平台 Skills**：内置 `coarising-distill`（PRD → 真源蒸馏）与 `coarising-cloze-worker`（单槽位隔离区 TDD 工人），原生兼容 Antigravity 与 Claude Code；
- **物理防越界 Hooks + 并行 Workflow + 编辑器 LSP**：一键安装 Claude Code `PreToolUse` / `Stop` 钩子、AGY `workflows/coarising_cloze_pipeline.py` 并行编排模板，以及零依赖 `truthsrc lsp-ears` + VS Code 语法高亮插件。

---

## 二、从一份 PRD 到跑起来：端到端七步全流程

下面这张流程图概括了 co-arising 2.0 从一份非结构化需求文档到最终双栈绿灯的全过程：

| 阶段 | 执行角色与工具 | 输入 | 确定性产出与门禁 |
| :--- | :--- | :--- | :--- |
| **Step 1 · 需求蒸馏** | 人类 + AI（`coarising-distill` Skill + MCP `v2_compile`） | 非结构化 PRD / 业务访谈 | `structures/*.yaml`、`behaviors/{domain,application}/*.ears`、`bindings/*.yaml` + Z3 驱动的 A/B 澄清卡 + Style E/B 中文确认书 |
| **Step 2 · 数学证明与入图** | `truthsrc compile-v2 --strict` | 正交真源目录 | `canonical-v2.json`、Z3 边界见证人、`.truthsrc/knowledge.sqlite` |
| **Step 3 · 代码与锁定预言机** | `truthsrc generate-v2` + `emit-tests-v2` | `canonical-v2.json` | L1 零 Token 实现代码；L2/L3 Port + `@cloze` 骨架 + `locked-tests.sha256.json` 锁定测试 |
| **Step 4 · 派生任务队列** | `truthsrc tasks-v2` / MCP `v2_tasks` | `canonical-v2.json` + SQLite | 实时任务清单（含规格变更后的 `STALE_SPEC_CHANGED` 自动标脏） |
| **Step 5 · 隔离区完形填空** | AI（`coarising-cloze-worker` / AGY `run_workflow`）+ `guard-write` | `v2_context_pack` 最小上下文包 | 仅修改 `@cloze` 围栏内的实现代码；`verify-v2 --strict` 跑通全部 TS + Scala 锁定测试 |
| **Step 6 · 盲审与全覆盖审计** | 独立只读审查子代理 + `audit-coverage-v2` + `run-tck-v2` | EARS 规约 + 槽位 Diff + 适配器 | `tasks-v2 --record-review` 签核为 `DONE`；100% 文件覆盖与 S1 混沌 TCK 全绿 |
| **Step 7 · 持续演进与 CI 门禁** | `truthsrc check-v2 --strict` + GitHub Actions | 任意真源或代码 PR | 一键串联编译、证明、生成、防篡改校验、双栈实测与覆写检查 |

### 关键设计原则：为什么绝不把任务状态手写在 Markdown 里？

当上游 PRD 发生变化、业务方修改了某条 EARS 规则后，人工维护的任务板几乎必然遗漏“哪些已写好的隔离区代码已经过时”。在 co-arising 2.0 中，每个规约单元在编译期都会写入精确的 `behaviorSha256`，而每次 `verify-v2` 通过后会把验证指纹记入 `.truthsrc/knowledge.sqlite`。只要某条 `.ears` 文件改动了一个数字或边界条件，`tasks-v2` 会立刻把对应槽位翻红为 **`STALE_SPEC_CHANGED`**，精准提示 Agent 只重填受影响的槽位，而其余未受影响的槽位保持 `DONE` 不动。

---

## 三、立刻上手：5 分钟跑通你的第一个 co-arising 2.0 项目

### 1. 环境准备

- **必需**：Node.js **≥ 22.13.0**（使用内置 `node:sqlite`，工具链 **0 npm 运行时依赖**）与 **Z3 SMT 求解器**（`--strict` 模式下必需）；
- **可选（如需运行 Scala 双栈实测与 JVM TCK）**：JDK 11+ 与 `sbt`。

```bash
# macOS 示例（Linux 可用 apt install z3 或下载官方 Z3 release）
brew install node@22 z3
node --version   # 需 >= v22.13.0
z3 --version     # 验证 Z3 可执行文件在 PATH 中
```

### 2. 获取工具链并用 `init-v2` 生成最小闭环项目

```bash
export COARISING_WS="$PWD"
git clone https://github.com/co-arising/metarch-truthsrc.git
export TRUTHSRC_CLI="$COARISING_WS/metarch-truthsrc/bin/truthsrc.js"

# 查看版本（应输出 2.0.0）
node "$TRUTHSRC_CLI" --version

# 创建并初始化一个开箱即用的 v2 练习项目（含正交真源、bindings 与 coverage-manifest）
node "$TRUTHSRC_CLI" init-v2 my-v2-app --format human
cd my-v2-app

# 一键运行 v2 完整门禁：Z3 严格证明 + 代码与锁定测试生成 + SHA-256 防篡改 + 实测执行 + 100% 覆盖率审计
node "$TRUTHSRC_CLI" check-v2 --root . --strict --format human

# 查看从规范与 SQLite 自动派生的任务队列状态
node "$TRUTHSRC_CLI" tasks-v2 --root . --format human
```

执行完上面三条命令，你已经亲手跑通了：

1. `structures/` + `behaviors/` + `bindings/` 的正交解析与边界检查；
2. Z3 SMT 冲突/死规则/漏分支严格证明；
3. TypeScript（以及传入 `--target typescript,scala` 时的 Scala）双栈代码与 SHA-256 锁定测试生成；
4. SQLite 知识图谱落盘与 `tasks-v2` 任务状态派生。

### 3. 运行真实的 `bank-wealth-demo` v2.0.0 银行试点

如果你想看一个包含 **3 个领域切片（L1 + L2）+ 2 个应用层编排故事（`*.story.ears` / `*.integration.ears`）+ TS/Scala 双栈对等实测 + S1 混沌 TCK + 变异体击杀**的完整案例，可以直接跑 `bank-wealth-demo`：

```bash
cd "$COARISING_WS"
git clone https://github.com/co-arising/bank-wealth-demo.git
cd bank-wealth-demo

# 1. 验证冻结的 v1 真源树依然 100% 无损（160 个 YAML 原子）
npm run validate

# 2. 运行 v2 试点：编译 + Z3 证明 + 双栈（5 TS + 5 Scala 套件）防篡改实测
npm run v2:compile
npm run v2:verify

# 3. 100% 全覆盖审计（56 / 56 文件，0 灰区，0 架构违规）
npm run v2:audit-coverage

# 4. S1 混沌 TCK（8 / 8）与端到端变异体击杀测试（5 / 5）
npm run v2:tck
npm run test:v2

# 5. 查看 v2 试点的派生任务队列
node "$TRUTHSRC_CLI" tasks-v2 --root v2-pilot --format human
```

---

## 四、接入 AI Agent：CLI + MCP + Skills + Hooks + Workflow 全家桶配置

co-arising 2.0 为 **Antigravity（AGY）** 和 **Claude Code** 设计了统一的能力分层：**MCP 负责确定性读取、编译与验证；Skills 负责方法论与协作纪律；Hooks / Workflow 负责物理写隔离与多槽位并行调度**。

### 1. 注册 `truthsrc mcp` 服务器（31 个工具：26 v1 + 5 v2）

在 Claude Code 中直接命令行注册：

```bash
claude mcp add truthsrc -- node /absolute/path/to/metarch-truthsrc/bin/truthsrc.js mcp
```

或在 Antigravity / 通用 MCP 客户端配置中加入：

```json
{
  "mcpServers": {
    "truthsrc": {
      "command": "node",
      "args": ["/absolute/path/to/metarch-truthsrc/bin/truthsrc.js", "mcp"]
    }
  }
}
```

v2 新增的 5 个核心 MCP 工具：

| MCP 工具 | 职责 | 典型调用时机 |
| :--- | :--- | :--- |
| **`v2_compile`** | 编译正交真源、运行 Z3 严格证明（支持 `strict: true`），落盘 `canonical-v2.json` 与 `knowledge.sqlite` | 需求蒸馏阶段循环验证每版 EARS 草稿 |
| **`v2_query_graph`** | 查询 v2 SQLite 知识图谱（`overview`、`cloze_slots`、`coverage`、`node`、`edges`） | 变更影响分析、检查槽位与文件覆盖归属 |
| **`v2_tasks`** | 实时派生全部 L1 / `@cloze` 任务队列与状态（含 `STALE_SPEC_CHANGED`） | 规划下一个待办槽位或决定并行派发列表 |
| **`v2_context_pack`** | 为指定 `slotId` 打包最小隔离上下文（仅含相关 EARS 规则、类型定义、Port 签名、围栏行号与锁定测试路径） | 隔离区工人填槽前的唯一上下文入口，避免污染上下文 |
| **`v2_verify`** | 校验锁定测试 SHA-256 并运行指定槽位或全量 TS/Scala 预言机测试，回写 SQLite 溯源 | 每次改动后作为硬验证门禁 |

### 2. 安装双端 Skills（需求蒸馏 + 隔离区填槽）

工具链在 `skills/` 目录下内置了两个遵循开放 Skill 规范的技能包，可直接拷贝到项目的 `.claude/skills/`（Claude Code）或工作区/全局 Antigravity skills 目录：

```bash
# Claude Code 项目级安装示例
mkdir -p .claude/skills
cp -r /absolute/path/to/metarch-truthsrc/skills/coarising_distill .claude/skills/
cp -r /absolute/path/to/metarch-truthsrc/skills/coarising_cloze_worker .claude/skills/
```

- **`coarising-distill`**：当你丢给 Agent 一份 PRD 时触发。它会严格按“盘点实体与不变量 → 切分正交目录 → 调用 `v2_compile` 用 Z3 抓歧义 → 生成带 A/B 选项的业务澄清卡 → 导出可读中文投影供业务签字”的纪律推进，绝不跳过证明直接写业务代码；
- **`coarising-cloze-worker`**：当你让 Agent 实现某个 `@cloze` 槽位时触发。它会先调 `v2_context_pack` 获取最小上下文，只在 `@coarising:cloze-start` 与 `@coarising:cloze-end` 之间编码，并通过 `v2_verify`（严格模式）自证绿灯，最后请求独立盲审签核。

### 3. 一键安装物理防越界 Hooks（Claude Code）

单靠 Prompt 嘱咐 Agent“不要改测试文件、不要改生成代码”并不可靠。运行一条命令即可生成 `.claude/settings.json` 物理围栏：

```bash
node "$TRUTHSRC_CLI" init-hooks --root . --format human
```

安装后会自动启用两道确定性钩子：

1. **`PreToolUse`（匹配 `Edit|Write|MultiEdit`）**：调用 `truthsrc guard-write`，**物理拒绝**任何对 `generated/`、`generated-tests/`、`locked-tests.sha256.json` 或当前 `@cloze` 围栏之外行号的写入；
2. **`Stop` 钩子**：在 Agent 声明“已完成”之前自动运行 `truthsrc verify-v2 --strict`，测试未过或指纹被篡改时直接拦截收尾。

### 4. Antigravity 多槽位并行编排（`run_workflow`）

如果一次需求变更产生了多个彼此独立的 `@cloze` 槽位（例如同时需要实现 `cash-fund-purchase`、`fund-order-confirm-tashares` 与 `ta-bridge-settlement`），可以直接使用内置的 Python 工作流模板 `workflows/coarising_cloze_pipeline.py`：

1. Phase 1 调用 `v2_compile` 与 `v2_tasks` 自动发现全部 `PENDING` / `STALE_SPEC_CHANGED` 槽位；
2. Phase 2 用 `parallel(...)` 按槽位扇出独立的 `coarising-cloze-worker` 子代理并行填槽与跑测；
3. Phase 3 对每个绿灯槽位派发**无共享历史的只读盲审子代理**，只看 EARS 规约与 Diff 进行对照审查，通过后执行 `tasks-v2 --record-review` 写入 `DONE`。

### 5. IDE 实时体验：VS Code 语法高亮与零依赖 LSP

- 语法高亮扩展位于 `metarch-truthsrc/editor/ears-vscode/`，支持 `.ears` / `.zh.ears` / `.story.ears` / `.integration.ears` 关键字与注释着色；
- 零依赖 stdio 语言服务器可通过 `node "$TRUTHSRC_CLI" lsp-ears` 启动，在编辑器中实时提供解析诊断、符号跳转与基础悬停提示。

---

## 五、真实 PRD 到运行闭环实战剧本（基金申购示例）

让我们用一个精简的真实金融场景，把上面所有组件串成一条连贯的操作链路：

### Step 1：原始 PRD 片段（充满隐含歧义）

> “客户发起基金申购时，需要检查账户可用余额是否足够并预留资金；随后向外部过户代理（TA）提交申购请求。如果 TA 确认成功则扣减预留资金并确认份额；如果 TA 拒绝，则进入独立退款流程。”

### Step 2：运行 `coarising-distill` + Z3 抓出 3 个隐藏缺口

Agent 读完 PRD 后，将其初步拆分为：

- `structures/bankwealth.yaml`：定义 `AccountId`、`Money(amount, currency)`、`CreditBalance` 状态与 `ReserveFunds` 命令/事件；
- `behaviors/domain/credit-balance-reserve.ears`（L1 领域切片）：声明币种匹配、金额为正、余额充足等守卫与 `post:` 预留状态折叠；
- `behaviors/application/cash-fund-purchase.story.ears`（L3 应用编排）：声明“预留资金 → 调 TA 提交 → 处理确认/拒绝”的编排步骤。

随后 Agent 调用 MCP **`v2_compile`（`strict: true`）**，Z3 立即拦截并指出三个 PRD 没说清的边界：

1. **金额等于 0 算合法还是拒绝？**（Z3 报告 `amount == 0` 未被规则覆盖）；
2. **同一 `requestId` 重复提交预留请求时，应报错还是幂等空成功？**；
3. **TA 通道超时返回 `UNKNOWN` 时，是否允许直接触发自动退款？**（应用层 BMC 指出缺失 `UNKNOWN` 分支）。

Agent 自动生成三张 **A/B 业务澄清卡**请业务负责人拍板。业务确认：金额必须严格大于 0；相同 `requestId` + 相同金额走幂等、不同金额报错冲突；`UNKNOWN` 态绝不能盲目退款，必须进入人工/对账挂起态。

### Step 3：业务签字与一键生成（`compile-v2` + `generate-v2` + `emit-tests-v2`）

补齐规则后再次运行 `v2_compile`，Z3 返回 **0 冲突、0 死规则、0 漏分支**，并可导出 Style E/B 只读业务确认表供产品与合规签字。接着：

- **L1 切片 `credit-balance-reserve.ears`** 经 Channel 4A **零 Token**直接生成完整的 TypeScript 与 Scala 领域规则实现和单元测试；
- **L3 编排 `cash-fund-purchase.story.ears`** 经 Channel 4B 生成 `CashFundPurchasePort` 接口、带 `@coarising:cloze-start/end` 围栏的 `cash-fund-purchase.cloze.ts` 与 `CashFundPurchaseCloze.scala`，以及写入 `locked-tests.sha256.json` 的锁定预言机测试（包含“禁止在 `UNKNOWN` 态盲目退款”的对抗测试）。

### Step 4：`tasks-v2` 派发与隔离区完形填空

运行 `v2_tasks` 看到：

- `CreditBalance.ReserveFunds`：L1 `DONE`（零手写）；
- `cash-fund-purchase`：L3 `PENDING`（待填槽）。

调用 `coarising-cloze-worker`（或 AGY `run_workflow`）：

1. 通过 `v2_context_pack(slotId="cash-fund-purchase")` 仅加载该槽位相关的 EARS 规则、Port 定义与围栏边界；
2. 在 `PreToolUse` `guard-write` 的物理保护下，只在 `@cloze` 围栏内填写编排代码；
3. 调用 `v2_verify(strict=true)`：锁定测试 SHA-256 校验通过，TS Vitest 与 Scala ScalaTest 全部绿灯，SQLite 记录溯源，槽位状态自动变为 `GREEN_NEEDS_REVIEW`；
4. 独立盲审子代理核对 EARS 规则与 Diff 后签核 `tasks-v2 --record-review --slot cash-fund-purchase --status APPROVED`，槽位正式归档为 **`DONE`**。

### Step 5：全仓审计与对抗回归

最后运行 `audit-coverage-v2` 与 `run-tck-v2`：56/56 文件全部纳入显式治理分区（0 灰区、0 架构越界），TA 外部适配器通过 8/8 混沌 TCK，变异体测试证实若有人在隔离区偷偷把 `UNKNOWN` 当成失败直接退款，锁定预言机将 100% 击杀该错误实现。

---

## 六、与 v1 的关系及诚实边界

- **平滑共存，零破坏兼容**：原始 v1 架构与 `bank-wealth-demo` 160 原子真源树已完整保留并打上 **`v1.0.0-baseline`** 标签；在 `metarch-truthsrc` `v2.0.0` 中，所有 v1 命令（`validate`、`roundtrip`、`graph`、`generate-project`、`verify-project`）与 26 个 v1 MCP 工具继续原样可用。
- **诚实边界声明**：`bank-wealth-demo` v2 试点（[状态页 F-33](/zh/status/#F-33)）验证的是正交 EARS 真源编译、Z3 严格证明、TS/Scala 双栈实测、100% 覆盖率审计、混沌 TCK 与变异体击杀；它**不替代** v1 在 2026-11-12 记录的独立全服务多 JVM 恢复验收（[F-24](/zh/status/#F-24)–[F-28](/zh/status/#F-28)）。所有量化事实与复现命令均登记在[状态与台账](/zh/status/#F-32)。
- **延伸阅读**：
  - [co-arising 2.0 长期架构蓝图（ADR）](/zh/articles/co-arising-v2-ears-native-architecture-20261126/)
  - [开始使用指南（含 v1 Counter 与 v2 快速入口）](/zh/guide/)
  - [知识图谱 Explorer](/zh/explorer/)

### 相关源码与文档链接

- [metarch-truthsrc 仓库（v2.0.0）](https://github.com/co-arising/metarch-truthsrc)
- [co-arising v2 快速入门手册](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/guides/co_arising_v2_quickstart.md)
- [EARS v2 文法参考](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/reference/ears_v2_grammar_reference.md)
- [v2 诊断码与修复指引](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/reference/v2_diagnostics_error_codes.md)
- [v2.0.0 发布说明](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/releases/v2_0_0_release_notes.md)
- [coarising-distill 技能（PRD 蒸馏）](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_distill/SKILL.md)
- [coarising-cloze-worker 技能（隔离区 TDD）](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_cloze_worker/SKILL.md)
- [Antigravity 并行编排工作流模板](https://github.com/co-arising/metarch-truthsrc/blob/main/workflows/coarising_cloze_pipeline.py)
- [VS Code EARS 语法扩展](https://github.com/co-arising/metarch-truthsrc/tree/main/editor/ears-vscode)
- [bank-wealth-demo 仓库（含 v2-pilot 与冻结 v1）](https://github.com/co-arising/bank-wealth-demo)
- [Z3 Theorem Prover（SMT 求解器）](https://github.com/Z3Prover/z3)
- [Model Context Protocol (MCP) 规范](https://modelcontextprotocol.io/)
