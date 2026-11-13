# Bank 0.3.0 technical acceptance — sanitized summary

[English](#english) · [中文](#中文)

## English

**Evidence captured 2026-11-12; summary updated 2026-11-13.** This is a maintainer-reviewed summary, not the original reports, a public download package or an independent third-party certification. The underlying local reports and their referenced files were checked against the hashes below. Their private runtime directories and logs are not published.

### Accepted scope

Candidate **`bank030-relocated-20261112-02`** was generated, built and executed after the paired source directories were actually relocated. Its four workshop layers — **source, anchors, code and service** — passed and were rechecked. The report records `fullPipelinePassed=true`, `requestedScopePassed=true` and no diagnostics (F-24).

- Actor scope: **64 tests passed**; readside scope: **47 passed**. They **share 23 generated tests** and are not 111 independent cases (F-25).
- **24 three-JVM recovery windows**, or 72 JVM executions, retained the fixed barriers and independent financial expectations (F-26).
- Real database/HTTP phases: initial, restart, refund and fresh SQL rebuild; three automated browser observations and five MySQL negatives passed (F-26).
- Fresh SQL rebuild readiness: **66.847 seconds within the unchanged 90-second gate**. Initial/restart/refund were 2.132/14.251/13.667 seconds. These are observations of this candidate, not general performance promises (F-27).
- Execution inputs remained unchanged; the candidate's owned resources exited and its lease was released. Those statements apply to owner-02, not to other sessions (F-28).

The environment was **native Darwin x64 / JDK11, one owner**. This does not certify production, concurrent writers, other platforms, a real fund-company connection or hostile-host isolation.

### Version and material identity

The CLI package is **0.5.0**; `saga-core`, `monarch-core` and `monarch-persistence` are **0.3.0**. Tool and engine versions are different dimensions.

The source candidate includes bank commit `ce51d0e6` **plus 16 source-overlay files fixed by the paired-material manifest**, and tool commit `cb860b5c`. A checkout of those commits alone is not a claim to reproduce the complete candidate. The CLI package's offline installation, actual prefix relocation and Counter 0→2 update were separately reviewed (40 command observations, F-29). Repeated update means zero generated-source writes, not zero graph/evidence writes.

The three engines' JAR/POM files are available on Maven Central (F-23). That does **not** establish a public channel for the matched tool package, paired source materials or clean1134 archive (DEF-15).

### Report identities

These hashes identify original reports inspected by the maintainer. Without access to those reports they do not let an external reader independently reproduce their contents; they are not signatures.

| Evidence role | SHA-256 |
|---|---|
| Four-layer workshop report | `b1b88cf53cb01088648ad08beacbe22e66d88cba0275a3acce51a53a0a8071b3` |
| Driver/source-stability/resource-exit result | `a51f12105ef3924a2dca86c07bf35a264210e8132238d56f5154952d573e00d1` |
| Relocated verification summary | `91f42cb58df776cf2508b83b503ff995d7af914009025c72c717784986a5fbcc` |

### Reproduction prerequisites, not an installation shortcut

The accepted workshop's source scope needs neither archive nor runtime supply and rejects those unused flags. Anchors/code/service verification requires **both** an explicit clean1134 archive and an existing prepared 0.3.0 `receipt.json` + `maven/` directory matching the project:

- The archive supplies the frozen compiler/toolchain and third-party dependencies. Its old engine files are excluded from the composed supply; the archive is not re-signed.
- `--runtime-supply` selects the separately locked 0.3.0 engines. Verification does not silently prepare, download or fall back to P23.
- Verification creates a fresh run. Service scope additionally needs its explicit JDK, resource lease and browser prerequisites.
- Report/view and independent session start/status/stop use the run's sealed supply. Session commands reject archive/runtime-supply overrides.

The convenient `npm run project` path and formal workshop acceptance are different entry points. An automatic engine download in one does not eliminate the other's prerequisites. Until complete matched materials have a confirmed public channel, this is **technical evidence**, not a one-command public reproduction claim.

### Open or unaccepted

- **DEF-07:** independent start/status/page-operation/stop experience is not accepted. The recorded session03 attempt did not reach readiness; later manual slot cleanup did not convert it into a passing experience. A later session-fix candidate is recorded as not executed. No claim about live resource state is made here.
- **DEF-15/16:** public material delivery and independent human usability remain unaccepted. Three automated browser observations are not three human sign-offs.
- **DEF-17:** the separate four-Saga/two-Play family observations are incomplete; Play examples do not themselves consume the engines.
- **DEF-18:** retry/backoff/deadline debt remains OPEN, not an accepted finite-profile exemption.
- **DEF-19:** specific Inspector race/fault-injection negatives and extra Node CI/typecheck were not executed in this technical round.

The older P23/service02 replay failure remains a historical failure (DEF-06). It is neither relabelled nor used to deny the new candidate's technical pass. Current and historical candidates have distinct evidence.

## 中文

**证据采集于2026-11-12，摘要更新于2026-11-13。** 本文是维护者核对后的脱敏摘要，不是原始报告、公开安装包或独立第三方认证。原报告及引用文件已按上述哈希核对；私有运行目录和日志未公开。外部读者仅有哈希，不能独立复现未公开报告的内容。

### 已通过的技术范围

**`bank030-relocated-20261112-02`** 在配对源码目录实际移址后重新生成、构建和执行。source、anchors、code、service 四层均通过并再次复核，报告的 `fullPipelinePassed`、`requestedScopePassed` 为 true，diagnostics 为空（F-24）。

- actor **64项**、readside **47项**通过；两组**共享23项生成测试，不是111个互不重复用例**（F-25）。
- **24个三JVM恢复窗口，共72 JVM执行**；保留固定barrier和独立金融预期（F-26）。
- initial、restart、refund、新SQL重建四阶段真实数据库/HTTP，三次自动浏览器观测、五个MySQL负例通过（F-26）。
- **本轮SQL重建66.847秒，处于未放宽的90秒门限内**；initial/restart/refund分别为2.132/14.251/13.667秒。只描述该候选，不是一般性能保证，也不挪用首轮成绩（F-27）。
- 输入未变，owner-02的资源退出和租约归还已确认；不能推广到其他会话（F-28）。

范围限于**原生Darwin x64/JDK11、单owner**，不等于生产、多writer、全平台、真实基金公司接入或敌意主机隔离认证。

### 版本、材料与报告

CLI工具包是**0.5.0**，三个Saga/Monarch引擎是**0.3.0**，不能混为一个版本。候选包含bank `ce51d0e6`及清单固定的**16项source overlay**、tool `cb860b5c`，只检出HEAD不等于取得完整验收材料。配套包的离线安装、真实prefix移址、Counter 0→2、stale/update已独立复核（40项命令观察，F-29）；重复更新的零写入仅指生成源码，不是图/台账/锚点零写入。

上表三份SHA分别对应四层报告、driver/输入稳定/资源退出结果、移址复核摘要。它们用于核对身份，不是第三方签名。运行时JAR/POM已在Maven Central取得（F-23），**不意味着工具tgz、配对源码bundle/overlay、clean1134等材料已有公开交付渠道**（DEF-15）。

### 当前入口的前置条件

source范围不需要并会拒绝 `--archive` 和 `--runtime-supply`。anchors/code/service正式验收同时要求：

1. 显式clean1134归档，提供固定编译工具链和第三方依赖；组合供给时排除其中旧引擎，不重签原归档。
2. 显式 `--runtime-supply`，指向与项目相符的已有0.3.0 `receipt.json + maven/` 目录。验收不隐式下载、prepare或回退P23。
3. 新的验收run；service还有明确JDK、独占资源/租约和浏览器前置。

report/view与独立会话的start/status/stop使用已有run封存供给；session不接受archive/runtime override。便捷 `npm run project` 与正式workshop是不同入口，不能因前者可取引擎，就宣传后者无须材料。在配对材料公开渠道未确认前，展示的是技术验收结果，不是一键公开复演承诺。

### 仍未签收

- **DEF-07：**独立start/status/页面操作/stop体验未签收。记录中的session03未达readiness，后续手工清理占位不是体验通过；新的修补候选记录为未执行。本文不推断当前资源是否存活。
- **DEF-15/16：**公开材料和真人可用性未签收；三次自动浏览器观测不等于三位独立读者签收。
- **DEF-17：**四Saga＋两Play家族观察未完成，银行不代签，Play示例本身不消费这些引擎。
- **DEF-18：**retry/backoff/deadline仍OPEN，不是finite profile豁免。
- **DEF-19：**特定Inspector竞态/故障注入负控及额外Node CI/typecheck未在本轮执行。

旧P23/service02回放失败保留为历史事实（DEF-06）；不将旧报告改绿，也不再用旧失败概括新的银行技术状态。
