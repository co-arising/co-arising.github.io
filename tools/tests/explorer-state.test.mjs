import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';

// Source-only DOM/Worker harness, not browser evidence; no snapshot data is evaluated.
const root = new URL('../../', import.meta.url);
const source = readFileSync(new URL('assets/js/explorer.js', root), 'utf8');
const siteSource = readFileSync(new URL('assets/js/site.js', root), 'utf8');
const bytes = readFileSync(new URL('assets/data/bank-wealth.graph.sqlite', root));
const wasm = readFileSync(new URL('assets/vendor/sqljs/sql-wasm.wasm', root));
const meta = JSON.parse(readFileSync(new URL('assets/data/bank-wealth.graph.meta.json', root)));
const require = createRequire(import.meta.url);
const SQL = await require(new URL('assets/vendor/sqljs/sql-wasm.js', root).pathname)({ wasmBinary: wasm });
await import(new URL('assets/js/explorer-query.js', root));
const execute = globalThis.ExplorerQuery.execute;
const arrayBuffer = (buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const unescape = (text) => text.replace(/&(?:amp|lt|gt|quot|#39);/g, (c) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }[c]));

function page({ url = '/explorer/', lang = 'en', badHash = false, fetchFails = false } = {}) {
  const nodes = new Map(), windowEvents = new Map(), timers = new Map();
  const workers = [], downloads = [], confirmations = [];
  let timerId = 0, confirmAnswer = false;
  class Element {
    constructor(id = '', tag = 'div') {
      this.id = id; this.tag = tag; this.dataset = {}; this.attributes = {}; this.events = new Map();
      this.children = []; this.value = ''; this.disabled = false; this.hidden = false; this._html = ''; this._text = '';
      this.classList = { toggle() {} };
    }
    get innerHTML() { return this._html; }
    set innerHTML(html) {
      this._html = html; this.children = [];
      for (const match of html.matchAll(/<button\b[^>]*data-node='([^']*)'[^>]*>/g)) {
        const button = new Element('', 'button'); button.dataset.node = unescape(match[1]); button.parent = this;
        this.children.push(button);
      }
    }
    get textContent() { return this._text; }
    set textContent(text) { this._text = text; this.children = []; }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key]; }
    addEventListener(name, fn) { if (!this.events.has(name)) this.events.set(name, []); this.events.get(name).push(fn); }
    fire(name, fields = {}) {
      const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...fields };
      for (const fn of this.events.get(name) || []) fn(event);
      return event;
    }
    focus() { document.activeElement = this; }
    querySelectorAll(selector) { return selector === 'button[data-node]' ? this.children : []; }
    closest(selector) { return selector === 'button[data-node]' && this.tag === 'button' && this.dataset.node !== undefined ? this : null; }
    contains(element) { return element === this || element.parent === this; }
  }
  for (const id of ['xp-status', 'xp-result', 'xp-sql', 'xp-run', 'xp-cancel', 'xp-clear', 'xp-timing', 'xp-radial', 'xp-radial-svg', 'language-switch', 'xp-node-search', 'xp-node-kind', 'xp-node-count', 'xp-node-list', 'xp-node-detail', 'xp-node-prev', 'xp-node-next', 'xp-node-page', 'xp-node-reset', 'xp-node-cancel']) nodes.set(id, new Element(id));
  const presets = ['census', 'describe', 'blast', 'lineage', 'orphans', 'sagas', 'invariants'].map((key) => {
    const button = new Element(key, 'button'); button.dataset.preset = key; return button;
  });
  const html = new Element(); html.lang = lang; html.setAttribute('lang', lang);
  const document = { documentElement: html, body: { dataset: {} }, getElementById: (id) => nodes.get(id) || null,
    querySelectorAll: (selector) => selector === '#xp-presets button' ? presets : [] };
  const location = new URL(url, 'https://co-arising.github.io');
  const entries = [location.href]; let index = 0;
  const fireWindow = (name) => { for (const fn of windowEvents.get(name) || []) fn(); };
  const history = {
    pushState(_state, _title, url) { location.href = new URL(url, location).href; entries.splice(++index); entries.push(location.href); },
    replaceState(_state, _title, url) { location.href = new URL(url, location).href; entries[index] = location.href; },
    go(delta) {
      if (index + delta < 0 || index + delta >= entries.length) return;
      const previousHash = location.hash;
      index += delta; location.href = entries[index]; fireWindow('popstate');
      if (previousHash !== location.hash) fireWindow('hashchange');
    },
  };
  class Worker {
    constructor(url) { this.url = url; this.terminated = false; workers.push(this); }
    postMessage(message, transfer) { assert.equal(transfer, undefined); this.message = structuredClone(message); }
    terminate() { this.terminated = true; }
    finish(result) {
      this.onmessage({ data: { id: this.message.id, ok: true, result: result || execute(SQL, bytes, this.message.request), milliseconds: 1.25 } });
    }
    fail(error = 'Simulated query error') { this.onmessage({ data: { id: this.message.id, ok: false, error } }); }
  }
  const context = vm.createContext({ document, location, history, Worker, URLSearchParams, TextEncoder, Event, Uint8Array,
    window: {
      addEventListener: (name, fn) => { if (!windowEvents.has(name)) windowEvents.set(name, []); windowEvents.get(name).push(fn); },
      dispatchEvent: (event) => fireWindow(event.type),
      confirm: (message) => { confirmations.push(message); return confirmAnswer; },
    },
    localStorage: { getItem: () => null, setItem() {} },
    crypto: { subtle: { async digest() { return arrayBuffer(badHash ? Buffer.alloc(32) : createHash('sha256').update(bytes).digest()); } } },
    fetch: (url) => new Promise((resolve) => downloads.push({ url, resolve })),
    setTimeout: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  });
  vm.runInContext(siteSource, context);
  vm.runInContext(source, context);
  const modeWorkers = (mode) => workers.filter((worker) => worker.message.request.mode === mode);
  return { document, nodes, workers, downloads, location, history, timers, confirmations, fireWindow, modeWorkers,
    preset: (key) => presets.find((button) => button.dataset.preset === key).fire('click'),
    presetButton: (key) => presets.find((button) => button.dataset.preset === key),
    confirm: (answer) => { confirmAnswer = answer; },
    choose(id, container = 'xp-node-list') {
      const button = new Element('', 'button'); button.dataset.node = id; button.parent = nodes.get(container);
      return nodes.get(container).fire('click', { target: button });
    },
    async boot() {
      for (const download of downloads) download.resolve({ ok: !fetchFails, status: fetchFails ? 503 : 200,
        arrayBuffer: async () => arrayBuffer(download.url.endsWith('.wasm') ? wasm : bytes), json: async () => meta });
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

test('both languages provide the native directory/inspector contract and truthful fallback', () => {
  for (const path of ['explorer/index.html', 'zh/explorer/index.html']) {
    const html = readFileSync(new URL(path, root), 'utf8');
    for (const id of ['nodes', 'xp-node-search', 'xp-node-kind', 'xp-node-reset', 'xp-node-count', 'xp-node-list', 'xp-node-detail', 'xp-node-prev', 'xp-node-next']) assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, id);
    assert.match(html, /<input[^>]*id="xp-node-search"[^>]*type="search"/);
    assert.match(html, /<label for="xp-node-kind">/);
    assert.match(html, /<select[^>]*id="xp-node-kind"/);
    assert.match(html, /canonical graphstore/);
    assert.match(html, /2026-11-11/);
    assert.match(html, /unavailable/);
  }
});

test('initial node URL waits for verified graph, loads once, and ignores URL SQL', async () => {
  const p = page({ url: '/explorer/?node=aggregate%3ACreditBalance&sql=DELETE+FROM+nodes#nodes' });
  assert.equal(p.workers.length, 0);
  await p.boot();
  assert.equal(p.modeWorkers('directory').length, 1);
  assert.equal(p.modeWorkers('inspect').length, 1);
  assert.equal(p.modeWorkers('sandbox').length, 0);
  assert.equal(p.modeWorkers('preset').length, 0);
  p.modeWorkers('directory')[0].finish(); p.modeWorkers('inspect')[0].finish();
  assert.match(p.nodes.get('xp-node-count').textContent, /389 matching \/ 389 total/);
  assert.equal(p.nodes.get('xp-node-list').children.length, 40);
  assert.equal((p.nodes.get('xp-node-kind').innerHTML.match(/<option/g) || []).length, 17);
  assert.match(p.nodes.get('xp-node-detail').innerHTML, /aggregate:CreditBalance/);
  assert.match(p.nodes.get('xp-node-detail').innerHTML, /canonical graphstore snapshot captured 2026-11-11/);
  assert.match(p.nodes.get('xp-node-detail').innerHTML, /unavailable — not provided by this snapshot/);
  p.fireWindow('popstate'); p.fireWindow('hashchange');
  assert.equal(p.modeWorkers('inspect').length, 1);
  assert.ok(p.downloads.every((download) => download.url.startsWith('/assets/')));
});

test('latest node, filters and console choice win across slow boot, independently', async () => {
  const p = page({ url: '/explorer/?node=aggregate%3ACreditBalance#blast' });
  p.preset('census'); p.preset('orphans');
  p.choose('slice:ReserveFunds'); p.choose('event:SipInstallmentFailed');
  p.nodes.get('xp-node-search').value = 'Sip'; p.nodes.get('xp-node-search').fire('input');
  p.nodes.get('xp-node-kind').value = 'event'; p.nodes.get('xp-node-kind').fire('change');
  await p.boot();
  assert.deepEqual(p.modeWorkers('inspect').map((worker) => worker.message.request.id), ['event:SipInstallmentFailed']);
  assert.deepEqual(p.modeWorkers('preset').map((worker) => worker.message.request.key), ['orphans']);
  assert.deepEqual(p.modeWorkers('directory')[0].message.request, { mode: 'directory', search: 'Sip', kind: 'event', page: 0 });
  p.modeWorkers('inspect')[0].finish(); p.modeWorkers('preset')[0].finish();
  assert.match(p.nodes.get('xp-node-detail').innerHTML, /event:SipInstallmentFailed/);
  assert.match(p.nodes.get('xp-result').innerHTML, /Raw node query/);
  assert.match(p.nodes.get('xp-result').innerHTML, /23 rows, 13 names/);
});

test('node switching cancels stale workers without changing active preset results', async () => {
  const p = page(); await p.boot(); p.modeWorkers('directory')[0].finish();
  p.preset('describe'); p.modeWorkers('preset')[0].finish();
  const consoleResult = p.nodes.get('xp-result').innerHTML;
  p.choose('aggregate:CreditBalance'); const first = p.modeWorkers('inspect').at(-1);
  p.choose('slice:ReserveFunds'); const last = p.modeWorkers('inspect').at(-1);
  assert.equal(p.document.activeElement, p.nodes.get('xp-node-detail'));
  assert.equal(first.terminated, true);
  last.finish(); const detail = p.nodes.get('xp-node-detail').innerHTML;
  first.finish();
  assert.equal(p.nodes.get('xp-node-detail').innerHTML, detail);
  assert.equal(p.nodes.get('xp-result').innerHTML, consoleResult);
  assert.equal(p.presetButton('describe').getAttribute('aria-pressed'), 'true');
  p.nodes.get('xp-node-search').value = 'no-such-node'; p.nodes.get('xp-node-search').fire('input');
  p.modeWorkers('directory').at(-1).finish();
  assert.match(p.nodes.get('xp-node-count').textContent, /0 matching \/ 389 total/);
  assert.match(p.nodes.get('xp-node-list').innerHTML, /No matching nodes/);
  assert.equal(p.nodes.get('xp-node-detail').innerHTML, detail);
  assert.equal(p.location.searchParams.get('node'), 'slice:ReserveFunds');
});

test('Back/Forward restores exact URL selection once and keeps the real language link current', async () => {
  for (const lang of ['en', 'zh-CN']) {
    const path = lang === 'en' ? '/explorer/' : '/zh/explorer/';
    const other = lang === 'en' ? '/zh/explorer/' : '/explorer/';
    const p = page({ url: path + '?flow=cash&sql=secret', lang }); await p.boot();
    p.choose('command:CancelIncomingCredit'); p.choose('command:CreditBalance.CancelIncomingCredit');
    assert.equal(p.location.hash, '#nodes');
    assert.equal(p.location.searchParams.get('flow'), 'cash');
    assert.equal(p.location.searchParams.has('sql'), false);
    assert.equal(p.nodes.get('language-switch').getAttribute('href'), other + p.location.search + '#nodes');
    p.nodes.get('xp-node-reset').fire('click');
    assert.equal(p.location.searchParams.has('node'), false);
    const before = p.modeWorkers('inspect').length;
    p.history.go(-1);
    assert.equal(p.modeWorkers('inspect').length, before + 1);
    assert.equal(p.modeWorkers('inspect').at(-1).message.request.id, 'command:CreditBalance.CancelIncomingCredit');
    p.history.go(-1);
    assert.equal(p.modeWorkers('inspect').at(-1).message.request.id, 'command:CancelIncomingCredit');
    p.history.go(-1);
    assert.equal(p.location.searchParams.has('node'), false);
    assert.equal(p.modeWorkers('inspect').at(-1).terminated, true);
    p.history.go(1);
    assert.equal(p.modeWorkers('inspect').at(-1).message.request.id, 'command:CancelIncomingCredit');
    assert.equal(p.nodes.get('language-switch').getAttribute('href'), other + p.location.search + '#nodes');
  }
});

test('filter responses are latest-only; pages have exact sizes, reset and remain bounded', async () => {
  const p = page(); await p.boot(); p.modeWorkers('directory')[0].finish();
  for (let page = 1; page <= 9; page++) {
    p.nodes.get('xp-node-next').fire('click'); const worker = p.modeWorkers('directory').at(-1);
    assert.equal(worker.message.request.page, page); worker.finish();
    assert.equal(p.nodes.get('xp-node-list').children.length, page === 9 ? 29 : 40);
  }
  assert.equal(p.nodes.get('xp-node-next').disabled, true);
  p.nodes.get('xp-node-search').value = 'CreditBalance'; p.nodes.get('xp-node-search').fire('input');
  const stale = p.modeWorkers('directory').at(-1);
  p.nodes.get('xp-node-search').value = 'CancelIncomingCredit'; p.nodes.get('xp-node-search').fire('input');
  p.nodes.get('xp-node-kind').value = 'command'; p.nodes.get('xp-node-kind').fire('change');
  const latest = p.modeWorkers('directory').at(-1); latest.finish(); stale.finish();
  assert.equal(stale.terminated, true);
  assert.equal(latest.message.request.page, 0);
  assert.match(p.nodes.get('xp-node-count').textContent, /2 matching \/ 389 total/);
  assert.equal(p.nodes.get('xp-node-list').children.length, 2);
  p.nodes.get('xp-node-reset').fire('click');
  assert.equal(p.nodes.get('xp-node-search').value, ''); assert.equal(p.nodes.get('xp-node-kind').value, '');
  p.modeWorkers('directory').at(-1).finish();
  assert.equal(p.nodes.get('xp-node-list').children.length, 40);
  assert.equal(p.nodes.get('xp-node-prev').disabled, true);
});

test('cancel, timeout and worker failure never render stale nodes or fake directory counts', async () => {
  const p = page(); await p.boot(); p.modeWorkers('directory')[0].finish();
  p.choose('aggregate:CreditBalance'); const cancelled = p.modeWorkers('inspect').at(-1);
  p.nodes.get('xp-node-cancel').fire('click'); cancelled.finish();
  assert.equal(cancelled.terminated, true);
  assert.match(p.nodes.get('xp-node-detail').innerHTML, /cancelled/);
  p.choose('slice:ReserveFunds'); const timedOut = p.modeWorkers('inspect').at(-1);
  assert.equal(p.timers.size, 1);
  const timer = [...p.timers.values()][0]; assert.equal(timer.delay, 5000); timer.fn(); timedOut.finish();
  assert.equal(timedOut.terminated, true);
  assert.match(p.nodes.get('xp-node-detail').innerHTML, /exceeded 5 seconds/);
  p.nodes.get('xp-node-search').fire('input'); p.modeWorkers('directory').at(-1).fail();
  assert.match(p.nodes.get('xp-node-count').textContent, /Query failed/);
  assert.doesNotMatch(p.nodes.get('xp-node-count').textContent, /389/);
  assert.equal(p.nodes.get('xp-node-list').innerHTML, '');
  assert.equal(p.nodes.get('xp-node-next').disabled, true);
});

test('SHA or download failure starts no workers and shows no fabricated query success', async () => {
  for (const options of [{ badHash: true }, { fetchFails: true }]) {
    const p = page({ ...options, url: '/explorer/?node=aggregate%3ACreditBalance#census' }); await p.boot();
    assert.equal(p.workers.length, 0);
    assert.match(p.nodes.get('xp-status').textContent, /Graph unavailable/);
    assert.match(p.nodes.get('xp-node-count').textContent, /Graph unavailable/);
    assert.match(p.nodes.get('xp-node-detail').innerHTML, /Graph unavailable/);
    assert.match(p.nodes.get('xp-result').innerHTML, /documented expectations only/i);
    assert.equal(p.nodes.get('xp-run').disabled, true);
  }
});

test('B console cancel/timeout/latest-choice and draft language confirmation remain intact', async () => {
  const p = page({ url: '/explorer/#blast' });
  p.nodes.get('xp-clear').fire('click'); await p.boot(); p.modeWorkers('directory')[0].finish();
  assert.equal(p.modeWorkers('preset').length, 0);
  p.preset('census'); const stale = p.modeWorkers('preset').at(-1);
  p.preset('blast'); const latest = p.modeWorkers('preset').at(-1);
  latest.finish(); const result = p.nodes.get('xp-result').innerHTML; stale.finish();
  assert.equal(p.nodes.get('xp-result').innerHTML, result);
  assert.match(result, /55 nodes/);
  p.nodes.get('xp-sql').value = 'SELECT 1;'; p.nodes.get('xp-sql').fire('input');
  p.nodes.get('xp-run').fire('click'); const sandbox = p.modeWorkers('sandbox').at(-1);
  p.nodes.get('xp-cancel').fire('click'); sandbox.finish();
  assert.match(p.nodes.get('xp-result').innerHTML, /cancelled/);
  assert.equal(sandbox.terminated, true);
  p.nodes.get('xp-run').fire('click'); const slow = p.modeWorkers('sandbox').at(-1);
  const timer = [...p.timers.values()][0]; assert.equal(timer.delay, 5000); timer.fn(); slow.finish();
  assert.match(p.nodes.get('xp-result').innerHTML, /exceeded 5 seconds/);
  assert.equal(p.nodes.get('language-switch').fire('click').defaultPrevented, true);
  p.confirm(true); assert.equal(p.nodes.get('language-switch').fire('click').defaultPrevented, false);
  p.choose('slice:ReserveFunds');
  assert.equal(p.location.href.includes('SELECT'), false);
  p.nodes.get('xp-clear').fire('click');
  assert.equal(p.nodes.get('xp-sql').value, '');
  assert.equal(p.location.searchParams.get('node'), 'slice:ReserveFunds', 'Clearing SQL must not reset the independent node inspector');
  p.modeWorkers('inspect').at(-1).finish();
  assert.match(p.nodes.get('xp-node-detail').innerHTML, /slice:ReserveFunds/);
  const confirmations = p.confirmations.length;
  assert.equal(p.nodes.get('language-switch').fire('click').defaultPrevented, false);
  assert.equal(p.confirmations.length, confirmations);
});

test('unknown exact IDs and isolated nodes are distinct, and adjacency buttons inspect real targets', async () => {
  const p = page(); await p.boot(); p.modeWorkers('directory')[0].finish();
  p.choose("aggregate:CreditBalance' OR 1=1 --"); p.modeWorkers('inspect').at(-1).finish();
  assert.match(p.nodes.get('xp-node-detail').innerHTML, /No node with this exact full ID/);
  p.choose('story:CashFundPurchase'); p.modeWorkers('inspect').at(-1).finish();
  assert.equal((p.nodes.get('xp-node-detail').innerHTML.match(/No recorded edges/g) || []).length, 2);
  p.choose('slice:ReserveFunds'); p.modeWorkers('inspect').at(-1).finish();
  const button = p.nodes.get('xp-node-detail').children[0];
  p.nodes.get('xp-node-detail').fire('click', { target: button });
  assert.equal(p.modeWorkers('inspect').at(-1).message.request.id, button.dataset.node);
  assert.equal(p.location.searchParams.get('node'), button.dataset.node);
  p.modeWorkers('inspect').at(-1).finish();
  assert.doesNotMatch(p.nodes.get('xp-node-detail').innerHTML, /No node with this exact full ID/);
  assert.equal(p.document.activeElement, p.nodes.get('xp-node-detail'));
});

test('stored atom, names, provenance and full-ID attributes are escaped, never evaluated', async () => {
  const p = page(); await p.boot(); p.modeWorkers('directory')[0].finish();
  const id = "x'\"><img src=x onerror=alert(1)>";
  p.choose(id);
  assert.equal(p.modeWorkers('inspect').at(-1).message.request.id, id);
  assert.equal(p.location.searchParams.get('node'), id);
  const data = execute(SQL, bytes, { mode: 'inspect', id: 'event:SipInstallmentFailed' });
  data.node.id = id; data.node.name = '<img src=x>'; data.node.atom = '<script>bad()</script>';
  data.node.provenance = [{ field: 'atom.provenance.author', value: '<iframe src=x>' }];
  data.outgoing = { total: 1, edges: [{ id, relation: '<svg onload=bad()>' }] };
  p.modeWorkers('inspect').at(-1).finish(data);
  const html = p.nodes.get('xp-node-detail').innerHTML;
  assert.doesNotMatch(html, /<(?:img|script|iframe|svg)\b/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.equal(p.nodes.get('xp-node-detail').children[0].dataset.node, id);
});
