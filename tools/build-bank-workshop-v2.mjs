#!/usr/bin/env node
/**
 * Build `downloads/bank-workshop-v2.html` by invoking the generic `exportV2WorkshopHtml`
 * engine in `metarch-truthsrc/lib/v2/view-v2.mjs` with curated chapters for bank-wealth-demo.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(__dirname, '..');

function parseArgs(argv) {
  const opts = {
    bank: resolve(SITE_ROOT, '..', 'bank-wealth-demo'),
    truthsrc: resolve(SITE_ROOT, '..', 'metarch-truthsrc'),
    out: resolve(SITE_ROOT, 'downloads', 'bank-workshop-v2.html'),
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--bank' && argv[i + 1]) opts.bank = resolve(argv[++i]);
    else if (argv[i] === '--truthsrc' && argv[i + 1]) opts.truthsrc = resolve(argv[++i]);
    else if (argv[i] === '--out' && argv[i + 1]) opts.out = resolve(argv[++i]);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const v2Root = join(opts.bank, 'v2-pilot');
  const dbPath = join(v2Root, '.truthsrc', 'knowledge.sqlite');
  if (!existsSync(dbPath)) throw new Error(`Missing v2 SQLite graph: ${dbPath}`);

  const db = new DatabaseSync(dbPath, { readOnly: true });
  const nodeIds = db.prepare('SELECT id FROM nodes ORDER BY id').all().map(r => r.id);
  db.close();
  const rulesOf = prefix => nodeIds.filter(id => id.startsWith(`rule:${prefix}#`));

  const curatedChapters = [
    {
      id: 'ch1-cash-purchase',
      kicker: 'CHAPTER 01 · APPLICATION STORY + INTERFACES HTTP',
      title: '现金申购入站、权限控制与幂等编排',
      description: '从 HTTP Controller + HttpAuthority（401/403/CSRF）到应用层 .story.ears 与读模型投影：拒绝信任客户端伪造账户/流水号（AX-APP-1），区分安全重放与参数冲突。',
      questions: [
        '同一客户请求号重入时，US-CFP-04（安全回放）与 US-CFP-05（参数冲突拒绝）如何被双栈 Cloze 与锁定 HTTP/应用测试精确区隔？',
        '为什么付款成功不等于投资成功？看 readmodel:bank-order-view 与 US-CFP-06 / US-CFP-07 / US-CFP-08。',
      ],
      nodeIds: [
        'behavior:CashFundPurchase',
        'cloze:cash-fund-purchase',
        'port:BankCashSubmitPort',
        'port:BankOrderQuery',
        'readmodel:bank-order-view',
        'vo:BankCashAcknowledgement',
        'agg:FundOrder',
        'cmd:FundOrder.RecordCashRequestSource',
        'cmd:FundOrder.RequestFundPurchaseSettlement',
        'event:FundOrder.CashRequestSourceRecorded',
        'event:FundOrder.FundPurchaseSettlementRequested',
        ...rulesOf('CashFundPurchase'),
      ],
    },
    {
      id: 'ch2-ta-bridge',
      kicker: 'CHAPTER 02 · INTEGRATION STORY + INTERFACES HTTP',
      title: 'TA 对账桥接、独立退款与未知态隔离',
      description: '展示三阶段效果协议（three-phase-reconcile）的 .integration.ears 编排：只有收到 TA 明确拒单或明确缺席证明才可派发独立退款；未知回执严禁误判为失败或自动退款。',
      questions: [
        '在既无确认也无明确拒单/缺席证明时，TA-BR-05 如何保证仅返回 pending_reconcile 且不派发退款也不确认份额？',
        '点选任意一条 TA-BR-* 规则的“生成代码”页签，查看 TS/Scala Cloze、Controller 与锁定测试的精确行高亮及反查。',
      ],
      nodeIds: [
        'behavior:TaBridgeSettlement',
        'cloze:ta-bridge-settlement',
        'port:BankTaBridgePort',
        'vo:TaBridgeAcknowledgement',
        'agg:FundOrder',
        'cmd:FundOrder.RecordFundTAConfirmed',
        'cmd:FundOrder.RequestIndependentRefund',
        'event:FundOrder.FundTASharesConfirmed',
        'event:FundOrder.IndependentRefundRequested',
        ...rulesOf('TaBridgeSettlement'),
      ],
    },
    {
      id: 'ch3-credit-balance',
      kicker: 'CHAPTER 03 · DOMAIN SLICE (DIRECT CODEGEN)',
      title: '资金预留与余额守恒（CreditBalance）',
      description: '通道 4A 零依赖领域切片：由 .ears 真源直接经过 Z3 QF_AUFLIA 互斥与完备性证明，同时生成纯函数 TypeScript 与 Scala 2.13 领域行为及精确 @ProvenanceId 锚点。',
      questions: [
        'AX-BAL-1 与 AX-BAL-2 两条不变量如何在 generated-scaffold 的 TS 与 Scala 行为中以精确 span 锚定？',
        '点击任意代码行号，体验从 TS/Scala 源码反查回 EARS 规则的闭环。',
      ],
      nodeIds: [
        'agg:CreditBalance',
        'behavior:CreditBalance.ReserveFunds',
        'cmd:CreditBalance.ReserveFunds',
        'event:CreditBalance.FundsReserved',
        'exact:AmountDecimal',
        'exact:Money',
        ...rulesOf('CreditBalance.ReserveFunds'),
      ],
    },
    {
      id: 'ch4-fund-quota',
      kicker: 'CHAPTER 04 · DOMAIN SLICE (DIRECT CODEGEN)',
      title: '基金申购额度控制（FundQuota）',
      description: '单笔区间、基金总额度上限、单账户额度上限三重守卫。全部金额运算使用精确十进制算术（无 IEEE-754 浮点误差），并在 TS 与 Scala 两侧同步验证。',
      questions: [
        '三道拒绝守卫（QUOTA_AMOUNT_RANGE / QUOTA_FUND_CAP / QUOTA_ACCOUNT_CAP）在 Z3 边界证人测试中如何对应到具体用例？',
      ],
      nodeIds: [
        'agg:FundQuota',
        'behavior:FundQuota.ReserveSubscriptionQuota',
        'cmd:FundQuota.ReserveSubscriptionQuota',
        'event:FundQuota.SubscriptionQuotaReserved',
        'exact:AmountDecimal',
        ...rulesOf('FundQuota.ReserveSubscriptionQuota'),
      ],
    },
    {
      id: 'ch5-ta-shares-cloze',
      kicker: 'CHAPTER 05 · NONLINEAR ARITHMETIC & CHANNEL 4B CLOZE',
      title: '净值整除份额确认与通道 4B 隔离区',
      description: 'FundOrder.ConfirmTAShares 包含非线性整除不等式 shares * nav <= netAmount < (shares + 1) * nav，落入通道 4B @cloze 槽位；由 Z3 QF_NIA 生成临界边界测试 + 独立子代理盲审收口。',
      questions: [
        '盲审在 FundOrderConfirmTASharesImpl.scala 中发现并加固了哪一处 Long.MaxValue 溢出边界？',
        '对比 3 个精确数值类型（AmountDecimal / NavDecimal / Money）在 1.0 强管控 domain/values/ 与 TS 中的零浮点映射。',
      ],
      nodeIds: [
        'agg:FundOrder',
        'behavior:FundOrder.ConfirmTAShares',
        'cloze:fund-order-confirm-tashares',
        'cmd:FundOrder.RecordFundTAConfirmed',
        'event:FundOrder.FundTASharesConfirmed',
        'exact:NavDecimal',
        'exact:AmountDecimal',
        'exact:Money',
        ...rulesOf('FundOrder.ConfirmTAShares'),
      ],
    },
  ];

  const tmpChapters = join(SITE_ROOT, '.tmp-bank-chapters.json');
  writeFileSync(tmpChapters, JSON.stringify(curatedChapters, null, 2), 'utf8');
  try {
    const { exportV2WorkshopHtml } = await import(pathToFileURL(join(opts.truthsrc, 'lib', 'v2', 'view-v2.mjs')).href);
    const res = exportV2WorkshopHtml({
      rootDir: v2Root,
      outFile: opts.out,
      pathPrefix: 'v2-pilot',
      title: '银行财富 v2.0.0 知识工作坊 · EARS 真源 ↔ scala-cqrs-play-service:2 强管控代码',
      subtitle: '由 truthsrc view-v2 直接采集自 bank-wealth-demo/v2-pilot/（生成器：scala-cqrs-play-service:2）。全量导出 58/58 知识节点与 47 条 SQLite 边（0 省略），覆盖 1.0 强管控分层（domain/values、domain/entities、domain/invariants、application/aggregates、protobuf、infrastructure、interfaces/http、modules）、*Impl.scala 手写隔离区与锁定测试，支持离线点行反查。',
      chaptersFile: tmpChapters,
    });
    console.log(JSON.stringify({ ...res, out: relative(SITE_ROOT, res.outFile) }, null, 2));
  } finally {
    const { rmSync } = await import('node:fs');
    rmSync(tmpChapters, { force: true });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
