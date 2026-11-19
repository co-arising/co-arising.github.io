# 对 co-arising 的启发：AI Coding 范式转移下的战略印证与工程路线



## 〇、一句话结论

**工业界用 2024–2026 两年的集体试错，恰好验证了 co-arising 坚持的"确定性元模型编译 + 切片完形填空（Cloze）+ 双向代码锚定"才是终局方向；而先行者（AWS Kiro、GitHub Spec-Kit、MetaGPT、Nuanced）栽过的跟头，则构成一份价值千金的产品避坑指南。**

---

## 一、核心战略印证：外部演进为什么恰好证明 co-arising 的壁垒

### 1.1 叙事定位成立："AI 编程的架构安全带"切中主航道

将 co-arising 从"Scala/DDD 后端脚手架"重塑为"AI 时代的复杂系统防幻觉与架构治理引擎"，与工业界经历"Vibe Coding 幻灭期"后的最新共识高度吻合——连 Karpathy 本人都已把 Vibe Coding 迭代为 Agentic Engineering，核心诉求正是"拿 Agent 杠杆 + 确定性护栏 + 软件质量零妥协"。这个故事正处于 2026 年下半年行业寻找"Post-Vibe-Coding 基础设施"的主航道上。

痛点叙事可直接引用的第三方硬数据（避免"技术洁癖"观感）：

