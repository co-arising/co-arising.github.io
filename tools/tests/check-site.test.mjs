import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
// Import only checker definitions; never execute site.js or launch a browser/server.
const python = String.raw`
import importlib.util, json, pathlib, sys
spec = importlib.util.spec_from_file_location('checks', pathlib.Path(sys.argv[1]) / 'tools/check-site.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
q = json.load(sys.stdin)
try:
    action = q['action']
    if action == 'config': result = m.site_configuration(q['text'])
    elif action == 'runtime': result = m.js_runtime_references(q['text'])
    elif action == 'registry': result = sorted(m.registry_ids(q['text'], q['prefix']))
    elif action == 'privacy': result = m.public_path_findings(q['text'])
    elif action == 'scan': result = m.check_site(q['root'])
    elif action == 'resources':
        rspec = importlib.util.spec_from_file_location('resources', pathlib.Path(sys.argv[1]) / 'tools/check-resources.py')
        resources = importlib.util.module_from_spec(rspec)
        rspec.loader.exec_module(resources)
        result = resources.inventory(lambda name: (m.ROOT / name).read_bytes(), q['entry'])
    elif action == 'browser-launch-failure':
        import contextlib, io, tempfile, types
        bspec = importlib.util.spec_from_file_location('browser_checks', pathlib.Path(sys.argv[1]) / 'tools/browser-checks.py')
        b = importlib.util.module_from_spec(bspec)
        bspec.loader.exec_module(b)
        state = {'closed': False, 'shutdown': False, 'joined': False}
        class Server:
            server_port = 1
            def __init__(self, *args, **kwargs): pass
            def serve_forever(self): raise AssertionError('must not start a real server')
            def shutdown(self): state['shutdown'] = True
            def server_close(self): state['closed'] = True
        class Thread:
            def __init__(self, *args, **kwargs): pass
            def start(self): pass
            def is_alive(self): return True
            def join(self, **kwargs): state['joined'] = True
        class Launcher:
            def launch(self, **kwargs): raise RuntimeError('test fixture: browser executable missing')
        class Runtime:
            def __enter__(self): return types.SimpleNamespace(webkit=Launcher())
            def __exit__(self, *args): pass
        fake = types.ModuleType('playwright.sync_api')
        fake.sync_playwright = Runtime
        sys.modules['playwright.sync_api'] = fake
        b.ThreadingHTTPServer, b.threading.Thread = Server, Thread
        with tempfile.TemporaryDirectory(prefix='co-arising-blocked-test-') as directory:
            b.tempfile.mkdtemp = lambda **kwargs: directory
            sys.argv = ['browser-checks.py', '--browser', 'webkit', '--extended']
            with contextlib.redirect_stdout(io.StringIO()): code = b.main()
            report = json.loads((pathlib.Path(directory) / 'report.json').read_text())
        result = {'exit': code, 'report': report, **state}
    elif action == 'page':
        page = m.Page(pathlib.Path('fixture.html'), q['text'])
        result = {'nav': page.nav_links, 'tables': {k: sorted(v) for k,v in page.table_ids.items()}, 'sections': page.sections, 'references': sorted(page.references), 'problems': page.problems}
    print(json.dumps({'ok': True, 'result': result}))
except (ValueError, OSError) as error:
    print(json.dumps({'ok': False, 'error': str(error)}))
`;
function call(request) {
  const output = spawnSync(process.env.PYTHON || 'python3', ['-B', '-c', python, root], { input: JSON.stringify(request), encoding: 'utf8' });
  assert.equal(output.status, 0, output.stderr || output.error?.message);
  return JSON.parse(output.stdout);
}
const config = readFileSync(join(root, 'assets/js/site.js'), 'utf8');

