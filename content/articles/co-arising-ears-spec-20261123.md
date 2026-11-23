# co-arising EARS 1.0 技术规格说明书（v1.2 双语对照版）

**文档版本**：`1.2.1`

**适用范围**：`metarch-truthsrc` / `truthsrc-smt` / `co-arising` 编译器与 AI Agent Harness 工具链

**参考基准项目**：`co-arising/bank-wealth-demo`（单笔申购与退款 `FundOrder`、金融额度门限 `FundQuota`、流批一体定投 `SipPlan`、用户故事 `CashFundPurchase`）

**核心原则**：受控 EARS 唯一真源（Single Truth Source）、创作自由（允许 LLM 白话起草）、AC/决策表单向只读投影、自然动宾语法与高信息密度、无实现泄漏（Solution-Free）、`SMT-LIB 2` 标准求解器无关

## 1. 架构总览：唯一真源 + 单跳验证 + 只读投影

在已经完成结构化领域建模（Event / Command / Role / Aggregate / Policy / Timer / Context Mapping / User Story Mapping）的前提下，`co-arising` 确立**单跳确定性验证闭环**，避免引入“白话 AC → LLM 翻译 → EARS → `.smt2`”的双跳有损回溯：

```
  [创作辅助层（不入库）]         [Git 仓库唯一真源]              [确定性单跳编译与只读投影]
  ─────────────────────       ────────────────────────       ─────────────────────────────────
  白话想法 / 事件风暴笔记                                      ┌─▶ 投影 1：风格 E（PM 友好白话 AC）
        │                                                     ├─▶ 投影 2：风格 B（DMN 决策表视图）
        ▼ (可选 LLM 起草)                                      ├─▶ 投影 3：SMT-LIB 2 (.smt2) ──▶ Z3/cvc5
  领域负责人审定合并 ────────▶  受控 EARS 1.0 真源             │     ├── 冲突/缺口 ──▶ A/B 需求澄清卡
                              (英文主标准 + 双语同构词法)      │     └── 全绿通过  ──▶ 边界证人样本
                                                              └─▶ 投影 4：TestIR ──▶ 锁定 Gherkin / ScalaTest
                                                                                    ──▶ @cloze TDD 完形填空

```

1. **创作自由**：对 EARS 真源负责的角色（架构师、领域专家或 Tech Lead）可以借助 LLM 把白话需求快速起草为受控 EARS，但白话草稿不作为持久层入库。

2. **唯一真源**：Git 仓库仅维护一份绑定 `truthsrc` 符号表的受控 EARS（支持 **风格 A：自然缩进版** 为主标准，可选同构的 **风格 C：块状 DSL 版**）。

3. **单向只读投影**：PM 审阅用的白话 AC（风格 E）与风控/架构扫盲用的决策表（风格 B），均由编译器从 EARS 真源确定性生成，随时可重建，永不漂移。

## 2. `co-arising EARS 1.0` 语言规范

### 2.1 双语同构关键字表（英文主标准 + 中文可选别名）

以英文关键字作为开源主标准（Canonical Profile），词法层（Lexer）原生支持中文同构关键字及 Unicode 业务谓词标识符——两者 100% 编译为同一棵 AST 与同一份 `.smt2`。

| 语义类别 | 英文主标准（Canonical） | 中文同构别名（CN Profile） | 语法与表达约定 | 
| ----- | ----- | ----- | ----- | 
| **切片/故事头** | `slice` / `story` | `切片` / `故事` | 声明归属聚合切片或应用层用户故事 | 
| **命名谓词区** | `where:` / `extern` | `定义:` / `外部判定` | 复用高频条件；**强制正向肯定命名**（禁用“未/不/无”开头，杜绝双重否定） | 
| **全局公理** | `axioms:` / `ALWAYS` | `公理:` / `恒成立` | 初始态及任意状态折叠后恒成立的系统底线 | 
| **规则区** | `rules:` / `[RULE_ID]` | `规则:` / `[RULE_ID]` | 行内 `[RULE_ID]` 直连 `truthsrc` 的 `aggregateRuleRefs` 稳定锚点 | 
| **EARS 结构词** | `WHILE` / `WHEN` / `IF ... THEN` / `WHERE` | `当处于` / `当收到` / `如果 ... 则` / `当启用` | 解析器按首词自动推导句型，无需手写 `pattern:` | 
| **模态词** | `SHALL` / `SHALL NOT` | `必须` / `禁止` | 强制行为与禁止行为（SMT 互斥冲突源） | 
| **自然逻辑词** | `and` / `or` / `not` / `in` / `is` / `is not` | `且` / `或` / `不满足` / `属于` / `为` / `不为` | 替代代码逻辑符，支持类 DMN FEEL 区间 `[min..max]` 与 `[start..end)` | 
| **领域动作** | `reject [request] with <Code>` | `拒绝请求，返回 <Code>` | **动宾结构严格正确**：宾语为被拒请求，错误码为原因/返回码 | 
| **领域动作** | `emit` / `transition ... -> ...` / `succeed-empty` / `keep` | `发射` / `状态变为` / `幂等空成功` / `维持` | 覆盖事件溯源、状态机迁移与幂等重入无副作用语义 | 
| **应用动作** | `pin ... from (...)` / `dispatch` / `respond ... with` / `expose ... as` | `固定` / `派发` / `响应` / `展示` | 专用于 `layer: application` 的可信边界与读模型隔离 | 
| **后置折叠** | `post:` (`x' = ...`) | `变更后:` | 供 Z3 执行不变式归纳证明（`Inv(s) ∧ Guard ∧ Post ⇒ Inv(s')`） | 

### 2.2 形式化 EBNF 文法（风格 A 双语同构内核）

语法层仅依赖抽象关键字 Token（`KW_*`），词法层统一承接英文主标准与中文同构别名，确保双语输入 100% 解析为同一棵 AST：

