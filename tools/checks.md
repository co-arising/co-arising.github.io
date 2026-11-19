# Local checks and publication checklist

Run these commands from the site repository. Deployment requires no build step;
maintenance tools are not browser runtime dependencies.

## Article publication verification — 2026-11-17

- Source/archive bytes and ordered external-link counts match the reviewed source;
  17 article contract checks pass, including HTML entity/link semantics, empty
  elements, multiline inline syntax, indented code and hardlinked-output safety.
  Original quotations, lists, tables and diagrams
  remain in the generated body; metadata and editorial framing are separate.
- Strict static checks: 23 pages, zero errors/warnings. Node suite: 129 passed,
  5 skipped, no failures. Resource comparison against `e39a7bb`: no warnings/errors;
  the four article entries are new, with no Explorer database/WASM dependency.
- Chromium and WebKit article observations: 1280/390px, light/dark, list-to-detail,
  TOC/current section/progress, actual deep-link reload, byte-exact Markdown download,
  related article and EN index navigation, horizontally scrollable tables/diagram,
  and no-JavaScript reading. Reports/screenshots are written to temporary evidence
  directories by `article-browser-checks.py`; these are browser-emulated viewports,
  not physical-device acceptance.
- Full existing-site Chromium extended matrix passes with ten navigation routes.
  Expected deliberately blocked-script/data requests are recorded by the failure
  probes, not treated as successful resource loads.
- These observations do not independently fact-check the papers, quotations or
  external statistics cited in the articles. Live deployment must still be checked
  separately after authenticated publication.

## Automated checks

Prerequisites: Python **≥3.9** (standard library), Node **≥22.13**, Bash for
parse-only shell syntax, and Git for optional baseline resource comparison. Python
Playwright plus an existing browser installation are optional, not app dependencies.
Article authoring additionally requires pinned **Markdown==3.4.1** and
**html5lib==1.1** from `tools/requirements-articles.txt`; serving the checked-in site
does not require them.
The check commands below do not install tools, run the bank, generate an application
or publish. Select the intended interpreter when PATH points to an older Node/Python.

```sh
python3 -B tools/check-site.py --strict
node tools/check-examples.mjs
node --test tools/tests/*.test.mjs
python3 -B tools/check-resources.py --baseline 28ba7c2
# After installing the optional pinned article-authoring dependency:
python3 -B tools/build-articles.py --check
python3 -B -m unittest discover -s tools/tests -p test_articles.py
python3 -B tools/article-browser-checks.py --browser chromium
python3 -B tools/article-browser-checks.py --browser webkit
```

- Static checks retain the 18 core pages plus 404 and add the paired article
  indices and discovered `zh/articles/*/index.html` details: canonical/hreflang,
  stable section IDs, section-scoped example/fact markers, F/DEF references,
  local links, actual status-table definition anchors and main/skip links.
  The original nine core route pairs keep their ID/section contracts. Every page
  has ten static navigation destinations (including Home and Insights).
  `SITE` is parsed as a literal object; no JS body or expression is evaluated.
  Five primary and four secondary enhanced links retain those destinations.
  Map/navigation links need accessible labels. Chinese-only details require their
  own canonical, trusted `data-page="article"` identity and
  `data-language-index="/articles/"`; they must not advertise an English translation.
  Their **EN index** link has neither translation metadata nor article query/hash.
  Paired indices retain query/fragment state when switching language.
- Article prose and attributed third-party data are editorial material, not
  verified product facts. Unmarked editorial F/DEF text is tracked separately;
  explicit `data-fact` and linked F/DEF identities still pass the strict registry
  checks. Core product validation is unchanged. Source fidelity/freshness checks
  do not prove third-party statistics, product shipping or proposed delivery plans.
- F/DEF definitions come directly from their Markdown table registries. New IDs
  must appear in both status tables; repeated display text, a link or an unrelated
  span is not a table definition. Privacy checks examine public prose, not intentional
  negative fixtures in test files. These checks do not certify arbitrary prose
  semantics or resolve every external documentation URL.
