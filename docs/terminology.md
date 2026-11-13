# Bilingual terminology and content discipline

This table guides wording; it is not a second language schema or fact registry.
Identifiers, examples and profile versions remain exactly as recorded in source.

| Term | 中文 | Meaning and boundary |
|---|---|---|
| truth source | 真源 | The authoritative knowledge authoring surface; not the only editable file in a project. |
| truth tree | 真源树 | File-based domain declarations. Technical bindings and handwritten implementations have separate responsibilities. |
| guard | 守卫 | A command-acceptance condition. `onFail` applies when the condition is false; `reject` and `succeed-empty` are different outcomes. |
| event binding | 事件绑定 | An explicit producer of an event field, distinct from technical/runtime bindings. |
| fold | 状态折叠 | Event-driven state evolution. Replay uses the event and pre-event state, not commands or external effects. |
| invariant | 不变量 | A domain condition intended to remain true; naming it does not automatically implement or prove its enforcement. |
| source anchor | 来源锚点 | A recorded relationship between knowledge and generated locations, with explicit precision and freshness. |
| span | 字节区间 | A half-open UTF-8 byte range. Convert to lines only against matching, verified source bytes. |
| handwritten zone | 手写实现区 | Explicit remaining computations, adapters and integrations; declared guards/bindings/folds can already be generated behavior. |
| knowledge graph | 知识图谱 | A specific derived representation with a schema and snapshot. Canonical graphstore, project graph and workshop export are not interchangeable. |
| blast radius | 影响范围 | Reachability over admitted modeled relationships. Missing modeled connections limit coverage. |
| technical acceptance | 技术验收 | A result for named inputs, artifacts, platform and checks—not public delivery, independent experience or production certification. |
| independent experience | 独立体验 | A separately admitted session and interaction flow. Automated technical observations do not sign it off implicitly. |
| unresolved / unaccepted | 未决 / 未签收 | An explicit limit, not a presumed failure or success. Retain the original receipt and candidate identity. |

## Authoring pages

- Keep the English-root and `/zh/` page responsibilities and stable anchors aligned.
  Natural prose may differ; code payloads, domain names and technical boundaries may not.
- Translate explanations outside executable examples. Preserve strings such as
  `succeed-empty`, `CountSet`, profile IDs and financial literals exactly.
- Mark complete commands and source examples with stable `data-example` IDs.
  A partial author fragment or proposed syntax must be labelled as such; do not
  present it as a runnable complete tree.
- A generated or derived view must say what it represents: source, compiled product,
  stored graph atom, code mapping, demonstration, or execution evidence.
- Record quantitative claims in `SITE-FACTS.md` and promises/open limits in
  `LEDGER.md`. Link to the corresponding status anchor in each language.
- Do not infer approval from a field, semantics from syntax validation, runtime
  success from compilation, or public reproducibility from a hash of private data.
- Preserve historical evidence dates. The global content-update date does not
  mean every fact was recaptured.

对应中文规则：解释可以自然改写，代码与业务身份不得翻译变形；原文、产物、教学示意与执行证据要区分；作者树只负责知识，不替代技术绑定和合法手写实现；来源精度、验收范围、未签收状态始终显式保留。