```ebnf
(* ═══ 1. 语法产生式（Syntactic Productions，语言无关） ═══ *)
SpecFile        ::= Header [ WhereSection ] [ AxiomsSection ] RulesSection ;
Header          ::= (KW_SLICE | KW_STORY) QualifiedName [ KW_LAYER (KW_DOMAIN | KW_APP) ] ;

WhereSection    ::= KW_WHERE_SEC ":" { PredDef | ExternDef } ;
PredDef         ::= Ident "=" BoolExpr [ KW_AS StringLit ] ;   (* "as" 供投影为风格 E 白话短语 *)
ExternDef       ::= KW_EXTERN Ident [ "(" IdentList ")" ] [ KW_AS StringLit ] ;

AxiomsSection   ::= KW_AXIOMS ":" { "[" RuleId "]" KW_ALWAYS (BoolExpr | Modality ActionList) } ;
RulesSection    ::= KW_RULES ":" { RuleEntry } ;
RuleEntry       ::= "[" RuleId "]" Statement [ PostSection ] ;

Statement       ::= KW_ALWAYS Modality ActionList
                  | [ KW_OPT BoolExpr ] [ KW_WHILE BoolExpr ] KW_WHEN Ident [ KW_AND BoolExpr ] Modality ActionList
                  | [ KW_OPT BoolExpr ] [ KW_WHILE BoolExpr ] KW_IF BoolExpr [ KW_WHILE BoolExpr ] [ KW_WHEN Ident ] KW_THEN Modality ActionList ;

Modality        ::= KW_SHALL | KW_SHALL_NOT ;
ActionList      ::= Action { KW_AND Action } ;

Action          ::= RejectAction
                  | KW_EMIT Ident
                  | KW_TRANSITION Path "->" Expr
                  | KW_SUCCEED_EMPTY
                  | KW_KEEP BoolExpr
                  | KW_PIN Ident KW_FROM "(" IdentList ")"
                  | KW_DISPATCH QualifiedName
                  | KW_RESPOND Ident [ KW_WITH BoolExpr ]
                  | KW_EXPOSE Ident KW_AS BoolExpr ;

RejectAction    ::= "reject" [ "request" | Ident ] "with" Ident
                  | "拒绝" [ "请求" | Ident ] ("，" | ",") "返回" Ident ;

PostSection     ::= KW_POST ":" { Path "'" "=" Expr } ;

BoolExpr        ::= OrExpr ;
OrExpr          ::= AndExpr { KW_OR AndExpr } ;
AndExpr         ::= NotExpr { KW_AND NotExpr } ;
NotExpr         ::= KW_NOT NotExpr | AtomPred ;
AtomPred        ::= Expr ("==" | "!=" | ">" | ">=" | "<" | "<=") Expr
                  | Expr [ KW_NOT ] KW_IN ( SetLit | IntervalLit | Path )
                  | Path KW_IS [ KW_NOT ] (KW_EMPTY | KW_NON_EMPTY)
                  | "(" BoolExpr ")"
                  | Ident [ "(" ArgList ")" ] ;
IntervalLit     ::= ("[" | "(") Expr ".." Expr ("]" | ")") ;

(* ═══ 2. 双语词法终结符映射（Bilingual Lexical Productions） ═══ *)
KW_SLICE        ::= "slice"         | "切片" ;
KW_STORY        ::= "story"         | "故事" ;
KW_LAYER        ::= "layer"         | "层级" ;
KW_DOMAIN       ::= "domain"        | "领域" ;
KW_APP          ::= "application"   | "应用" ;
KW_WHERE_SEC    ::= "where"         | "定义" ;
KW_EXTERN       ::= "extern"        | "外部判定" ;
KW_AXIOMS       ::= "axioms"        | "公理" ;
KW_RULES        ::= "rules"         | "规则" ;
KW_POST         ::= "post"          | "变更后" ;

KW_ALWAYS       ::= "ALWAYS"        | "恒成立" ;
KW_OPT          ::= "WHERE"         | "当启用" ;
KW_WHILE        ::= "WHILE"         | "当处于" ;
KW_WHEN         ::= "WHEN"          | "当收到" ;
KW_IF           ::= "IF"            | "如果" ;
KW_THEN         ::= "THEN"          | "则" ;
KW_SHALL        ::= "SHALL"         | "必须" ;
KW_SHALL_NOT    ::= "SHALL" "NOT"   | "禁止" ;

KW_AND          ::= "and" | "AND"   | "且" ;
KW_OR           ::= "or"  | "OR"    | "或" ;
KW_NOT          ::= "not" | "NOT"   | "不满足" ;
KW_IN           ::= "in"            | "属于" ;
KW_IS           ::= "is"            | "为" ;
KW_EMPTY        ::= "empty"         | "空" ;
KW_NON_EMPTY    ::= "non-empty"     | "非空" ;

KW_EMIT         ::= "emit"          | "发射" ;
KW_TRANSITION   ::= "transition"    | "状态变为" ;
KW_SUCCEED_EMPTY::= "succeed-empty" | "幂等空成功" ;
KW_KEEP         ::= "keep"          | "维持" ;
KW_PIN          ::= "pin"           | "固定" ;
KW_FROM         ::= "from"          | "来自" ;
KW_DISPATCH     ::= "dispatch"      | "派发" ;
KW_RESPOND      ::= "respond"       | "响应" ;
KW_WITH         ::= "with"          | "携带" ;
KW_EXPOSE       ::= "expose"        | "展示" ;
KW_AS           ::= "as"            | "作为" ;

(* 支持 ASCII 与 Unicode 汉字业务谓词标识符 *)
Ident           ::= UnicodeLetter { UnicodeLetter | Digit | "_" | "-" } ;
```

*(注：风格 C 为同构块状变体，仅将缩进块替换为 `KW_SLICE X { KW_DEFINE ... KW_RULE [ID] { ... } }`，共享同一解析 AST。)*

### 2.3 谓词表达能力与 SMT-LIB 2 分层边界

遵循 AWS Cedar 的“主动裁剪图灵完备性以换取 100% 可分析性”设计哲学，所有谓词按 SMT 理论自动分流：

| 谓词层级 | 占比 | 典型企业业务规则 | SMT-LIB 2 理论 | 编译器策略 | 
| ----- | ----- | ----- | ----- | ----- | 
| **L1 核心可判定层** | \~85% | 金额定点数（分）、状态机枚举、游标顺序、双门限累加、修订区间 `[effectiveSlot..end)`、Map 存在性 | `QF_AUFLIA` + `DT` | **默认模式，毫秒级 100% 可判定求解** | 
| **L2 字符串 / 多步时序 / 局部乘法** | \~10% | 基金净值与定存份额夹逼校验（`shares * nav <= netAmount`）、多步状态机（暂停→跳期→恢复永不复活） | `QF_NIA`（切片隔离）/ `QF_SLIA`（cvc5）/ `k`-步 BMC | **按切片隔离开启 `QF_NIA`（带 2s 超时），跨聚合联调时降维为 `extern`** | 
| **L3 外部 IO 与黑盒逻辑** | \~5% | 会话鉴权、CSRF 验签、TA 外部回调解析、主机确定性 ID（`@host`） | `extern` 未解释布尔谓词 | 保留 100% 布尔分支与缺口校验，不侵入基础设施 | 

## 3. `bank-wealth-demo` 四类完整实战样例（中英文双语对照）

以下 3.1 至 3.4 均同时给出 **英文主标准（Canonical EN）** 与 **中文同构版（CN Profile）**，两者编译后的 AST 与 `.smt2` 100% 等价。

### 3.1 样例一（领域逻辑 · 单笔）：基金现金申购与独立退款（`FundOrder`）

#### （1）申购结算请求：`FundOrder.RequestFundPurchaseSettlement`

**英文主标准（Canonical EN · 风格 A）**

```
slice FundOrder.RequestFundPurchaseSettlement

where:
  validAmount      = amount.currency == "CNY" and amount.amount > 0.00      as "申购金额为正数人民币"
  validAccounts    = investorAccountId != fundCollectionAccountId           as "投资人账户与募集户不同"
  validIdentity    = operationId is non-empty and fundCode is non-empty     as "操作编号与基金代码非空"
  sameAsRecorded   = operationId == order.operationId
                     and investorAccountId == order.investorAccountId
                     and fundCollectionAccountId == order.fundCollectionAccountId
                     and fundCode == order.fundCode
                     and amount == order.amount                             as "重入参数与原申购记录完全一致"
  extern matchesCashOriginal                                                as "与可信入站原始请求一致"

axioms:
  [AX-FO-1] ALWAYS order.status in {"new", "payment-requested", "payment-succeeded", "ta-confirmed", "canceled"}

rules:
  [ORDER_RESOURCE]              IF fundOrderId != order.id
                                THEN SHALL reject request with ORDER_RESOURCE

  [ORDER_ACCOUNTS]              IF not validAccounts
                                THEN SHALL reject request with ORDER_ACCOUNTS

  [ORDER_AMOUNT]                IF not validAmount
                                THEN SHALL reject request with ORDER_AMOUNT

  [ORDER_OPERATION]             IF not validIdentity
                                THEN SHALL reject request with ORDER_OPERATION

  [CASH_ADMITTED_PAYMENT_MATCH] IF order.cashRequestSource is non-empty and not matchesCashOriginal
                                THEN SHALL reject request with CASH_ADMITTED_PAYMENT_MATCH

  [ORDER_REPLAY_CONFLICT]       IF not sameAsRecorded WHILE order.status != "new"
                                THEN SHALL reject request with ORDER_REPLAY_CONFLICT

  [ORDER_REQUEST_ONCE]          WHILE order.status != "new"
                                WHEN RequestFundPurchaseSettlement AND sameAsRecorded
                                SHALL succeed-empty

  [SETTLEMENT_REQUESTED]        WHILE order.status == "new"
                                WHEN RequestFundPurchaseSettlement
                                  AND fundOrderId == order.id
                                  AND validAccounts AND validAmount AND validIdentity
                                  AND (order.cashRequestSource is empty or matchesCashOriginal)
                                SHALL transition order.status -> "payment-requested"
                                  AND emit FundPurchaseSettlementRequested
                                post:
                                  order.status' = "payment-requested"
                                  order.amount' = amount

```