- F-10's registry value is a complete ordered numeric census: its categories must
  sum to its total, and both status value cells must match those quantities. Extra
  VO-expansion numbers belong outside that value cell. Current bank source links
  and the `bank-convenience` clone target must match `SITE.urls.bank`; historical
  snapshot origins are not rewritten by this check.
- HTML/CSS and finite first-party JS fetch, Worker, import/importScripts and literal
  asset references must be local and exist. Computed URLs and vendor internals are
  not proven safe by a text scan; browser request observation supplies another layer.
  Graph SHA/count checks open SQLite with `mode=ro&immutable=1`.
- Example checks accept new stable IDs while retaining the nine B IDs. Exact EN/ZH
  code bytes and source metadata must agree; malformed marked blocks cannot silently
  disappear. Declared CLI invocations are checked even when indented. Shell syntax
  uses `bash --noprofile --norc -n`, without execution or startup files. This checks
  syntax/explicit flags, **not whether the real CLI accepts every flag**.
- `counter-fold-ir` and examples marked `data-example-kind="compiled-fragment"`
  with `data-grammar="json"` receive JSON grammar checks only. Arbitrary whole author
  JSON is not treated as an input schema; proposals are not semantic passes.
  Optional kinds: `shell`, `author`, `compiled-fragment`, `proposal`, `text`;
  grammars: `shell`/`bash`, `json`, `yaml`, `text`. YAML/author/proposal grammar and
  semantics still need the official matched toolchain; no `--toolchain` execution
  has been added or invented.
- To compare the source-bound slice with an existing checkout, use
  `node tools/check-examples.mjs --bank-root /absolute/bank-wealth-demo`.
  It reads only, neither modifying nor compiling the checkout, and resolves symlinks
  before checking the source-path boundary. Do not refresh a hash merely to silence
  a mismatch; review the source and both copies.
- Node tests retain B routing/copy/denied-capability/guard/real-SQL regressions and
  add checker negative fixtures. DOM mocks and text checks are not browser, compiler,
  bank/JVM or business acceptance.
- Resource reports list every entry's finite transitive resource inventory and
  raw/gzip byte totals, baseline deltas and critical Git diffstat. Baselines are
  read with `git show`, never checked out. On-demand Explorer dependencies are
  included; external prose links are not. Article indices/details are included as
  reading entries. Baseline-absent pages report `newEntry: true`, with no fabricated
  delta or missing-baseline inventory error; existing entry budgets are unchanged.
  Reading pages must not load SQLite/WASM or the workshop. Over 20% raw or gzip
  growth in existing entries needs an explanation (`--strict` makes these warnings
  fail). Gzip totals are deterministic per-file sums, **not
  transfer measurements, cache behavior or invented performance timings**.

## Graph / Code snapshot delivery gate

The same Explorer now has Graph and Code views. The public pointer selects the
fully verified isolated bank snapshot described by F-30 and
`docs/bank-explorer-20261115.md`. This is source/anchor acceptance, not a new
bank service run. Explicit missing snapshots still fail rather than borrowing
locations from another version.

`tools/export-explorer-snapshot.mjs` and its schema/fixtures define the public
contract; `tools/build-assets.md` describes explicit inputs and absent destination.
Run the release payload gate in addition to page checks:

```sh
python3 -B tools/check-public-payloads.py
```

It checks downloaded HTML, public JSON/text and SQLite payloads, not only visible
prose. The historical Workshop's two private verification paths were removed from
its public copy; original evidence and executable/CSP were checked unchanged.
The installed bank bundle and historical copy pass this release payload gate.
Source files keep their original bytes; private files are withheld whole.

Browser observation uses `tools/browser-explorer-code.py --fixture RESOURCES_JSON
--evidence NEW_DIRECTORY`. Its fixture is produced by
`tools/tests/fixtures/explorer-fixture.mjs` into an owned temporary directory, never
into public assets. The report and page title explicitly label it synthetic:
**browser-contract evidence is not bank generation or runtime acceptance**.

