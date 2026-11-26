# co-arising 2.0 长期架构蓝图：以 EARS 为唯一行为主干的端到端编译与 AI 隔离区 TDD 闭环

> **文档定位与演进声明**：本文是一份面向长期演进的 **v2 目标架构设计文档（Architecture Blueprint / ADR）**。当前公开的 [`co-arising`](https://co-arising.github.io/) v1 基线与 [`bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo) 演示站继续保持稳定可运行；在 v2 中，我们选择从第一性原理出发，彻底消除「双表达式引擎 + 有损 Lowering 翻译层」的历史债，让受控 EARS 1.0 成为贯穿**需求建模 → 数学论证 → `Canonical Model v2` → 确定性脚手架生成 → 隔离区 AI `@cloze` TDD** 的唯一行为主干。

<div class="co-kpi-strip" role="region" aria-label="co-arising 2.0 核心架构指标">
<div><div class="kpi-num">1 AST</div><div class="kpi-label">全链路唯一行为 IR（EARS IR），彻底淘汰旧表达式双轨与 Lowering 层</div></div>
<div><div class="kpi-num">5 + k</div><div class="kpi-label">SMT 五项体检 + k-步 BMC 硬闸门，未证毕不产出 Canonical Model</div></div>
<div><div class="kpi-num">80 / 20</div><div class="kpi-label">L1 规则零 Token 直接生成；L2/L3 与应用隔离区转入锁定预言机 TDD</div></div>
<div><div class="kpi-num red">exit 2</div><div class="kpi-label">PreToolUse + Stop Hooks 物理锁死生成区与测试预言机，防 AI 作弊</div></div>
</div>

## 一、为什么在 v2 彻底告别「双表达式引擎 + Lowering 翻译层」？

在 [`metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) v1（`0.5.0`）的演进过程中，我们已经证明了「结构化事件风暴真源树 → 类型化语义产品 → 确定性洋葱架构脚手架 → 双向代码回锚」的可行性；同时在 [co-arising EARS 1.0 技术规格说明书](https://co-arising.github.io/zh/articles/co-arising-ears-spec-20261123/) 中确立了受控 EARS 与 `SMT-LIB 2` 的单跳数学验证范式。

但当我们将 EARS 接入 v1 真实项目进行深度核对时，一个根本性的架构张力浮现出来：**v1 原有的切片守卫表达式语言（`expressions.mjs` v4 + `.slice.yaml` 中的转义字符串 `@guard`）与 EARS 1.0 并不处于同一表达平面**：

| 维度 | v1 原表达式语言（`domain-decision@4` / `@guard`） | `co-arising 2.0` 原生 EARS 1.0 主干 |
|---|---|---|
| **作者体验与信噪比** | 单行 JSON 转义字符串（复杂规则动辄 400+ 字符），无命名谓词复用，业务专家无法直读 | 双语同构（EN 主标准 + CN 同构别名）、`where:` 正向肯定谓词复用，天然自动投影白话 AC 与决策表 |
| **全局与跨步不变量** | 仅支持单命令顺序短路守卫；缺乏全局公理（`ALWAYS`）、禁令（`SHALL NOT`）与跨命令时序安全性质 | 原生一等公民支持 `axioms: ALWAYS`、`SHALL / SHALL NOT` 冲突检测与 `k`-步有界模型检验（BMC） |
| **数学算子与理论分层** | 仅限加减与线性比较，不支持乘法 `*`（无法表达基金份额夹逼 `shares * nav <= netAmount`）与 FEEL 区间 `[min..max]` | 参照 [AWS Cedar](https://www.cedarpolicy.com/) 裁剪哲学按 `L1 (QF_AUFLIA)` / `L2 (QF_NIA + BMC)` / `L3 (extern)` 自动分流 |
| **原隔离区（`handwritten/`）覆盖度** | **盲区**：可信入站、重入防重扣、跨聚合编排、读模型视图隔离只能散落在自然语言说明里，无法进入编译器 | 用 `layer: application` 原生声明 `pin` / `dispatch` / `respond` / `expose` 契约，直接编译为锁定 BDD 预言机驱动 AI TDD |

如果我们为了“避免改动 v1 生成器”而强行在中间塞一层 **`EARS → 旧 @guard` 的 Lowering 编译器**，短期看似省事，长期却会陷入三倍维护地狱：系统永远背着**两套表达式 AST、两套类型检查器、一个有损翻译桥**，每给 EARS 新增一种高阶语义都会在旧 IR 上撞墙。

既然 v1 公开站点与参考演示已经能够稳定运行，**从长期第一性原理出发，最干净的选择就是：保持 v1 冻结稳定，在 v2 直接立新标——让 EARS 从头到尾贯通成为唯一行为 IR**。

<figure class="co-arch-fig">
<div class="arch-caption-head">FIGURE 01 · v1 过渡拼装 vs v2 EARS-NATIVE 单主干对比</div>
<svg viewBox="0 0 820 278" width="100%" role="img" aria-label="对比 v1 双表达式拼装架构与 v2 EARS-Native 单主干架构">
  <defs>
    <marker id="v1v2-arr-ink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-ink"/>
    </marker>
    <marker id="v1v2-arr-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-teal"/>
    </marker>
    <marker id="v1v2-arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-amber"/>
    </marker>
  </defs>
  <rect x="12" y="10" width="796" height="114" rx="4" class="arch-band-amber"/>
  <text x="26" y="31" class="arch-t-amber">v1 过渡拼装形态（保留历史兼容的代价：双 AST + 有损翻译 + 隔离区游离）</text>
  <rect x="26" y="44" width="150" height="64" rx="4" class="arch-card-amber"/>
  <text x="101" y="68" text-anchor="middle" class="arch-t-title">.slice.yaml @guard</text>
  <text x="101" y="88" text-anchor="middle" class="arch-t-sub">旧表达式 AST #1</text>
  <rect x="206" y="44" width="144" height="64" rx="4" class="arch-card-amber arch-dash"/>
  <text x="278" y="68" text-anchor="middle" class="arch-t-title">有损 Lowering 层</text>
  <text x="278" y="88" text-anchor="middle" class="arch-t-sub">EARS → 旧 guards v4</text>
  <rect x="380" y="44" width="156" height="64" rx="4" class="arch-card-amber"/>
  <text x="458" y="68" text-anchor="middle" class="arch-t-title">Canonical v1</text>
  <text x="458" y="88" text-anchor="middle" class="arch-t-sub">仅覆盖聚合 L1 守卫</text>
  <rect x="566" y="44" width="226" height="64" rx="4" class="arch-card-red arch-dash"/>
  <text x="679" y="68" text-anchor="middle" class="arch-t-red">handwritten/ 隔离区游离在外</text>
  <text x="679" y="88" text-anchor="middle" class="arch-t-sub">自然语言文档 · 无 SMT · 易漂移</text>
  <line x1="176" y1="76" x2="203" y2="76" class="arch-edge-amber" marker-end="url(#v1v2-arr-amber)"/>
  <line x1="350" y1="76" x2="377" y2="76" class="arch-edge-amber" marker-end="url(#v1v2-arr-amber)"/>
  <line x1="536" y1="76" x2="563" y2="76" class="arch-edge-amber" marker-end="url(#v1v2-arr-amber)"/>
  <rect x="12" y="142" width="796" height="124" rx="4" class="arch-band-teal"/>
  <text x="26" y="164" class="arch-t-band-teal">v2 EARS-NATIVE 单主干架构（零翻译损耗 · 数学闸门前置 · 领域与隔离区统一收口）</text>
  <rect x="26" y="178" width="154" height="72" rx="4" class="arch-card-teal"/>
  <text x="103" y="203" text-anchor="middle" class="arch-t-title">正交唯一真源</text>
  <text x="103" y="222" text-anchor="middle" class="arch-t-sub">YAML 结构 + EARS 行为</text>
  <text x="103" y="238" text-anchor="middle" class="arch-t-mono">全系统仅 1 套 AST</text>
  <rect x="206" y="178" width="158" height="72" rx="4" class="arch-card-teal"/>
  <text x="285" y="203" text-anchor="middle" class="arch-t-title">SMT 数学硬闸门</text>
  <text x="285" y="222" text-anchor="middle" class="arch-t-sub">Z3 / cvc5 五项 + k-BMC</text>
  <text x="285" y="238" text-anchor="middle" class="arch-t-teal">未全绿直接阻断</text>
  <rect x="390" y="178" width="176" height="72" rx="4" class="arch-card-dark"/>
  <text x="478" y="203" text-anchor="middle" class="arch-t-title-dark">Canonical Model v2</text>
  <text x="478" y="222" text-anchor="middle" class="arch-t-sub-dark">原生 EARS IR + TestIR</text>
  <text x="478" y="238" text-anchor="middle" class="arch-t-sub-dark">+ SQLite 依赖图谱</text>
  <rect x="592" y="178" width="200" height="72" rx="4" class="arch-card-teal"/>
  <text x="692" y="201" text-anchor="middle" class="arch-t-title">双通道确定性落地</text>
  <text x="692" y="220" text-anchor="middle" class="arch-t-teal">4A: L1 零 Token 生成骨架</text>
  <text x="692" y="238" text-anchor="middle" class="arch-t-red">4B: 隔离区锁定预言机 TDD</text>
  <line x1="180" y1="214" x2="203" y2="214" class="arch-edge-teal" marker-end="url(#v1v2-arr-teal)"/>
  <line x1="364" y1="214" x2="387" y2="214" class="arch-edge-teal" marker-end="url(#v1v2-arr-teal)"/>
  <line x1="566" y1="214" x2="589" y2="214" class="arch-edge-teal" marker-end="url(#v1v2-arr-teal)"/>
</svg>
<figcaption>图 1：放弃“强行兼容旧 @guard Lowering”后，v2 用一套统一的 EARS IR 直接贯通数学验证、Canonical Model v2、脚手架生成与隔离区 AI 完形填空。</figcaption>
</figure>

## 二、`co-arising 2.0` 全景架构流程图

下面这张完整流程图定义了 `co-arising 2.0` 的四个物理层次（**1. 正交唯一真源 → 2. 单一前端与 SMT 数学硬闸门 → 3. EARS-Native `Canonical Model v2` → 4A/4B 双通道落地**），以及贯穿全程的防漂移反馈闭环：

<figure class="co-arch-fig">
<div class="arch-caption-head">FIGURE 02 · CO-ARISING 2.0 END-TO-END ARCHITECTURE &amp; CONTROL FLOW</div>
<svg viewBox="0 0 820 970" width="100%" role="img" aria-label="co-arising 2.0 四层全景架构流程图：正交唯一真源、SMT数学验证闸门、Canonical Model v2 与双通道确定性生成和隔离区 AI Cloze TDD 闭环">
  <defs>
    <marker id="arr-ink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-ink"/>
    </marker>
    <marker id="arr-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-teal"/>
    </marker>
    <marker id="arr-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-red"/>
    </marker>
    <marker id="arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-amber"/>
    </marker>
  </defs>
  <rect x="14" y="12" width="792" height="148" rx="4" class="arch-band"/>
  <text x="28" y="34" class="arch-t-band">LAYER 1 · GIT 唯一作者真源（正交分离：结构归 YAML，行为归 EARS，无双写）</text>
  <rect x="28" y="48" width="234" height="96" rx="4" class="arch-card"/>
  <text x="145" y="72" text-anchor="middle" class="arch-t-title">结构真源（truth/*.yaml）</text>
  <text x="145" y="92" text-anchor="middle" class="arch-t-sub">VO / 精确小数（Money, scale）</text>
  <text x="145" y="110" text-anchor="middle" class="arch-t-sub">聚合状态初值 · 命令 / 事件签名</text>
  <text x="145" y="128" text-anchor="middle" class="arch-t-mono">Saga 拓扑 · ReadModel · 无 @guard</text>
  <rect x="284" y="48" width="320" height="96" rx="4" class="arch-card-teal"/>
  <text x="444" y="72" text-anchor="middle" class="arch-t-title">行为真源（truth/**/*.ears · EN/CN 同构）</text>
  <text x="444" y="92" text-anchor="middle" class="arch-t-sub">• layer: domain — 公理 · 规则 · post 折叠</text>
  <text x="444" y="110" text-anchor="middle" class="arch-t-sub">• layer: application — 原隔离区入站 / 编排 / 视图</text>
  <text x="444" y="128" text-anchor="middle" class="arch-t-teal">唯一行为编辑面 · 风格 A（缩进）与风格 C（块状）</text>
  <rect x="630" y="58" width="162" height="76" rx="4" class="arch-card-amber arch-dash"/>
  <text x="711" y="81" text-anchor="middle" class="arch-t-amber">创作辅助层（不入库）</text>
  <text x="711" y="100" text-anchor="middle" class="arch-t-sub">白话想法 / 事件风暴笔记</text>
  <text x="711" y="118" text-anchor="middle" class="arch-t-mono">允许 LLM 起草 · 人工合入</text>
  <line x1="630" y1="96" x2="608" y2="96" class="arch-edge-amber" marker-end="url(#arr-amber)"/>
  <path d="M 145 144 L 145 182 L 315 182 L 315 204" class="arch-edge" marker-end="url(#arr-ink)"/>
  <line x1="444" y1="144" x2="444" y2="204" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <rect x="14" y="190" width="792" height="222" rx="4" class="arch-band"/>
  <text x="28" y="212" class="arch-t-band">LAYER 2 · 单一前端编译、只读审阅投影与 SMT 数学论证硬闸门</text>
  <rect x="206" y="224" width="356" height="58" rx="4" class="arch-card-teal"/>
  <text x="384" y="246" text-anchor="middle" class="arch-t-title">唯一 EARS Parser + 单一符号与精确类型检查器</text>
  <text x="384" y="266" text-anchor="middle" class="arch-t-sub">正向肯定命名检查 · L1 / L2 / L3 自动分级 · 淘汰旧 expressions.mjs</text>
  <rect x="596" y="224" width="196" height="74" rx="4" class="arch-card arch-dash"/>
  <text x="694" y="245" text-anchor="middle" class="arch-t-title">单向只读审阅投影</text>
  <text x="694" y="264" text-anchor="middle" class="arch-t-sub">• 风格 E：PM 白话 AC (.md)</text>
  <text x="694" y="282" text-anchor="middle" class="arch-t-sub">• 风格 B：DMN 决策表 (.md)</text>
  <line x1="562" y1="253" x2="592" y2="253" class="arch-edge" marker-end="url(#arr-ink)"/>
  <rect x="206" y="302" width="356" height="58" rx="4" class="arch-card"/>
  <text x="384" y="324" text-anchor="middle" class="arch-t-title">SMT-LIB 2 单跳确定性编译 → Z3 / cvc5</text>
  <text x="384" y="344" text-anchor="middle" class="arch-t-sub">1.互斥冲突 · 2.逻辑缺口 · 3.不变式归纳 · 4.死规则 · 5.边界证人 + k-步 BMC</text>
  <line x1="384" y1="282" x2="384" y2="298" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <rect x="292" y="374" width="184" height="28" rx="14" class="arch-band-teal"/>
  <text x="384" y="392" text-anchor="middle" class="arch-t-teal">数学论证全绿通过？</text>
  <line x1="384" y1="360" x2="384" y2="371" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <rect x="28" y="302" width="152" height="96" rx="4" class="arch-card-red"/>
  <text x="104" y="325" text-anchor="middle" class="arch-t-red">未通过 → 物理阻断</text>
  <text x="104" y="345" text-anchor="middle" class="arch-t-title">A/B 需求澄清卡</text>
  <text x="104" y="364" text-anchor="middle" class="arch-t-sub">Z3 反例 + :named ID</text>
  <text x="104" y="382" text-anchor="middle" class="arch-t-mono">严禁进入下游生成</text>
  <path d="M 292 388 L 184 388" class="arch-edge-red" marker-end="url(#arr-red)"/>
  <path d="M 104 302 L 104 170 L 345 170 L 345 148" class="arch-edge-red" marker-end="url(#arr-red)"/>
  <text x="238" y="382" text-anchor="middle" class="arch-t-red">否（SAT 缺陷）</text>
  <line x1="384" y1="402" x2="384" y2="438" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <text x="456" y="424" text-anchor="middle" class="arch-t-teal">是（全绿 + 边界证人）</text>
  <rect x="14" y="442" width="792" height="106" rx="4" class="arch-card-dark"/>
  <text x="30" y="466" class="arch-t-title-dark">LAYER 3 · CANONICAL MODEL v2（EARS-NATIVE 单一中间产物 · 零 Lowering 损耗）</text>
  <rect x="30" y="480" width="176" height="52" rx="4" class="arch-pill-dark"/>
  <text x="118" y="502" text-anchor="middle" class="arch-t-title-dark">结构元模型</text>
  <text x="118" y="520" text-anchor="middle" class="arch-t-sub-dark">Types · State · Saga</text>
  <rect x="218" y="480" width="206" height="52" rx="4" class="arch-pill-dark"/>
  <text x="321" y="502" text-anchor="middle" class="arch-t-title-dark">原生 EARS IR v2</text>
  <text x="321" y="520" text-anchor="middle" class="arch-t-sub-dark">First-Hit · emit/post 折叠</text>
  <rect x="436" y="480" width="172" height="52" rx="4" class="arch-pill-dark"/>
  <text x="522" y="502" text-anchor="middle" class="arch-t-title-dark">已证毕 TestIR</text>
  <text x="522" y="520" text-anchor="middle" class="arch-t-sub-dark">Z3 边界证人 + BMC 轨迹</text>
  <rect x="620" y="480" width="172" height="52" rx="4" class="arch-pill-dark"/>
  <text x="706" y="502" text-anchor="middle" class="arch-t-title-dark">知识依赖图谱</text>
  <text x="706" y="520" text-anchor="middle" class="arch-t-sub-dark">knowledge.sqlite 缓存</text>
  <path d="M 220 548 L 220 572 L 195 572 L 195 596" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <text x="114" y="578" text-anchor="middle" class="arch-t-teal">domain L1 + 全量结构</text>
  <path d="M 560 548 L 560 572 L 585 572 L 585 596" class="arch-edge-red" marker-end="url(#arr-red)"/>
  <text x="692" y="578" text-anchor="middle" class="arch-t-red">L2/L3 + application 隔离区</text>
  <rect x="14" y="600" width="356" height="354" rx="4" class="arch-band-teal"/>
  <text x="28" y="622" class="arch-t-band-teal">CHANNEL 4A · 确定性零 TOKEN 生成（约 80%）</text>
  <rect x="30" y="636" width="324" height="78" rx="4" class="arch-card-teal"/>
  <text x="192" y="660" text-anchor="middle" class="arch-t-title">多语言确定性生成器插件</text>
  <text x="192" y="680" text-anchor="middle" class="arch-t-sub">Scala · TypeScript · Java · Rust · Go</text>
  <text x="192" y="698" text-anchor="middle" class="arch-t-mono">直接消费 EARS IR，零 LLM 介入</text>
  <line x1="192" y1="714" x2="192" y2="736" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <rect x="30" y="740" width="324" height="114" rx="4" class="arch-card"/>
  <text x="192" y="764" text-anchor="middle" class="arch-t-title">generated-scaffold/（只读锁定）</text>
  <text x="192" y="785" text-anchor="middle" class="arch-t-sub">• Aggregate Behavior + EventHandler</text>
  <text x="192" y="804" text-anchor="middle" class="arch-t-sub">• Protobuf / Codec / Saga Host / Pure Oracle</text>
  <text x="192" y="823" text-anchor="middle" class="arch-t-sub">• Port Traits + 预埋 @cloze 空槽骨架</text>
  <text x="192" y="842" text-anchor="middle" class="arch-t-mono">加盖 @generated 与 @ProvenanceId 锚点</text>
  <line x1="192" y1="854" x2="192" y2="876" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <rect x="30" y="880" width="324" height="58" rx="4" class="arch-card-teal"/>
  <text x="192" y="904" text-anchor="middle" class="arch-t-title">零漂移基础设施与 L1 领域核心</text>
  <text x="192" y="924" text-anchor="middle" class="arch-t-teal">每次改真源随时全量重算 · 永不手改</text>
  <path d="M 354 796 L 398 796 L 398 675 L 414 675" class="arch-edge-amber" marker-end="url(#arr-amber)"/>
  <rect x="394" y="600" width="412" height="354" rx="4" class="arch-band-red"/>
  <text x="408" y="622" class="arch-t-band-red">CHANNEL 4B · 原隔离区 AI @CLOZE TDD 闭环（约 20%）</text>
  <rect x="410" y="636" width="186" height="72" rx="4" class="arch-card-red"/>
  <text x="503" y="657" text-anchor="middle" class="arch-t-title">锁定可执行预言机</text>
  <text x="503" y="675" text-anchor="middle" class="arch-t-sub">.feature + *EarsSpec</text>
  <text x="503" y="694" text-anchor="middle" class="arch-t-mono">generated-tests/ SHA-256</text>
  <rect x="608" y="636" width="182" height="72" rx="4" class="arch-card"/>
  <text x="699" y="657" text-anchor="middle" class="arch-t-title">Sandwich Context Pack</text>
  <text x="699" y="675" text-anchor="middle" class="arch-t-sub">类型签名 + @caller 契约</text>
  <text x="699" y="694" text-anchor="middle" class="arch-t-mono">按依赖图裁剪 · 零 grep</text>
  <line x1="503" y1="708" x2="548" y2="736" class="arch-edge" marker-end="url(#arr-ink)"/>
  <line x1="699" y1="708" x2="650" y2="736" class="arch-edge" marker-end="url(#arr-ink)"/>
  <rect x="410" y="740" width="242" height="58" rx="4" class="arch-card-teal"/>
  <text x="531" y="762" text-anchor="middle" class="arch-t-title">AI Agent 单点 TDD 完形填空</text>
  <text x="531" y="782" text-anchor="middle" class="arch-t-sub">仅允许写 handwritten/ @cloze 槽内</text>
  <rect x="664" y="740" width="126" height="58" rx="4" class="arch-card-red"/>
  <text x="727" y="761" text-anchor="middle" class="arch-t-red">PreToolUse Hook</text>
  <text x="727" y="780" text-anchor="middle" class="arch-t-mono">越界写即 exit 2</text>
  <line x1="664" y1="769" x2="656" y2="769" class="arch-edge-red" marker-end="url(#arr-red)"/>
  <line x1="531" y1="798" x2="531" y2="816" class="arch-edge" marker-end="url(#arr-ink)"/>
  <rect x="410" y="820" width="380" height="52" rx="4" class="arch-card-red"/>
  <text x="600" y="841" text-anchor="middle" class="arch-t-title">Stop Hook 三连检（任一失败 exit 2 强制自愈）</text>
  <text x="600" y="860" text-anchor="middle" class="arch-t-sub">1. 测试 SHA-256 防篡改 · 2. 真跑 *EarsSpec · 3. AST 双向锚点对账</text>
  <path d="M 410 846 L 402 846 L 402 769 L 408 769" class="arch-edge-red" marker-end="url(#arr-red)"/>
  <line x1="600" y1="872" x2="600" y2="888" class="arch-edge-teal" marker-end="url(#arr-teal)"/>
  <rect x="410" y="892" width="380" height="48" rx="4" class="arch-card-teal"/>
  <text x="600" y="912" text-anchor="middle" class="arch-t-title">独立盲审 Subagent（contract-reviewer · skip style）</text>
  <text x="600" y="930" text-anchor="middle" class="arch-t-teal">防硬编码作弊 → 落盘分层 Provenance 证据并回锚图谱</text>
</svg>
<figcaption>图 2：co-arising 2.0 端到端控制流。实线青色表示通过数学验证的确定性正向数据流；红色虚线表示物理阻断与自愈回流（SMT 澄清卡、PreToolUse 越界拦截、Stop Hook 三连检回注）。</figcaption>
</figure>

## 三、正交唯一真源：结构归 YAML，行为归 EARS

v2 的第一条设计铁律是**正交分离（Orthogonal Separation）**——既不在 YAML 中藏匿业务逻辑字符串，也不把数据结构与传输编解码塞进 EARS：

| 关注面 | 唯一归属文件 | 承载内容 | 严禁承载 |
|---|---|---|---|
| **结构真源** | `truth/<sys>/contexts/<ctx>/*.yaml` | ValueObject 结构体、精确数值 `scale`/`precision`/`units`、Protobuf Wire/Storage Codec、聚合 `stateFields` 类型与初值、命令参数与事件载荷签名、Saga 参与者与 Pipeline 拓扑、读模型 Schema | `@guard` 布尔表达式字符串、手写业务判断逻辑 |
| **行为真源** | `truth/<sys>/contexts/<ctx>/specs/**/*.ears` | `where:` 命名谓词、`extern` 外部判定边界、`axioms:` 全局不变式、`rules:` 领域拒绝/幂等/迁移规则、`post:` 状态折叠、`layer: application` 入站与读模型契约 | 字段底层存储类型、Wire 编解码细节、框架注解或实现代码 |
| **审阅投影** | `projections/ac/**`、`projections/tables/**` | 编译器零 LLM 确定性派生的风格 E 白话 AC 与风格 B DMN 决策表 | **严禁人工编辑**（随时由真源重建） |

### 正交配合样例：一份双门限额度切片如何做到零冗余

结构侧只声明“有什么字段与精确类型”，行为侧只声明“必须满足什么业务法则”：

```yaml
# truth/bank-wealth/contexts/bankwealth/aggregates/fund-quota/aggregate.yaml（纯结构，零 @guard）
kind: aggregate
name: FundQuota
stateFields:
  - minPurchase: AmountDecimal = "0.00"
  - maxSingleLimit: AmountDecimal = "0.00"
  - fundTotalUsed: AmountDecimal = "0.00"
  - fundTotalCap: AmountDecimal = "0.00"
  - perAccountCap: AmountDecimal = "0.00"
  - accountUsed: Map[AccountId, AmountDecimal] = []
commands:
  - name: ReserveSubscriptionQuota
    parameters: [accountId: AccountId, amount: AmountDecimal]
    produces: [SubscriptionQuotaReserved]
```

```text
# truth/bank-wealth/contexts/bankwealth/specs/fund-quota-reserve.ears（唯一行为真源）
slice FundQuota.ReserveSubscriptionQuota

where:
  validAmount   = amount in [quota.minPurchase..quota.maxSingleLimit]          as "单笔申购金额在合法区间内"
  withinFundCap = quota.fundTotalUsed + amount <= quota.fundTotalCap           as "在基金申购总门限内"
  withinAcctCap = quota.accountUsed[accountId] + amount <= quota.perAccountCap as "在单账户申购总门限内"

axioms:
  [AX-Q-1] ALWAYS quota.fundTotalUsed <= quota.fundTotalCap
  [AX-Q-2] ALWAYS quota.accountUsed[accountId] <= quota.perAccountCap

rules:
  [QUOTA_AMOUNT_RANGE] IF not validAmount   THEN SHALL reject request with QUOTA_AMOUNT_RANGE
  [QUOTA_FUND_CAP]     IF not withinFundCap THEN SHALL reject request with QUOTA_FUND_CAP
  [QUOTA_ACCOUNT_CAP]  IF not withinAcctCap THEN SHALL reject request with QUOTA_ACCOUNT_CAP

  [QUOTA_RESERVED]     WHILE validAmount and withinFundCap and withinAcctCap
                       WHEN ReserveSubscriptionQuota
                       SHALL emit SubscriptionQuotaReserved
                       post:
                         quota.fundTotalUsed'          = quota.fundTotalUsed + amount
                         quota.accountUsed'[accountId] = quota.accountUsed[accountId] + amount
```

通过单一符号表绑定器，编译器直接用 YAML 结构对 `.ears` 完成严格名义类型检查、精确小数精度对齐以及事件/命令存在性核验；如果 `.ears` 写错了字段路径（例如把嵌套字段 `occurrence.occurrenceId` 误写为顶层 `occurrenceId`），编译前即刻精准报错。

## 四、数学验证硬闸门：未证毕，不产出 `Canonical Model v2`

v1 的测试验证发生在代码生成之后；而 v2 把基于 [SMT-LIB 2](https://smt-lib.org/) 与 [Z3](https://z3prover.github.io/) / [cvc5](https://cvc5.github.io/) 的形式化验证前移为**进入 `Canonical Model v2` 之前的硬编译闸门**。

1. **三层理论自动分流（保证毫秒级可判定性）**：
   - **L1 核心可判定层（`QF_AUFLIA`）**：定点加减比较、枚举状态机、游标单调性、Map 存在性 `(Array K Bool)` + 值数组 `(Array K V)`、FEEL 区间 `[start..end)`。毫秒级 100% 完备求解。
   - **L2 受限扩展层（`QF_NIA` 隔离 + `k`-步 BMC）**：非线性局部乘法（如基金净值份额夹逼 `shares * nav <= netAmount`）独立开启 `QF_NIA` 与 2 秒超时；多命令有状态切片（如定投暂停跳期→恢复）展开 `k`-步有界模型检验，证明诸如“暂停期间被记为 `skipped` 的到期槽位在任意后续步永不能复活为 `backlog`”。
   - **L3 外部黑盒层（`extern` / `@host`）**：会话鉴权、CSRF、外部 TA 回执验签、确定性主机 ID 映射为未解释布尔谓词或符号常量，在不污染底层可判定性的前提下保留 100% 布尔分支与缺口校验。
2. **定点尺度自动对齐**：
   - 编译器自动追踪每个变量的精确十进制位数（如 `Money` `scale = 2`、净值 `nav` `scale = 4`、份额 `shares` `scale = 0`），在编码 `shares * nav <= order.netAmount` 时自动对齐为 `(* shares nav) <= (* netAmount 100)`，彻底杜绝浮点误差与手工缩放错位。
3. **五项标准 `(push 1) ... (pop 1)` 体检与 A/B 澄清卡**：
   - **互斥冲突**：`SAT(Axioms ∧ G_emit ∧ G_reject)` 与 `SHALL` / `SHALL NOT` 冲突，期望 `unsat`。
   - **逻辑缺口**：`SAT(Axioms ∧ ¬(G_1 ∨ ... ∨ G_n))`，期望 `unsat`；一旦 `sat`，立即反解码模型为可读业务字段并吐出面向 PM / 架构师的 **A/B 需求澄清卡**。
   - **不变式归纳证明**：`SAT(Inv(s) ∧ G_i ∧ Post(s, s') ∧ Frame(s, s') ∧ ¬Inv(s'))`，期望 `unsat`。
   - **死规则检测**：`UNSAT(Axioms ∧ G_i)`，一旦不可达立即提取 `get-unsat-core` 定位冲突公理。
   - **边界证人合成**：对每条可达规则与关键临界等式调用 `(get-model)`，反解码出精确小数与枚举样本写入 `TestIR`。

## 五、`Canonical Model v2` 原生设计：钉死三个核心语义契约

要让下游多语言生成器直接消费 `Canonical Model v2` 而不再需要任何旧的 `@guard` Lowering 层，必须在 v2 IR 规范（`co-arising.canonical/v2`）中一次性冻结以下三个语义契约：

### 契约 1：唯一行为 IR（`co-arising.ears-ir/v2`）
`Canonical Model v2` 直接内嵌经类型检查、宏展开与 Z3 证毕的 EARS IR，每条切片/故事自带不可篡改的验证凭证（`canonicalSha256`、`theory`、`solver`、`smtVerified: true` 与 `witnesses[]`）：

```json
{
  "schemaVersion": "co-arising.canonical/v2",
  "context": "bankwealth",
  "structures": { "valueObjects": [], "exactTypes": [], "aggregates": [], "sagas": [], "readModels": [] },
  "behaviors": [
    {
      "kind": "slice",
      "layer": "domain",
      "target": "FundQuota.ReserveSubscriptionQuota",
      "hitPolicy": "FIRST",
      "theory": { "tier": "L1", "logic": "QF_AUFLIA", "codegenChannel": "deterministic" },
      "verification": { "solver": "z3", "passed": true, "bmcSteps": 0, "canonicalSha256": "..." },
      "axioms": [],
      "rules": [],
      "testIr": { "schemaVersion": "co-arising.test-ir/v2", "scenarios": [] }
    }
  ]
}
```

### 契约 2：声明式 SMT 与命令式代码生成的统一——DMN First-Hit 优先序
在 SMT 中，两条 `IF ... reject` 规则的守卫同时成立并不属于互斥冲突（因为它们都导向拒绝请求）；但在生成命令式代码（Scala `Either` / Rust `Result` / Go `error`）时，必须确定**同时触犯两条拒绝规则时返回哪一个错误码**。

`Canonical Model v2` 明确规定：参照 [OMG DMN](https://www.omg.org/spec/DMN/) 的 **First-Hit（首个命中）策略**，`.ears` 文件中 `rules:` 的自上而下声明顺序即代码生成时的确定性求值优先级。这使得声明式数学论证、风格 B 决策表与命令式代码生成三者 100% 同构。

### 契约 3：纯事件溯源闭环——`emit` 自动传播与 `post:` 折叠一致性
事件溯源架构要求**聚合状态只能在 `applyEvent(event)` 中演进**，严禁在 `handleCommand` 中直接突变状态。`Canonical Model v2` 将 EARS 的 `emit` 与 `post:` 无缝映射为标准事件溯源代数：

- **参数自动传播（`@PROPAGATED`）**：命令参数与目标事件载荷同名且同类型时默认自动绑定；仅派生值与宿主计算（`@host(...)`）需显式声明映射，消灭样板 `bindings`。
- **`post:` 即事件折叠契约**：当规则执行 `emit E` 并声明 `post: state.x' = ...` 时，编译器将该 `post:` 校验并绑定为 `applyEvent(E)` 的确定性状态折叠（若多个命令发射同一事件 `E`，编译器强制校验各处 `post:` 等价一致），从而直接驱动生成 `handleCommand`、`applyEvent` 与纯函数回放预言机 `Pure Replay Oracle`。

## 六、双通道落地：零 Token 脚手架（4A）vs 隔离区 AI TDD（4B）

依据控制论中的阿什比必需多样性定律（[Harness Engineering](https://martinfowler.com/articles/harness-engineering.html)），调节器只能约束它拥有显式模型的空间。`co-arising 2.0` 不让 AI 去碰确定性骨架，也不指望确定性生成器包揽所有复杂编排，而是按理论边界做物理分流：

### 通道 4A：确定性零 Token 代码生成（L1 + 全部架构骨架）
- 消费 `Canonical Model v2` 中的全部结构定义与 `tier == L1 && layer == domain` 的行为 IR。
- 通过独立的多语言生成器插件（`Scala` / `TypeScript` / `Java` / `Rust` / `Go`），零 Token 生成洋葱架构全部骨架：值对象与精确编解码、聚合 `Behavior` 与 `EventHandler`、Protobuf / JSON Schema、Saga 协调器宿主、应用层 Port Trait，以及在复杂逻辑落点预埋 `// @cloze:start(<id>) .. // @cloze:end(<id>)` 空槽。
- 全部生成文件加盖 `@generated` 与 `@ProvenanceId` 双向锚点，输出至只读锁定区 `generated-scaffold/`。

### 通道 4B：原隔离区 AI `@cloze` TDD 闭环（L2/L3 + `layer: application`）
那些在 v1 中只能靠人类口头约定或零散文档维护的“手写大孔”（可信入站防重扣、复杂净值份额算法、外部 TA 协议桥接、读模型水位线恢复）在 v2 中全部纳入 `.ears` 契约管辖：

1. **锁定可执行 BDD 预言机（`EarsTestEmitter`）**：
   - 从 `TestIR` + 符号表生成锁定的 [Gherkin](https://cucumber.io/docs/gherkin/reference/) `.feature` 与目标语言可执行测试套件（例如基于 [ScalaTest](https://www.scalatest.org/) + [Akka Persistence TestKit](https://doc.akka.io/libraries/akka-persistence-testkit/current/index.html) 的 `*EarsSpec.scala`，或 TypeScript Vitest / Rust `cargo test`）。
   - 每条用例绑定 `@CoArisingSpec(id="<RULE_ID>", witness="<witness-id>")` 锚点，并将全部锁定测试文件的 SHA-256 写入 `generated-tests/manifest.sha256.json`。
2. **三明治切片上下文包（Sandwich Context Pack）**：
   - 由 SQLite 知识依赖图谱自动导出极简上下文包（上层：闭包值对象与 Port 签名；中层：调用方事务与重试 `@caller` 契约；下层：关联的 `@CoArisingSpec` 验收用例列表），让编码 Agent 无需全仓 `grep` 即可精准填空。
3. **物理级防作弊 Hooks 与契约盲审（参照 [Claude Code 最佳实践](https://code.claude.com/docs/en/best-practices)）**：
   - **`PreToolUse` Hook（`exit 2`）**：拦截任何修改 `projections/`、`generated-scaffold/`、`generated-tests/` 或 `handwritten/` 中 `@cloze` 槽位之外行（含篡改标记行）的写操作。
   - **`Stop` Hook（`exit 2`）**：Agent 结束回合前强制执行三连检——(a) 核验 `manifest.sha256.json` 防止通过 Shell/sed 绕过篡改测试；(b) 真跑目标语言可执行 `*EarsSpec`；(c) 执行 AST 双向来源锚点对账。任一失败即向 `stderr` 打印失败的 `@CoArisingSpec` ID 并阻断退出，迫使 Agent 原地自愈。
   - **独立无污染盲审 Subagent（`contract-reviewer`）**：不继承编码 Agent 对话历史，强制 `skip style`，仅对照 `*.ears`、`TestIR` 与 `@cloze` 的 `git diff` 审查是否存在针对 Z3 边界样本的硬编码作弊，通过后落盘分层 Provenance 证据。

## 七、与 v1 基线的诚实边界与分阶段演进路线

保持工程诚实，清晰划分「当前已落地的原型验证」与「v2 尚未交付的目标能力」：

| 阶段 | 核心里程碑 | 当前状态 | 退出验收标准 |
|---|---|---|---|
| **v1 冻结基线** | 公开站 Pages + `bank-wealth-demo` v1 演示 + EARS 1.0 前端/Z3 五项体检/4-步 BMC/风格 E&amp;B 投影/Hooks 原型 | **已完成（v1 分支实测全绿）** | `metarch-truthsrc` Lint 0 违规、15/15 EARS 单测通过；`bank-wealth-demo` 6 对双语基准 AST/SMT 100% 等价、Hooks `exit 2` 实测通过、既有 160 atoms roundtrip 零破坏 |
| **v2 Phase 1** | `Canonical Model v2` Schema 与单一编译器（结构 YAML + 原生 EARS IR + SMT 硬闸门） | 规划中 | 彻底移除第二套表达式解析器；单一符号/类型检查器统一服务 SMT、投影与下游生成器；未过 Z3 门禁拒绝落盘 `canonical-v2.json` |
| **v2 Phase 2** | 直连 EARS IR 的 L1 确定性多语言代码生成器（首批目标栈：Scala 或 TypeScript/Rust） | 规划中 | 直接消费 `First-Hit` 规则链与 `emit`/`post:` 折叠生成 `Behavior`/`EventHandler`/`Pure Replay Oracle`，零中间 `@guard` 翻译 |
| **v2 Phase 3** | 可执行 `EarsTestEmitter`（从证人骨架升级为真实驱动 Actor / Port 的可执行 BDD 预言机） | 规划中 | 自动构造命令/值对象并断言 `Accepted`/`Refused`/状态演进，`sbt "testOnly *EarsSpec"` / `vitest` 真跑红绿闭环 |
| **v2 Phase 4** | 隔离区 AI `@cloze` TDD 端到端试点（含 Context Pack 导出、`Stop` Hook 自愈与 `contract-reviewer` 盲审） | 规划中 | 在真实应用故事与 L2 复杂算法切片上完成“红灯预言机 → AI 仅填 `@cloze` → 变异测试必红 → 盲审通过 → 图谱回锚”全闭环 |

## 八、参考标准、学术出处与关联文档

- [co-arising EARS 1.0 技术规格说明书（v1.2 双语对照版）](https://co-arising.github.io/zh/articles/co-arising-ears-spec-20261123/) —— EARS 1.0 双语同构文法、`bank-wealth-demo` 四类样例与只读投影规范
- [如何在 metarch-truthsrc 中扩展一个全新的代码生成器](https://co-arising.github.io/zh/articles/metarch-truthsrc-extending-code-generator-20261126/) —— v1 管线中间产物与多语言生成器插件架构参考
- [规约本身就有 Bug：AWS Kiro 与 SMT 求解器深度拆解](https://co-arising.github.io/zh/articles/aws-kiro-smt-spec-analyzer-20261119/) —— 在编码前用形式化方法消除规约歧义的理论与工业参照
- [对 co-arising 的启发：AI Coding 范式转移下的战略印证与工程路线](https://co-arising.github.io/zh/articles/co-arising-implications-20261116/) —— 阿什比定律、Behaviour Harness、双速工作流与单点完形填空战略背景
- [Z3 Prover（Microsoft Research）](https://z3prover.github.io/) —— SMT-LIB 2 五项体检与 k-步 BMC 的主求解器
- [cvc5 SMT Solver](https://cvc5.github.io/) —— 支持 `QF_SLIA` 等扩展理论的求解器无关备选后端
- [SMT-LIB 2 Standard](https://smt-lib.org/) —— 求解器无关的形式化验证标准语言
- [AWS Cedar Policy Language](https://www.cedarpolicy.com/) —— “主动裁剪图灵完备性以换取 100% 可分析性”的语言设计参照
- [EARS（Easy Approach to Requirements Syntax）](https://en.wikipedia.org/wiki/Easy_Approach_to_Requirements_Syntax) —— 受控自然语言需求句式的原始规范出处
- [OMG DMN Specification](https://www.omg.org/spec/DMN/) —— 风格 B 决策表、FEEL 区间语法与 First-Hit 命中策略的标准依据
- [Cucumber Gherkin Reference](https://cucumber.io/docs/gherkin/reference/) —— 锁定 `.feature` 验收测试预言机语法标准
- [ScalaTest](https://www.scalatest.org/) &amp; [Akka Persistence TestKit](https://doc.akka.io/libraries/akka-persistence-testkit/current/index.html) —— 事件溯源聚合与锁定 BDD 预言机的参考测试驱动
- [Harness Engineering for Coding Agent Users（Martin Fowler / Birgitta Böckeler）](https://martinfowler.com/articles/harness-engineering.html) —— 拓扑降维减熵与 Behaviour Harness 理论出处
- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices) —— `PreToolUse` / `Stop` Hooks（`exit 2`）物理拦截与独立上下文盲审机制出处
- [`co-arising/metarch-truthsrc`](https://github.com/co-arising/metarch-truthsrc) &amp; [`co-arising/bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo) —— 当前 v1 编译器与参考基准仓库


---

## 附录：v2.0 GA 实现落地与 v2.1 全域治理更新（2026-11-26）

本蓝图已于 `metarch-truthsrc`（`feat/co-arising-v2-ears-native`）与 `bank-wealth-demo`（`feat/co-arising-v2-pilot`）完成端到端落地并通过 P0–P2 全量发布门禁验证：

1. **正交限界上下文真源目录**：每个限界上下文按知识形态拆分为 `structures/`（静态名词 YAML）、`behaviors/domain/`（领域聚合 `.ears`）、`behaviors/application/`（用户故事 `*.story.ears` 与外部系统集成策略 `*.integration.ears`）以及 `bindings/`（解空间 S1 效果协议与禁止跨层依赖规则），由编译器路径-层级静态门禁（`V2_PATH_LAYER_MISMATCH`、`V2_LAYER_ACTION_VIOLATION`）与 4 项严格领域边界门禁物理守护。
2. **双栈确定性闭环（TypeScript + Scala）**：`compile-v2`（Z3 + First-Hit + 边界等式证人 + 应用层 `k`-step BMC + `.zh.ears` 双语等价检查 + Style E/B 投影）→ `generate-v2`（TS + Scala 领域层与应用层全对齐）→ `emit-tests-v2`（SHA-256 锁定预言机）→ `verify-v2 --strict`（跨平台防静默跳过门禁）。`bank-wealth-demo` 已实现 5 TS + 5 Scala 套件全量真实编译运行通过。
3. **全域 100% 覆盖治理（v2.1）与多协议 S1 TCK**：问题空间（D1/D2 → E1）与解空间（S1/S2/S3 → E2/E3/E4）零灰区分类（`bank-wealth-demo` 56/56 = 100%）；内置 `three-phase-reconcile`、`transactional-outbox`、`saga-compensation`、`idempotent-consumer` 四族 S1 故障注入 TCK（支持 Node ESM 与 Scala/JVM 执行器）。
4. **开箱即用 DX 与编辑器生态**：一等子命令 `truthsrc init-v2`、`truthsrc check-v2 --strict`、`truthsrc guard-write`、`truthsrc init-hooks`、`truthsrc lsp-ears` 及 `.ears` TextMate 语法高亮与 VS Code 插件脚手架。