**中文同构版（CN Profile · 风格 A）**

```
切片 FundOrder.RequestFundPurchaseSettlement

定义:
  申购金额合法     = amount.currency == "CNY" 且 amount.amount > 0.00
  出入账户不同     = investorAccountId != fundCollectionAccountId
  身份与基金非空   = operationId 为 非空 且 fundCode 为 非空
  重入参数一致     = operationId == order.operationId
                     且 investorAccountId == order.investorAccountId
                     且 fundCollectionAccountId == order.fundCollectionAccountId
                     且 fundCode == order.fundCode
                     且 amount == order.amount
  外部判定 与入站原单一致

公理:
  [AX-FO-1] 恒成立 order.status 属于 {"new", "payment-requested", "payment-succeeded", "ta-confirmed", "canceled"}

规则:
  [ORDER_RESOURCE]              如果 fundOrderId != order.id
                                则 必须 拒绝请求，返回 ORDER_RESOURCE

  [ORDER_ACCOUNTS]              如果 不满足 出入账户不同
                                则 必须 拒绝请求，返回 ORDER_ACCOUNTS

  [ORDER_AMOUNT]                如果 不满足 申购金额合法
                                则 必须 拒绝请求，返回 ORDER_AMOUNT

  [ORDER_OPERATION]             如果 不满足 身份与基金非空
                                则 必须 拒绝请求，返回 ORDER_OPERATION

  [CASH_ADMITTED_PAYMENT_MATCH] 如果 order.cashRequestSource 为 非空 且 不满足 与入站原单一致
                                则 必须 拒绝请求，返回 CASH_ADMITTED_PAYMENT_MATCH

  [ORDER_REPLAY_CONFLICT]       当处于 order.status != "new"
                                如果 不满足 重入参数一致
                                则 必须 拒绝请求，返回 ORDER_REPLAY_CONFLICT

  [ORDER_REQUEST_ONCE]          当处于 order.status != "new"
                                当收到 RequestFundPurchaseSettlement 且 重入参数一致
                                必须 幂等空成功

  [SETTLEMENT_REQUESTED]        当处于 order.status == "new"
                                当收到 RequestFundPurchaseSettlement
                                  且 fundOrderId == order.id
                                  且 出入账户不同 且 申购金额合法 且 身份与基金非空
                                  且 (order.cashRequestSource 为 空 或 与入站原单一致)
                                必须 状态变为 order.status -> "payment-requested"
                                  且 发射 FundPurchaseSettlementRequested
                                变更后:
                                  order.status' = "payment-requested"
                                  order.amount' = amount

```

#### （2）独立退款切片：`FundOrder.RequestFundPurchaseRefund`

**英文主标准（Canonical EN · 风格 C 块状变体）**

```
slice FundOrder.RequestFundPurchaseRefund {
  define paymentSucceeded = paymentTxId == order.selectedPaymentTxId
                            and order.cashPaymentFinalResults[paymentTxId] == "succeeded"
  define taRejected       = order.taStatus == "rejected"
  define refundPending    = order.refundOperationId is non-empty

  rule [REFUND_RESOURCE]    { if fundOrderId != order.id then reject request with REFUND_RESOURCE }
  rule [REFUND_PAYMENT]     { if not paymentSucceeded    then reject request with REFUND_PAYMENT }
  rule [REFUND_TA_REJECTED] { if not taRejected          then reject request with REFUND_TA_REJECTED }

  rule [REFUND_INTENT_ONCE] {
    while refundPending
    when RequestFundPurchaseRefund and paymentSucceeded and taRejected
    then succeed-empty
  }

  rule [REFUND_REQUESTED] {
    while not refundPending
    when RequestFundPurchaseRefund and fundOrderId == order.id and paymentSucceeded and taRejected
    then emit FundPurchaseRefundRequested
     and transition order.refundOutcome -> "pending"
  }
}

```

**中文同构版（CN Profile · 风格 C 块状变体）**

```
切片 FundOrder.RequestFundPurchaseRefund {
  定义 付款已成功   = paymentTxId == order.selectedPaymentTxId
                      且 order.cashPaymentFinalResults[paymentTxId] == "succeeded"
  定义 TA已拒绝     = order.taStatus == "rejected"
  定义 退款已发起   = order.refundOperationId 为 非空

  规则 [REFUND_RESOURCE]    { 如果 fundOrderId != order.id 则 拒绝请求，返回 REFUND_RESOURCE }
  规则 [REFUND_PAYMENT]     { 如果 不满足 付款已成功        则 拒绝请求，返回 REFUND_PAYMENT }
  规则 [REFUND_TA_REJECTED] { 如果 不满足 TA已拒绝          则 拒绝请求，返回 REFUND_TA_REJECTED }

  规则 [REFUND_INTENT_ONCE] {
    当处于 退款已发起
    当收到 RequestFundPurchaseRefund 且 付款已成功 且 TA已拒绝
    必须 幂等空成功
  }

  规则 [REFUND_REQUESTED] {
    当处于 不满足 退款已发起
    当收到 RequestFundPurchaseRefund 且 fundOrderId == order.id 且 付款已成功 且 TA已拒绝
    必须 发射 FundPurchaseRefundRequested
      且 状态变为 order.refundOutcome -> "pending"
  }
}

```

### 3.2 样例二（领域逻辑 · 金融限额与净值份额）：双门限控制 + 份额精确折算

在 DDD 中，将**全行/单户申购总门限**归属 `FundQuota`（纯 `QF_AUFLIA`），将**本期基金净值与定存份额确认**归属 `FundOrder.ConfirmTAShares`（独立开启 `QF_NIA` 隔离求解，采用定点数整除夹逼不等式替代浮点除法）。

#### （1）双门限控制：`FundQuota.ReserveSubscriptionQuota`

**英文主标准（Canonical EN）**

```
slice FundQuota.ReserveSubscriptionQuota

where:
  validAmount   = amount in [quota.minPurchase..quota.maxSingleLimit]       as "单笔申购金额在合法区间内"
  withinFundCap = quota.fundTotalUsed + amount <= quota.fundTotalCap        as "在基金申购总门限内"
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

**中文同构版（CN Profile）**

```
切片 FundQuota.ReserveSubscriptionQuota

定义:
  单笔额度合法     = amount 属于 [quota.minPurchase..quota.maxSingleLimit]
  在基金总门限内   = quota.fundTotalUsed + amount <= quota.fundTotalCap
  在单户总门限内   = quota.accountUsed[accountId] + amount <= quota.perAccountCap

公理:
  [AX-Q-1] 恒成立 quota.fundTotalUsed <= quota.fundTotalCap
  [AX-Q-2] 恒成立 quota.accountUsed[accountId] <= quota.perAccountCap

规则:
  [QUOTA_AMOUNT_RANGE] 如果 不满足 单笔额度合法   则 必须 拒绝请求，返回 QUOTA_AMOUNT_RANGE
  [QUOTA_FUND_CAP]     如果 不满足 在基金总门限内 则 必须 拒绝请求，返回 QUOTA_FUND_CAP
  [QUOTA_ACCOUNT_CAP]  如果 不满足 在单户总门限内 则 必须 拒绝请求，返回 QUOTA_ACCOUNT_CAP

  [QUOTA_RESERVED]     当处于 单笔额度合法 且 在基金总门限内 且 在单户总门限内
                       当收到 ReserveSubscriptionQuota
                       必须 发射 SubscriptionQuotaReserved
                       变更后:
                         quota.fundTotalUsed'          = quota.fundTotalUsed + amount
                         quota.accountUsed'[accountId] = quota.accountUsed[accountId] + amount