Observed locally on 2026-11-15 in Chromium and WebKit: unpublished-pointer fallback,
Graph → complete source → clicked-line knowledge → actual author pointer,
refresh/back/EN–ZH, file search, withheld file, 375px layout, unknown snapshot and
modified-source rejection. New source bytes were displayed as text, not HTML.
Source bytes were displayed as text, not HTML. Adversarial lifecycle observation
also covered a slow code jump followed by changing Graph node, a Code deep-link
whose source response remained pending while Graph became ready, stale file-tree
context, withheld-file busy-state reset and retrying the same file after HTTP 503.
All retained the current selection and recovered without stale code/knowledge.
Rapid WebKit navigation also exposed post-navigation fetches; page loads now abort
at beforeunload/pagehide and restore safely from page cache. Twenty rapid page
changes and the final complete WebKit run produced no page errors or external
requests. The final Chromium complete run also passed.
The shared bank output initially failed `PROJECT_VERIFICATION_CURRENTINPUTS`.
An independent candidate then passed full verification and public export without
repairing shared files or receipts. `tools/browser-bank-explorer.py --evidence NEW_DIRECTORY`
drives the installed real bank dataset: ReserveFunds → Behaviors line 26 → same
command; LEDGER_SUFFICIENT → Rules line 33 → same guard; real structure-file source,
refresh/EN–ZH, 375px and withheld build.sbt. Chromium and WebKit both passed.

Real Counter observation additionally ran the public init/generate/export CLIs in
an independent temporary project, then drove the actual Explorer in Chromium and
WebKit: SetCount → CounterRules.scala line 7 → clicked-line reverse returned the
same qualified command and author pointer. Export contained 20 public files,
12 identities, 38 locations and 6 spans. No bank output or project database was
used or changed. This proves the exporter/browser seam, not bank acceptance.

Full existing site browser flows passed in Chromium and WebKit after preserving
the old node URL shape and handling blocked Worker loads with an explicit query
error. Automated maintenance checks are recorded separately from these runtime
observations; they are not substitutes for them.

The source-only implementation run before bank activation had 123 tests (122 passed,
one optional legacy CLI integration skipped); the real temporary Counter exporter
integration was enabled. After real bank activation and historical sanitization,
128 tests completed: 127 passed and the same optional skip. Strict
page/paired-example checks and the separate public-payload release gate pass.

Resource growth is intentional and reviewed: the finite inventory now includes
385 on-demand author/generated files, their index and the matched Graph snapshot,
plus the retained legacy fallback. The inventory measures all reachable assets,
not one page load. It reports approximately 8.53 MB raw / 1.47 MB per-file gzip,
+183% / +114% versus the pre-Code HEAD, so its 20% warning remains visible.
Individual source files load only when opened; this is not a timing claim or a
reason to preload the source tree. See F-30 for the verified file/count scope.

## Browser observation — integration gate

**Do not run the final matrix while parallel content/Explorer edits are in flight.**
Once the integrator has reconciled selectors, static contracts and shared assets:

```sh
python3 -B tools/browser-checks.py --browser chromium --extended
python3 -B tools/browser-checks.py --browser webkit --extended
```

The driver owns a **127.0.0.1 ephemeral-port** server, closes it even when launch
fails, and retains `report.json`/screenshots (plus extended `layout.json`) in a new
system temporary directory whose path is printed. It never installs a browser.
Missing Playwright or browser executables produce **BLOCKED, exit 2**; test failures
produce **FAIL, exit 1**. All created contexts collect page errors, console errors
and external HTTP attempts; external requests are blocked and fail the run. Console
errors are retained separately because injected resource failures and navigation
cancellations can generate them; a pass does not mean an empty browser console.

The default suite preserves B's all-route, 404/language, native Chromium clipboard,
denied storage/clipboard, guard/Arise keyboard, seven real SQL presets, sandbox
mutation isolation, empty/error/truncation, cancel/deadline, slow-load, hash-failure,
no-JS, 360px layout and draft-language regressions.