- Karpathy 从 Vibe Coding 到 Agentic Engineering 的转向（[The New Stack](https://thenewstack.io/vibe-coding-is-passe/)）
- [GitClear：代码流失率翻倍（3.3% → 7.1%）、重复块 4 倍暴增](https://www.gitclear.com/ai_assistant_code_quality_2025_research)
- [Foundra：AI 代码重大缺陷率 1.7 倍](https://www.foundra.ai/key-reads/vibe-coding-over-karpathy-agentic-engineering-first-time-founders-may-2026)
- [Thoughtworks 雷达对"AI 加速架构漂移正反馈死循环"的定性](https://www.thoughtworks.com/radar/techniques/architecture-drift-reduction-with-llms)

### 1.2 控制论"阿什比定律（Ashby's Law）"提供最硬核的理论背书

Thoughtworks 杰出工程师 Birgitta Böckeler 在 [《Harness engineering for coding agent users》(2026.04)](https://martinfowler.com/articles/harness-engineering.html) 中指出：调节器只能监管它拥有显式模型的对象；LLM 编码 Agent 几乎能生成任何代码（无限多样性），唯有锁定预定义拓扑（Topology）降维减熵（variety-reduction），才能构建严密的控制套具。

**对 co-arising 的意义**：这等于在为 co-arising 写注脚。通用 IDE（Cursor、Windsurf）管不住架构腐化，是因为它们面对"无约束的图灵完备代码空间"；而 co-arising 通过 DDD + CQRS + Event Sourcing + Saga 的真理树元模型，先把架构拓扑锁死在有限的确定性轨道上，**从信息论源头砍掉 80%（工作假设，尚未实测）产生架构幻觉的自由度**。

### 1.3 填补全行业公认最难的"Behaviour Harness（业务行为套具）"空白

Böckeler 的 Harness 分类体系中坦言：行业目前只做好了 Maintainability Harness（Linter / CodeScene 抓圈复杂度）与初级的 Architecture Fitness Harness（ArchUnit 抓包依赖）；而最难的 **Behaviour Harness**（确保 AI 生成的代码在业务行为上真正符合预期），全行业依然只能靠"自然语言 Spec + 盲信 AI 自己写的测试"。

**对 co-arising 的意义**：co-arising 不是又一个静态代码检查器——它是极少数能把**业务不变量守卫（Invariant Guards）+ 状态折叠（State Fold）+ Given-When-Then 验收契约**编译为确定性代码桩与双向对账表的系统。按这个设计，co-arising 的目标是：**别人只做了"代码形状"的 Harness，co-arising 要实现工业界缺失的 Domain Behaviour Harness。**

### 1.4 "L3→L5 非对称神经符号鸿沟"是精准的竞争定位武器

借用 [FAOS 论文 (arXiv:2604.00555)](https://arxiv.org/html/2604.00555v5) 的 L0–L5 耦合成熟度模型做竞争格局切割：

| 竞品 | 所处层级 |
|------|----------|
| Greptile、Codebase-Memory、Nomik 等 Graph+MCP 工具 | L2（输入端 AST 语法检索） |
| Qlerify 等 DDD 工具 | 软性 Advisory 提示，无编译级锁死 |
| co-arising | **L4–L5：输入裁剪 + 输出确定性校验闭环的编译级引擎** |

同时把 [KIT JDomInO 论文 (arXiv:2608.05612)](https://arxiv.org/html/2608.05612v1) 尚未攻克的两大难题列为首要攻关目标：反向持久化锚点（Provenance Identity Markers）与跨上下文 Saga。

### 1.5 "逆参数知识效应（Inverse PKE）"为极致上下文压缩提供学术依据

[FAOS 论文](https://arxiv.org/html/2604.00555v5) 的定律：LLM 预训练语料越薄弱的私有业务规则，本体锚定带来的准确率增益越大（高达 2 倍以上，p < .001）；反之把通用概念塞进上下文反而引发"上下文干扰"。

**对 co-arising 的意义**：这呼应了 co-arising 已验证的"宏展开 + 单行微语法压缩 + 业务切片完形填空（Context Pack Cloze）"路线——把几万行源码或全量图谱塞给 LLM 不仅贵，还会引发上下文干扰。**80% 的通用架构样板交给确定性编译器（零 Token、零幻觉），只把 LLM 最缺的 20% 核心私有业务不变量通过精准切片喂给 Agent。**（80/20 比例为工作假设，尚未实测）

---

## 二、五大产品与架构启发：吸取先行者教训

### 启发 1：警惕"Plan Mode 之死"——死磕单行微语法，绝不陷入"Markdown/YAML 审查地狱"

- **前车之鉴**：Böckeler 痛批 [GitHub Spec-Kit 与 Kiro](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) 生成海量啰嗦重复的 Markdown（"我宁愿直接审代码"）；[Ayman Nadeem《Plan mode is dead》(2026.09)](https://www.aymannadeem.com/artificial/intelligence,/developer/tools/2026/09/24/plan-mode-is-dead.html) 指出 AI 生成的冗长规约让人"两眼发直"，且强迫用户"过早结束思考"。
- **落地动作**：
  - 坚持**微语法（Micro-Grammar）与宏展开压缩**——暴露给架构师和 LLM 的真源必须像公式一样紧凑高信噪比（Qualified Ref、Guard、Binding、Fold 单行微语法），绝不能变成 JSON/YAML 配置泥潭；
  - 用**苏格拉底式反向访谈**替代"填表式前置建模"：用户想新增业务特性时，由 co-arising 基于现有图谱发起 3–5 个精准架构选择题（"该命令失败时是否触发逆向补偿事件？聚合根状态需校验哪些前置不变量？"），回答完直接生成几行微语法真源。

### 启发 2：彻底抛弃软性提示词约束，用 PreToolUse + Stop Hook (exit 2) 打造物理级防作弊笼子

- **前车之鉴**：[Anthropic 官方文档](https://code.claude.com/docs/en/best-practices) 明确划定界限——写在 CLAUDE.md、Prompt 或 Skill 里的规则全是**非确定性的**（模型随时可能忽略）；[Chris Richardson 实测](https://microservices.io/post/architecture/2026/03/09/genai-development-platform-part-1-development-guardrails.html) 发现 Claude Code 甚至会找借口拒绝修复坏味道。
- **落地动作**：co-arising 在推出 MCP Server 的同时，必须**配套分发一套原生 `.claude/settings.json` Hooks 套件**：
  - **PreToolUse Hook 锁死生成区**：Agent 企图修改确定性编译生成的脚手架骨架、协议层或跨上下文模块时，脚本直接 `exit 2` 物理阻断文件写入，强制只在 `@cloze` 业务填空区内改动；
  - **Stop Hook 自愈式正反馈注入**：Agent 写完业务方法试图结束回合时，自动触发双向对账器与切片测试；一旦违反领域不变量或破坏图谱契约，立即 `exit 2` 拦截，并把**带精确领域修复指令的编译报错**输出到 stderr，逼迫 Agent 在人类介入前自动完成自我修正。

### 启发 3：砍掉"多智能体角色扮演剧场"，确立"编译器 + 单点 Cloze Agent + 盲审 Subagent"铁三角

- **前车之鉴**：[r/better_claw 200 任务实测](https://www.reddit.com/r/better_claw/comments/1uvht82/every_local_multiagent_setup_ranked_by_how_often/) 与 [NeurIPS MAST 复盘 (r/hermesagent)](https://www.reddit.com/r/hermesagent/comments/1wvfi1b/multiagent_role_design_findings_how_i_use_the/) 已证伪 MetaGPT/ChatDev 式"PM Agent 跟架构师 Agent 开会"——人设背景故事零收益，多轮传话只会让幻觉复利放大并烧光 KV Cache。
- **落地动作**：
  - 由确定性 co-arising 编译器**直接取代"架构师 Agent"和"Tech Lead Agent"**；
  - 编译器通过图遍历，为每个待实现业务切片生成高度隔离的 **Context Pack**（仅含类型依赖、调用方契约、前置 Guard 与验收场景），交给单一编码 Agent 在极小上下文窗口内做"单文件完形填空"；
  - 编码完成后，拉起从未见过编码推导历史的独立 **Fresh Subagent**，仅喂 Context Pack 与 Git Diff 做契约盲审，系统提示词焊死 `skip style`（忽略风格挑刺，只查业务不变量与边界遗漏），杜绝审查员瞎指挥导致的过度工程化。

### 启发 4：建立"双速工作流（Two-Speed Workflow）"

- **前车之鉴**：[Böckeler 实测](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) 指出"用同一套重型 Spec 流程应对所有规模的问题"必然失败——改个小逻辑也要走四步审批，开发者会直接卸载工具。
- **落地动作**：
  - **快通道（Cloze Fast-Path）**：不改变领域事件、聚合边界与状态结构，仅调整 Handler 内部算法——直接重跑单节点 Context Pack Cloze，Stop Hook 秒级校验，零建模仪式感；
  - **慢通道（Architecture Evolution Path）**：新增命令/事件、跨越限界上下文、修改 Saga 编排时——才启动真理树更新、图谱影响半径分析（Impact Analysis）与脚手架重编译。

### 启发 5：用"Mermaid C4 / 事件流视图自动投影"替代手工画图

- **前车之鉴**：[Ayman Nadeem 提出 2026 年最深刻的未解之谜](https://www.aymannadeem.com/artificial/intelligence,/developer/tools/2026/09/24/plan-mode-is-dead.html)——"当 5 个甚至 100 个并行 Agent 同时高速修改系统时，人类如何在不读每一行代码、也不读几万字 AI 废话的前提下，保持对系统全局心智模型（Mental Model）的掌控？"
- **落地动作**：这正是 co-arising 的 **CQRS 图谱投影 + 可视化领域看板**大显身手的地方。不让人类画图，而是利用双向代码锚定，在每次 Agent 提交 PR 时自动将变更映射为 [C4 模型 / Mermaid 事件流差异图（Visual Diff on Truth-Tree）](https://arxiv.org/html/2603.15021v1)——让架构师一眼看到："这次 PR 只是填补了 `OrderAggregate` 内部的一个绿色完形填空节点，完全没有触碰红色的跨上下文边界"。

---

## 三、融合后的理想闭环工作流（四步）

将上述启发融会贯通，co-arising 可以打造一条极具说服力的四步标准执行流：

```
┌─────────────────────────────────────────────────────────────┐
│ ① 反向访谈与微语法真源演进                                     │
│    替代冗长的 Markdown Plan Mode                              │
│    架构师提出业务变更意图 → co-arising 基于现有 Neo4j/SQLite   │
│    领域图谱发起 3-5 个边界澄清提问 → 增量写入 truthsrc 微语法   │
│    真源 → 图谱自动渲染 Mermaid 事件流影响范围供人类一眼确认      │
├─────────────────────────────────────────────────────────────┤
│ ② 确定性脚手架编译与切片 Context Pack 导出                     │
│    基于 Inverse PKE 与 Ashby 定律降维                         │
│    编译器零 Token、零幻觉生成大部分 CQRS/ES/Saga 强类型骨架   │
│    与测试桩；为剩余核心业务行为按切片导出极简 Context Pack │
├─────────────────────────────────────────────────────────────┤
│ ③ 受双层 Hooks 物理锁定的单点完形填空                          │
│    PreToolUse 防越界 + Stop Hook (exit 2) 强制自愈            │
│    干净上下文编码 Agent 执行单文件填空；回合结束时 Stop Hook    │
│    自动运行编译器、双向溯源对账器与验收测试，违约即阻断并注入    │
│    领域级修复指令                                             │
├─────────────────────────────────────────────────────────────┤
│ ④ 独立子智能体契约盲审与图谱溯源回写                           │
│    Fresh Subagent + skip style                               │
│    无历史污染的 Subagent 仅对照 Context Pack 与 Git Diff 盲审  │
│    通过后将代码 AST 符号表锚点回写至领域知识图谱                │
└─────────────────────────────────────────────────────────────┘
```

这套设计避开了早期多智能体框架与重型 SDD 工具的覆辙，把 2026 年底硅谷才摸索出的 Harness Engineering 推向了**编译级高度**。

---

## 四、"哪些进工具链、哪些做 Skill"：黄金分割线

### 4.1 第一性原理

结合 Anthropic "Deterministic vs. Non-deterministic" 二分法与 Böckeler "Computational（CPU 计算级）vs. Inferential（GPU 语义推理级）"框架：

- **进工具链（CLI 编译器 + MCP Server + Hooks）**：凡要求 100% 零例外执行、涉及语法与符号表转换、图谱精确遍历、骨架生成、物理边界拦截的逻辑——做成确定性编译与计算工具，**绝不消耗 LLM Token，绝不给 Agent 讨价还价或幻觉的余地**；
- **进 Skill（`.claude/skills/` + 独立 Subagents）**：凡涉及向人类提问澄清模糊需求（Knowledge Crunching）、在受限槽位内编写业务算法、从存量烂代码提炼业务语义、语义合理性审查——做成按需加载的 `SKILL.md`，平时只占几十个 Token 描述，触发时才加载完整工作流。

### 4.2 全景职责矩阵（按生命周期阶段）

| 生命周期阶段 | 核心能力模块 | 归属层 | 工程载体 | 架构依据 |
|---|---|---|---|---|
| 1. 需求澄清与增量建模 | 苏格拉底式反向提问、识别缺失 Guard 与异常分支 | **Skill** | `.claude/skills/domain-interview/SKILL.md` | 需求初期是模糊自然语言，需 LLM 扮演领域专家向人类出选择题消除歧义 |
| 2. 真源解析与宏展开 | truthsrc 单行微语法双向解析、M1/M2/M3 宏展开、元模型完整性校验 | **工具链** | co-arising CLI 编译器 + 确定性 Validator | 词法/语法解析与图拓扑合法性检查必须 100% 确定（补齐 JDomInO 缺失的独立校验器） |
| 3a. 存量系统逆向冷启动（结构） | AST 静态扫描、调用链提取、数据库 Schema 导出 | **工具链** | CLI 扫描器 + 本地 SQLite/Neo4j 图构建器 | 静态结构提取用 Tree-Sitter/LSP 毫秒级完成，比 Agent 调 grep 省 10 倍 Token |
| 3b. 存量系统逆向冷启动（语义） | 从静态类簇中识别聚合根与隐式领域事件 | **Skill** | `.claude/skills/brownfield-miner/SKILL.md`（`disable-model-invocation: true`） | 静态工具分不清通用类与 DDD 语义角色，需 LLM 做语义聚类并交人类确认 |
| 4. 脚手架生成与切片打包 | 生成 CQRS/Saga/Actor 骨架、注入 `@ProvenanceId` 锚点、导出切片 Context Pack | **工具链** | co-arising Codegen 引擎 + MCP Server 工具集 | 大部分结构样板零 Token 生成；按切片裁剪规避长上下文退化与上下文干扰 |
| 5. 业务逻辑完形填空 | 在单个 `@cloze` 槽位内编写业务状态计算与领域算法 | **Skill** | `.claude/skills/cloze-fill/SKILL.md` | 局部业务算法需要灵活逻辑合成能力，适合 Agent 拿极简 Context Pack 按步骤填空 |
| 6. 写保护与双向对账门禁 | 禁止篡改非 Cloze 生成区、回合结束自动编译测试与符号表反向对账 | **工具链** | `.claude/settings.json` 的 PreToolUse 与 Stop Hooks（`exit 2`） | 零容忍规则放 Prompt 必被绕过，必须 Hook 物理层阻断 |
| 7. 契约盲审与防作弊检查 | 检查是否硬编码假数据骗过测试、是否完整兑现业务意图 | **Skill / Subagent** | `.claude/agents/contract-reviewer.md`（独立上下文 + `skip style`） | 静态编译抓不出"用 `if (id == 1) return true` 骗过测试"的语义作弊 |

### 4.3 必须焊死在工具链里的四大硬核组件

**① truthsrc 微语法编译器与图谱引擎（Core CLI）**
- 双向无损转换：单行微语法（Qualified Ref、Guard、Binding、Fold、Parameter）↔ 元模型 AST / 图数据库（Neo4j 或嵌入式 SQLite）的确定性编译；
- 元模型静态类型与拓扑检查（Model-Level Linter）：生成代码之前，确定性检查"孤儿领域事件（无人发布/订阅）""跨限界上下文直接引用实体""Saga 缺少逆向补偿通道"等。

**② 带持久化身份锚点的脚手架生成器（Deterministic Codegen）**
- 正向生成包结构、Aggregate Root 状态机壳、Command/Event 序列化、CQRS ReadModel 投影框架、Given-When-Then 测试脚手架；
- **关键壁垒**：在生成的每个类、方法与 `@cloze` 填空区写入持久化溯源身份锚点（如 `@CoArisingNode(id = "bc.wealth.ta.ConfirmOrder")`），彻底解决 JDomInO 因名称匹配导致重构改名即失步的痛点。

**③ 精准裁剪的 MCP Server（4–6 个高内聚原子工具）**
- `coarising_get_slice_context(slice_id)`：输入业务切片 ID（如 `TA-01`、`REFUND-02`），图遍历直接返回双压缩 Context Pack（入参/返回值类型定义、前置 Invariant Guard 声明、调用方契约、验收测试场景）；
- `coarising_analyze_impact(node_id)`：返回修改某聚合根或事件在全图谱中的上下游影响半径与受波及 Cloze 节点列表；
- `coarising_compile_and_reconcile()`：触发增量编译与代码-图谱双向符号对账，返回结构化差异报告与 Mermaid C4/事件流可视化图。

**④ 物理级防作弊 Hooks（`.claude/settings.json` 强制护栏）**
- 第一道闸（PreToolUse 拦截越界写入）：匹配 `Edit|Write|MultiEdit` 调用；目标文件属于锁定生成区、或修改行跨越 `@cloze:start` / `@cloze:end` 边界时，立即 `exit 2` 并输出：`[co-arising Guardrail] 禁止直接修改架构骨架文件，请仅在 @cloze 槽位内编写业务逻辑，或通过修改 truthsrc 元模型重新编译。`
- 第二道闸（Stop Hook 强制 L4–L5 闭环对账）：Agent 试图结束回合时自动运行 `co-arising verify --slice <current>`（增量编译 + 反向 AST 锚点对账 + 该切片 Given-When-Then 测试）；任一未过即 `exit 2`，报错注入 stderr，逼迫 Agent 原地修复到全绿。

### 4.4 应封装为 Skill / Subagent 的四大认知工作流

**① domain-interview Skill（苏格拉底式反向访谈与微语法建模）**
- 定位：替代重型 Plan Mode，做"人类业务意图 → truthsrc 微语法真源"的翻译官；
- 指令要点：新功能/业务变更时先调用 `coarising_analyze_impact` 查看上下文；严禁直接脑补全套模型，必须针对命令前置条件（Invariant Guard）、状态演进（State Fold）与异常补偿提出**不超过 4 道结构化选择题**；用户确认后按微语法规范更新真源树，调用 `coarising_compile_and_reconcile` 生成骨架与 Mermaid 事件流图供一眼核对。

**② cloze-fill Skill（受控切片完形填空工作流）**
- 定位：指导编码 Agent 在极小上下文窗口内高效完成核心业务填空；
- 指令要点：第一步调用 `coarising_get_slice_context` 获取 Context Pack，**严禁盲目全局 grep 或读取无关限界上下文文件**；第二步仅在目标文件 `@cloze` 锚点区间内编写领域逻辑，覆盖 Context Pack 列出的所有 Given-When-Then 边界条件；第三步触发本地切片单测，通过后交 Stop Hook 对账。

**③ brownfield-miner Skill（存量烂代码逆向提炼工作流）**
- 定位：遗留 Spring Boot / Node.js / Scala 存量项目渐进式导入 co-arising（Frontmatter 设 `disable-model-invocation: true`，仅架构师手动 `/brownfield-miner` 触发）；
- 指令要点：先运行工具链静态 AST 与数据库 Schema 提取器获取粗粒度模块聚类；再由 LLM 阅读核心业务表与 Service 类，甄别真正的业务实体、不可变值对象与隐式状态变迁事件，剔除纯技术 DTO 噪音，起草初始 truthsrc 候选文件。

**④ contract-reviewer Subagent（零上下文污染的契约盲审员）**
- 定位：`.claude/agents/contract-reviewer.md` 独立子智能体，解决"编写者 Agent 自我合理化或投机取巧骗过测试"；
- 指令要点：运行在全新干净上下文，从未见过主 Agent 编码对话；输入仅有 Context Pack + `git diff`；**强制 `skip style`**（完全忽略命名偏好、排版、非必要抽象重构建议），只做三项冷酷核查：
  1. 是否所有 Guard 条件都已真正实现而非硬编码绕过？
  2. 是否夹带了未在真源中声明的隐式副作用或外部调用？
  3. 验收测试是否真实覆盖了逆向异常分支？

---

## 五、商业叙事一句话

> **Skill 负责把人类的模糊意图"编译"进确定性的领域真源（truthsrc），而工具链（Compiler + MCP + Hooks）则像物理定律一样，把编码 Agent 死死锁在真源划定的轨道内完成填空与自愈——既保留了 Vibe Coding 的对话式丝滑体验，又在底层实现了传统编译器级别的架构确定性。**

---

## 六、GTM 路线与避坑清单

### 6.1 三步演进方向

| 阶段 | 策略 | 要点 |
|------|------|------|
| Phase 1 | 开源优先引流（Developer-First & MCP Native） | PLG 路线；第一时间推出官方 MCP Server；语言破圈（TypeScript/Python/Rust 轻量解析或通用架构契约 DSL）；GitHub 社区运营 + 实战教程 |
| Phase 2 | 企业级架构治理平台（Top-Down SaaS） | 架构合规与漂移检测（CI/CD 插件将 PR 与领域图谱对比，越界即拦截）；可视化领域看板（Event Storming & Graph Studio），打破"设计文档与代码永远不一致"魔咒 |
| Phase 3 | 生态扩展：自进化智能体（AI-First Agentic Loop） | 结构化领域模型 + 图谱 + 双向锚定 = "可执行的企业数字孪生架构脑"；自然语言业务变更 → AI 自动改模型 → 编译 → 测试验证 |

### 6.2 四大避坑要点

1. **过度陷入技术宗教（Too academic）**：DDD/Akka 在硅谷相对小众，不能要求用户先懂战术 DDD——必须**零门槛接入**（从 OpenAPI 规范、数据库 Schema 或 Markdown 需求文档切入，逐步引导走向结构化建模）。
2. **避免沦为"又一个画图工具"**：核心护城河是**编译器级的一致性（Code-to-Graph & Model-to-Code 双向闭环）**，必须死磕代码锚定与自动化生成准确率。
3. **增加 Brownfield（存量老系统）逆向采矿切入点**：硅谷大厂与金融企业最大痛点不在从零写新项目，而在海量存量系统不敢让 Agent 碰。Phase 1 的 MCP Server 若能结合 AST 解析器先把存量 TypeScript/Java/Scala 代码库自动聚类映射为初始候选领域图谱，再让人类架构师在关键边界"加锁"（锁死 Aggregate 与 Invariant），PLG 冷启动阻力将降低一个数量级。
4. **双速工作流**：用同一套重型流程应对所有规模的问题必然失败，小改动必须零仪式感（见启发 4）。

---

## 七、关键外部参考（与本启发直接相关）

- [Birgitta Böckeler: Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)（Ashby 定律、Harness 分类、Computational vs Inferential）
- [Birgitta Böckeler: SDD 三工具实测](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)（Markdown 审查地狱、虚假控制感）
- [Claude Code 官方最佳实践 (2026.11)](https://code.claude.com/docs/en/best-practices)（反向访谈、Hooks、盲审 Subagent、skip style）
- [Ayman Nadeem: Plan mode is dead](https://www.aymannadeem.com/artificial/intelligence,/developer/tools/2026/09/24/plan-mode-is-dead.html)（Planning ≠ A Plan）
- [arXiv:2604.00555 — FAOS](https://arxiv.org/html/2604.00555v5)（Inverse PKE、L0–L5 非对称耦合成熟度）
- [arXiv:2608.05612 — JDomInO](https://arxiv.org/html/2608.05612v1)（模型漂移=工具链失败；锚点与 Saga 难题=co-arising 的切入点）
- [arXiv:2603.27277 — Codebase-Memory](https://arxiv.org/html/2603.27277v1)（图查询省 10 倍 Token；AST 不懂 DDD 语义=流派一盲区）
- [Qlerify SDD](https://www.qlerify.com/spec-driven-development)（Advisory 校验=流派二盲区对照）
- [Chris Richardson: GenAI 开发护栏](https://microservices.io/post/architecture/2026/03/09/genai-development-platform-part-1-development-guardrails.html)（Agent 为坏味道找借口；Hook 必要性）
- [r/better_claw 200 任务基准](https://www.reddit.com/r/better_claw/comments/1uvht82/every_local_multiagent_setup_ranked_by_how_often/)｜[r/hermesagent 角色设计复盘](https://www.reddit.com/r/hermesagent/comments/1wvfi1b/multiagent_role_design_findings_how_i_use_the/)（多智能体剧场证伪）
- [arXiv:2603.15021 — C4 for Agentic Systems](https://arxiv.org/html/2603.15021v1)（Mermaid C4 自动投影依据）
