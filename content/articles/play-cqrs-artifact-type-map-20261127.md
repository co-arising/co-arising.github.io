# Play CQRS（scala-cqrs-play-service:2）Artifact Type 架构地图：洋葱分层、分解粘合与目标代码全景

> 版本锚定：`metarch-truthsrc` @ [`1e87c6a`](https://github.com/co-arising/metarch-truthsrc)（`scala-cqrs-play-service:2` · `catalogSha256: 156b224f3614` · 60 族 / 14 生产者 / 64 种 `artifactKinds`） · `bank-wealth-demo` @ [`b5cadc0`](https://github.com/co-arising/bank-wealth-demo) · 本文受 `assets/data/artifact-maps.lock.json` 与 `sync-site-facts` 门禁受控同步（对应站点状态台账 `F-32` / `F-33`）。

在大多数代码生成器里，“一个模型生成一份巨型 `Service.scala`”看似简单，但只要业务规则、持久化、权限、长流程和读模型同时演化，生成器很快就会退化成不可维护的字符串大杂烩——**AI 和人类改一处就会污染十处，洋葱架构的依赖边界也形同虚设**。

`metarch-truthsrc` 的 [`scala-cqrs-play-service:2`](https://github.com/co-arising/metarch-truthsrc/tree/main/generators/scala-cqrs-play-service) 选择了相反的工程路径：**极度细粒度的正交分解（60 族统一产出 × 64 种 `artifactKinds`——在 v1/v2 原 54 族基础上新增 `#55`–`#60` 反应式策略族） + 严格向内依赖的洋葱边界 + 最后在基础设施最外缘通过 Guice DI 与 `ApplicationBootstrap` 重新粘合**。本文按“**架构哲学 → 可点击交互式全景图与粘合拓扑 → 从内到外五层逐一拆解（附样例代码与边界判断） → 端到端串联实例 → 升级同步与未来 Rust 扩展契约**”展开。

---

## 一、架构哲学：为什么先拆成 60 族 Artifact Type，再经由 DI 与 Bootstrap 粘合

<div class="co-kpi-strip" role="region" aria-label="Play CQRS v2 产物规模概览">
  <div><div class="kpi-num">60</div><div class="kpi-label">统一产物家族（54 族基线 + Policy #55–#60）</div></div>
  <div><div class="kpi-num">14</div><div class="kpi-label">生成器 Producer（manifest 声明）</div></div>
  <div><div class="kpi-num">64</div><div class="kpi-label">受治理 Artifact Kinds（覆盖全链）</div></div>
  <div><div class="kpi-num red">0</div><div class="kpi-label">洋葱 DIP 违规（126 个受检 Scala 文件）</div></div>
</div>

### 1. 第一性原理：Kernel（关键业务信息）、Seam（隔离缝）与 Glue（胶水机制）的三分法

在 `co-arising` 中，代码并不是平权的一堆文本，每一类 Artifact Type 都明确归属于三种角色之一：

<div class="article-table">
<table>
<thead>
<tr><th>角色分类</th><th>徽标</th><th>决定权与来源</th><th>变更频率</th><th>典型代表</th></tr>
</thead>
<tbody>
<tr><td><strong>关键业务信息（Kernel）</strong></td><td><span class="at-badge at-kernel">KERNEL</span></td><td>完全由 YAML 结构 + <a href="https://co-arising.github.io/zh/articles/co-arising-ears-spec-20261123/">EARS 规约</a> 与 Z3 数学证明推导（<code>4A</code> 零 Token 或受控语义契约）</td><td>随领域规则变化</td><td><code>ValueObject</code>、<code>Entity</code>、<code>EventHandler</code>、<code>Rules</code>、<code>Axioms</code>、<code>PolicyOn&lt;Cmd&gt;</code></td></tr>
<tr><td><strong>边界与隔离缝（Seam &amp; Port）</strong></td><td><span class="at-badge at-seam">SEAM</span></td><td>由编译期推导签名契约（<code>Port</code> / <code>Protocol</code> / <code>CallerContractSpec</code> / <code>Semantics</code>），把非确定性实现（<code>L2</code>/<code>L3</code>/Infra）关进 <code>handwritten/</code> <code>@cloze</code> 隔离区</td><td>仅在能力接口演进时变化</td><td><code>*Computations</code>、<code>*Protocol</code>、<code>*Repository</code>、<code>*Port.scala</code>、<code>ApplyEventSemantics</code>、<code>PolicyDlqSink</code></td></tr>
<tr><td><strong>胶水与运行时机制（Glue）</strong></td><td><span class="at-badge at-glue">GLUE</span></td><td>零新业务决策——把 Kernel 与 Seam 接到 Akka Typed、ClusterSharding、Play HTTP、ScalaPB 与 Guice DI 的标准框架仪式</td><td>仅随目标栈版本或家族升级变化</td><td><code>*Aggregate</code>、<code>*Behaviors</code>、<code>*ProtoConverters</code>、<code>*Bootstrap</code>、<code>ApplicationBootstrap</code>、<code>GeneratedBindingsModule</code></td></tr>
</tbody>
</table>
</div>

**核心原则是“纯度不外泄、胶水不进核”**：最内层的 `domain/` 不允许出现任何 `akka.*`、`play.*`、`scalikejdbc.*`、`javax.inject.*` 或 Protobuf 导入；不仅架构更干净，也让 [`verify-gate.mjs`](https://github.com/co-arising/metarch-truthsrc) 能把 **Kernel + Seam 文件直接送进离线 `scalac` 毫秒级独立编译并执行 100% 领域变异测试**，而无需每次拉起整个 Play/Akka 集群。

### 2. 为什么要先彻底分解，最后再粘合？

1. **所有权隔离（Overwrite vs. Never-Overwrite）**：如果 `FundOrderRules.scala`（编译器拥有、每次覆盖）和 `FundOrderComputationsImpl.scala`（人工/`@cloze` 拥有、绝不覆盖）写在同一文件里，重新生成必然覆写人工语义；拆成独立 Artifact Type 后，[`generated-scaffold/` 与 `handwritten/` 物理分目录](https://github.com/co-arising/metarch-truthsrc/blob/main/CODEGEN.md)，再用 `GeneratedBindingsModule` 在运行期粘合。
2. **双通道验证（L1 确定性 vs. L2/L3 预言机 TDD）**：规则、状态折叠与公理校验留在纯粹无副作用的 `#45 Rules` / `#3 EventHandler` / `#48 Axioms`；复杂计算与外部调用留在 `#51 ApplicationPort` + `*Computations`。
3. **跨技术栈可迁移（Scala/Play → Rust/Axum）**：分解之后，所有 **Kernel 契约** 与 **Port Seam** 具有清晰的语言无关结构（见第九章 Rust 蓝图），替换的只是 **Glue 层目标适配器**。

---

## 二、Play CQRS 全景 Artifact Type 架构图与粘合拓扑

> 点击下图任意节点，可直接跳转到对应洋葱层与 Artifact Type 的详细拆解与真实样例代码；左侧目录支持按洋葱层次展开或折叠全部子类目。

<figure class="co-arch-fig co-arch-map">
<div class="arch-caption-head">FIGURE 01 · PLAY CQRS (scala-cqrs-play-service:2 @ 1e87c6a) ONION ARTIFACT TYPE MAP (CLICKABLE)</div>
<svg viewBox="0 0 1120 1110" width="100%" role="img" aria-label="Play CQRS 五层同心洋葱架构 Artifact Type 全景地图：从最内层 Domain Core 到 Application、Infrastructure、Interfaces 与 Verification 闸门层">
  <defs>
    <marker id="map-arr-ink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-ink"/>
    </marker>
    <marker id="map-arr-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-teal"/>
    </marker>
    <marker id="map-arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-amber"/>
    </marker>
    <marker id="map-arr-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-red"/>
    </marker>
  </defs>

  <ellipse cx="560" cy="480" rx="540" ry="472" class="arch-ring-iface"/>
  <ellipse cx="560" cy="480" rx="470" ry="400" class="arch-ring-infra"/>
  <ellipse cx="560" cy="480" rx="368" ry="296" class="arch-ring-app"/>
  <ellipse cx="560" cy="480" rx="220" ry="168" class="arch-ring-domain"/>

  <text x="560" y="42" text-anchor="middle" class="arch-t-band">LAYER 4 · INTERFACES &amp; PLAY RUNTIME</text>
  <text x="560" y="60" text-anchor="middle" class="arch-t-chip-sub">HTTP 入口 · 5-Layer Authz · 构建脚手架</text>

  <text x="560" y="114" text-anchor="middle" class="arch-t-band-amber">LAYER 3 · INFRASTRUCTURE &amp; DI RE-ASSEMBLY</text>
  <text x="560" y="212" text-anchor="middle" class="arch-t-band">LAYER 2 · APPLICATION LAYER</text>

  <text x="560" y="354" text-anchor="middle" class="arch-t-band-teal">LAYER 1 · DOMAIN CORE</text>
  <text x="560" y="372" text-anchor="middle" class="arch-t-chip-sub">零 Akka / Play / JDBC 依赖</text>
  <text x="560" y="574" text-anchor="middle" class="arch-t-chip-teal">KERNEL + SEAM · 独立离线 scalac</text>

  <a class="arch-node" href="#section-3-1">
    <rect x="392" y="398" width="156" height="44" rx="5" class="arch-card-teal"/>
    <text x="470" y="417" text-anchor="middle" class="arch-t-chip-title">#1 Value Objects</text>
    <text x="470" y="434" text-anchor="middle" class="arch-t-chip-sub">Money · ExactTypes</text>
  </a>
  <a class="arch-node" href="#section-3-2">
    <rect x="572" y="398" width="156" height="44" rx="5" class="arch-card-teal"/>
    <text x="650" y="417" text-anchor="middle" class="arch-t-chip-title">#2 Domain Entity</text>
    <text x="650" y="434" text-anchor="middle" class="arch-t-chip-sub">State · sealed Event</text>
  </a>
  <a class="arch-node" href="#section-3-3">
    <rect x="392" y="452" width="156" height="44" rx="5" class="arch-card-teal"/>
    <text x="470" y="471" text-anchor="middle" class="arch-t-chip-title">#3 EventHandler</text>
    <text x="470" y="488" text-anchor="middle" class="arch-t-chip-sub">(State, Evt) =&gt; State</text>
  </a>
  <a class="arch-node" href="#section-3-4">
    <rect x="572" y="452" width="156" height="44" rx="5" class="arch-card-teal"/>
    <text x="650" y="471" text-anchor="middle" class="arch-t-chip-title">#4/#5/#45 Rules</text>
    <text x="650" y="488" text-anchor="middle" class="arch-t-chip-sub">Z3 Guard + Postcond</text>
  </a>
  <a class="arch-node" href="#section-3-5">
    <rect x="392" y="506" width="156" height="44" rx="5" class="arch-card-teal"/>
    <text x="470" y="525" text-anchor="middle" class="arch-t-chip-title">#48 Axioms/Replay</text>
    <text x="470" y="542" text-anchor="middle" class="arch-t-chip-sub">ALWAYS Invariants</text>
  </a>
  <a class="arch-node" href="#section-3-6">
    <rect x="572" y="506" width="156" height="44" rx="5" class="arch-card-amber"/>
    <text x="650" y="525" text-anchor="middle" class="arch-t-chip-title">#14/#51 Compute</text>
    <text x="650" y="542" text-anchor="middle" class="arch-t-chip-sub">L1 Noop / L2 Impl</text>
  </a>

  <a class="arch-node" href="#section-4-1">
    <rect x="380" y="228" width="170" height="52" rx="5" class="arch-card-amber"/>
    <text x="465" y="249" text-anchor="middle" class="arch-t-chip-title">#7/#11 Protocol</text>
    <text x="465" y="267" text-anchor="middle" class="arch-t-chip-sub">Command · Reply · Params</text>
  </a>
  <a class="arch-node" href="#section-4-2">
    <rect x="570" y="228" width="170" height="52" rx="5" class="arch-card"/>
    <text x="655" y="249" text-anchor="middle" class="arch-t-chip-title">#6/#8–#10 Behaviors</text>
    <text x="655" y="267" text-anchor="middle" class="arch-t-chip-sub">EntityKey · Rules Host</text>
  </a>
  <a class="arch-node" href="#section-4-3">
    <rect x="212" y="440" width="122" height="76" rx="5" class="arch-card-amber"/>
    <text x="273" y="463" text-anchor="middle" class="arch-t-chip-title">#12 Repo Port</text>
    <text x="273" y="482" text-anchor="middle" class="arch-t-chip-sub">Repository trait</text>
    <text x="273" y="501" text-anchor="middle" class="arch-t-chip-amber">SEAM · DIP</text>
  </a>
  <a class="arch-node" href="#section-4-4">
    <rect x="786" y="440" width="122" height="76" rx="5" class="arch-card-teal"/>
    <text x="847" y="463" text-anchor="middle" class="arch-t-chip-title">#51/#52 Story</text>
    <text x="847" y="482" text-anchor="middle" class="arch-t-chip-sub">ExternPorts/Impl</text>
    <text x="847" y="501" text-anchor="middle" class="arch-t-chip-teal">KERNEL + SEAM</text>
  </a>
  <a class="arch-node" href="#section-4-5">
    <rect x="320" y="640" width="152" height="52" rx="5" class="arch-card-teal"/>
    <text x="396" y="661" text-anchor="middle" class="arch-t-chip-title">#15/#26+ ReadSide</text>
    <text x="396" y="679" text-anchor="middle" class="arch-t-chip-sub">View · Query · Proj</text>
  </a>
  <a class="arch-node" href="#section-4-6">
    <rect x="484" y="666" width="152" height="52" rx="5" class="arch-card-teal"/>
    <text x="560" y="687" text-anchor="middle" class="arch-t-chip-title">#55–#60 Policy</text>
    <text x="560" y="705" text-anchor="middle" class="arch-t-chip-sub">PolicyMachine 闭环</text>
  </a>
  <a class="arch-node" href="#section-4-7">
    <rect x="648" y="640" width="152" height="52" rx="5" class="arch-card-amber"/>
    <text x="724" y="661" text-anchor="middle" class="arch-t-chip-title">#13/#40–#46 Saga</text>
    <text x="724" y="679" text-anchor="middle" class="arch-t-chip-sub">Cross-Agg · Bridge</text>
  </a>

  <a class="arch-node" href="#section-5-1">
    <rect x="356" y="128" width="196" height="48" rx="5" class="arch-card"/>
    <text x="454" y="148" text-anchor="middle" class="arch-t-chip-title">#29–#33 Protobuf Codec</text>
    <text x="454" y="166" text-anchor="middle" class="arch-t-chip-sub">*.proto · SnapAdapter</text>
  </a>
  <a class="arch-node" href="#section-5-2">
    <rect x="568" y="128" width="196" height="48" rx="5" class="arch-card"/>
    <text x="666" y="148" text-anchor="middle" class="arch-t-chip-title">#12 / #24 Repo &amp; DLQ</text>
    <text x="666" y="166" text-anchor="middle" class="arch-t-chip-sub">ScalikeJDBC · DLQ Bury</text>
  </a>
  <a class="arch-node" href="#section-5-3">
    <rect x="358" y="784" width="194" height="48" rx="5" class="arch-card-amber"/>
    <text x="455" y="804" text-anchor="middle" class="arch-t-chip-title">#25 Connectors &amp; Effects</text>
    <text x="455" y="822" text-anchor="middle" class="arch-t-chip-sub">Outbound · ServerSnapshot</text>
  </a>
  <a class="arch-node" href="#section-5-5">
    <rect x="568" y="784" width="194" height="48" rx="5" class="arch-card-dark"/>
    <text x="665" y="804" text-anchor="middle" class="arch-t-chip-title-dark">#38/#47/#50 DI &amp; Boot ★</text>
    <text x="665" y="822" text-anchor="middle" class="arch-t-chip-sub-dark">Guice + PolicyBootstrap</text>
  </a>

  <a class="arch-node" href="#section-6-1">
    <rect x="16" y="36" width="228" height="66" rx="5" class="arch-card-teal"/>
    <text x="130" y="57" text-anchor="middle" class="arch-t-chip-title">#49 ApiDto &amp; 5-Layer Authz</text>
    <text x="130" y="75" text-anchor="middle" class="arch-t-chip-sub">Principal · PEP/PDP · RowScope</text>
    <text x="130" y="92" text-anchor="middle" class="arch-t-chip-teal">KERNEL + SEAM</text>
  </a>
  <a class="arch-node" href="#section-6-2">
    <rect x="876" y="36" width="228" height="66" rx="5" class="arch-card"/>
    <text x="990" y="57" text-anchor="middle" class="arch-t-chip-title">#34–#36 Controllers &amp; DSL</text>
    <text x="990" y="75" text-anchor="middle" class="arch-t-chip-sub">PlayController · StateApi</text>
    <text x="990" y="92" text-anchor="middle" class="arch-t-chip-tag">GLUE · HTTP → AppPort</text>
  </a>
  <a class="arch-node" href="#section-6-3">
    <rect x="16" y="854" width="228" height="66" rx="5" class="arch-card"/>
    <text x="130" y="875" text-anchor="middle" class="arch-t-chip-title">#37–#38 ServiceLoader</text>
    <text x="130" y="893" text-anchor="middle" class="arch-t-chip-sub">ServiceContract · HttpBridge</text>
    <text x="130" y="910" text-anchor="middle" class="arch-t-chip-tag">GLUE · 路由与契约自检</text>
  </a>
  <a class="arch-node" href="#section-6-4">
    <rect x="876" y="854" width="228" height="66" rx="5" class="arch-card"/>
    <text x="990" y="875" text-anchor="middle" class="arch-t-chip-title">#39 Project Scaffold</text>
    <text x="990" y="893" text-anchor="middle" class="arch-t-chip-sub">build.sbt · dev.conf · Akka</text>
    <text x="990" y="910" text-anchor="middle" class="arch-t-chip-tag">GLUE · ScalaPB + Play</text>
  </a>

  <line x1="28" y1="480" x2="84" y2="480" class="arch-edge" marker-end="url(#map-arr-ink)"/>
  <line x1="98" y1="480" x2="186" y2="480" class="arch-edge-teal" marker-end="url(#map-arr-teal)"/>
  <text x="142" y="466" text-anchor="middle" class="arch-t-chip-teal">DIP →</text>

  <line x1="1092" y1="480" x2="1036" y2="480" class="arch-edge" marker-end="url(#map-arr-ink)"/>
  <line x1="1022" y1="480" x2="934" y2="480" class="arch-edge-teal" marker-end="url(#map-arr-teal)"/>
  <text x="978" y="466" text-anchor="middle" class="arch-t-chip-teal">← DIP</text>

  <line x1="348" y1="336" x2="398" y2="376" class="arch-edge-teal" marker-end="url(#map-arr-teal)"/>
  <line x1="772" y1="336" x2="722" y2="376" class="arch-edge-teal" marker-end="url(#map-arr-teal)"/>

  <text x="560" y="918" text-anchor="middle" class="arch-t-chip-tag">Teal = Kernel · Amber = Seam · Neutral = Glue · Dark ★ = DI Hub · → 向内 DIP</text>

  <rect x="16" y="972" width="1088" height="122" rx="6" class="arch-band-red arch-dash"/>
  <text x="34" y="996" class="arch-t-band-red">LAYER 5 · VERIFICATION &amp; BDD ORACLE GATE（独立验证与防篡改层 · 不进入生产运行期依赖）</text>
  <a class="arch-node" href="#section-7-1">
    <rect x="34" y="1012" width="520" height="66" rx="5" class="arch-card-teal"/>
    <text x="294" y="1035" text-anchor="middle" class="arch-t-chip-title">#53 Gherkin Features · TS/Scala Oracles · manifest.sha256.json</text>
    <text x="294" y="1057" text-anchor="middle" class="arch-t-chip-sub">KERNEL · 锁定预言机与双向 Witness 物化 · Domain / App / HTTP 全覆盖</text>
  </a>
  <a class="arch-node" href="#section-7-2">
    <rect x="566" y="1012" width="520" height="66" rx="5" class="arch-card-red"/>
    <text x="826" y="1035" text-anchor="middle" class="arch-t-chip-title">#54 Mutation Gate · Onion DIP Gate · sbt/scalac Partition</text>
    <text x="826" y="1057" text-anchor="middle" class="arch-t-chip-sub">GLUE · 100% Guard 变异击杀 + 0 DIP 违规 + handwritten/ 越界审计</text>
  </a>

  <line x1="306" y1="972" x2="306" y2="928" class="arch-edge-red" marker-end="url(#map-arr-red)"/>
  <line x1="814" y1="972" x2="814" y2="928" class="arch-edge-red" marker-end="url(#map-arr-red)"/>
</svg>
<figcaption>图 1：Play CQRS（<code>scala-cqrs-play-service:2</code>）五层同心洋葱全景架构图。由外向内依次为 Layer 4 Interfaces、Layer 3 Infrastructure（含 DI 粘合中枢）、Layer 2 Application、最内层 Layer 1 Domain Core，底部为独立离线审计的 Layer 5 BDD Oracle 与 DIP 门禁。</figcaption>
</figure>

### 分解之后如何重新粘合？两条主干线看透全局

很多读者第一次看生成的脚手架目录会疑惑：文件拆得这么散，**运行时到底是谁把 `FundQuotaRules`、`FundOrderComputationsImpl`、`CashFundPurchaseImpl`、`BankOrderApplyEventSemanticsImpl` 和 `PolicyOn*Runner` 串起来的？**答案在下面这张粘合拓扑图里：

<figure class="co-arch-fig co-arch-map">
<div class="arch-caption-head">FIGURE 02 · DECOMPOSITION &amp; RE-ASSEMBLY WIRING TOPOLOGY (GUICE DI + AKKA RUNTIME)</div>
<svg viewBox="0 0 960 448" width="100%" role="img" aria-label="分解后的 Artifact Type 如何通过 Guice DI Module 树与 ApplicationBootstrap 重新粘合成完整 Akka CQRS 与 Play 运行时">
  <defs>
    <marker id="wire-arr-ink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-ink"/>
    </marker>
    <marker id="wire-arr-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-teal"/>
    </marker>
    <marker id="wire-arr-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" class="arch-head-amber"/>
    </marker>
  </defs>

  <rect x="14" y="14" width="452" height="420" rx="5" class="arch-band"/>
  <text x="28" y="38" class="arch-t-band">1. PLAY / GUICE DI MODULE 粘合树（静态装配）</text>

  <rect x="30" y="54" width="420" height="82" rx="4" class="arch-card-dark"/>
  <text x="240" y="78" text-anchor="middle" class="arch-t-title-dark">BootstrapModule (modules/)</text>
  <text x="240" y="99" text-anchor="middle" class="arch-t-sub-dark">绑定 AggRepository → HandwrittenBindingsModule</text>
  <text x="240" y="117" text-anchor="middle" class="arch-t-sub-dark">→ eager 实例化 ApplicationBootstrap</text>

  <rect x="30" y="160" width="420" height="74" rx="4" class="arch-card-amber"/>
  <text x="240" y="183" text-anchor="middle" class="arch-t-title">HandwrittenBindingsModule (handwritten/)</text>
  <text x="240" y="203" text-anchor="middle" class="arch-t-sub">绝不覆盖 · install(GeneratedBindingsModule)</text>
  <text x="240" y="220" text-anchor="middle" class="arch-t-sub">+ install(&lt;Ctx&gt;ProjectionModule)</text>

  <rect x="30" y="260" width="204" height="152" rx="4" class="arch-card-teal"/>
  <text x="132" y="284" text-anchor="middle" class="arch-t-chip-title">GeneratedBindingsModule</text>
  <text x="132" y="306" text-anchor="middle" class="arch-t-chip-sub">• L1 Computations → .Noop</text>
  <text x="132" y="325" text-anchor="middle" class="arch-t-chip-sub">• L2 Computations → *Impl</text>
  <text x="132" y="344" text-anchor="middle" class="arch-t-chip-sub">• L3 StoryHandler → *Impl</text>
  <text x="132" y="363" text-anchor="middle" class="arch-t-chip-sub">• PolicySemantics + DlqSink</text>
  <text x="132" y="382" text-anchor="middle" class="arch-t-chip-sub">• HttpRouter + ToolGates</text>

  <rect x="246" y="260" width="204" height="152" rx="4" class="arch-card"/>
  <text x="348" y="284" text-anchor="middle" class="arch-t-chip-title">&lt;Ctx&gt;ProjectionModule</text>
  <text x="348" y="308" text-anchor="middle" class="arch-t-chip-sub">#26 ApplyEventSemantics</text>
  <text x="348" y="328" text-anchor="middle" class="arch-t-chip-sub">→ ApplyEventSemanticsImpl</text>
  <text x="348" y="354" text-anchor="middle" class="arch-t-mono">handwritten/ 读模型</text>
  <text x="348" y="373" text-anchor="middle" class="arch-t-mono">自定义行折叠语义</text>

  <line x1="240" y1="136" x2="240" y2="157" class="arch-edge-teal" marker-end="url(#wire-arr-teal)"/>
  <line x1="132" y1="234" x2="132" y2="257" class="arch-edge-teal" marker-end="url(#wire-arr-teal)"/>
  <line x1="348" y1="234" x2="348" y2="257" class="arch-edge-amber" marker-end="url(#wire-arr-amber)"/>

  <rect x="494" y="14" width="452" height="420" rx="5" class="arch-band-teal"/>
  <text x="508" y="38" class="arch-t-band-teal">2. AKKA RUNTIME BOOTSTRAP 与 REACTIVE 闭环（动态运行）</text>

  <rect x="510" y="54" width="420" height="82" rx="4" class="arch-card-dark"/>
  <text x="720" y="78" text-anchor="middle" class="arch-t-title-dark">ApplicationBootstrap (*Bootstrap Traits)</text>
  <text x="720" y="99" text-anchor="middle" class="arch-t-sub-dark">init&lt;Agg&gt;Aggregate + init&lt;View&gt;ReadsideProjection</text>
  <text x="720" y="117" text-anchor="middle" class="arch-t-sub-dark">+ initPolicyOn&lt;Cmd&gt;Projection</text>

  <rect x="510" y="160" width="202" height="106" rx="4" class="arch-card-teal"/>
  <text x="611" y="184" text-anchor="middle" class="arch-t-title">ClusterSharding 写侧</text>
  <text x="611" y="206" text-anchor="middle" class="arch-t-sub">EventSourcedBehavior</text>
  <text x="611" y="225" text-anchor="middle" class="arch-t-sub">Behaviors → Rules + Fold</text>
  <text x="611" y="244" text-anchor="middle" class="arch-t-sub">EventAdapter → Protobuf</text>

  <rect x="728" y="160" width="202" height="106" rx="4" class="arch-card-amber"/>
  <text x="829" y="184" text-anchor="middle" class="arch-t-title">ShardedDaemonProcess</text>
  <text x="829" y="206" text-anchor="middle" class="arch-t-sub">eventsByTag(ReadJournal)</text>
  <text x="829" y="225" text-anchor="middle" class="arch-t-sub">① ReadSide → ViewTable</text>
  <text x="829" y="244" text-anchor="middle" class="arch-t-sub">② PolicyMachine → ask</text>

  <rect x="510" y="292" width="420" height="120" rx="4" class="arch-card"/>
  <text x="720" y="317" text-anchor="middle" class="arch-t-title">PlayHttpBridge → StoryController → StoryImpl</text>
  <text x="720" y="340" text-anchor="middle" class="arch-t-sub">5 层 Authz (PEP/PDP + RowScope) → ExternPorts</text>
  <text x="720" y="359" text-anchor="middle" class="arch-t-sub">→ EffectsPort → AggregateProtocol</text>
  <text x="720" y="384" text-anchor="middle" class="arch-t-mono">SagaCoordinatorBootstrap + #46 ExternalAuthority</text>

  <line x1="611" y1="136" x2="611" y2="157" class="arch-edge-teal" marker-end="url(#wire-arr-teal)"/>
  <line x1="829" y1="136" x2="829" y2="157" class="arch-edge-amber" marker-end="url(#wire-arr-amber)"/>
  <line x1="712" y1="213" x2="725" y2="213" class="arch-edge" marker-end="url(#wire-arr-ink)"/>
  <line x1="450" y1="95" x2="507" y2="95" class="arch-edge-teal" marker-end="url(#wire-arr-teal)"/>
</svg>
<figcaption>图 2：静态依赖由 Guice DI 模块树按 <code>BootstrapModule → HandwrittenBindingsModule → GeneratedBindingsModule + ProjectionModule</code> 装配；运行期由 <code>ApplicationBootstrap</code> 同时初始化 Sharding 写侧实体与 <code>ShardedDaemonProcess</code> 投影。</figcaption>
</figure>

---

## 三、Domain 核心层（最内层 · 零框架依赖）

这一层位于 `domain/`，是整个架构里含金量最高的 **Kernel 与 Seam 领地**：没有任何 HTTP、Akka 或数据库知识，全部代码可用离线 `scalac` 毫秒级独立编译。

### Value Object & ExactType（#1）

<span class="at-badge at-kernel">KERNEL</span> **解决的问题**：防止“裸 `BigDecimal` / 裸 `String` 货币混算、精度丢失与非法枚举透传”。编译器直接从 `structures/exactTypes` 与 `valueObjects` 产出带构造不变量和算术方法的受限值对象（如 `Money`、`AmountDecimal`、`NavDecimal`、`BankCashAcknowledgement`），把精度与单位检查前移到构造期。

```scala
// generated-scaffold/scala/example/bankwealth/v2/domain/values/Money.scala
sealed abstract case class Money private (amount: BigDecimal, currency: String) {
  def isPositive: Boolean = amount > 0
  def plus(other: Money): Either[iMadzError, Money] =
    if (currency != other.currency) Left(iMadzError("EXACT_UNIT_MISMATCH", "exact units differ"))
    else for {
      lhs <- Money.checkedAmount(amount)
      rhs <- Money.checkedAmount(other.amount)
      result <- Money.checkedAmount(lhs + rhs)
    } yield new Money(result, currency) {}
}
```

### Domain Entity（#2）

<span class="at-badge at-kernel">KERNEL</span> **解决的问题**：定义聚合根的不可变 `State` 快照、`empty` 初始状态与 `sealed trait Event extends CborSerializable` 事实契约，确保领域状态结构与事件载荷只有一套真源。

```scala
// generated-scaffold/scala/example/bankwealth/v2/domain/entities/FundOrderEntity.scala
object FundOrderEntity {
  final case class State(netAmount: BigDecimal, paymentOutcome: String, taStatus: String)
  def empty: State = State(netAmount = BigDecimal("0.00"), paymentOutcome = "pending", taStatus = "pending")

  sealed trait Event extends CborSerializable
  final case class CashRequestSourceRecorded(principal: String, clientRequestId: String) extends Event
  final case class FundTASharesConfirmed(shares: Long, nav: BigDecimal) extends Event
  type EventHandler = (State, Event) => State
}
```

### EventHandler（#3）

<span class="at-badge at-kernel">KERNEL</span> **解决的问题**：保证事件溯源（Event Sourcing）的状态重放与 EARS `post:` 后置条件严格同构。`FundQuotaEventHandler` 从 EARS `post:` 表达式直接生成 `(State, Event) => State` 纯函数，杜绝“命令校验和状态折叠各写一套”的语义分叉。

```scala
// generated-scaffold/scala/example/bankwealth/v2/domain/entities/behaviors/FundQuotaEventHandler.scala
object FundQuotaEventHandler extends EventHandler {
  override def apply(state: State, input: Event): State = input match {
    case event: SubscriptionQuotaReserved =>
      state.copy(
        fundTotalUsed = (state.fundTotalUsed + event.amount),
        accountUsed = state.accountUsed.updated(
          event.accountId,
          (state.accountUsed.getOrElse(event.accountId, BigDecimal("0")) + event.amount))
      )
  }
}
```

### Aggregate Invariant Rules & RuleParams（#4 / #5 / #45）

<span class="at-badge at-kernel">KERNEL</span> **解决的问题**：把每条命令的纯输入参数封装为 `<Agg>RuleParams.<Cmd>Params`，并在 `<Agg>Rules` 中以 `InvariantRule[Event, State, Params]` 实现 **DMN FIRST-HIT（先拒绝、后发射）** 规则及 `checkEventPostconditions` 事实载荷防空校验。每个规则行都挂有 `@knowledge` 语义锚点以便逆向溯源。

```scala
// generated-scaffold/scala/example/bankwealth/v2/domain/invariants/FundQuotaRules.scala
final class ReserveSubscriptionQuotaRule(hosts: FundQuotaComputations)
    extends InvariantRule[Event, State, ReserveSubscriptionQuotaParams] {
  override def apply(state: State, p: ReserveSubscriptionQuotaParams): Either[iMadzError, List[Event]] = {
    if ((p.amount < state.minPurchase || p.amount > state.maxSingleLimit)) Left(iMadzError("QUOTA_AMOUNT_RANGE", "QUOTA_AMOUNT_RANGE"))
    else if (((state.fundTotalUsed + p.amount) > state.fundTotalCap)) Left(iMadzError("QUOTA_FUND_CAP", "QUOTA_FUND_CAP"))
    else if (((state.accountUsed.getOrElse(p.accountId, BigDecimal("0")) + p.amount) > state.perAccountCap)) Left(iMadzError("QUOTA_ACCOUNT_CAP", "QUOTA_ACCOUNT_CAP"))
    else Right(List(SubscriptionQuotaReserved(p.accountId, p.amount)))
  }
}
```

### Z3 Axioms & Replay（#48）

<span class="at-badge at-kernel">KERNEL</span> **解决的问题**：把编译期已经通过 [Z3 Prover](https://github.com/Z3Prover/z3) 验证过的 `axioms: ALWAYS` 翻译成运行期与测试期可复用的 `FundQuotaAxioms.checkAxioms(state)` 和 `replay(initial, events)`，防止外部旁路构造破坏全局业务公理。

```scala
// generated-scaffold/scala/example/bankwealth/v2/domain/entities/FundQuotaAxioms.scala
object FundQuotaAxioms {
  def replay(initial: State, events: Seq[Event]): State =
    events.foldLeft(initial)(FundQuotaEventHandler.apply)

  def checkAxioms(state: State): Seq[String] = {
    val violated = scala.collection.mutable.ListBuffer.empty[String]
    if (!(state.fundTotalUsed <= state.fundTotalCap)) violated += "AX-Q-1"
    if (state.accountUsed.keys.exists(accountId => !(state.accountUsed.getOrElse(accountId, BigDecimal("0")) <= state.perAccountCap))) violated += "AX-Q-2"
    violated.toSeq
  }
}
```

### Domain Computations Port & L2 @cloze Impl（#14 / #51）

<span class="at-badge at-seam">SEAM</span> **解决的问题**：对 `L1`（纯粹线性算术）聚合，`Computations` 自动生成 `Noop` 零成本实例；对 `L2`（含非线性计算如 `shares * nav <= netAmount` 或宿主算法）命令，编译器在 `domain/services/<Agg>Computations.scala` 吐出强类型 Port，同时在 `handwritten/` 下初始化永不覆写的 `*ComputationsImpl.scala` `@cloze` 隔离区，再由 `GeneratedBindingsModule` 通过 Guice 绑定回去。

---

## 四、Application 应用层（写侧协议、读侧物化、反应式策略与长流程）

这一层把纯 Domain 内核组织成可调度的 CQRS 用例：写入指令怎么进、读模型怎么折叠、`Event => Command` 策略怎么反应、多聚合长流程怎么编排。

### Aggregate Protocol & CommandHelpers（#7 / #11）

<span class="at-badge at-seam">SEAM</span> <span class="at-badge at-glue">GLUE</span> **解决的问题**：定义 [Akka Cluster Sharding](https://doc.akka.io/docs/akka/current/typed/cluster-sharding.html) 所需的消息信封（`sealed trait Command` 带 `replyTo: ActorRef[Reply]`，`Reply` 为 `Accepted(events)` 或 `Refused(error)`），并用 `CommandHelpers` 完成 `Command → RuleParams` 的纯胶水拆包转换，确保 Domain `Rules` 永远不认识 `ActorRef`。

```scala
// generated-scaffold/scala/example/bankwealth/v2/application/aggregates/FundOrderProtocol.scala
object FundOrderProtocol {
  sealed trait Command extends CborSerializable
  final case class RecordFundTAConfirmed(shares: Long, nav: BigDecimal, replyTo: ActorRef[Reply]) extends Command
  final case class RequestIndependentRefund(orderId: String, replyTo: ActorRef[Reply]) extends Command
  final case class GetState(replyTo: ActorRef[State]) extends Command

  sealed trait Reply extends CborSerializable
  final case class Accepted(events: Vector[Event]) extends Reply
  final case class Refused(error: iMadzError) extends Reply
  type CommandHandler = (State, Command) => Effect[Event, State]
}
```

### Aggregate, Factory & Behaviors（#6 / #8 / #9 / #10）

<span class="at-badge at-glue">GLUE</span> **解决的问题**：标准 **Glue 层**。`<Agg>Aggregate` 声明 `EntityTypeKey` 与分片标签 `tags`；`<Agg>Behaviors` 调用公共运行时 `runReplyingPolicy(rule, helper)(state, cmd).withPost(checkEventPostconditions).replyWith(cmd.replyTo)`，把无框架依赖的 Domain Rule 变成持久化 `Effect.persist(...).thenReply(...)`。

```scala
// generated-scaffold/scala/example/bankwealth/v2/application/aggregates/behaviors/FundQuotaBehaviors.scala
private def executionBehavior(state: State, hosts: FundQuotaComputations): PartialFunction[Command, Effect[Event, State]] = {
  case cmd: ReserveSubscriptionQuota =>
    runReplyingPolicy(new FundQuotaRules.ReserveSubscriptionQuotaRule(hosts), ReserveSubscriptionQuotaHelper)(state, cmd)
      .withPost(FundQuotaRules.checkEventPostconditions)
      .replyWith(cmd.replyTo)
}
```

### Aggregate Repository Port（#12）

<span class="at-badge at-seam">SEAM</span> **解决的问题**：对上层用例/网关暴露聚合访问接口（`trait <Agg>Repository`），把 `ClusterSharding` 的 `EntityRef.ask` 异步细节隐藏在基础设施实现里。

### Application Story Port, CallerContractSpec & L3 @cloze Impl（#51 / #52）

<span class="at-badge at-kernel">KERNEL</span> <span class="at-badge at-seam">SEAM</span> **解决的问题**：针对 `layer: application` 的 `*.story.ears` / `*.integration.ears` 编排故事，生成器产出入站 `Request`、`ExternPorts`（只读幂等与鉴权谓词）、`EffectsPort`（`pin` / `dispatch`）、强类型 `CallerContractSpec`（`idempotencyKey`、`retryPolicy`、`forbiddenUntrustedFields`，彻底取代不安全的字符串 JSON）以及 `Handler`；人工或 AI 只需在 `handwritten/` 的 `<Story>Impl.scala` `@cloze` 槽中实现编排语义，受锁定 Oracle 测试监督。

```scala
// generated-scaffold/scala/example/bankwealth/v2/application/services/CashFundPurchasePort.scala
trait CashFundPurchaseHandler extends ApplicationService {
  def handle(req: CashFundPurchaseRequest, externs: CashFundPurchaseExternPorts, effects: CashFundPurchaseEffectsPort): Either[iMadzError, CashFundPurchaseSuccessResponse]
}
object CashFundPurchaseCallerContract {
  val spec: CallerContractSpec = CallerContractSpec(
    idempotencyKey = "(principal, clientRequestId)",
    retryPolicy = "at-least-once safe; replayed identical payload must never re-dispatch settlement",
    forbiddenUntrustedFields = Seq("operationId", "investorAccountId", "fundCollectionAccountId")
  )
}
```

### ReadModel View, QueryService & ReadSide Projection（#15 / #23 / #26 / #27 / #28）

<span class="at-badge at-kernel">KERNEL</span> <span class="at-badge at-glue">GLUE</span> **解决的问题**：实现 CQRS 读写分离。从 `readModels[*]` 产出 `<View>.scala`、`QueryService`、`ReadsideRepository` 接口、[`Akka Projection`](https://doc.akka.io/docs/akka-projection/current/) 定义 `<View>ReadsideProjection`、`<View>ReadsideProjectionHandler`，以及 `#26` `<Stem>ApplyEvent` + `ApplyEventSemantics` 隔离扩展口（允许手写 `ApplyEventSemanticsImpl` 注入自定义字段推导，并通过 `<Context>ProjectionModule` 单独绑定）。

```scala
// generated-scaffold/scala/example/bankwealth/v2/application/readmodels/bank_order_readside/BankOrderReadsideProjectionHandler.scala
override def process(envelope: EventEnvelope[Any]): Future[Done] =
  envelope.event match {
    case e: FundOrderEntity.CashRequestSourceRecorded =>
      val base = BankOrderView(clientRequestId = envelope.persistenceId)
      repository.upsert(base.copy(principal = e.principal, clientRequestId = e.clientRequestId)).map(_ => Done)
    case _ => bindings.onUnmatchedEvent(envelope)
  }
```

### Reactive Policy & PolicyMachine（#55–#58 / #60）

<span class="at-badge at-kernel">KERNEL</span> <span class="at-badge at-glue">GLUE</span> **解决的问题**：把 EARS `WHEN event <SrcAgg>.<SrcEvent> SHALL dispatch <TargetAgg>.<TargetCmd>` 反应式策略装配成可重试、带 DLQ 吞毒的 Akka Projection 闭环——这正是 v2 从 54 族扩展到 **60 族**的新增核心家族群：

- **`#55 policy-decision` (`PolicyOn<Cmd>.scala`)**：纯内核 `(decide, dispose)` 函数对与 `DefaultSemantics`，不含任何 Akka 依赖；
- **`#56 policy-mechanics` (`PolicyOn<Cmd>Mechanics.scala`)**：通过 `ClusterSharding.entityRefFor(EntityKey, entityId).ask[Reply]` 派发命令，把 `Refused(err)` 映射为 `Left(err)`；
- **`#57 policy-handler` (`PolicyOn<Cmd>Handler.scala`)**：Akka `Handler[EventEnvelope[Any]]` 装配壳，负责 `Event` 解码、包裹 `PolicyEnvelope` 并喂入 `PolicyMachine.run`；
- **`#58 policy-runner` (`PolicyOn<Cmd>Runner.scala`)**：封装 `EventSourcedProvider.eventsByTag` 与 `ProjectionId`；
- **`#60 projection-runtime-mechanism` (`PolicyMachine.scala` / `FailureVerdict.scala` / `PolicyEnvelope.scala` / `PolicyDlqBury.scala`)**：共享 4 段效果管线，并**显式检查 `Future.traverse(commands)(execute)` 返回列表中的每一个 `Left(err)`**——`Permanent` 送入 `PolicyDlqSink.bury` 后推进 offset，`Retryable` 则返回失败 `Future` 以阻断 offset 提交触发重放；此外守护进程注册 trait 对应 **`#59 policy-bootstrap`**（见第 5.4 节）。

```scala
// application/projection/policy/PolicyMachine.scala (metarch-truthsrc scala-cqrs-play-service:2 @ 1e87c6a)
Future
  .traverse(commands)(execute)
  .flatMap { results =>
    val verdicts = results.collect { case Left(err) => dispose(e, err) }
    val permanents = verdicts.collect { case p: FailureVerdict.Permanent => p }
    val retryables = verdicts.collect { case r: FailureVerdict.Retryable => r }
    Future
      .traverse(permanents)(p => bury(envelope, s"$aggType·${p.what}"))
      .flatMap { _ =>
        retryables.headOption match {
          case Some(FailureVerdict.Retryable(err)) =>
            Future.failed(new RuntimeException(s"[policy] $aggType retryable failure: err=${err.code}"))
          case None => Future.successful(())
        }
      }
  }
```

### Orchestration, Saga, EffectFace & ExternalEventBridge（#13 / #16–#21 / #40–#44 / #46）

<span class="at-badge at-kernel">KERNEL</span> <span class="at-badge at-seam">SEAM</span> **解决的问题**：承接多步 Saga、外部工具闸门（`ConnectorPort`）、外部副作用契约（`EffectFace` + `Host`）以及跨限界上下文集成（`#46 ExternalEventBridge` → `<Agg>ExternalEvents` + `ExternalAuthority` 4 处同步）。v2 通过 `#40`–`#44` 统一了 v1 的旧 `#16`–`#21` Saga 家族，用单一状态机事件与确定性步骤序列表替代碎裂的 Saga 模板。

---

## 五、Infrastructure 基础设施层（序列化、持久化与分解后的粘合引导）

外层基础设施解决“领域事件如何落盘、ReadModel/DLQ 如何写库、外部端口如何接上真实适配器”，并承担**把所有分解后的部件最终粘合起来**的工程职责。

### Protobuf Schema, ProtoConverters & Serialization Adapters（#29–#33）

<span class="at-badge at-glue">GLUE</span> **解决的问题**：保证 [Akka Persistence Typed](https://doc.akka.io/docs/akka/current/typed/persistence.html) 事件日志的长期演进兼容性（绝不用易碎的 Java/Jackson 全自动序列化直接写 State/Event）。生成器产出一整套 [ScalaPB](https://scalapb.github.io/) `.proto`、领域与 PO 互转的 `*ProtoConverters`、`*EventAdapter` / `*SnapshotAdapter`，以及通过 `ClassTag` 显式注册所有消息清单的 `DomainProtoSerializer`。

```scala
// infrastructure/persistence/FundOrderEventAdapter.scala & DomainProtoSerializer.scala
class FundOrderEventAdapter extends EventAdapter[Event, pb.FundOrderEventPO] with FundOrderProtoConverters {
  override def manifest(event: Event): String = "FundOrderEventPO"
  override def toJournal(event: Event): pb.FundOrderEventPO = encodeFundOrderEventPO(event)
  override def fromJournal(envelope: pb.FundOrderEventPO, manifest: String): EventSeq[Event] =
    EventSeq.single(decodeFundOrderEventPO(envelope))
}
```

### Repository Impl, ReadSide DDL & PolicyDlqBury（#12 / #24）

<span class="at-badge at-glue">GLUE</span> **解决的问题**：实现读库建表 DDL（`<View>ReadsideSchema`）、基于 [ScalikeJDBC](http://scalikejdbc.org/) 的幂等 `ON CONFLICT DO UPDATE` 读写实现（`<View>RepositoryImpl`），以及策略毒丸事件持久化兜底 `PolicyDlqBury`（写入 `kn_projection_dlq`）。

### Outbound Connectors & Effect Implementations（#25）

<span class="at-badge at-glue">GLUE</span> **解决的问题**：为 Application 层的 `ExternPorts`、`EffectsPort`、`ConnectorPort` 与 `EffectFace.Port` 提供可运行默认桩（`DefaultOutboundConnectors`、`InMemoryStore`）以及隔离区真实实现承接点（`*ConnectorImpl`、`*EffectPortImpl`）。

### Bootstrap Traits（#47 / #38b / #38c / #38d / #59 policy-bootstrap）

<span class="at-badge at-glue">GLUE</span> **解决的问题**：把复杂的 Akka 生命周期启动仪式从业务代码中完全剥离。每个聚合产出 `<Agg>Bootstrap`（装配 `EventSourcedBehavior`、`withTagger`、`RetentionCriteria`、`SupervisorStrategy` 与 `EventAdapter`），每个 ReadSide / Policy / Saga / Effect 各自产出对应的 `*Bootstrap` trait，内部统一使用 `ShardedDaemonProcess` 按标签分片拉起。

```scala
// infrastructure/bootstrap/FundQuotaBootstrap.scala
EventSourcedBehavior[Command, Event, State](
  persistenceId = PersistenceId.ofUniqueId(persistenceId),
  emptyState = initial,
  commandHandler = FundQuotaAggregate.commandHandler(hosts),
  eventHandler = FundQuotaEventHandler.apply
).withTagger(_ => Set(tag))
 .withRetention(RetentionCriteria.snapshotEvery(numberOfEvents = 100, keepNSnapshots = 3))
 .eventAdapter(new FundQuotaEventAdapter)
 .snapshotAdapter(new FundQuotaSnapshotAdapter)
```

### Guice DI Wiring & ApplicationBootstrap（#38 / #50）

<span class="at-badge at-glue">GLUE</span> **解决的问题**：这是**全系统重新粘合的总开关**——把前面 50 多个零散的 Kernel、Seam 与 Glue 文件通过四段嵌套装配成一台完整的 [Google Guice](https://github.com/google/guice) + [Play Framework](https://www.playframework.com/) 应用：

1. **`BootstrapModule`**：绑定聚合仓库实现 `<Agg>RepositoryImpl`，通过 `installOptionalModule` 加载隔离区模块 `HandwrittenBindingsModule`，最后把 `ApplicationBootstrap` 设为 `.asEagerSingleton()`。
2. **`HandwrittenBindingsModule`（`handwritten/` 绝不覆写）**：默认一行 `install(new GeneratedBindingsModule())` + `install(new <Ctx>ProjectionModule())`，人工需要替换生产级实现时只需在此覆盖绑定。
3. **`GeneratedBindingsModule`**：根据行为分层自动完成闭环绑定——`L1` 聚合绑定 `Computations.Noop`，`L2` 聚合绑定 `*ComputationsImpl`，`L3` 故事绑定 `*Impl`，以及 `ReadsideRepositoryImpl`、`ToolGate`、`PolicyDlqSink`、`PolicyOn<Cmd>Semantics` 与 `HttpRouter`。
4. **`ApplicationBootstrap`**：以多 trait 混入（`with FundQuotaBootstrap with FundOrderBootstrap with CreditBalanceBootstrap with BankOrderReadsideBootstrap with PolicyOn<Cmd>Bootstrap`）在构造期顺序启动全部聚合分片与 `ShardedDaemonProcess` 投影。

---

## 六、Interfaces 与 Service Runtime 层（HTTP 入口、5 层鉴权与构建脚手架）

接口与服务壳只做三件事：**认证鉴权、协议翻译、以及把依赖打包成可编译运行的 Play/sbt 工程**。

### 5-Layer Authz PEP/PDP & ApiDto（#49）

<span class="at-badge at-kernel">KERNEL</span> <span class="at-badge at-seam">SEAM</span> **解决的问题**：将认证（`Principal`）、角色/策略决策点（`AuthorizationPort`、`AuthzDecisionQuery`）、Entitlement 校验（`EntitlementPort`）、CSRF 防护与 HTTP 状态码映射标准化，并承接从 `readModels[*].rowScopeSpec` 生成的行级权限上下文。

### HTTP Controllers, AggregateStateApiController & CommandDsl（#34–#36）

<span class="at-badge at-glue">GLUE</span> **解决的问题**：为每个暴露 HTTP 的 Story 生成薄控制器 `<Story>Controller`——合并路径/Query/Body 与 `Principal`，调用 `<Story>Handler.handle(...)`，并在返回前执行 **RowScope 行级防越权（IDOR）兜底校验**（不匹配时直接截断返回 `403 FORBIDDEN_ROW_SCOPE`）；同时提供聚合状态只读探测控制器 `#34 AggregateStateApiController`。

```scala
// interfaces/http/CashFundPurchaseController.scala
handler.handle(appReq, externs, effects) match {
  case Left(err) => HttpResponse(status = HttpStatusMapper.statusForRejection(err.code), body = Map("ok" -> false, "code" -> err.code))
  case Right(res) =>
    // Enforces rowScope matchField against req.principal before returning 200
    if (rowScopeDenied) HttpResponse(status = 403, body = Map("ok" -> false, "code" -> "FORBIDDEN_ROW_SCOPE"))
    else HttpResponse(status = 200, body = withView)
}
```

### ServiceContract, ServiceLoader, PlayHttpBridge & Routes（#37 / #38）

<span class="at-badge at-glue">GLUE</span> **解决的问题**：`ServiceContract` 在启动时执行端点自检（`requireInstalled`），`ServiceLoader` + `PlayHttpBridge` + `conf/routes` 将 Play 请求安全解包并分派给强类型的 `HttpRouter`。

### Project Scaffold & Runtime Configs（#39）

<span class="at-badge at-glue">GLUE</span> **解决的问题**：一键产出完整可构建工程元数据：`build.sbt`（精确接入 `generated-scaffold/scala` 与 `handwritten/scala` 双源码目录及 ScalaPB 代码生成插件）、`project/plugins.sbt`、`conf/serialization.conf`（绑定 `DomainProtoSerializer` 与 Saga/Effect 序列化器）和开箱可跑的本地 `conf/dev.conf`。

---

## 七、Verification & BDD Oracle 治理层（把架构边界变成机器闸门）

与常见生成器最大的区别在于：**验证产物本身就是一级 Artifact Type**，并且与产品代码同源编译。

### Gherkin Features, Executable Oracles & Locked Manifest（#53）

<span class="at-badge at-kernel">KERNEL</span> **解决的问题**：`test-emitter` 根据 Z3 反例/见证直接生成 `.feature` 规约、TypeScript `node:test` Oracle、ScalaTest `AnyFunSuite` Oracle 以及 `generated-tests/manifest.sha256.json`。由于测试脚本写入受 SHA-256 防篡改锁定，任何 AI 或开发者在填写 `handwritten/` `@cloze` 时都不能“改测试来凑通过”。

### Mutation Gate & Onion DIP Gate（#54）

<span class="at-badge at-glue">GLUE</span> **解决的问题**：`verify-v2` 在交付前自动执行双重硬闸门：① **Onion DIP Gate（`checkOnionDipBoundaries`）** 扫描全部 `domain/` 与 `application/` 源文件，确认 0 条外层逆向导入；② **Domain Mutation Gate（`mutation-gate.mjs`）** 自动对生成出的规则边界做条件取反与符号变异（如 `<` ↔ `<=`），要求锁定测试 **100% 击杀变异体**。

---

## 八、端到端实例串联：一笔理财申购如何穿过 5 层洋葱与胶水

结合 [`bank-wealth-demo`](https://github.com/co-arising/bank-wealth-demo) 与刚落地的 Reactive Policy 闭环，我们可以完整追踪一条真实请求与事件链在 60 族（64 种）Artifact Type 之间的穿梭轨迹：

1. **HTTP 入站（Layer 4）**：`POST /api/v1/bankwealth/bank-cash-submit-port/submit` 经 `PlayHttpBridge` + `HttpRouter` 进入 `CashFundPurchaseController`，由 `ApiDto`（#49）完成 `investor` 角色与 `Principal` 注入。
2. **应用层编排与幂等缝（Layer 2 + Seam）**：`CashFundPurchaseImpl` 实现 `CashFundPurchaseHandler`（#51），先查 `ExternPorts.requestExists` 与 `payloadMatchesOriginal`（受 `CallerContractSpec` `(principal, clientRequestId)` 与禁止不可信字段 `investorAccountId` 约束），通过后触发 `EffectsPort.pin` 与 `dispatch`。
3. **写侧实体与领域内核（Layer 2 Glue → Layer 1 Kernel）**：命令经 `FundQuotaAggregate.EntityKey` 与 `FundQuotaBehaviors` 进入 `FundQuotaRules.ReserveSubscriptionQuotaRule`（#45）；通过 `Money`（#1）精确算术检查后发射 `SubscriptionQuotaReserved`（#2），再经 `FundQuotaEventHandler`（#3）确定性更新配额状态并由 `FundQuotaAxioms.checkAxioms`（#48）护航。
4. **序列化落盘与异步投影（Layer 3 + Layer 2）**：`FundQuotaEventAdapter` 与 `DomainProtoSerializer`（#29–#33）将事件按 Protobuf 写入持久化日志并打上 `tags`；`ShardedDaemonProcess` 拉起两条独立消费通道：
   - **读侧投影**：`BankOrderReadsideProjectionHandler`（#28）消费事件并调用 `BankOrderReadsideRepositoryImpl`（#24）写入读表，供 `BankOrderViewQueryService`（#15）查询；
   - **反应式 Policy 闭环**：当出现 `WHEN event <SrcAgg>.<SrcEvent> SHALL dispatch <TargetAgg>.<TargetCmd>` 时，`PolicyOn<Cmd>Runner` 订阅源聚合事件流，经 `PolicyMachine.run` 驱动 `PolicyOn<Cmd>.DefaultSemantics.decide` 与 `PolicyOn<Cmd>Mechanics` 向目标聚合发送命令；若回执为 `Refused(err)`，`Left(err)` 经 `dispose` 分流给 `PolicyDlqBury`（`Permanent` 落 `kn_projection_dlq` 并推进 offset）或返回失败 `Future`（`Retryable` 触发重放）。

---

## 九、Artifact Type 升级同步契约与未来目标架构规范（Rust / Axum 范式）

为了让这份架构地图**永远不和 `metarch-truthsrc` 源码漂移**，站点流水线已经把产物目录同步做成了一条机器可验证的闭环（同步规范见 `docs/artifact-map-authoring-contract.md`）：

1. **`metarch-truthsrc` 源头指纹**：`lib/v2/surface-registry.mjs` 扫描全部 `generators/*/generator.json`（`schemaVersion === "truthsrc.product-generator/v2"`），计算每个目标技术栈的 `catalogSha256`（覆盖 `artifactFamilyCoverage`、`producers` 与 `artifactKinds`）并写入 `exportCapabilitiesLock()`。
2. **双仓锁文件对齐**：`co-arising.github.io/tools/sync-site-facts.mjs --write` 将 `targetArtifactCatalogs` 写入 `assets/data/facts.lock.json`；`assets/data/artifact-maps.lock.json` 为每一个目标栈绑定对应的双语地图文章 `slug`、期望 `catalogSha256`、`truthsrcShort` 与 `bankShort`。
3. **CI 阻断门禁**：`sync-site-facts.mjs --check`（在 `site_ci.yml` 中每次 push/PR 自动运行）强制校验——**只要 `metarch-truthsrc` 新增或升级了任意 Artifact Type，或新增了一个目标技术栈生成器，就必须同步更新对应的双语地图文章（含 `truthsrcShort` 与 `catalogSha256` 前 12 位指纹）与锁文件，否则 CI 直接报错阻断**。

### 未来扩展规范：如果增加 Rust 目标架构（例：`rust-cqrs-axum-service:2`）

参考我们在[扩展代码生成器指南](https://co-arising.github.io/zh/articles/metarch-truthsrc-extending-code-generator-20261126/)中的 Rust 工程蓝图，任何未来新增的 Rust（例如 `Axum + Tokio + SQLx + Prost + Tonic`）v2 生成器一旦注册进 `generators/`，其配套 Artifact Type 地图文章必须按同等洋葱五层框架提供对应映射与真实 Rust 样例：

<div class="article-table">
<table>
<thead>
<tr><th>洋葱层次</th><th>Play / Scala 角色</th><th>Rust 目标对应 Artifact Type（例：<code>rust-cqrs-axum-service:2</code>）</th><th>Kernel / Seam / Glue 归属</th></tr>
</thead>
<tbody>
<tr><td><strong>Layer 1 · Domain Core</strong></td><td><code>Money</code>、<code>*Entity</code>、<code>*EventHandler</code>、<code>*Rules</code>、<code>*Axioms</code>、<code>*Computations</code></td><td>纯零依赖 Workspace Crate <code>domain</code>：Newtype/<code>rust_decimal</code>、<code>enum Event</code>、<code>fn apply(state, ev)</code>、<code>fn handle(state, params) -&gt; Result&lt;Vec&lt;Event&gt;, DomainError&gt;</code>、<code>trait Computations</code></td><td><span class="at-badge at-kernel">KERNEL</span> + <span class="at-badge at-seam">SEAM</span></td></tr>
<tr><td><strong>Layer 2 · Application</strong></td><td><code>*Protocol</code>、<code>*StoryPort</code>、<code>*ReadsideProjection</code>、<code>PolicyMachine</code></td><td>Crate <code>application</code>：命令/回执 DTO、<code>async trait Repository</code>、<code>CallerContract</code> 常量、<code>ReadsideProjector</code> 与 <code>PolicyMachine::run</code> 效果循环</td><td><span class="at-badge at-kernel">KERNEL</span> + <span class="at-badge at-seam">SEAM</span> + <span class="at-badge at-glue">GLUE</span></td></tr>
<tr><td><strong>Layer 3 · Infrastructure</strong></td><td><code>*.proto</code> / <code>*Serializer</code> / <code>*RepositoryImpl</code> / <code>GeneratedBindingsModule</code></td><td>Crate <code>infrastructure</code>：<code>prost</code> `.proto` 编码、<code>sqlx</code> Outbox/ReadSide/DLQ 实现、<code>AppState</code> 依赖注入容器与后台消费任务</td><td><span class="at-badge at-glue">GLUE</span></td></tr>
<tr><td><strong>Layer 4 · Interfaces &amp; Runtime</strong></td><td><code>*Controller</code>、<code>ApiDto</code>、<code>HttpRouter</code>、<code>build.sbt</code></td><td>Crate <code>interfaces</code> + 二进制入口：<code>axum::Router</code>、Tower 中间件 5 层 Authz Extractor、<code>RowScope</code> 响应守卫与 <code>Cargo.toml</code> workspace</td><td><span class="at-badge at-kernel">KERNEL</span> + <span class="at-badge at-glue">GLUE</span></td></tr>
<tr><td><strong>Layer 5 · Verification</strong></td><td>Gherkin + ScalaTest + Mutation Gate + DIP Check</td><td><code>cargo test</code> BDD Oracle、<code>cargo-mutants</code> Guard 变异门禁与 <code>Cargo.toml</code> 依赖方向检查（<code>domain</code> 严禁依赖 <code>tokio/axum/sqlx</code>）</td><td><span class="at-badge at-kernel">KERNEL</span> + <span class="at-badge at-glue">GLUE</span></td></tr>
</tbody>
</table>
</div>

### 延伸参考资料

- [metarch-truthsrc 主仓源码](https://github.com/co-arising/metarch-truthsrc) · [生成器架构总览 (`CODEGEN.md`)](https://github.com/co-arising/metarch-truthsrc/blob/main/CODEGEN.md) · [EARS v2 文法规范](https://github.com/co-arising/metarch-truthsrc/blob/main/knowledge_base/reference/ears_v2_grammar_reference.md)
- [bank-wealth-demo 银行试点参考仓](https://github.com/co-arising/bank-wealth-demo) · [co-arising 2.0 GA 端到端实战](https://co-arising.github.io/zh/articles/co-arising-v2-ga-prd-to-running-guide-20261126/)
- [Onion Architecture (Jeffrey Palermo)](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/) · [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/)