`--extended` adds D's 40-node directory pages, literal search/kind/empty/reset,
selected identity and real adjacency, share/reload/back/forward/language and unknown
IDs; 768/1280 × EN/ZH × auto/light/dark representative pages; measured navigation
height/offset and actual link counts; 200% CSS layout zoom; reduced motion; all-route
no-JS/site-script-failure fallback; graph failure and cold-offline boundaries. Waits
follow rendered results/busy state, not fixed sleeps. The slow-load B fixture uses
an intentional response delay, not a readiness assumption.

D contract: `#nodes`, `#xp-node-search`, `#xp-node-kind`, `#xp-node-reset`,
`#xp-node-count`, `#xp-node-list button[data-node]`,
`#xp-node-detail button[data-node]`, `#xp-node-prev`/`#xp-node-next`;
share `?node=<encoded-id>#nodes`. Filtering preserves identity; the explicitly
labelled reset clears filters/selection. Reconcile delivered selectors before
interpreting a timeout as a UI defect.

`--extended` also checks 360/390 CSS-pixel EN/ZH navigation: overflow-dependent
scroll guidance, actual 44px project touch targets, explicit horizontal input before
primary-link taps, Reference links/keyboard Escape, theme/language taps and anchor
clearance. Mobile callout stacking and persistent Counter-guide links are checked.
Mobile Explorer visits wait for the actual 40-node first page before proceeding,
not only a changed URL; no fixed sleep or page-error suppression is used.
No physical-device or WCAG certification is implied.

| Integrated result · 2026-11-14, local review working tree based on `28ba7c2` | Result |
|---|---|
| Strict static registry/link checks and paired examples | **PASS**: 29 facts, 22 ledger entries, graph 389/413 |
| Node maintenance suite | **PASS**: 53 passed, 1 optional CLI integration skipped; no toolchain execution |
| Resource inventory versus `28ba7c2` | **PASS**: no strict budget warnings or missing resources |
| Chromium B regressions after integration | **PASS** |
| Chromium extended directory/layout/failure and narrow-navigation matrix | **PASS**: no page errors or external requests; expected injected resource failures retained as console errors |
| WebKit B + extended matrix | **PASS**: WebKit 26.5 / Playwright build 2336; no page errors or external requests; console messages retained and reviewed |
| Native browser-menu 200% zoom, screen reader, contrast/focus review | **NOT RUN**; targeted keyboard focus and screenshots reviewed, not a complete accessibility audit |
| Cached-offline availability | **NOT RUN / not guaranteed** |

Both browser runs retained screenshots, `layout.json`, `mobile-layout.json` and
`report.json` in separate local temporary evidence directories; these files are not
public release materials. Each run measured 16 mobile and 48 desktop cases: no
page-level horizontal overflow, with mobile navigation targets at least 44px wide
and high. Baseline mobile measurements found EN overflow but no ZH primary nav
overflow. Reviewed screenshots confirm the conditional hint, larger controls and
single-column mobile callouts. These passes do not close independent human checks.

WebKit was initially blocked by a missing executable; its matching browser was then
installed with explicit authorization, without upgrading project dependencies.
The first full run failed on Worker page errors while the mobile test immediately
left Explorer after a URL change. A routed/unrouted diagnostic localized these to
navigation during Worker startup. The mobile test now waits for the rendered first
directory page at both entry points; unchanged page-error assertions then passed
in both engines. Remaining WebKit console messages were traced to navigation-cancelled
imports and deliberate 404/offline cases, not silently discarded. Local server
broken-pipe messages during cancelled requests were retained separately. No Explorer
runtime or graph assets were changed, and this is not a general unload-race guarantee.

A historical B Chromium pass at `6627b63` is not a pass for the new integrated
matrix. WebKit gets no unsupported Chromium clipboard permissions: its copy check
observes exact `writeText` payloads, **not native OS clipboard readback**. Native
WebKit clipboard remains manual. CSS zoom=2 is a portable layout stress, not a claim
that browser-menu zoom was tested. Reduced-motion checks are limited observations,
not WCAG certification. Routed contexts disable HTTP cache; cold-offline failure
and cached-offline availability must not be conflated. No service worker or automatic
offline cache contract exists.

