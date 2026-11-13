# Local checks and publication checklist

Run these commands from the site repository. Deployment still requires no build step;
the following are maintenance tools, not browser runtime dependencies.

## Automated checks

```sh
python3 -B tools/check-site.py --strict
node tools/check-examples.mjs
node --test tools/tests/*.test.mjs
```

- The static checker uses the Python standard library. It checks 18 content pages
  plus 404, bilingual IDs, canonical/hreflang, local links, registered F/DEF IDs,
  asset existence, graph bytes/counts and private paths in public prose. It does
  not certify every prose claim or third-party URL.
- The example checker compares nine marked EN/ZH payloads, explicit project/output
  flags and the captured source fingerprint. To also compare the captured slice
  with an existing bank checkout, use
  `node tools/check-examples.mjs --bank-root /absolute/bank-wealth-demo`.
  It reads that checkout without modifying or compiling it. A mismatch requires
  reviewing the new source and both pages; do not merely replace the hash.
- Node tests cover graph-query isolation, real SQL behavior and limits, guard
  coverage, page routing, copy payloads and failed browser storage/clipboard paths.
  Node 22 is the recorded validation environment. These tests do not run bank/JVM
  services and do not replace native browser observation.

## Browser observation

With Python Playwright and its Chromium browser already installed:

```sh
python3 -B tools/browser-checks.py
```

The driver starts its own static server on **127.0.0.1 with an ephemeral port**, drives
the actual pages and Worker, and stops both browser and server. It retains screenshots
and `report.json` in a new system temporary directory and prints the location. It does
not install dependencies, publish files or use existing bank resources. Use the Python
interpreter that owns your Playwright installation, not an unrelated Python on PATH.

Covered surfaces: all content routes, language fragments and 404, exact EN/ZH clipboard
payloads, denied storage/clipboard, keyboard guard changes and full Arise reconstruction,
seven SQL presets, disposable writes, empty/error/truncated results, cancellation,
slow initial loads, wrong database hashes, no-JavaScript content and narrow-screen overflow.

Chromium has been exercised. WebKit, human screen-reader review, a fresh public tool
installation and bank service acceptance remain separate checks. Do not claim them from
a Chromium report. Manual screenshots should record viewport/theme when reviewing
visual differences.

For a manual preview, bind only to localhost:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

`file://` is not the Explorer entry: its database/WASM require same-origin HTTP.
The downloaded workshop HTML is a separate self-contained offline snapshot.

## Content and evidence

- [ ] EN/ZH code payloads, fact IDs, source references and failure boundaries agree.
- [ ] F-24–F-29 retain candidate/date/platform scope. SQL rebuild is 66.847 s;
      actor64/readside47 share 23 generated tests.
- [ ] Historical P23 failure, current technical pass, independent experience,
      public materials and human acceptance remain separate.
- [ ] Raw orphan nodes (23 rows / 13 names) are not equated with 11 canonical
      sourceless events. Lineage is model-to-declared-source, not a field-level proof.
- [ ] No private audit paths, raw logs, credentials or session login material are
      copied into public pages or the sanitized summary.
- [ ] `--runtime-supply` is documented only for the correct workshop scopes;
      source rejects unused supplies and sessions use sealed run inputs.
- [ ] Content update dates do not re-date old verification captures.

## Interaction and accessibility

- [ ] Static navigation and prose remain available with JS disabled or unavailable.
- [ ] Language switching retains current supported query/fragment state; unknown
      paths recover to language homes rather than adding repeated `/zh` prefixes.
- [ ] Theme remains usable without localStorage. Copy does not include control text;
      denied copying is not labelled successful.
- [ ] Partial guard loss differs from complete/no coverage; keyboard controls can
      remove and restore every relation without losing focus.
- [ ] Free SQL uses a new disposable Worker database for every run. Changes are
      discarded; preset data and original bytes remain intact. This is isolation,
      not an SQL read-only authorizer or an arbitrary-input memory-safety guarantee.
- [ ] Text/result limits and cancellation are visible; late results cannot overwrite
      a newer selection. An unavailable graph shows unexecuted expectations.
- [ ] Text contrast, visible focus, 200% zoom, reduced motion and mobile reading have
      been checked for the actual changed screens. No broad WCAG-certification claim.

## Assets and publication (explicit authorization required)

- [ ] Graph SHA-256 matches metadata; derived data is regenerated, not hand-edited.
- [ ] Reading pages do not load the database/WASM or workshop snapshot.
- [ ] Runtime assets are local; external GitHub/documentation links are not runtime
      requests. A cold offline visit is not guaranteed without prior asset caching.
- [ ] `.nojekyll` remains present; no framework/build/CDN dependency was introduced.
- [ ] Review the final diff and staged file list; do not include temporary evidence.
- [ ] Commit/push only when authorized, then separately check the live deployment.