```

#### （2）本期净值与定存份额确认：`FundOrder.ConfirmTAShares`

**英文主标准（Canonical EN）**

```
slice FundOrder.ConfirmTAShares

where:
  validNav       = nav > 0.0000                                             as "本期基金净值为正"
  exactFloorMath = shares >= 0
                   and shares * nav <= order.netAmount
                   and (shares + 1) * nav > order.netAmount                 as "确认份额精确等于净申购额向下取整除以本期净值"

rules:
  [TA_INVALID_NAV]     IF not validNav       THEN SHALL reject request with TA_INVALID_NAV
  [TA_SHARES_MISMATCH] IF not exactFloorMath THEN SHALL reject request with TA_SHARES_MISMATCH

  [TA_CONFIRMED]       WHILE order.paymentOutcome == "succeeded" and order.taStatus != "confirmed"
                       WHEN RecordFundTAConfirmed AND validNav AND exactFloorMath
                       SHALL transition order.taStatus -> "confirmed"
                         AND emit FundTASharesConfirmed

```

**中文同构版（CN Profile）**

```
切片 FundOrder.ConfirmTAShares

定义:
  本期净值合法   = nav > 0.0000
  份额折算精确   = shares >= 0
                   且 shares * nav <= order.netAmount
                   且 (shares + 1) * nav > order.netAmount

规则:
  [TA_INVALID_NAV]     如果 不满足 本期净值合法 则 必须 拒绝请求，返回 TA_INVALID_NAV
  [TA_SHARES_MISMATCH] 如果 不满足 份额折算精确 则 必须 拒绝请求，返回 TA_SHARES_MISMATCH

  [TA_CONFIRMED]       当处于 order.paymentOutcome == "succeeded" 且 order.taStatus != "confirmed"
                       当收到 RecordFundTAConfirmed 且 本期净值合法 且 份额折算精确
                       必须 状态变为 order.taStatus -> "confirmed"
                         且 发射 FundTASharesConfirmed

```

### 3.3 样例三（领域逻辑 · 流批一体）：有限现金定投（`SipPlan`）

完整覆盖 `bank-wealth-demo` 中 `SipPlan` 的批处理观察游标（`observedCount`）、流式派发游标（`startCount`）、离散时钟到期（`dueSlot <= currentTick`）、多版本修订生效区间（`[effectiveSlot..revisionEnd)`）、暂停跳期与积压（`backlog`）隔离以及“首次终态防重计数、三败不自动暂停”不变式。

**英文主标准（Canonical EN）**

```
slice SipPlan.StreamBatchExecution

where:
  scheduleReady     = plan.initialized and plan.scheduleSealed              as "定投计划已初始化且日程已封板"
  slotValid         = position in plan.slots and plan.slots[position] == dueSlot as "期次与预定扣款槽位匹配"
  slotDue           = dueSlot <= plan.currentTick                           as "槽位已到达当前业务时钟"
  inRevisionWindow  = revision in plan.revisions
                      and plan.revisions[revision] == config
                      and dueSlot >= config.effectiveSlot
                      and (revision not in plan.revisionEnds or dueSlot < plan.revisionEnds[revision])
                                                                            as "槽位落在修订版本有效区间内"
  alreadyTriggered  = dueSlot in plan.occurrences                           as "该槽位已触发当期申购"
  sameTriggerReplay = alreadyTriggered
                      and plan.occurrences[dueSlot].revision == revision
                      and plan.occurrences[dueSlot].config == config        as "触发重入参数与已记录期次一致"

axioms:
  [AX-SIP-1] ALWAYS plan.startCount <= plan.observedCount and plan.observedCount <= plan.scheduleCount
  [AX-SIP-2] ALWAYS plan.successTotal + plan.failureTotal <= plan.scheduleCount
  [AX-SIP-3] ALWAYS plan.currentTick >= -1

rules:
  # --- 批处理观察侧（Batch Observation）：暂停期间到期槽位记为 skipped，绝不进入 backlog ---
  [SIP_SKIP_ONCE]       WHILE dueSlot in plan.slotDisposition and plan.slotDisposition[dueSlot] == "skipped"
                        WHEN SkipPausedSipDueSlot AND scheduleReady AND slotValid
                        SHALL succeed-empty

  [SIP_SKIP_CONFLICT]   IF dueSlot in plan.slotDisposition and plan.slotDisposition[dueSlot] != "skipped"
                        WHEN SkipPausedSipDueSlot
                        THEN SHALL reject request with SIP_OBSERVATION_CONFLICT

  [SIP_SKIP_ORDER]      IF position != plan.observedCount
                        WHEN SkipPausedSipDueSlot
                        THEN SHALL reject request with SIP_OBSERVATION_ORDER

  [SIP_SKIP_NOT_DUE]    IF not slotDue
                        WHEN SkipPausedSipDueSlot
                        THEN SHALL reject request with SIP_SLOT_DUE

  [SIP_SKIP_NOT_PAUSED] IF not (plan.paused and dueSlot >= plan.pauseTick)
                        WHEN SkipPausedSipDueSlot
                        THEN SHALL reject request with SIP_PAUSE_CLASSIFICATION

  [SIP_SKIP_RECORDED]   WHILE scheduleReady and dueSlot not in plan.slotDisposition
                        WHEN SkipPausedSipDueSlot
                          AND slotValid AND position == plan.observedCount
                          AND slotDue AND plan.paused AND dueSlot >= plan.pauseTick
                        SHALL emit SipPausedDueSlotSkipped
                        post:
                          plan.slotDisposition'[dueSlot] = "skipped"
                          plan.observedCount'            = plan.observedCount + 1

  # --- 流式派发侧（Stream Dispatch）：严格按 startCount 消费 backlog，永不复活 skipped ---
  [SIP_ACTIVE_START]    IF plan.paused                                      WHEN TriggerSipInstallment THEN SHALL reject request with SIP_ACTIVE_START
  [SIP_START_ORDER]     IF position != plan.startCount                      WHEN TriggerSipInstallment THEN SHALL reject request with SIP_START_ORDER
  [SIP_BACKLOG_REQ]     IF plan.slotDisposition[dueSlot] != "backlog"       WHEN TriggerSipInstallment THEN SHALL reject request with SIP_BACKLOG_REQUIRED
  [SIP_REV_INTERVAL]    IF not inRevisionWindow                             WHEN TriggerSipInstallment THEN SHALL reject request with SIP_REVISION_INTERVAL
  [SIP_OCC_CONFLICT]    IF alreadyTriggered and not sameTriggerReplay       WHEN TriggerSipInstallment THEN SHALL reject request with SIP_OCCURRENCE_REPLAY_CONFLICT

  [SIP_OCC_ONCE]        WHILE sameTriggerReplay
                        WHEN TriggerSipInstallment AND scheduleReady AND slotValid
                        SHALL succeed-empty

  [SIP_TRIGGERED]       WHILE scheduleReady and not plan.paused and not alreadyTriggered
                        WHEN TriggerSipInstallment
                          AND slotValid AND position == plan.startCount
                          AND plan.slotDisposition[dueSlot] == "backlog"
                          AND inRevisionWindow
                        SHALL emit SipInstallmentTriggered
                        post:
                          plan.occurrences'[dueSlot] = @host(StableSipOccurrence)
                          plan.startCount'           = plan.startCount + 1

  # --- 终态防重计数：首次终态才计数，三连败不自动暂停 ---
  [SIP_TERMINAL_ONCE]   WHILE occurrenceId in plan.firstTerminals and plan.firstTerminals[occurrenceId] == "failed"
                        WHEN RecordSipInstallmentFailed
                        SHALL succeed-empty

  [SIP_FAIL_NO_PAUSE]   WHILE occurrenceId not in plan.firstTerminals
                        WHEN RecordSipInstallmentFailed
                        SHALL emit SipInstallmentFailed
                          AND keep plan.paused == plan.paused
                        post:
                          plan.firstTerminals'[occurrenceId] = "failed"
                          plan.failureTotal'                 = plan.failureTotal + 1
                          plan.paused'                       = plan.paused

