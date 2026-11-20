# 规约本身就有 Bug：深度拆解 AWS Kiro 如何用 SMT 求解器在写代码前消灭 Spec 歧义与逻辑冲突

2026 年，规约驱动开发（Spec-Driven Development，SDD）已成为 AI Coding 工程化的主流共识——几乎所有团队都在强调“先写 `spec.md` / `requirements.md`，再让 Coding Agent 动手写代码”。然而，在 **AI Engineer CODE 2026**（2026 年 11 月 11 日）的演讲 [《Specs have bugs too》](https://ai.engineer/code/2026/talks/online-aws-specification-analyzer) 中，来自 **AWS Automated Reasoning Group（自动推理组）** 的软件工程师 **Rajath Mahendrappa Kotyal**（[AI Engineer 讲者档案](https://ai.engineer/speakers/rajath-mahendrappa-kotyal) · [GitHub `@rajathkotyal`](https://github.com/rajathkotyal)）一针见血地戳破了 SDD 的核心盲区：

> **如果你的规约本身就包含隐藏歧义、跨句冲突和状态缺口，再强的 Coding Agent 也只会把错误的需求以 10 倍速编译成生产环境里的 Bug。**

这篇深度解读将围绕五大核心问题展开：

1. **演讲、Slides 与学术引用溯源**：核实 Slides 获取方式、AWS 研发团队背景，以及演讲中所有关键统计数据的原始论文出处。
2. **Before SMT vs. After SMT**：没有 SMT 之前 Spec 怎么写，引入 SMT 之后 Spec 写法与人机协作工作流发生了怎样的质变。
3. **底层原理全解**：SMT 求解器究竟如何工作？AWS 的三阶段神经符号管线与“7–10 次采样 + 逻辑等价聚类”如何解决自然语言二义性。
4. **开源生态与可运行样例**：盘点 GitHub 上的核心开源项目，并提供可直接运行的 SMT-LIB2 与 Python `z3-solver` 完整代码片段。
5. **对 `co-arising`（`truthsrc`）的四大深度补充**：如何将 SMT 逻辑校验无缝嫁接到 `truthsrc` 编译器、苏格拉底式 `domain-interview` Skill、测试生成与 Saga 不变量验证中。

## 一、演讲全景、Slides 核实与核心理论/实证引用溯源

### 1.1 讲者、研发团队与 Slides 获取情况

* **演讲视频与官方文字版**：录播位于 AI Engineer CODE 2026 Day 1 直播的 [`1:50:46–1:58:35`](https://www.youtube.com/watch?v=ZZ19zhYnDKY&t=6648s)，官方配套页面为 [Specs have bugs too | AI Engineer CODE 2026](https://ai.engineer/code/2026/talks/online-aws-specification-analyzer)。
* **讲者背景**：[Rajath Mahendrappa Kotyal](https://ai.engineer/speakers/rajath-mahendrappa-kotyal) 毕业于卡内基梅隆大学（CMU），现任职于 AWS Automated Reasoning Group，参与构建了 Kiro 的 Requirements Analysis（需求分析）引擎，同时也是 AWS 开源 Rust 模型检查器 [Kani](https://github.com/model-checking/kani) 的核心贡献者与评审者。
* **核心团队勘误**：演讲末尾自动语音字幕（ASR）将致谢名单识别为 `"Anda Jin, Stefan, Nia and Delmos"`。经核对 AWS Kiro 团队于 2026 年 5 月 12 日发表的官方深度技术博客 [《Requirements analysis: catching requirement bugs before they become code》](https://kiro.dev/blog/deep-spec-analysis/)，该特性的核心应用科学家（Applied Science）团队成员实为：**Oyendrila Dobe、Jatin Arora、Stefan Zetzsche、Nadia Labai、Rémi Delmas**。
* **关于 Slides 的说明**：截至目前，AI Engineer CODE 2026 官方**未单独提供独立下载的 PDF 版 Slides**。但官方的 [Reading Edition 页面](https://ai.engineer/code/2026/talks/online-aws-specification-analyzer) 已精确标注了关键幻灯片的时间戳（例如 `01:54:20` 分离 LLM 翻译与 Solver 校验的架构图、`01:55:00` 多采样逻辑等价聚类图、`01:55:40` 语义熵分流决策图）；且演讲中展示的所有方法论、示例、SMT 公式与流程图，均已在上述 [Kiro 官方长文](https://kiro.dev/blog/deep-spec-analysis/) 中以高清图文形式完整公开。

### 1.2 演讲与 Slides 中的理论与实证引用溯源

演讲与 Kiro 官方文章中引用了多组震撼性的量化结论。下面将每一组关键数据完整溯源到其原始学术论文或工业实证出处：

| 演讲 / Slides 中的核心论断 | 原始论文 / 实证出处 | 核心发现与工程含义 |
| ----- | ----- | ----- |
| **模糊、矛盾或不完整的 Prompt 会导致代码生成 Pass@1 下降 20–40%，且 60–90% 语法合法的代码语义上是错的** | **Larbi et al. (2025)**，[*When Prompts Go Wrong: Evaluating Code Model Robustness to Ambiguous, Contradictory, and Incomplete Task Descriptions*](https://arxiv.org/html/2507.20439)（arXiv:2507.20439，见 [Kiro 博客引用](https://kiro.dev/blog/deep-spec-analysis/)） | 将清晰任务描述变异为含歧义、冲突或缺口的描述后，模型生成的代码往往“能编译、能跑通”，但实际行为与作者意图背道而驰。 |
| **欠定义（Underspecified）Prompt 在切换模型或微调提示词时，回归风险约翻倍（2×），准确率跌幅有时超过 20%** | **Yang et al. (2025)**，*What Prompts Don't Say: Understanding and Managing Underspecification in LLM Prompts*（arXiv:2505.13360，见 [Kiro 博客引用](https://kiro.dev/blog/deep-spec-analysis/)） | LLM 会用自身隐式偏见默默填补规约空白；升级到新模型后，新模型用不同的隐式偏见填空，导致代码在测试全绿的情况下发生静默行为漂移。 |
| **LLM 自动形式化（Auto-formalization）在工业界存在能力边界：擅长分类与实体抽取，但直接生成完备形式化规约仍面临“隐式领域知识”挑战** | **Norheim et al. (2024)**（MIT & Airbus 联合研究），*Challenges in applying large language models to requirements engineering tasks*，*Design Science*, 10:e16（doi:10.1017/dsj.2024.8，见 [Kiro 博客引用](https://kiro.dev/blog/deep-spec-analysis/)） | 解释了为什么 AWS 不让 LLM 一步到位做端到端证明，而是将“隐式领域知识（需求暗物质）”显式化为背景公理，并保留人类最终裁决权。 |
| **结构化自然语言需求语法标准（EARS）** | **Mavin et al. (2009)**（Rolls-Royce），[*Easy Approach to Requirements Syntax (EARS)*](https://alistairmavin.com/ears/)（17th IEEE RE'09，见 [Wikipedia](https://en.wikipedia.org/wiki/Easy_Approach_to_Requirements_Syntax) 与 [Kiro 博客](https://kiro.dev/blog/deep-spec-analysis/)） | 用极少的固定句式关键词（`WHEN`、`WHILE`、`IF...THEN`、`WHERE`、`SHALL`）约束自然语言，使其天然具备映射到一阶逻辑蕴含式（`antecedent => consequent`）的骨架。 |
| **AWS 内部实证：约 60% 的初版需求在进入编码前需要精炼** | 行业媒体与技术综述引述 AWS Kiro 内测数据（见 [Specira 分析](https://www.specira.ai/blog/specs-are-the-problem) 与 [Stepto 2026 综述](https://stepto.net/blog/ai-formal-verification-vericoding-specifications-2026)） | 在 **35 个 AWS 内部项目、超过 1,400 条验收标准** 的评估中，约 **60%** 的初版需求在交给 Agent 实现前被检出缺陷并需精炼。 |
| **学术界同期独立印证：歧义导致不同运行/模型间的功能分叉** | [*Orchid Benchmark (2026)*](https://arxiv.org/html/2604.21505v3)（arXiv:2604.21505）与 [*ClarifyCodeBench (2026)*](https://arxiv.org/html/2607.00711v2)（arXiv:2607.00711） | 人类开发者会在编码中持续澄清，而 LLM 被迫在单次生成中做“隐式押注”，直接将需求歧义固化为架构债。 |

## 二、Before SMT vs. After SMT：规约写法与工作流的本质跃迁

在没有 SMT 的时代，哪怕团队引入了“Spec 驱动开发”，写出来的 `requirements.md` 也往往停留在“人类读起来好像没毛病，但机器执行必然翻车”的状态。

AWS 团队在 [Kiro 官方博客](https://kiro.dev/blog/deep-spec-analysis/) 中将需求 Bug 归纳为四大类，并基于数十年系统工程经验（如 INCOSE 指南）提出合格规约必须满足的五项通用属性：**可测试（Testable）、无实现细节（Solution-free）、无歧义（Unambiguous）、逻辑一致（Consistent）、状态完备（Complete）**。

### 2.1 没有 SMT 之前：Spec 是怎么写的？

以 Kiro 官方博客与演讲中经典的 **「删除房产（Delete Property）」** 与 **「电商订单处理（Order Processing）」** 为例，没有 SMT 校验的初版 Spec 通常长这样（即便套用了 EARS 模板）：

```markdown
### 初版 Spec（Before SMT —— 看似清晰，实则暗藏四大雷区）

**场景 A：删除房产（Delete Property）**
- AC1: WHEN a Property Owner initiates property deletion, THE Platform SHALL prompt for confirmation before proceeding.
- AC2: WHEN a Property Owner confirms deletion, THE Platform SHALL remove the Property record from the Platform.
- AC3: WHEN a Property is deleted, THE Platform SHALL display a confirmation message and redirect to the properties list.
- AC4: THE Platform SHALL implement soft deletion to retain Property records in the database for audit purposes while hiding them from the user interface.
- AC5: WHEN a Property Owner attempts to delete a Property that does not belong to their User Account, THE Platform SHALL deny the deletion and display an authorization error message.

**场景 B：电商订单（Order Processing）**
- R1: WHEN an order is submitted AND inventory is available, THE Order System SHALL fulfill the order.
- R2: WHEN an order is submitted AND inventory is not available, THE Order System SHALL place the order on backorder.
- R3: THE Order System SHALL NOT place any order on backorder.
- R4: WHEN an order is canceled, THE Order System SHALL refund all payments associated with the order.
- R5: WHILE an order is in a canceled-and-refunded state, THE Order System SHALL NOT fulfill the order.
```

单看任何一条，工程师都会觉得“写得挺规范”。但把它交给 Coding Agent 后，灾难必然发生：

1. **单句歧义（Ambiguity）**：AC2 的 `"remove the record"` 究竟是物理删除（Hard Delete）还是标记隐藏（Soft Delete）？
2. **跨句冲突（Inconsistency）**：AC2 暗示删除，AC4 要求数据库保留；R2 要求缺货时转 `backorder`，R3 又全局禁止 `backorder`；更隐蔽的是，如果一个已取消并退款的订单被重新提交（`order_submitted`），当有库存时 **R1 与 R5 冲突**，无库存时 **R2 与 R3 冲突**——无论库存状态如何，都不存在合法的实现路径！
3. **混杂实现细节与句式误用（Wrong Level of Detail）**：AC4 写了 `"implement soft deletion"` 和 `"in the database"`（越界规定了 *How* 而非可观测的 *What*）；AC5 描述的是错误路径，却用了正常流关键词 `WHEN` 而非错误流关键词 `IF...THEN`。
4. **状态覆盖缺口（Incompleteness）**：房产不存在怎么办？房产名下还有未到期租约怎么办？用户点取消确认怎么办？订单既没提交也没取消处于空闲（Idle）状态时系统该干什么？

### 2.2 引入 SMT 之后：Spec 怎么写？工作流怎么变？

引入 SMT 并不是让产品经理或开发工程师去手写晦涩的数理逻辑公式。在 AWS Kiro 的实践中，**人类依然只读写自然语言（EARS 规约），SMT 形式化完全隐藏在后台**，但 Spec 的**结构形态**与**编写工作流**发生了根本变化：

1. **写法规范化（Refinement 后的 Spec）**：
   * 剔除所有“论点式废话”（如“系统应支持鉴权”）与“实现处方”（如“使用数据库软删字段”），全部改写为**输入、状态、触发事件与可观测输出一一对应**的 EARS 句式。
   * 严格区分正常路径（`WHEN`）、状态持续（`WHILE`）、全局约束（`THE ... SHALL`）与异常错误路径（`IF ... THEN`）。
   * 显式补齐反推出来的异常分支（例如房产不存在、存在活跃租约、取消确认弹窗）。
2. **增加“后台三件套”（由系统自动维护，对人透明或可选审计）**：
   * **Formal Schema（符号表）**：显式声明实体、属性、事件、输入与输出变量，每个符号绑定自然语言溯源说明。
   * **Rule Assertions（规则蕴含断言）**：每条 EARS 语句精准对应一条逻辑蕴含式 `antecedent => consequent`。
   * **Background Axioms（隐式领域公理）**：显式写下人类默认常识（例如 `duration >= 0`、“未提交的订单不能被取消”、“同一房产不能同时有两个活跃所有者”），避免求解器在现实中不可能的状态里误报。
3. **交互形态改变：从“写完就生成代码”变成“先答完几道 A/B 二选一澄清题”**：
   * SMT 发现的任何冲突、歧义、缺口或意外场景，都不会吐出一堆数学报错，而是翻译成极简的**二选一自然语言问题**：**选项 A 永远表示“保持现状”，选项 B 永远表示“按具体建议修改规约”**。

下面是上节同一套「删除房产」与「电商订单」规约，经过 **Refinement + SMT 逻辑校验 + 人类回答 A/B 澄清题** 之后的完整改造版 Spec（其中场景 A 严格对应 [Kiro 官方博客](https://kiro.dev/blog/deep-spec-analysis/) 给出的 8 条精炼验收标准；场景 B 展示了消除 `{R2, R3}` 冲突、`{R1, R5}` 条件冲突与 `Idle` 状态缺口并补全隐式领域公理后的无冲突版本）：

```markdown
### 改造后 Spec（After SMT —— 可测试、无实现泄漏、逻辑自洽且状态完备）

**场景 A：删除房产（Delete Property）**
- AC1 [UNCHANGED]: WHEN a Property Owner initiates property deletion, THE Platform SHALL prompt for confirmation before proceeding.
- AC2 [AMENDED - 消除"remove"歧义与AC4冲突]: WHEN a Property Owner confirms deletion, THE Platform SHALL mark the Property record as deleted such that it is no longer visible in any user-facing view.
- AC3 [UNCHANGED]: WHEN a Property is deleted, THE Platform SHALL display a confirmation message and redirect to the properties list.
- AC4 [AMENDED - 剥离"soft deletion/database"实现细节]: WHEN a Property record is marked as deleted, THE Platform SHALL retain the record for admin/audit access while excluding it from all user-facing views.
- AC5 [AMENDED - 异常流改用 IF-THEN 模式]: IF the Property does not belong to the requesting Property Owner's User Account, THEN THE Platform SHALL reject the deletion and display an authorization error.
- AC6 [ADDED - 补齐业务前置缺口]: IF the Property has active leases, THEN THE Platform SHALL reject the deletion and indicate active leases exist.
- AC7 [ADDED - 补齐异常输入缺口]: IF the Property does not exist, THEN THE Platform SHALL display a not-found error.
- AC8 [ADDED - 补齐取消分支缺口]: WHEN a Property Owner cancels the confirmation prompt, THE Platform SHALL abort deletion and return to the previous view.

**场景 B：电商订单（Order Processing，经人类回答 SMT A/B 澄清题后修订）**
- R1 [AMENDED - 限定前置状态，消除与 R5 的条件冲突]: WHEN an order in Pending state is submitted AND inventory is available, THE Order System SHALL transition the order to Fulfilled and fulfill the order.
- R2 [AMENDED - 人类在 R2/R3 冲突中裁决“禁止缺货延期，改为拒绝”]: WHEN an order in Pending state is submitted AND inventory is not available, THE Order System SHALL reject the submission and notify the customer of insufficient inventory.
- R3 [KEPT - 全局不变量与 R2 彻底一致]: THE Order System SHALL NOT place any order on backorder.
- R4 [AMENDED - 明确可取消的前提状态]: WHEN an order in Pending or Fulfilled state is canceled, THE Order System SHALL transition the order to Canceled and refund all payments associated with the order.
- R5 [AMENDED - 明确已取消退款订单拒绝重新提交]: IF a submission is attempted WHILE an order is in a Canceled-and-refunded state, THEN THE Order System SHALL reject the submission and SHALL NOT fulfill the order.
- R6 [ADDED - 填补 Idle 覆盖缺口]: WHILE an order is in Idle state with no submit or cancel event, THE Order System SHALL keep the order unchanged in Idle state without emitting fulfillment or refund actions.

**后台自动维护的隐式领域公理（Background Axioms，对人类透明或可审计）**
- Axiom 1: An order has exactly one mutually exclusive state in {Idle, Pending, Fulfilled, Canceled}.
- Axiom 2: An order cannot be canceled before it has been created/submitted.
- Axiom 3: A payment that has already been refunded cannot be refunded a second time.
```

对比前后的差异一目了然：初版 Spec 里的 5 条房产规则和 5 条订单规则，看似简洁，实则把至少 6 个关键业务决策静默甩给了 Coding Agent 去猜；而改造后的 Spec 每一条都满足“输入/状态/事件 → 可观测输出”的一一映射，且所有冲突核（`{R2, R3}`、`{R1, R5}`）和未定义状态（`Idle`、无租约检查、记录不存在）都在写第一行代码前被彻底焊死。

| 对比维度 | 没有 SMT 之前（传统 SDD） | 引入 SMT 之后（Neuro-Symbolic SDD） |
| ----- | ----- | ----- |
| **Spec 核心形态** | 散文或松散 Markdown / 初版 EARS，常夹杂实现细节与隐含假设 | 精炼后的可测试 EARS + 后台自动维护的 SMT-LIB Schema、蕴含断言与领域公理 |
| **缺陷发现时机** | 写完代码、跑完集成测试甚至上线产生回归后（修复成本最高） | 写第一行代码之前、Design 阶段之前（纯文本改写，几乎零成本） |
| **处理歧义的方式** | Coding Agent 凭概率隐式“猜一个”并静默写进代码 | 多次采样 + 逻辑等价聚类算出语义熵，生成 A/B 二选一问题迫使人类拍板 |
| **多规则交互校验** | 依赖人工 Code Review / Design Review 肉眼扫查，跨 5 条以上规则极易漏检 | SMT 求解器穷举组合空间，自动给出最小冲突规则集（UNSAT Core）与覆盖缺口反例 |
| **人机职责边界** | 人类写模糊文档，LLM 既当翻译又当裁判又当码农 | **LLM 负责翻译与精炼，Solver 负责数学校验，人类负责业务意图拍板** |

## 三、架构师视角彻底搞懂：SMT 是怎么工作的？

很多工程团队听说“形式化验证 / SMT”就望而却步。其实从软件工程视角看，SMT 求解器的核心机制非常干净清晰。

### 3.1 从 SAT 到 SMT：为什么布尔逻辑不够用？

* **SAT（Boolean Satisfiability，布尔可满足性）**：给一个由布尔变量（`true`/`false`）与逻辑连接词（`AND`、`OR`、`NOT`）组成的公式，问：**是否存在一组变量赋值，让整个公式为真？** 如果存在，返回 `sat` 并给出一组具体赋值（称为 **Model / 见证解**）；如果无论怎么赋值都不可能为真，返回 `unsat`（不可满足）。
* **SMT（Satisfiability Modulo Theories，可满足性模理论）**：真实业务规约里不仅有布尔开关，还有**整数/实数算术**（如 `balance >= withdraw_amount`）、**枚举与代数数据类型**（如订单状态 `Pending | Submitted | Canceled`）、**字符串**、**数组/集合**与**位向量**。SMT 就是在 SAT 之上挂载了多个“一阶逻辑理论求解器（Theory Solvers）”，让机器能同时推理布尔逻辑与业务数据结构。

### 3.2 SMT 求解器内部如何运转：DPLL(T) / CDCL(T)

现代工业级 SMT 求解器（如微软的 [Z3](https://github.com/z3prover/z3) 与斯坦福/爱荷华大学的 [cvc5](https://github.com/cvc5/cvc5)）底层普遍采用 **CDCL(T)**（冲突驱动子句学习 + 理论求解器协同）架构，可以理解为“**逻辑调度员 + 专科医生**”的双层循环：

1. **布尔抽象（Boolean Abstraction）**：把所有算术/枚举原子条件替换成布尔占位符（例如把 `inventory > 0` 记作布尔变量 $p_1$，`order_state == Canceled` 记作 $p_2$）。
2. **SAT 内核搜索与传播**：SAT 引擎尝试为这些布尔变量分配真假值，使其满足整体逻辑骨架。
3. **理论求解器验算（Theory Solver Check）**：把 SAT 引擎选出的真值组合交回对应的领域理论求解器检查（例如算术求解器会发现 $x > 5$ 和 $x < 3$ 不能同时为真）。
4. **冲突学习与回溯（Conflict-Driven Clause Learning）**：一旦理论求解器发现矛盾，它就提炼出一条新的排斥子句（Learned Clause）塞回 SAT 引擎，剪掉整个无效搜索分支，直到找到合法解（`sat`）或证明彻底无解（`unsat`）。

在 Spec 分析中，SMT 求解器最值钱的三大能力恰好对应工程痛点：

* **查冲突（Consistency）**：把所有规则合取（`R1 ∧ R2 ∧ ... ∧ Rn`）再加上“某条规则的前置条件被触发”，问求解器是否 `sat`。如果返回 `unsat`，说明规则集自相矛盾；开启 `produce-unsat-cores` 后，求解器能直接定位出**最小冲突规则子集**（如 `{R2, R3}` 或 `{R1, R5}`）。
* **查缺口（Completeness）**：问求解器“是否存在一种输入/状态组合，使得**所有**业务规则的前置条件同时为假（`¬ant(R1) ∧ ¬ant(R2) ∧ ...`）？”如果返回 `sat`，求解器吐出的那组 Model（如 `order_submitted=false, order_canceled=false`）就是活生生的**未定义状态反例（Idle Order）**！
* **查等价（Logical Equivalence）**：给定 LLM 翻译出的两个公式 $F_1$ 和 $F_2$，要判断它们在所有输入下是否完全等价，只需向求解器询问 `F1 ≠ F2` 是否可满足。如果返回 **`unsat`**，数学上即严格证明 $F_1 \equiv F_2$；如果返回 **`sat`**，求解器直接给出**语义差异反例（Semantic Diff）**——即精准指出在什么具体场景下两个理解会产生不同行为！

### 3.3 AWS Kiro 三阶段神经符号管线与“语义熵聚类”

仅仅把自然语言丢给 LLM 翻译一次再交给 SMT，有一个致命漏洞：**如果原句本身有歧义，LLM 可能会默默挑一种自洽的解释翻译成 SMT，求解器检查完告诉你“逻辑一致”，但其实丢掉了另一种完全合法的业务解释。**

Rajath Kotyal 在演讲（`01:55:00–01:55:40`）与 [Kiro 官方博客](https://kiro.dev/blog/deep-spec-analysis/) 中最惊艳的创新，正是**把 LLM 的非确定性（Nondeterminism）变废为宝，改造成“歧义探测器”**：

1. **Stage 1：逆向溯因精炼（Refinement）**
   * 利用 LLM 的语境理解力，从 User Story 的成功态反向推导：要到达成功态需要什么前置条件？哪些异常会阻断它？自动改写 Thesis-level 句子、剔除实现细节、纠正 EARS 模式误用并补全显而易见的异常路径。
2. **Stage 2：多采样自动形式化 + 逻辑等价聚类（Auto-formalization & Semantic Entropy Clustering）**
   * 对同一条 EARS 需求，让 LLM 独立翻译 **7–10 次**生成候选 SMT-LIB2 公式。
   * **关键一步**：不是按文本字面相似度聚类（变量名不同、合取顺序不同但含义完全相同的公式应归为一类），而是调用 **SMT 求解器两两判定逻辑等价**，将所有输入下行为完全一致的公式聚成同一个语义簇（Semantic Cluster）。
   * 计算跨簇分布的**语义熵（Semantic Entropy）**，并按两个阈值分流：
     * **低于 `low_entropy`**：模型高度一致，直接采纳最大簇代表作为权威形式化结果。
     * **高于 `high_entropy`**：模型发散严重、大概率在幻觉，系统拒答（Abstain）并要求重写该条需求。
     * **介于两者之间（中熵）**：说明原句存在 2 个以上稳健但互斥的合理读法（典型如 `"remove the record"` 的硬删 vs 软删）。系统用 SMT 算出前两大簇的 **Semantic Diff（语义差异反例）**，再翻译回人类可读的 **A/B 二选一澄清题**。
3. **Stage 3：逻辑分析与场景模拟（Logical Analysis & Scenario Simulation）**
   * 在确认无歧义的形式化模型上，执行冲突检测（含多规则 Case Split 条件冲突）、覆盖缺口检测。
   * 进一步从模型中采样 **Accepted Scenarios（规约允许的行为）** 与 **Rejected Scenarios（规约禁止的行为）**——相当于“在写代码前模拟运行 Spec”。为了不让海量场景淹没开发者，系统引入 **LLM Judge** 评估每个场景结合 User Story 是否“令人意外（Surprising）”，只把最反直觉的场景推送给人类确认。

> **重要边界提醒**：Rajath Kotyal 在演讲结尾非常坦诚地强调——**除了人类自己，没有任何自动化的“规约正确性神谕（Oracle）”**。一份在数学上 100% 一致且完备的 Spec，依然可能描述了一个完全错误的产品；且隐式领域知识（“需求暗物质”）的提取目前仍是前沿难题。SMT 的价值在于把可自动化的逻辑检错做到极致，把最关键的少数业务拍板留给人类。

## 四、开源生态清单与可直接运行的 SMT-LIB2 / Python Z3 样例

### 4.1 GitHub 开源生态与参考样例工程

虽然 Kiro IDE 内置的 Requirements Analysis 引擎本身是商业产品特性，但其底层的标准、求解器以及 AWS 官方配套的神经符号自动推理工程已有非常丰富的开源项目可直接学习与集成：

| 开源项目 / 仓库 | 维护方 | 定位与对工程落地的价值 |
| ----- | ----- | ----- |
| [**Z3Prover/z3**](https://github.com/z3prover/z3) | Microsoft Research | 工业界事实标准的开源 SMT 求解器（MIT 协议），支持 SMT-LIB2，提供 Python（`pip install z3-solver`）、TypeScript/WebAssembly（npm `z3-solver`）与 C++/Java 绑定。 |
| [**cvc5/cvc5**](https://github.com/cvc5/cvc5) | Stanford / U. of Iowa | 新一代开源 SMT 求解器，在字符串理论、序列与代数数据类型推理方面表现优异，支持独立二进制与多语言绑定（如 [`cvc5/cvc5-rs`](https://github.com/cvc5/cvc5-rs)）。 |
| [**aws-samples/sample-automated-reasoning-formalization (ARchitect)**](https://github.com/aws-samples/sample-automated-reasoning-formalization) | AWS Samples | AWS 官方开源桌面样例应用：利用 Kiro CLI 与 Bedrock Automated Reasoning 控制面 API，帮助非技术领域专家将自然语言文档形式化为逻辑策略并执行测试验证。 |
| [**aws-samples/amazon-bedrock-samples (`automated-reasoning-rewriting-chatbot`)**](https://github.com/aws-samples/amazon-bedrock-samples/blob/main/responsible_ai/automated-reasoning-rewriting-chatbot/README.md) | AWS Samples | AWS 官方开源的“LLM 生成 + 自动推理反馈 + 迭代重写”闭环样例（Python Flask + React），并生成可数学验证的审计日志。 |
| [**cedar-policy/cedar-spec**](https://github.com/cedar-policy/cedar-spec) | AWS | AWS 开源授权策略语言 Cedar 的形式化定义与证明工程（含 Lean 形式化、差分测试与属性测试生成器），是策略类 DSL 形式化的典范。 |
| [**model-checking/kani**](https://github.com/model-checking/kani) | AWS | AWS 开源的 Rust 位精确模型检查器（演讲者 Rajath Kotyal 深度参与维护），展示如何把形式化验证无缝集成进日常语言工具链与 CI。 |
| [**dafny-lang/dafny**](https://github.com/dafny-lang/dafny) | Microsoft / AWS 社区 | 验证感知编程语言，将前置条件/后置条件/不变量直接编译为 SMT-LIB 交由 Z3 证明，并可编译输出 Go/Python/Java/C#/JS 代码。 |

### 4.2 样例片段 1：原生 SMT-LIB2 复现演讲中的电商订单冲突与缺口

将下面保存为 `order_spec.smt2`，在本地执行 `z3 order_spec.smt2`（或 `cvc5 order_spec.smt2`）即可直接复现 Kiro 演讲与博客中的全部三种逻辑分析结果：

```lisp
; order_spec.smt2 —— 复现 AWS Kiro 演讲中的 5 条订单规约分析
(set-option :produce-unsat-cores true)
(set-logic QF_DT) ; 使用带代数数据类型的无量词逻辑

; 1. Schema 声明（事件、状态、输出）
(declare-datatypes () ((OrderState Idle Submitted Canceled)))

(declare-const order_submitted Bool)
(declare-const order_canceled Bool)
(declare-const inventory_available Bool)
(declare-const order_state OrderState)

(declare-const order_fulfilled Bool)
(declare-const order_backordered Bool)
(declare-const payments_refunded Bool)

; 2. 规则蕴含断言（使用 :named 命名以便提取最小冲突核 UNSAT Core）
; R1: WHEN submitted AND inventory_available => fulfill
(assert (! (=> (and order_submitted inventory_available) order_fulfilled) :named R1))
; R2: WHEN submitted AND NOT inventory_available => backorder
(assert (! (=> (and order_submitted (not inventory_available)) order_backordered) :named R2))
; R3: SHALL NOT place any order on backorder
(assert (! (not order_backordered) :named R3))
; R4: WHEN canceled => refund all payments
(assert (! (=> order_canceled payments_refunded) :named R4))
; R5: WHILE canceled-and-refunded => SHALL NOT fulfill
(assert (! (=> (and (= order_state Canceled) payments_refunded) (not order_fulfilled)) :named R5))

; --- 检查 A：直接冲突（触发 R2 前置条件）---
(push)
(assert (and order_submitted (not inventory_available)))
(check-sat)        ; 输出: unsat
(get-unsat-core)   ; 输出最小冲突规则集: (R2 R3)
(pop)

; --- 检查 B：条件冲突（已取消且已退款的订单被重新提交，跨库存状态分情况讨论）---
(push)
(assert (and (= order_state Canceled) payments_refunded order_submitted))
(check-sat)        ; 输出: unsat（无论 inventory_available 为真或假，都会撞上 {R1,R5} 或 {R2,R3}）
(get-unsat-core)   ; 输出冲突核
(pop)

; --- 检查 C：覆盖缺口（是否存在没有任何触发型规则命中的输入/状态组合？）---
(push)
(assert (not (and order_submitted inventory_available)))              ; not R1 antecedent
(assert (not (and order_submitted (not inventory_available))))        ; not R2 antecedent
(assert (not order_canceled))                                        ; not R4 antecedent
(assert (not (and (= order_state Canceled) payments_refunded)))      ; not R5 antecedent
(check-sat)        ; 输出: sat（证明存在覆盖缺口！）
(get-model)        ; 输出具体反例，例如 order_state = Idle, order_submitted = false, order_canceled = false
(pop)
```

### 4.3 样例片段 2：Python `z3-solver` 复现“多采样逻辑等价聚类与语义差异探测”

下面这段 60 行左右的 Python 代码，直接还原了演讲中最核心的 **“用 SMT 求解器聚类 LLM 的多次翻译，把单句歧义转化为精准 A/B 澄清题”** 的底层引擎（本地安装 `pip install z3-solver` 即可运行）：

```python
import math
from z3 import Bool, And, Not, Solver, sat, unsat

# 声明房产删除规约的共享 Schema 变量
confirmed = Bool("owner_confirmed_deletion")
record_exists_in_db = Bool("record_exists_in_db")
visible_to_user = Bool("visible_to_user")
visible_to_admin = Bool("visible_to_admin")

# 模拟 LLM 对 "WHEN Owner confirms deletion, Platform SHALL remove the record" 的 6 次采样翻译：
# 注意：表面语法写法不同（如用 De Morgan 律或顺序不同），但语义上其实只有“硬删除”与“软删除”两簇
samples = [
    ("sample_1", And(confirmed, Not(record_exists_in_db), Not(visible_to_user), Not(visible_to_admin))),
    ("sample_2", And(Not(visible_to_admin), Not(visible_to_user), Not(record_exists_in_db), confirmed)),
    ("sample_3", And(confirmed, record_exists_in_db, Not(visible_to_user), visible_to_admin)),
    ("sample_4", And(confirmed, Not(visible_to_user), record_exists_in_db, visible_to_admin)),
    ("sample_5", And(confirmed, Not(record_exists_in_db), Not(visible_to_user), Not(visible_to_admin))),
    ("sample_6", And(visible_to_admin, record_exists_in_db, Not(visible_to_user), confirmed)),
]

def are_logically_equivalent(f1, f2) -> bool:
    """用 Z3 严格判断两个公式是否在所有输入下完全等价"""
    s = Solver()
    s.add(f1 != f2)
    return s.check() == unsat

def semantic_diff_witness(f1, f2):
    """提取两个不等价簇的分歧见证反例（用于生成自然语言 A/B 澄清题）"""
    s = Solver()
    s.add(f1 != f2)
    if s.check() == sat:
        return s.model()
    return None

# 1. 基于逻辑等价性进行语义聚类
clusters = []
for name, formula in samples:
    placed = False
    for cluster in clusters:
        if are_logically_equivalent(cluster[0][1], formula):
            cluster.append((name, formula))
            placed = True
            break
    if not placed:
        clusters.append([(name, formula)])

# 2. 计算语义熵（Semantic Entropy）
total = len(samples)
entropy = -sum((len(c) / total) * math.log2(len(c) / total) for c in clusters)
print(f"聚类数量: {len(clusters)} | 语义熵 H = {entropy:.3f} bits")
for idx, c in enumerate(clusters, 1):
    print(f"  簇 {idx} ({len(c)}/{total}): {[item[0] for item in c]}")

# 3. 命中中熵区间 -> 计算前两大簇的语义分歧反例
if len(clusters) >= 2:
    clusters.sort(key=len, reverse=True)
    witness = semantic_diff_witness(clusters[0][0][1], clusters[1][0][1])
    print("\n检测到真实语义歧义！SMT 构造的分歧反例（Semantic Diff）：")
    print(witness)
    # 输出示例表明：在 confirmed=True 时，两簇在 record_exists_in_db 与 visible_to_admin 上取值相反
    # 上层 LLM 据此自动生成 A/B 二选一问题交给人类拍板！
```

## 五、对 `co-arising`（`truthsrc`）整个实践的四大深度补充

把 AWS Kiro Specification Analyzer 放到 **`co-arising`（`truthsrc`）** 的架构坐标系里审视，会发现一个极其振奋的结论：**`co-arising` 实际上站在比纯自然语言 SDD 更高、更适合嫁接 SMT 求解器的起点上！**

在 `co-arising` 的现有流水线中：

* **确定性 Toolchain** 负责：`truthsrc` 单行微语法 & M1/M2/M3 宏展开 → Canonical JSON 编译 → Neo4j/SQLite 知识图谱 → 确定性 AST/拓扑校验器（如检查孤儿领域事件、跨限界上下文引用、缺失 Saga 补偿）→ Context Pack 切片 → Scala/Akka（Event Sourcing + CQRS + Saga）确定性骨架生成 → `@CoArisingNode` 双向锚定与 `PreToolUse`/`Stop (exit 2)` 硬门禁。
* **认知层 Skills / Subagents** 负责：`domain-interview`（苏格拉底式反向访谈）、`cloze-fill`（填空区实现）、`brownfield-miner`、`contract-reviewer`。

对比 AWS 的实践，`co-arising` 已经漂亮地解决了 **“架构漂移、拓扑断链与上下文退化”**，但在 **“业务谓词的逻辑自洽性与需求暗物质显式化”** 上存在一块高价值空白。以下是四大可直接落地的补充方向：

### 补充一：给确定性 Toolchain 补上“逻辑校验层”——`truthsrc-smt` 编译器后端

* **当前盲区**：`co-arising` 现有的确定性校验器停留在**语法与拓扑结构层**（能查出“某个事件没人监听”或“Saga 少了补偿步骤”，但查不出两条 `Guard` 谓词互相打架、或者某条分支永远不可能被触发）。
* **先天优势**：AWS Kiro 必须花很大力气用 LLM 把散文/EARS 翻译成 SMT Schema，因此不可避免地承受翻译幻觉成本；而 `truthsrc` 本身就是高度结构化的领域真值树微语法，天然具备 `Qualified Ref`、`Guard`、`Binding`、`Fold`、`Parameter`！这意味着 **`truthsrc` AST 到 SMT-LIB2 / Z3 的映射在很大程度上是确定性编译（Deterministic Compilation），而非概率性翻译！**
* **落地收益**：在 `metarch-truthsrc` 编译器中新增一个静态分析 Pass（放入确定性 Toolchain 与 `Stop` Hook）：
  1. **死分支检测（Dead Guard）**：检查是否存在 `Guard` 与领域公理合取后为 `unsat`（永假条件）。
  2. **同触发器规则冲突（Rule Conflict）**：当同一命令或事件触发多条状态转移/策略分支时，检查其 `Guard` 交集是否可满足且输出/效应互斥，直接报出 **UNSAT Core**。
  3. **状态覆盖缺口（State Coverage Gap）**：对聚合根（Aggregate）的状态枚举与关键属性，检查 `¬Guard_1 ∧ ¬Guard_2 ∧ ...` 是否 `sat`，把未覆盖的合法状态组合暴露在生成 Scala/Akka 代码之前。

### 补充二：把“语义熵聚类 + A/B 澄清题”植入 `domain-interview` Skill，显式沉淀“领域公理区”

* **当前盲区**：在 `co-arising` 的架构边界中，`domain-interview` 属于模糊认知层 Skill，目前依赖 LLM 的提示词工程进行苏格拉底式追问，容易出现“该问的漏问、不该问的问一堆”。
* **AWS 启发与升级方案**：
  1. 当用户用自然语言向 `domain-interview` 阐述复杂业务规则（例如 `bank batch transfer` 的部分失败退款规则、或 `fab simulation` 的设备调度优先级）时，在生成 `truthsrc` 之前，对关键业务句执行 **5–7 次低成本采样形式化 + Z3 等价聚类**。
  2. 只对**中熵分叉点**（确实存在 2 种以上互斥解释）和 **SMT 模拟出的意外场景（Surprising Accepted/Rejected Scenarios）** 向人类发起 **A/B 二选一确认**，把访谈信噪比拉满。
  3. **攻克 AWS 提到的“需求暗物质（Implicit Domain Knowledge）”**：在 `truthsrc` 语法中引入显式的 **`Axiom` / `Invariant` 块**（例如“批量转账总额恒等于明细之和”、“已冲正交易不可二次冲正”），让 `domain-interview` 访谈挖掘出的隐式业务常识不再散落在聊天记录里，而是作为一等公民写入 `truthsrc` 并持久参与后续所有版本的 SMT 回归证明。

### 补充三：用 SMT 反例模型（Model）驱动 `Given-When-Then` 测试与填空区验收

* **当前盲区**：在 `co-arising` 的 `cloze-fill` 阶段，AI Agent 在受控手写区实现业务逻辑，需要高质量的测试来卡住语义正确性。纯靠 LLM 写单元测试容易只测 Happy Path，漏掉边界组合。
* **落地收益**：SMT 求解器在检查 `Accepted Scenarios`、`Rejected Scenarios` 以及每条 `Guard` 的边界条件时，返回的 `get-model` 本身就是**满足数学约束的精确输入数据向量**。
* 可以直接由 Toolchain 把这些 SMT 求解出的具体见证解，确定性地渲染为 Scala/Akka Event Sourcing 的 **`Given`（历史事件序列 / 聚合状态）→ `When`（触发命令与参数）→ `Then`（预期产出事件或拒绝异常）** 测试骨架！这样 `contract-reviewer` 和 CI 测试就能把 `cloze-fill` 关进数学级的验收笼子里。

### 补充四：把 Saga 补偿与跨聚合不变量纳入有界模型检验（Bounded Model Checking）

* **结合 `co-arising` 独特基因**：AWS Kiro 目前的 Requirements Analysis 主要聚焦在单份 `requirements.md` 的静态逻辑一致性；而 `co-arising` 的核心护城河在于 **Event Sourcing + CQRS + Saga（后向补偿）/ Monarch（前向恢复）** 构成的分布式领域行为编排。
* **高阶演进方向**：针对 `bank-wealth-demo` 及规划中的 `bank batch transfer`、`fab simulation` 等高复杂度场景，可以将 `truthsrc` 中的 Saga 状态机展开为有限步长（$k$ 步）的 SMT 转移系统：
  * 自动验证：**“如果在第 $i$ 步发生超时或下游拒绝并触发补偿链路，最终所有参与聚合的资金/库存不变量是否依然成立（无资金凭空增减、无资源死锁）？”**
  * 一旦验证返回反例，SMT 会直接给出一份精确到第几步失败的**故障复现轨迹**，在写第一行分布式协调代码前就把最难排查的并发与补偿 Bug 扼杀在摇篮里。

## 结语：从“静态架构编译器”走向“神经符号领域验证引擎”

回顾整场演讲，AWS Automated Reasoning Group 给整个 AI Coding 行业上了一堂极具分量的工程课：**面对概率性的大模型，不能只靠更多自然语言 Prompt 去修补自然语言的漏洞，必须把确定性的数理逻辑引擎请回研发流水线的最前端。**

对于 `co-arising` 而言，这并非推翻重来，而是一次精准的“拼图合龙”：

* `truthsrc` 已经把业务语义压成了高密度的结构化微语法；
* 只需要在确定性 Toolchain 里接上 Z3/SMT-LIB2 的逻辑求解器，在 `domain-interview` Skill 里接上多采样等价聚类与 A/B 澄清机制，就能把 `co-arising` 从 **“防止架构漂移的认知编译器”** 进一步升级为 **“在写第一行代码前就能数学自证业务逻辑无冲突、无歧义、无缺口的领域行为验证引擎”**。