test('SITE is a literal config; its body is never executed', () => {
  const found = call({ action: 'config', text: config + '\nthrow new Error("must never execute");' });
  assert.equal(found.ok, true, found.error);
  assert.equal(found.result.nav.flatMap(g => g.items).length, 8);
  assert.equal(call({ action: 'config', text: 'const SITE = (() => { throw new Error("no eval"); })();' }).ok, false);
  assert.equal(call({ action: 'config', text: config.replace('href: "/dsl/"', 'href: "/unknown/"') }).ok, false);
  assert.equal(call({ action: 'config', text: config.replace('href: "/dsl/"', 'href: "/guide/"') }).ok, false);
  assert.equal(call({ action: 'config', text: config.replace(/labelZh:\s*"[^"]*"/, 'labelZh: 17') }).ok, false);
  assert.equal(call({ action: 'config', text: 'const SITE = { nav: [], nav: [] };' }).ok, false);
});

test('table definitions are actual row anchors, not references or detached duplicate displays', () => {
  const result = call({ action: 'page', text: '<section id="facts"><a href="#F-30">F-30</a><span id="F-30">not a row</span><table><tr><th><span id="F-18">F-18</span><span id="F-19">F-19</span></th></tr></table></section><section id="ledger"><table><tr id="DEF-21"><td>new item</td></tr></table></section>' }).result;
  assert.deepEqual(result.tables, { facts: ['F-18', 'F-19'], ledger: ['DEF-21'] });
  assert.ok(result.references.includes('F-30'));
  assert.deepEqual(call({ action: 'registry', prefix: 'F', text: '| F-01 | old |\n| F-30 | new |\nF-999 is only prose' }).result, ['F-01', 'F-30']);
  assert.equal(call({ action: 'registry', prefix: 'DEF', text: '| DEF-21 | a |\n| DEF-21 | b |' }).ok, false);
});

test('runtime URL scan follows finite fetch/Worker/import loads, not normal repository href strings', () => {
  const result = call({ action: 'runtime', text: `
    const repo = "https://github.com/co-arising/metarch-truthsrc";
    const escape = /[&<>"']/g;
    const asset = "/assets/data/local.json";
    fetch(asset); fetch("https://cdn.example/data.json", {mode:"cors"});
    new Worker(new URL("https://cdn.example/worker.js", import.meta.url));
    importScripts("/assets/vendor/local.js", "//cdn.example/other.js");
    import("https://cdn.example/module.js");
    // fetch("https://comments.example/nope")
    const snippet = 'fetch("https://prose.example/nope")';
  ` }).result;
  assert.deepEqual(result, ['//cdn.example/other.js', '/assets/data/local.json', '/assets/vendor/local.js', 'https://cdn.example/data.json', 'https://cdn.example/module.js', 'https://cdn.example/worker.js']);
});

function fixture(change) {
  const temporary = mkdtempSync(join(tmpdir(), 'co-arising-static-test-'));
  try {
    cpSync(root, temporary, { recursive: true, filter: source => !source.split('/').includes('.git') });
    change(temporary);
    return call({ action: 'scan', root: temporary });
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
function amend(dir, file, transform) {
  const path = join(dir, file);
  writeFileSync(path, transform(readFileSync(path, 'utf8')));
}

test('new registry IDs require EN/ZH table anchors, not merely duplicate display text', () => {
  const result = fixture(dir => {
    amend(dir, 'SITE-FACTS.md', text => text + '\n| F-999 | regression fixture |\n');
    amend(dir, 'LEDGER.md', text => text + '\n| DEF-999 | regression fixture |\n');
  });
  assert.equal(result.ok, true, result.error);
  assert.ok(result.result.errors.some(e => e.includes('facts table IDs') && e.includes('F-999')));
  assert.ok(result.result.errors.some(e => e.includes('ledger table IDs') && e.includes('DEF-999')));
});

test('static scan rejects missing fallback/main, page identity, marker and metadata drift', () => {
  const result = fixture(dir => {
    amend(dir, 'index.html', text => text.replace('href="/dsl/"', 'href="/guide/"').replace('<body>', '<body data-page="unknown">').replace('class="skip-link"', 'class="not-skip"').replace('data-fact="F-23"', 'data-fact="F-999"').replace('hreflang="en"', 'hreflang="xx"'));
    amend(dir, 'zh/dsl/index.html', text => text.replace('data-example="initialize-account-file"', 'data-example="changed-id"'));
  }).result;
  for (const pattern of ['static navigation', 'main/skip-link', 'data-page', 'fact_markers differ', 'examples differ', 'hreflang', 'unregistered']) {
    assert.ok(result.errors.some(e => e.includes(pattern)), `missing rejection: ${pattern}`);
  }
});

test('private-path fixtures are not public prose and external documentation is not an asset', () => {
  assert.equal(call({ action: 'privacy', text: 'published /Users/example/private/report.txt' }).result, true);
  const result = fixture(dir => {
    writeFileSync(join(dir, 'tools/tests/private-fixture.test.mjs'), '// /Users/example/private/report.txt');
    amend(dir, 'index.html', text => text.replace('</main>', '<a href="https://example.org/docs">External documentation</a></main>'));
  }).result;
  assert.ok(!result.errors.some(e => e.includes('private-fixture') || e.includes('example.org')));
});

test('read-only static scan leaves database bytes untouched', () => {
  const database = join(root, 'assets/data/bank-wealth.graph.sqlite');
  const before = readFileSync(database);
  const result = call({ action: 'scan', root });
  assert.equal(result.ok, true, result.error);
  assert.deepEqual(readFileSync(database), before);
});