```

**中文同构版（CN Profile）**

```
切片 SipPlan.StreamBatchExecution

定义:
  日程已就绪       = plan.initialized 且 plan.scheduleSealed
  槽位匹配         = position 属于 plan.slots 且 plan.slots[position] == dueSlot
  槽位已到期       = dueSlot <= plan.currentTick
  在修订有效期内   = revision 属于 plan.revisions
                     且 plan.revisions[revision] == config
                     且 dueSlot >= config.effectiveSlot
                     且 (不满足 (revision 属于 plan.revisionEnds) 或 dueSlot < plan.revisionEnds[revision])
  当期已触发       = dueSlot 属于 plan.occurrences
  触发重入一致     = 当期已触发
                     且 plan.occurrences[dueSlot].revision == revision
                     且 plan.occurrences[dueSlot].config == config

公理:
  [AX-SIP-1] 恒成立 plan.startCount <= plan.observedCount 且 plan.observedCount <= plan.scheduleCount
  [AX-SIP-2] 恒成立 plan.successTotal + plan.failureTotal <= plan.scheduleCount
  [AX-SIP-3] 恒成立 plan.currentTick >= -1

规则:
  # --- 批处理观察侧：暂停期间到期槽位记为 skipped，绝不进入 backlog ---
  [SIP_SKIP_ONCE]       当处于 dueSlot 属于 plan.slotDisposition 且 plan.slotDisposition[dueSlot] == "skipped"
                        当收到 SkipPausedSipDueSlot 且 日程已就绪 且 槽位匹配
                        必须 幂等空成功

  [SIP_SKIP_CONFLICT]   如果 dueSlot 属于 plan.slotDisposition 且 plan.slotDisposition[dueSlot] != "skipped"
                        当收到 SkipPausedSipDueSlot
                        则 必须 拒绝请求，返回 SIP_OBSERVATION_CONFLICT

  [SIP_SKIP_ORDER]      如果 position != plan.observedCount
                        当收到 SkipPausedSipDueSlot
                        则 必须 拒绝请求，返回 SIP_OBSERVATION_ORDER

  [SIP_SKIP_NOT_DUE]    如果 不满足 槽位已到期
                        当收到 SkipPausedSipDueSlot
                        则 必须 拒绝请求，返回 SIP_SLOT_DUE

  [SIP_SKIP_NOT_PAUSED] 如果 不满足 (plan.paused 且 dueSlot >= plan.pauseTick)
                        当收到 SkipPausedSipDueSlot
                        则 必须 拒绝请求，返回 SIP_PAUSE_CLASSIFICATION

  [SIP_SKIP_RECORDED]   当处于 日程已就绪 且 不满足 (dueSlot 属于 plan.slotDisposition)
                        当收到 SkipPausedSipDueSlot
                          且 槽位匹配 且 position == plan.observedCount
                          且 槽位已到期 且 plan.paused 且 dueSlot >= plan.pauseTick
                        必须 发射 SipPausedDueSlotSkipped
                        变更后:
                          plan.slotDisposition'[dueSlot] = "skipped"
                          plan.observedCount'            = plan.observedCount + 1

  # --- 流式派发侧：严格按 startCount 消费 backlog，永不复活 skipped ---
  [SIP_ACTIVE_START]    如果 plan.paused                                    当收到 TriggerSipInstallment 则 必须 拒绝请求，返回 SIP_ACTIVE_START
  [SIP_START_ORDER]     如果 position != plan.startCount                    当收到 TriggerSipInstallment 则 必须 拒绝请求，返回 SIP_START_ORDER
  [SIP_BACKLOG_REQ]     如果 plan.slotDisposition[dueSlot] != "backlog"     当收到 TriggerSipInstallment 则 必须 拒绝请求，返回 SIP_BACKLOG_REQUIRED
  [SIP_REV_INTERVAL]    如果 不满足 在修订有效期内                          当收到 TriggerSipInstallment 则 必须 拒绝请求，返回 SIP_REVISION_INTERVAL
  [SIP_OCC_CONFLICT]    如果 当期已触发 且 不满足 触发重入一致              当收到 TriggerSipInstallment 则 必须 拒绝请求，返回 SIP_OCCURRENCE_REPLAY_CONFLICT

  [SIP_OCC_ONCE]        当处于 触发重入一致
                        当收到 TriggerSipInstallment 且 日程已就绪 且 槽位匹配
                        必须 幂等空成功

  [SIP_TRIGGERED]       当处于 日程已就绪 且 不满足 plan.paused 且 不满足 当期已触发
                        当收到 TriggerSipInstallment
                          且 槽位匹配 且 position == plan.startCount
                          且 plan.slotDisposition[dueSlot] == "backlog"
                          且 在修订有效期内
                        必须 发射 SipInstallmentTriggered
                        变更后:
                          plan.occurrences'[dueSlot] = @host(StableSipOccurrence)
                          plan.startCount'           = plan.startCount + 1

  # --- 终态防重计数：首次终态才计数，三连败不自动暂停 ---
  [SIP_TERMINAL_ONCE]   当处于 occurrenceId 属于 plan.firstTerminals 且 plan.firstTerminals[occurrenceId] == "failed"
                        当收到 RecordSipInstallmentFailed
                        必须 幂等空成功

  [SIP_FAIL_NO_PAUSE]   当处于 不满足 (occurrenceId 属于 plan.firstTerminals)
                        当收到 RecordSipInstallmentFailed
                        必须 发射 SipInstallmentFailed
                          且 维持 plan.paused == plan.paused
                        变更后:
                          plan.firstTerminals'[occurrenceId] = "failed"
                          plan.failureTotal'                 = plan.failureTotal + 1
                          plan.paused'                       = plan.paused

```

### 3.4 样例四（应用逻辑 · 用户故事）：`CashFundPurchase`（`PurchaseFundWithCash`）

**英文主标准（Canonical EN）**

```
story CashFundPurchase layer application

where:
  validSubmit = amount.currency == "CNY" and amount.amount > 0.00           as "提交金额为正数人民币"
  extern sessionAuthenticated(principal)                                    as "客户会话已认证"
  extern originAndCsrfValid                                                 as "来源与 CSRF 校验通过"
  extern fundCodeActive(fundCode)                                           as "基金代码处于可申购状态"
  extern requestExists(principal, clientRequestId)                          as "该客户请求号已存在原记录"
  extern payloadMatchesOriginal(principal, clientRequestId, fundCode, amount) as "重入请求参数与原请求一致"

axioms:
  [AX-APP-1] ALWAYS BankCashSubmit SHALL NOT supply operationId, investorAccountId, fundCollectionAccountId

