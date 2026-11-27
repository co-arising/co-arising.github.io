# 别再靠抽卡写业务代码了：co-arising 2.0 确定性优势、实验期实操玩法与 11 张全景图谱开箱

**发布日期：2026-11-26** · 对应版本：[`@madpolaris/truthsrc` v2.0.0](https://github.com/co-arising/metarch-truthsrc) · 开源社区：[加入 Discord 反馈](https://discord.gg/PwYrRpJu75)

最近和不少技术朋友聊 AI Coding，大家几乎都有同一个体感：

> **写代码的速度早就不是瓶颈了，真正的痛点是“概率漂移”。**
>
> PRD 里漏了个边界条件，AI 替你瞎猜了一个；
> 页面上多画了个字段，上游根本没人采集；
> 公开接口一不小心把手机号或身份证吐出去了，或者少了行级权限导致越权（IDOR）；
> 测试没跑过，AI 顺手把测试断言改松了；
> 需求改了一行数字，之前写的十几处业务代码哪些过时了，没人说得清。

**[co-arising 2.0（metarch-truthsrc）](https://github.com/co-arising/metarch-truthsrc)** 想解决的就是这件事：**不是让 AI 更自由地写更多代码，而是把 AI 的不确定性，牢牢关进数学证明、编译门禁和物理围栏的笼子里。**

昨天我们刚落地了一波重要更新——补齐了全链路字段血缘、PII 合规硬门禁、资源级 IDOR 与行级权限、CQRS 读侧物化绑定、11 张问题/方案空间离线全景图谱（`atlas-v2`）、Domain 变异测试门禁以及全面升级的 [`coarising-distill` Skill](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_distill/SKILL.md)。

先说一句大实话：**这个项目目前依然处于快速迭代的实验期——底座的编译器、Z3 证明、图谱和门禁已经非常硬了，但最前面的 AI Skill 交互层（如何接住五花八门的真实 PRD）还在持续打磨。** 所以特别想邀请大家拿手头最真实、甚至最乱的一份 PRD 来试着玩一圈，看看它到底能帮你拦下多少坑，顺便帮我们把 Skill 的毛刺都踩出来。

---

## 一、这个项目到底带来了哪些“确定性优势”？

传统的 Vibe Coding 是把“理解需求 → 架构设计 → 写代码 → 写测试”整条链路都交给大模型的概率输出；而 co-arising 2.0 把从 PRD 到可运行服务的 **10 个阶段**清晰切开，**明确标出哪里允许 AI 发挥，哪里必须由编译器和数学 100% 兜底**：

| 阶段 | 核心动作 / 工具 | 执行主体 | 确定性 | 兜底机制 |
| :--- | :--- | :--- | :---: | :--- |
| **0. 初始化与围栏** | `init-v2` / `init-hooks` | 确定性 CLI | **高** | 正交目录骨架 + 物理防越界 Hooks 一次到位 |
| **1. PRD 蒸馏成真源** | [`coarising-distill` Skill](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_distill/SKILL.md) | AI Agent | **低** | 故意放在最前端吸收自然语言歧义，靠阶段 2 硬门禁兜底 |
| **2. 编译、SMT 证明与推图** | `compile-v2` / MCP `v2_compile` | 编译器 + [Z3 SMT](https://github.com/Z3Prover/z3) | **高** | **100% 检出**规则冲突、漏分支、死规则、越层、血缘断裂与合规违规 |
| **3. 业务歧义收敛签字** | 拍板 A/B 澄清卡 + 审阅签字包 | 人类业务方 + AI | **中** | 业务取舍由人决定，但“歧义是否消完”由 Z3 100% 裁定 |
| **4. 脚手架与洋葱五层生成** | `generate-v2` + `emit-tests-v2` | 确定性生成器 | **高** | 零 Token 发射洋葱五层代码 + `@cloze` 槽位 + **SHA-256 锁定三层测试** |
| **5. 隔离区任务队列与打包** | `tasks-v2` / `context-pack-v2` | 确定性派生引擎 | **高** | 从真源哈希与 SQLite 实时推导，改一行 `.ears` 自动精准标脏 `STALE` |
| **6. 隔离区并行 BDD+TDD** | [`coarising-cloze-worker`](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_cloze_worker/SKILL.md) + Hook | AI Agent + Hook | **中** | AI 只在 `@cloze` 围栏内填槽，越界写文件直接被 `guard-write` 物理拦截 |
| **7. 全三层验收与混沌门禁** | `verify-v2 --strict` + `audit-coverage-v2` + `run-tck-v2` | 确定性执行引擎 | **高** | SHA-256 防篡改 + TS/Scala 真跑 + DIP 0 违规 + 覆盖率/变异测试 + 混沌 TCK |
| **8. 独立上下文盲审** | `coarising-cloze-worker` Mode B | 独立只读 AI / 人 | **中** | 隔离上下文只看 `.ears` + `@cloze` Diff，消除“自己审自己”的偏见 |
| **9. 本地运行与离线工作坊** | `node handwritten/server.ts` + `view-v2` / `atlas-v2` | 确定性运行时/渲染器 | **高** | 开箱起本地 HTTP 服务 + 单文件离线全景图谱 & 代码行级互查工作坊 |

结合昨天刚落地的 7 项核心升级，它能给你带来 5 个实打实的确定性保障：

1. **写第一行代码前，先用 [Z3 SMT 求解器](https://github.com/Z3Prover/z3) 把需求漏洞证出来**：规则互相打架、边界值漏分支（比如金额正好等于 0 怎么算）、被前序规则吞掉的死规则，编译器直接给出反例和 **A/B 业务澄清卡**，逼着业务方拍板，绝不让 AI 默默替你猜。
2. **全链路字段血缘 & 严格类型防漂移**：从 `Command → Event → post: 状态折叠 → State → ReadModel` 端到端校验，并支持多子域 `subdomain` 与 SQLite 递归跨子域血缘（`audit-system-lineage-v2`）。未消费的数值/资金事件字段默认 **fail-closed 报错**，只接受带类型的正式豁免（`waiveLineage`）；读模型上展示的每一列都必须声明机器可校验的来源，杜绝“页面要显示但上游没采集”。
3. **合规 / 隐私 / 可见性硬门禁（防 PII 泄露）**：声明顶层 `compliance` 契约与字段敏感级别（`pii / secret / tokenized-pii`）后，编译器直接拦截两类致命雷区——**公开接口泄露 PII**，以及**在需要支持删除/注销的合规域里把原始 PII 直接写入不可变事件**，同时输出含法务签字栏的合规报告。
4. **权限模型从粗放 RBAC 升级到资源级 / 资格凭证 / 行级隔离**：补齐资源级权限策略（防 IDOR `403 FORBIDDEN_RESOURCE`）、防伪造主体参数绑定（`bindPrincipal` + `principal` 透传）、资格/证书前置校验（`requiresEntitlement → 403 ENTITLEMENT_REQUIRED`）和 ReadModel 结构化 `rowScope`（`403 FORBIDDEN_ROW_SCOPE`），TS 与 Scala 运行时 1:1 对齐，并自动生成逐路由 Authz + IDOR + 资格凭证测试矩阵。
5. **AI 无法作弊的交付闭环与质量门禁**：AI 填槽时被 `guard-write` Hook 物理锁在 `@cloze` 行号区间内，动不了生成代码也改不了锁定测试；验收除了 SHA-256 防篡改、洋葱 DIP 0 违规、100% 文件覆盖率、行/分支覆盖率（含 Scala `sbt-scoverage`）、Git worktree 并行 TDD 隔离与 8/8 S1 混沌 TCK 之外，还内置了**确定性 Domain 变异测试门禁（`--mutation-gate`）**，专门防止测试“假绿”。

---

## 二、先打个预防针：项目还在实验期，尤其是 Skill 这块

我们不想把它包装成一个“一键取代工程师的魔法黑盒”，真实边界如下（正式验收事实均登记在[状态台账](https://co-arising.github.io/zh/status/)）：

- **底座已经非常硬**：[`metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) CLI（0 npm 运行时依赖，纯 Node 标准库 + 内置 `node:sqlite`）、Z3 证明门禁、全链路血缘/合规/权限校验、洋葱五层双栈代码与锁定测试发射、以及离线 HTML 图谱/工作坊渲染，全部是字节级确定性工具。你也可以直接去 [`bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo) 看真实银行试点的跑通结果。
- **还在实验期、最需要真实案例打磨的是 Skill 层**：[`coarising-distill`](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_distill/SKILL.md)（PRD → 真源）和 [`coarising-cloze-worker`](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_cloze_worker/SKILL.md)（隔离区填槽）。
  - 昨天我们刚把 `coarising-distill` 升级到完整覆盖 [EventStorming](https://www.eventstorming.com/) 13 个阶段，同步更新了 [Schema 手册](https://github.com/co-arising/metarch-truthsrc/blob/main/skills/coarising_distill/references/structures_and_bindings_schema.md)与[错误码参考](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/reference/v2_diagnostics_error_codes.md)，并加了一条 **Hard Rule 8（对产品经理/业务方零 DDD 术语访谈）**——要求 AI 别再问“聚合根怎么拆、流批一体用什么”，而是翻译成大白话问业务和合规场景。
  - 但真实世界的 PRD 千奇百怪，大模型在长对话里偶尔还是会偷懒、漏读参考手册或者想跳过证明直接写代码。**把这套 Skill 在真实 PRD 上打磨顺滑，正是我们现在最想听社区反馈的地方。**

---

## 三、现在怎么玩？（从克隆到跑通，分两档玩法）

不必一上来就配齐整套双栈环境，建议先玩**轻量档（5~10 分钟，只需 Node ≥ 22.13 和 Z3，不用装 Scala/JVM）**：拿一份你自己的 PRD 跑完“蒸馏 → Z3 找漏洞 → 打开 11 张全景架构图与中文签字包”，就已经能直观感受到确定性编译的威力；有兴趣再继续跑完后半段的洋葱五层代码生成和本地服务启动。

### Step 1：环境准备与克隆仓库

前置只需要 **Node.js ≥ 22.13.0**（使用内置 `node:sqlite`）和 **[Z3](https://github.com/Z3Prover/z3)**（`--strict` 严格证明必需）：

```bash
# macOS（Ubuntu 可用 sudo apt-get install -y z3，Windows 可用 winget install Microsoft.Z3）
brew install z3
node --version   # 确认 >= v22.13.0

# 克隆工具链（运行时零第三方 npm 依赖）
export COARISING_WS="$PWD"
git clone https://github.com/co-arising/metarch-truthsrc.git
export TRUTHSRC_CLI="$COARISING_WS/metarch-truthsrc/bin/truthsrc.js"
node "$TRUTHSRC_CLI" --version
```

### Step 2：初始化练习目录、挂载 MCP 并添加 Skills

以 **Claude Code** 为例（**Antigravity (AGY)** 同样原生兼容，把 `skills/` 拷贝到工作区或全局 skills 目录并配置同名 `truthsrc` MCP 即可，完整接法也可参考 [v2.0 GA 指南](https://co-arising.github.io/zh/articles/co-arising-v2-ga-prd-to-running-guide-20261126/)）：

```bash
# 1. 一键初始化正交项目骨架（自动带好 .claude/settings.json 防作弊 Hooks）
node "$TRUTHSRC_CLI" init-v2 my-prd-lab --system demo --context core --target typescript --package example.core --format human
cd my-prd-lab

# 2. 注册 truthsrc MCP（提供 v2_compile / v2_tasks / v2_context_pack / v2_verify / v2_view 等 32 个工具）
claude mcp add truthsrc -- node "$TRUTHSRC_CLI" mcp

# 3. 拷贝两个官方 Skill（需求蒸馏 + 隔离区填槽）
mkdir -p .claude/skills
cp -r "$COARISING_WS/metarch-truthsrc/skills/coarising_distill" .claude/skills/
cp -r "$COARISING_WS/metarch-truthsrc/skills/coarising_cloze_worker" .claude/skills/
```

### Step 3：随便扔一份你的 PRD 进去

不用写得多规范，把你手头现有的 PRD、需求评审记录、甚至半页产品草稿放进 `docs/prd.md`，打开 Claude Code / AGY，直接把下面这段话发给它：

```text
请使用 coarising-distill skill，把 docs/prd.md 蒸馏成 co-arising 2.0 正交真源（放在 truth/core/ 下）：
1. 先按 Skill 的要求通读内置 Schema 和 EARS 语法参考，不要凭记忆猜字段；
2. 遇到 PRD 里漏掉的合规、隐私、批量失败、超时或权限问题，用大白话问我（不要甩 DDD 术语），并把悬而未决的问题记入 hotspots；
3. 写完 structures/*.yaml、behaviors/{domain,application}/*.ears 和 bindings/*.yaml 后，调用 truthsrc MCP 的 v2_compile（或 CLI compile-v2 --strict --strict-lineage --out-signoff signoff --lang zh）做严格证明；
4. 只要 Z3 报出 A/B 澄清卡，别替我猜，直接转成业务大白话让我拍板，直到编译全绿并导出 signoff/ 全景图谱与签字文档。
```

---

## 四、中间会遇到哪些“问题”？（提前剧透，遇到别慌）

自己上手玩的时候，大概率会撞上这两类情况——**第一类是系统故意拦住你的“好问题”，第二类是实验期可能踩到的小摩擦**：

### A. 系统故意拦住你的“好问题”（它在帮你给 PRD 排雷）

1. **被 AI 反问一连串“扎心”业务题（8 维 PRD 盲区雷达 + 行业合规扫描）**
   比如它会突然问你：*“如果用户以后注销账号，个人手机号/身份证要不要彻底删除或匿名化？”“批量发 500 条里有 2 条失败、1 条外部超时没回执，是整批回滚还是单条补发？”“机构管理员能不能看到其他机构的数据？”* —— 这些平时都是上线后才爆的雷，现在会在 Phase 0 被记成 `blocking hotspot`，不拍板不放行。
2. **Z3 弹出 A/B 澄清卡**
   比如“输入金额正好为 0 时既不满足规则 1 也不满足规则 2”，或者“两条风控规则条件重叠”。你只需要回复“选 A / 选 B / 按 xxx 改”，AI 会自动回写 `.ears` 再重跑 Z3。
3. **血缘 / 隐私 / 权限编译报错**
   比如 `V2_LINEAGE_UNCONSUMED_NUMERIC_FIELD`（事件里塞了个数值/资金字段但下游没人消费）、`V2_COMPLIANCE_RAW_PII_IN_IMMUTABLE_EVENT`（可删除合规域里把明文 PII 写进了不可变事件）、或者 ReadModel 找不到字段来源。每一条诊断都带精确的 `file:line:col` 定位（详见 [EARS v2 语法参考](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/reference/ears_v2_grammar_reference.md) 与[错误码手册](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/reference/v2_diagnostics_error_codes.md)），AI 自己大多能顺着修好。

### B. 实验期可能踩到的小摩擦（欢迎截图来吐槽）

1. **Skill 偶尔“偷懒”或急着写代码**：遇到超长或极口语化的 PRD 时，大模型偶尔会跳过先读 `references/` 手册导致 YAML 键名写错，或者没等 Z3 全绿就想手写业务代码。提醒它一句 *“先读 skill 里的 references 文档，跑 `compile-v2 --strict` 过关再继续”* 通常就能拉回轨道。
2. **未装 Z3 或 Node 版本不够**：`--strict` 模式下没装 `z3` 会明确报 `V2_SOLVER_MISSING`（故意不静默跳过）；Node 低于 `22.13.0` 会提示升级。
3. **只想先跑 TypeScript 却带着 Scala 报错**：`init-v2` 和 `generate-v2` 加上 `--target typescript` 即可纯 Node 体验，不需要装 JDK 或 `sbt`。

---

## 五、编译和验收通过之后，能看到什么？

### 1. 只要前半段编译通过（还不写一行手写代码），立刻打开 `signoff/` 开盲盒

- **单文件离线全景图谱 `signoff/atlas.html`（共 11 张交互图）**
  直接双击用浏览器打开（严格离线 CSP、支持浅色/暗黑切换、3 档信息密度、缩放拖拽、节点聚光灯、一键导出 SVG / Mermaid / CSV / CML），也支持通过 `truthsrc atlas-v2` 从多子域 canonical、v1 真源树或 `.ingest/*.json` 直接生成：
  - **问题空间 6 张图**：
    1. **Alberto Brandolini 橙色便签 2D 事件矩阵**：按时间轴从左到右跨行对齐的斜瀑布布局，附阶段 / 角色 / Event Modeling 视图与 Hotspots；
    2. **二维用户故事地图（Story Map）**：同步导出 `signoff/story-map.csv`，可直接导入 [Miro](https://miro.com/) 或 [StoriesOnBoard](https://storiesonboard.com/)；
    3. **用例时序图 & 持久化流水线**：独立 SVG 时序渲染；
    4. **领域模型与聚合关系图**：完整展示 Aggregates、Relations（`1:1` / `1:N` / `N:M`）、Deadlines、ValueObjects 与 ExactTypes；
    5. **字段级数据血缘 & PII 合规台账**：端到端追踪字段流动与跨子域多跳 PII 污点；
    6. **多子域上下文映射图**：同步导出标准 [ContextMapper](https://contextmapper.org/) `signoff/domain-map.cml`。
  - **方案空间 5 张图**：
    7. **洋葱五层架构与 L1/L2/L3 代码生成通道图**；
    8. **权限 PEP / PDP / 资源级 IDOR / 资格凭证 / 行级隔离矩阵**；
    9. **CQRS 读侧物理物化拓扑**（`stream` / `batch` / `hybrid` 共享物化视图与跨读模型列类型冲突校验）；
    10. **分层测试策略 & Git worktree 并行 TDD 拓扑**；
    11. **BoundedContexts 部署拓扑图**。
- **给产品、业务和法务直接审阅签字的中文文档**：
  - `signoff/ac/*.md`（中文验收标准 Style E）
  - `signoff/tables/*.md`（DMN 决策表）
  - `signoff/lineage.md`（全链路血缘 + 行业合规义务与法务签字栏）
  - `signoff/event-matrix.md` & `signoff/use-cases.md`（完整事件矩阵与用例规约）

### 2. 继续跑完后半段代码落地，还能看到什么？

如果你接着跑代码发射与隔离区填槽：

```bash
# 零 Token 发射洋葱五层代码 + 静态工程脚手架 + SHA-256 锁定三层测试
node "$TRUTHSRC_CLI" generate-v2 --in .truthsrc/canonical-v2.json --out . --target typescript --package example.core --with-scaffold
node "$TRUTHSRC_CLI" emit-tests-v2 --in .truthsrc/canonical-v2.json --out . --target typescript --package example.core
node "$TRUTHSRC_CLI" tasks-v2 --root . --format human
```

再让 Agent 用 `coarising-cloze-worker` 把派生出来的 `@cloze` 槽位填完、跑绿 `check-v2 --strict`（可加 `--mutation-gate` 跑内置 Domain 变异测试），最终你会拿到：

- **一套本地直接能调的 HTTP 服务**：运行 `node handwritten/server.ts`（TS）或对应 Scala Play 脚手架，自带 `/health`、`/api/v1/...` 以及内建 401/403/IDOR 防护的 `HttpAuthority`；
- **单文件离线代码工作坊 `workshop.html`**：运行 `node "$TRUTHSRC_CLI" view-v2 --root . --out workshop.html`（或调 MCP `v2_view`），双击浏览器打开——点击任意一条业务规则，直接高亮定位到洋葱五层代码和锁定测试用例的精确行号，**真源 ↔ 代码 ↔ 测试双向逐行反查**；
- **一份不掺水的验收账本**：SHA-256 防篡改通过、洋葱 DIP 0 违规、100% 文件覆盖率（零灰区）、行/分支覆盖率、Domain 变异测试与 S1 混沌 TCK 绿灯一目了然。

---

## 六、欢迎来踩坑 & 加入 Discord 反馈

这个项目现在最缺的不是吹捧，而是**真实业务 PRD 的“毒打”**。

哪怕你只花 10 分钟，随便丢一份你们业务里最绕的 PRD 进去：

- 看看 Z3 能不能抓出你没注意到的逻辑洞；
- 看看打开 `signoff/atlas.html` 里的 11 张全景图香不香；
- 更欢迎把 **Skill 哪一步卡壳了、哪句提问很蠢、哪个报错看不懂、或者你期望怎么改**，直接截图丢进我们的社区！

- **Discord 社区（反馈 / 吐槽 / 讨论）**：[加入 co-arising Discord](https://discord.gg/PwYrRpJu75)
- **GitHub 工具链仓库**：[co-arising/metarch-truthsrc](https://github.com/co-arising/metarch-truthsrc)
- **银行双栈试点样例**：[co-arising/bank-wealth-demo](https://github.com/co-arising/bank-wealth-demo)
- **项目官网与中文文档**：[co-arising.github.io/zh/](https://co-arising.github.io/zh/)
