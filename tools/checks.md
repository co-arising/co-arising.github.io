# Local checks and publication checklist

Run these commands from the site repository. Deployment requires no build step;
maintenance tools are not browser runtime dependencies.

## Automated checks

Prerequisites: Python **≥3.9** (standard library), Node **≥22.13**, Bash for
parse-only shell syntax, and Git for optional baseline resource comparison. Python
Playwright plus an existing browser installation are optional, not app dependencies.
No command below installs tools, runs the bank, generates an application or publishes.
Select the intended interpreter when PATH points to an older Node/Python.

```sh
python3 -B tools/check-site.py --strict
node tools/check-examples.mjs
node --test tools/tests/*.test.mjs
python3 -B tools/check-resources.py --baseline 6627b63
```

- Static checks cover 18 content pages plus 404: canonical/hreflang, stable section
  IDs, section-scoped example/fact markers, F/DEF references, local links, actual
  status-table definition anchors, main/skip links and nine-route static navigation.
  `SITE` is parsed as a literal object; no JS body or expression is evaluated.
  Five primary and three secondary enhanced links do not remove the nine static
  destinations (including Home). Map/navigation links need accessible labels.
- F/DEF definitions come directly from their Markdown table registries. New IDs
  must appear in both status tables; repeated display text, a link or an unrelated
  span is not a table definition. Privacy checks examine public prose, not intentional
  negative fixtures in test files. These checks do not certify arbitrary prose
  semantics or resolve every external documentation URL.
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
  included; external prose links are not. Reading pages must not load SQLite/WASM
  or the workshop. Over 20% raw or gzip growth needs an explanation (`--strict`
  makes these warnings fail). Gzip totals are deterministic per-file sums, **not
  transfer measurements, cache behavior or invented performance timings**.

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
errors are retained separately because injected resource failures generate them.

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

| Integrated result to be updated by the integrator | Result |
|---|---|
| Chromium B regressions after C/D integration | **NOT RUN** |
| Chromium extended directory/layout/failure matrix | **NOT RUN** |
| WebKit B + extended matrix | **NOT RUN** |
| Native browser-menu 200% zoom, screen reader, contrast/focus review | **NOT RUN** |
| Cached-offline availability | **NOT RUN / not guaranteed** |

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
- [ ] Baseline `6627b63` entry byte/gzip deltas are recorded; growth over 20% is
      explained. Sizes are not presented as measured performance timings.
- [ ] Runtime assets are local; external GitHub/documentation links are not runtime
      requests. Neither cold nor cached-offline site availability is guaranteed.
- [ ] `.nojekyll` remains present; no framework/build/CDN dependency was introduced.
- [ ] Review the final diff and staged file list; do not publish temporary evidence.
- [ ] Commit/push only when authorized, then separately check the live deployment.