rules:
  [US-CFP-01] IF not sessionAuthenticated(principal) or not originAndCsrfValid
              WHEN BankCashSubmitPort.submit
              THEN SHALL reject request with UNAUTHORIZED_OR_CSRF

  [US-CFP-02] IF not fundCodeActive(fundCode) or not validSubmit
              WHEN BankCashSubmitPort.submit
              THEN SHALL reject request with INVALID_CASH_SUBMIT

  [US-CFP-03] WHILE not requestExists(principal, clientRequestId)
              WHEN BankCashSubmitPort.submit
                AND sessionAuthenticated(principal) AND originAndCsrfValid
                AND fundCodeActive(fundCode) AND validSubmit
              SHALL pin BankCashOriginal from (principal, clientRequestId)
                AND dispatch FundOrder.RecordCashRequestSource
                AND dispatch FundOrder.RequestFundPurchaseSettlement
                AND respond BankCashAcknowledgement with ack.replayed == false and ack.accepted == true

  [US-CFP-04] WHILE requestExists(principal, clientRequestId)
              WHEN BankCashSubmitPort.submit AND payloadMatchesOriginal(principal, clientRequestId, fundCode, amount)
              SHALL respond BankCashAcknowledgement with ack.replayed == true
                AND SHALL NOT dispatch FundOrder.RequestFundPurchaseSettlement

  [US-CFP-05] IF not payloadMatchesOriginal(principal, clientRequestId, fundCode, amount)
              WHILE requestExists(principal, clientRequestId)
              WHEN BankCashSubmitPort.submit
              THEN SHALL reject request with CASH_SOURCE_CONFLICT

  [US-CFP-06] WHILE order.paymentOutcome == "succeeded" and order.taStatus != "confirmed"
              WHEN BankOrderQuery.get
              SHALL expose bank-order-view as view.paymentCompleted == true and view.taFinalized == false

```

**中文同构版（CN Profile）**

```
故事 CashFundPurchase layer application

定义:
  提交金额合法               = amount.currency == "CNY" 且 amount.amount > 0.00
  外部判定 客户会话已认证(principal)
  外部判定 来源与CSRF合法
  外部判定 基金代码可申购(fundCode)
  外部判定 原请求已存在(principal, clientRequestId)
  外部判定 重入参数与原单一致(principal, clientRequestId, fundCode, amount)

公理:
  [AX-APP-1] 恒成立 禁止 BankCashSubmit 携带 operationId, investorAccountId, fundCollectionAccountId

规则:
  [US-CFP-01] 如果 不满足 客户会话已认证(principal) 或 不满足 来源与CSRF合法
              当收到 BankCashSubmitPort.submit
              则 必须 拒绝请求，返回 UNAUTHORIZED_OR_CSRF

  [US-CFP-02] 如果 不满足 基金代码可申购(fundCode) 或 不满足 提交金额合法
              当收到 BankCashSubmitPort.submit
              则 必须 拒绝请求，返回 INVALID_CASH_SUBMIT

  [US-CFP-03] 当处于 不满足 原请求已存在(principal, clientRequestId)
              当收到 BankCashSubmitPort.submit
                且 客户会话已认证(principal) 且 来源与CSRF合法
                且 基金代码可申购(fundCode) 且 提交金额合法
              必须 固定 BankCashOriginal from (principal, clientRequestId)
                且 派发 FundOrder.RecordCashRequestSource
                且 派发 FundOrder.RequestFundPurchaseSettlement
                且 响应 BankCashAcknowledgement with ack.replayed == false 且 ack.accepted == true

  [US-CFP-04] 当处于 原请求已存在(principal, clientRequestId)
              当收到 BankCashSubmitPort.submit 且 重入参数与原单一致(principal, clientRequestId, fundCode, amount)
              必须 响应 BankCashAcknowledgement with ack.replayed == true
                且 禁止 派发 FundOrder.RequestFundPurchaseSettlement

  [US-CFP-05] 当处于 原请求已存在(principal, clientRequestId)
              如果 不满足 重入参数与原单一致(principal, clientRequestId, fundCode, amount)
              当收到 BankCashSubmitPort.submit
              则 必须 拒绝请求，返回 CASH_SOURCE_CONFLICT

  [US-CFP-06] 当处于 order.paymentOutcome == "succeeded" 且 order.taStatus != "confirmed"
              当收到 BankOrderQuery.get
              必须 展示 bank-order-view as view.paymentCompleted == true 且 view.taFinalized == false

```

## 4. 从真源自动派生的只读投影（风格 E + 风格 B）

编译器利用 `where:` 中的 `as "..."` 业务短语标签，零 LLM 确定性生成两份只读审阅视图：

### 4.1 风格 E 投影：PM 友好白话 AC（以 `FundQuota` 为例）

> **功能规约：基金申购额度预留（只读投影，真源：`fund-quota-reserve.ears`）**
>
> * **AC-1 `[QUOTA_AMOUNT_RANGE]`**：如果不满足“单笔申购金额在合法区间内”，系统必须拒绝请求并返回 `QUOTA_AMOUNT_RANGE`。
>
> * **AC-2 `[QUOTA_FUND_CAP]`**：如果不满足“在基金申购总门限内”，系统必须拒绝请求并返回 `QUOTA_FUND_CAP`。
>
> * **AC-3 `[QUOTA_ACCOUNT_CAP]`**：如果不满足“在单账户申购总门限内”，系统必须拒绝请求并返回 `QUOTA_ACCOUNT_CAP`。
>
> * **AC-4 `[QUOTA_RESERVED]`**：当同时满足“单笔申购金额在合法区间内”、“在基金申购总门限内”与“在单账户申购总门限内”且收到额度预留请求时，系统必须发射 `SubscriptionQuotaReserved` 并累加基金总已用额度与单账户已用额度。

### 4.2 风格 B 投影：DMN 决策表视图（一眼扫盲区）

| Rule ID | `validAmount` | `withinFundCap` | `withinAcctCap` | Outcome | 
| ----- | ----- | ----- | ----- | ----- | 
| `QUOTA_AMOUNT_RANGE` | `false` | any | any | `reject request with QUOTA_AMOUNT_RANGE` | 
| `QUOTA_FUND_CAP` | `true` | `false` | any | `reject request with QUOTA_FUND_CAP` | 
| `QUOTA_ACCOUNT_CAP` | `true` | `true` | `false` | `reject request with QUOTA_ACCOUNT_CAP` | 
| `QUOTA_RESERVED` | `true` | `true` | `true` | `emit SubscriptionQuotaReserved` + update totals | 

## 5. 从受控 EARS 1.0 到 `SMT-LIB 2` 单跳确定性编译

`truthsrc-smt` 将上述 EARS AST 直接翻译为标准 `.smt2`（兼容 `z3 -smt2` 与 `cvc5`）：

* **类型映射**：`Money` 缩放为整数分（×100）；净值 `nav` 缩放为 4 位定点数整数（×10000）；`Map[K, V]` 编译为存在位图 `(Array K Bool)` + 值数组 `(Array K V)`；每条规则通过 `(! <expr> :named <RuleId>)` 绑定精准溯源标签。

* **五项标准 `(push 1) ... (pop 1)` 体检**：

  1. **互斥冲突**：`SAT(Axioms ∧ G_emit ∧ G_reject)` 期望 `unsat`。

  2. **逻辑缺口**：`SAT(Axioms ∧ ¬(G_1 ∨ ... ∨ G_n))` 期望 `unsat`。

  3. **不变式归纳证明**：`SAT(Inv(s) ∧ G_i ∧ Post(s, s') ∧ ¬Inv(s'))` 期望 `unsat`。

  4. **死规则检测**：`UNSAT(Axioms ∧ G_i)` 期望 `sat`。

  5. **边界证人合成**：对每个边界条件（如 `amount == minPurchase`、`quota.fundTotalUsed + amount == fundTotalCap`、`dueSlot == currentTick`）调用 `(get-model)` 导出精确 BDD 测试样本。

### 编译片段示例：双门限不变式证明（`QF_AUFLIA`）+ 份额夹逼校验（`QF_NIA` 隔离）

```
; === A. FundQuota 切片 (QF_AUFLIA, 毫秒级) ===
(set-option :produce-models true)
(set-option :produce-unsat-cores true)
(set-logic QF_AUFLIA)

(declare-const amount Int)
(declare-const min_purchase Int)
(declare-const max_single Int)
(declare-const fund_used Int)
(declare-const fund_used_next Int)
(declare-const fund_cap Int)

(assert (! (<= fund_used fund_cap) :named AX-Q-1))