For a manual preview, bind only to localhost:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

`file://` is not the Explorer entry: database/WASM need same-origin HTTP. The
workshop download is a separate self-contained historical snapshot. Its offline
contract is not inferred from the website's Explorer tests.

## Content and evidence

- [ ] Article Markdown and manifest metadata produce fresh checked-in outputs via
      `tools/build-articles.py --check`; originals retain reviewed source bytes.
- [ ] Editorial quotations, external statistics and proposed engineering directions
      remain attributed and unverified, not recast as F-xx product-shipping proof.
- [ ] Original Chinese article titles are not presented as translated EN titles;
      EN detail translation is not advertised where only an index exists.
- [ ] EN/ZH code payloads, fact IDs, source references and failure boundaries agree.
- [ ] F-24–F-29 retain candidate/date/platform scope. SQL rebuild is 66.847 s;
      actor64/readside47 share 23 generated tests.
- [ ] Historical P23 failure, current technical pass, independent experience,
      public materials and human acceptance remain separate.
- [ ] Raw orphan nodes (23 rows / 13 names) are not equated with 11 canonical
      sourceless events. Lineage is model-to-declared-source, not field-level proof.
- [ ] No private audit paths, raw logs, credentials or session login material are
      copied into public pages or the sanitized summary.
- [ ] `--runtime-supply` is documented only for the correct workshop scopes;
      source rejects unused supplies and sessions use sealed run inputs.
- [ ] Content update dates do not re-date old verification captures.
- [ ] Current/proposed fold examples are labelled accurately; official parser,
      profile and semantic checks are recorded separately from text/grammar checks.

## Interaction and accessibility

- [ ] Static navigation and prose remain available with JS disabled or unavailable.
- [ ] Language switching retains allowed query/fragment state; unknown paths recover
      to language homes rather than adding repeated `/zh` prefixes.
- [ ] Theme works without localStorage. Copy excludes controls; denied copying is
      not labelled successful. Native WebKit clipboard is separately observed.
- [ ] Partial guard loss differs from complete/no coverage; keyboard controls can
      remove and restore every relation without losing focus.
- [ ] Free SQL uses a disposable Worker database per run. Changes are discarded;
      preset data and original bytes stay intact. This is isolation, not an SQL
      read-only authorizer or arbitrary-input memory-safety guarantee.
- [ ] Text/result limits and cancellation are visible; late results cannot overwrite
      a newer selection. Unavailable graphs show unexecuted expectations.
- [ ] Node selection uses real full IDs; filtering, unknown IDs, pagination, adjacency,
      sharing and history retain their documented state. Missing code anchors are
      unavailable, not guessed file/line or span mappings.
- [ ] Text contrast, visible focus, native 200% zoom, reduced motion and mobile reading
      are reviewed on the changed screens. No broad WCAG-certification claim.

## Assets and publication (explicit authorization required)

- [ ] Graph SHA-256 matches metadata; derived data is regenerated, not hand-edited.
- [ ] Reading pages do not load the database/WASM or workshop snapshot.
- [ ] Baseline `28ba7c2` entry byte/gzip deltas are recorded; growth over 20% is
      explained. Sizes are not presented as measured performance timings.
- [ ] Runtime assets are local; external GitHub/documentation links are not runtime
      requests. Neither cold nor cached-offline site availability is guaranteed.
      Single sanctioned exception: the Cloudflare Web Analytics beacon
      (`https://static.cloudflareinsights.com/beacon.min.js`) injected by
      `assets/js/site.js` for production traffic statistics (ad9d34e), recorded in
      `ALLOWED_EXTERNAL_RUNTIME` inside `tools/check-site.py`; that exact URL is
      exempt from the external-runtime-resource scan, everything else still fails.
- [ ] `.nojekyll` remains present; no framework/build/CDN dependency was introduced.
- [ ] Review the final diff and staged file list; do not publish temporary evidence.
- [ ] Commit/push only when authorized, then separately check the live deployment.