; 不变式归纳证明：QUOTA_RESERVED 绝不会突破基金总门限
(push 1)
  (assert (! (and (>= amount min_purchase) (<= amount max_single) (<= (+ fund_used amount) fund_cap)) :named QUOTA_RESERVED))
  (assert (= fund_used_next (+ fund_used amount)))
  (assert (> fund_used_next fund_cap)) ; 反证假设突破门限
  (check-sat) ; 期望 unsat
(pop 1)

; 边界证人合成：刚好打满基金总门限的合法边界样本
(push 1)
  (assert (and (> min_purchase 0) (< min_purchase max_single) (> fund_cap max_single)))
  (assert (and (>= amount min_purchase) (<= amount max_single) (= (+ fund_used amount) fund_cap)))
  (check-sat)
  (get-model)
(pop 1)

```

```
; === B. ConfirmTAShares 独立切片 (QF_NIA 隔离 + 2s 超时) ===
(set-logic QF_NIA)
(declare-const nav Int)       ; 4 位定点数，如 1.2500 => 12500
(declare-const net_amount Int); 4 位对齐净额，如 100.00 => 1000000
(declare-const shares Int)
(assert (and (> nav 0) (>= shares 0) (<= (* shares nav) net_amount) (> (* (+ shares 1) nav) net_amount)))
(check-sat)
(get-model)

```

## 6. 数学验证产物：澄清卡片 + 与四类样例 1:1 对齐的 BDD 拆解

### 6.1 冲突与缺口澄清卡片（面向 PM / 架构师）

当 Z3 捕获 `sat`（缺口或冲突）时，`co-arising check-spec --format json` 吐出反例模型与 `:named` 规则 ID，并投影为 A/B 澄清卡：

> **【需求缺口澄清】`SipPlan.SkipPausedSipDueSlot` 漏覆盖日程未封板场景**
>
> * **Z3 反例**：`plan.initialized = true, plan.scheduleSealed = false, plan.paused = true, dueSlot = 1, currentTick = 1`。
>
> * **请裁决**：
>
>   * **选项 A**：显式拒绝，新增 `[SIP_SCHEDULE_SEALED] IF not plan.scheduleSealed WHEN SkipPausedSipDueSlot THEN SHALL reject request with SIP_SCHEDULE_SEALED`。
>
>   * **选项 B**：允许未封板日程提前跳过。

### 6.2 Gherkin（`.feature`）拆解——1:1 严格对齐第 3 节四类样例

```
# AUTO-GENERATED BY co-arising EARS 1.0 (LOCKED — DO NOT EDIT)

# --- 对齐样例 3.1：单笔基金现金申购与独立退款 ---
@layer:domain @aggregate:FundOrder @slice:RequestFundPurchaseSettlement
Feature: 单笔基金现金申购结算与独立退款

  @spec:SETTLEMENT_REQUESTED @spec:ORDER_AMOUNT @spec:ORDER_ACCOUNTS @z3-witness
  Scenario Outline: 申购结算金额与账户边界校验
    Given FundOrder "ord-001" 状态为 "new"
    When 发送 RequestFundPurchaseSettlement(investor=<inv>, collection=<col>, amount=<amt> <ccy>)
    Then 结果应为 <outcome>

    Examples:
      | inv     | col     | amt    | ccy | outcome                              |
      | acc-inv | acc-col | 0.01   | CNY | emit FundPurchaseSettlementRequested |
      | acc-inv | acc-col | 0.00   | CNY | reject ORDER_AMOUNT                  |
      | acc-inv | acc-inv | 100.00 | CNY | reject ORDER_ACCOUNTS                |

  @spec:REFUND_REQUESTED @spec:REFUND_INTENT_ONCE @spec:REFUND_TA_REJECTED
  Scenario: 仅当付款成功且 TA 拒绝时允许发起独立退款，重复请求幂等空成功
    Given FundOrder "ord-001" 付款终态为 "succeeded" 且 taStatus 为 "rejected"
    When 发送 RequestFundPurchaseRefund(order="ord-001", paymentTxId="tx-1")
    Then 发射 FundPurchaseRefundRequested 且 refundOutcome 变为 "pending"
    When 再次发送相同的 RequestFundPurchaseRefund(order="ord-001", paymentTxId="tx-1")
    Then 返回幂等空成功 (succeed-empty)

# --- 对齐样例 3.2：金融双门限与净值份额确认 ---
@layer:domain @aggregate:FundQuota @aggregate:FundOrder
Feature: 基金申购双门限与 TA 本期净值份额确认

  @spec:QUOTA_RESERVED @spec:QUOTA_FUND_CAP @spec:QUOTA_ACCOUNT_CAP @z3-witness
  Scenario Outline: 基金总门限与单户总门限边界拦截
    Given 基金起购区间 [10.00..50000.00]，基金总门限 100000.00（已用 99000.00），单户总门限 20000.00（已用 19500.00）
    When 账户 "acc-inv" 请求 ReserveSubscriptionQuota(amount=<amt> CNY)
    Then 结果应为 <outcome>

    Examples:
      | amt     | outcome                           |
      | 500.00  | emit SubscriptionQuotaReserved    |
      | 500.01  | reject QUOTA_ACCOUNT_CAP          |
      | 1000.01 | reject QUOTA_FUND_CAP             |
      | 9.99    | reject QUOTA_AMOUNT_RANGE         |

  @spec:TA_CONFIRMED @spec:TA_SHARES_MISMATCH @z3-witness:QF_NIA
  Scenario Outline: TA 本期净值与定存份额精确夹逼校验
    Given FundOrder "ord-001" 净申购额为 100.00 CNY 且付款成功
    When 收到 RecordFundTAConfirmed(nav=<nav>, shares=<shares>)
    Then 结果应为 <outcome>

    Examples:
      | nav    | shares | outcome                    |
      | 1.2500 | 80     | emit FundTASharesConfirmed |
      | 1.2500 | 81     | reject TA_SHARES_MISMATCH  |
      | 0.0000 | 0      | reject TA_INVALID_NAV      |

# --- 对齐样例 3.3：流批一体有限现金定投 (SipPlan) ---
@layer:domain @aggregate:SipPlan @slice:StreamBatchExecution
Feature: 流批一体有限现金定投调度、跳过与防重计数

  @spec:SIP_SKIP_RECORDED @spec:SIP_BACKLOG_REQ @bmc:4-step
  Scenario: 暂停期间到期槽位记为 skipped，恢复后严禁复活触发
    Given SipPlan "plan-1" 已封板且在 tick=1 时暂停，position=0 对应 dueSlot=1
    When 时钟推进到 tick=1 并执行 SkipPausedSipDueSlot(position=0, dueSlot=1)
    Then 发射 SipPausedDueSlotSkipped 且 slotDisposition[1] 为 "skipped"，observedCount 变为 1
    When 计划恢复后尝试执行 TriggerSipInstallment(position=0, dueSlot=1)
    Then 必须拒绝请求并返回 SIP_BACKLOG_REQUIRED

  @spec:SIP_FAIL_NO_PAUSE @spec:SIP_TERMINAL_ONCE
  Scenario: 连续失败不自动暂停且重复失败回执不重复计数
    Given SipPlan "plan-1" 处于激活态（paused=false），occurrence "occ-1" 尚未记录终态
    When 连续两次收到 RecordSipInstallmentFailed("occ-1")
    Then 首次发射 SipInstallmentFailed、failureTotal 加 1 且 paused 保持 false
    And 第二次返回幂等空成功（failureTotal 不变）

# --- 对齐样例 3.4：应用层用户故事 (CashFundPurchase) ---
@layer:application @story:cash-fund-purchase
Feature: 现金申购基金用户故事（可信入站、重入防重扣与视图隔离）

  @spec:US-CFP-03 @spec:US-CFP-04 @spec:US-CFP-05 @spec:US-CFP-06
  Scenario: 响应丢失重入找回原单不二次扣款，且付款成功不等于 TA 终态
    Given 已认证客户 "cust-1" 账户余额充足
    When 客户提交 BankCashSubmit(clientRequestId="req-101", fundCode="FUND-A", amount=100.00 CNY)
    Then 固定 BankCashOriginal 并返回 ack(replayed=false, accepted=true)
    When 客户用相同 clientRequestId="req-101" 与相同参数重发
    Then 返回 ack(replayed=true) 且不重复派发 RequestFundPurchaseSettlement
    When 客户用相同 clientRequestId="req-101" 但篡改金额为 200.00 CNY 重发
    Then 拒绝请求并返回 CASH_SOURCE_CONFLICT
    When 付款三方 Saga 成功但 TA 尚未确认，客户查询 BankOrderQuery
    Then bank-order-view 展示 paymentCompleted=true 且 taFinalized=false

```

### 6.3 ScalaTest 与多语言 `EarsTestEmitter` 投影

编译器从 `TestIR` 同时生成契合 `bank-wealth-demo` 的锁定 ScalaTest 文件（置于 `generated-tests/scala/example/bankwealth/ears/`），每条用例携带 `@CoArisingSpec` 锚点：

```
// LOCKED BDD ORACLE — GENERATED BY co-arising EARS 1.0 (DO NOT MODIFY)
package example.bankwealth.ears

import org.scalatest.funsuite.AnyFunSuite
import example.bankwealth.domain._
import example.bankwealth.domain.SipPlanProtocol._
import example.bankwealth.domain.values._

final class SipPlanStreamBatchEarsSpec extends AnyFunSuite {
  // @CoArisingSpec(id="SIP_BACKLOG_REQ", witness="bmc-skip-no-resurrect")
  test("[SIP_BACKLOG_REQ] paused skipped dueSlot cannot be resurrected after resume") {
    // 使用与 BankSipStateSpec 相同的 ActorTestKit + PersistenceTestKit 驱动：
    // 1. CreateSipPlan -> AppendSipDueSlot(0, 1L) -> SealSipSchedule -> PauseSipPlan(1L)
    // 2. AdvanceSipClock(1L) -> SkipPausedSipDueSlot(0, 1L) -> Accepted(SipPausedDueSlotSkipped)
    // 3. ResumeSipPlan -> TriggerSipInstallment(0, 1L, ...) -> Refused("SIP_BACKLOG_REQUIRED")
  }

  // @CoArisingSpec(id="SIP_FAIL_NO_PAUSE", witness="first-terminal-idempotent")
  test("[SIP_FAIL_NO_PAUSE] duplicate failure receipts count once and never auto-pause") {
    // 断言首次 RecordSipInstallmentFailed 后 failureTotal == 1 && !paused
    // 断言二次 RecordSipInstallmentFailed 返回 Accepted(Vector.empty) && failureTotal == 1
  }
}

```

面向未来多语言扩展（TypeScript / Java / Rust / Go），仅需实现统一 `EarsTestEmitter` 接口即可复用上游全套 EARS + SMT 资产：

```
trait EarsTestEmitter {
  def language: String                 // "scala" | "typescript" | "java" | "rust" | "go"
  def framework: String                // "scalatest" | "vitest" | "junit5" | "cargo-test"
  def emitDomainSpec(ir: TestIR): GeneratedFile
  def emitApplicationSpec(ir: TestIR): GeneratedFile
}

```

## 7. 隔离区 BDD 测试锁定与 AI Agent 完形填空闭环

### 7.1 领地读写保护矩阵

| 目录路径 | 资产角色 | 写入权限 | 物理保护机制 | 
| ----- | ----- | ----- | ----- | 
| `truth/**/*.ears` | 行为唯一真源 | 人工审定（允许 LLM 起草后人工合入） | `co-arising check-spec`（Z3/cvc5 门禁） | 
| `projections/ac/**` & `projections/tables/**` | 风格 E 白话 AC 与风格 B 决策表 | **仅编译器只读投影** | 随时由真源重建，严禁反向编辑 | 
| `generated-tests/**` & `generated-scaffold/**` | **锁定的 BDD 测试预言机与代码骨架** | **仅编译器可写（Agent 禁改）** | `PreToolUse` Hook（`exit 2`）+ SHA-256 摘要校验 | 
| `handwritten/**`（`@cloze` 槽位） | **AI Agent 行为逻辑完形填空区** | 仅允许编辑 `@cloze:start(<id>)..@cloze:end(<id>)` | `PreToolUse` 行区间锁 + `Stop` Hook（`exit 2`） | 

### 7.2 确定性防作弊 Hooks（`.claude/settings.json`）

```
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [{ "type": "command", "command": "node tools/coarising-guard-write.mjs" }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "node tools/coarising-verify-cloze.mjs --slice $COARISING_ACTIVE_SLICE" }]
      }
    ]
  }
}

```

* **`PreToolUse`（`coarising-guard-write.mjs`）**：若 Agent 企图修改 `generated-tests/`、`generated-scaffold/` 或 `handwritten/` 中 `@cloze` 槽位之外的行，直接以 **`exit 2`** 阻断写入，强制其只能通过修改业务实现来跑通测试。

* **`Stop`（`coarising-verify-cloze.mjs`）**：回合结束前自动执行三连检——(1) 校验 `generated-tests/` 的 SHA-256 摘要防 `sed` 绕过篡改；(2) 运行 `sbt "testOnly *EarsSpec"` 跑通领域与应用全量 BDD；(3) 运行反向 AST 锚点对账（`verify-handwritten-map.mjs`）。任一项未过即向 `stderr` 打印失败的 `@CoArisingSpec(id=...)` 并以 **`exit 2`** 拦截，迫使 Agent 原地自愈。

* **契约盲审收口**：全绿后拉起无历史对话污染的独立 Subagent（`contract-reviewer`），仅喂给它 `*.ears` 真源、`TestIR` 与 `@cloze` 的 `git diff` 并强制 **`skip style`**，拦截针对 Z3 边界样本的硬编码作弊，最终落盘分层多域 Digest（Provenance Record）。

---

## 八、参考链接与标准出处

以下外部标准、工具与项目是本规范的设计参照与落地依赖，编号与正文各节的引用点对应：

- [Z3 Prover（Microsoft Research）](https://z3prover.github.io/) —— 第 5 节 `.smt2` 求解体检的主求解器
- [cvc5](https://cvc5.github.io/) —— `QF_SLIA` 等字符串理论切片的备选求解器
- [SMT-LIB 2 标准](https://smt-lib.org/) —— 第 2.3 节理论分层与第 5 节编译目标的标准语法
- [AWS Cedar](https://www.cedarpolicy.com/) —— "裁剪图灵完备性换取 100% 可分析性"的设计哲学参照
- [EARS（Easy Approach to Requirements Syntax）](https://en.wikipedia.org/wiki/Easy_Approach_to_Requirements_Syntax) —— 受控句式的原始出处
- [OMG DMN 规范](https://www.omg.org/spec/DMN/) —— 风格 B 决策表与 FEEL 区间语法的参照
- [Gherkin 语法参考](https://cucumber.io/docs/gherkin/reference/) —— 第 6.2 节锁定 `.feature` 投影的语法
- [ScalaTest](https://www.scalatest.org/) —— 第 6.3 节 `AnyFunSuite` 测试预言机框架
- [sbt](https://www.scala-sbt.org/) —— Stop Hook 三连检中的 `testOnly *EarsSpec` 构建入口
- [Akka Persistence Test Kit](https://doc.akka.io/libraries/akka-persistence-testkit/current/index.html) —— 事件溯源样例的测试驱动
- [Claude Code 最佳实践](https://code.claude.com/docs/en/best-practices) —— 第 7 节 Hooks（`exit 2`）与盲审 Subagent 的机制依据
- [co-arising/bank-wealth-demo](https://github.com/co-arising/bank-wealth-demo) —— 第 3 节四类样例的参考基准项目
