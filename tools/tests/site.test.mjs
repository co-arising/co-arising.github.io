import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../../assets/js/site.js', import.meta.url), 'utf8');

function page({ lang = 'en', path = '/guide/', search = '', hash = '', notFound = false, saved = null, blockedRead = false, blockedWrite = false, clipboardFails = false, fallbackWorks = false } = {}) {
  const nodes = new Map();
  const timers = new Map();
  const windowEvents = new Map();
  const clipboard = [];
  let timerId = 0;
  class Element {
    constructor(tag = 'div') {
      this.tag = tag; this.dataset = {}; this.attributes = {}; this.children = [];
      this.events = new Map(); this.style = {}; this.value = ''; this._text = ''; this._html = '';
      const classes = new Set();
      this.classList = { add: (c) => classes.add(c), remove: (c) => classes.delete(c),
        toggle: (c, on) => { if (on) classes.add(c); else classes.delete(c); } };
    }
    get textContent() { return this._text + this.children.map((child) => child.textContent).join(''); }
    set textContent(value) { this._text = value; this.children = []; }
    get innerText() { throw new Error('Rendered controls are not a copy payload'); }
    get innerHTML() { return this._html; }
    set innerHTML(value) {
      this._html = value;
      if (this === nav) {
        for (const id of ['language-switch', 'theme-toggle']) nodes.set(id, new Element(id === 'theme-toggle' ? 'button' : 'a'));
      }
    }
    setAttribute(key, value) { this.attributes[key] = value; }
    getAttribute(key) { return this.attributes[key]; }
    appendChild(child) { this.children.push(child); child.parent = this; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this); }
    addEventListener(name, fn) { if (!this.events.has(name)) this.events.set(name, []); this.events.get(name).push(fn); }
    async fire(name) { for (const fn of this.events.get(name) || []) await fn({}); }
    querySelector(selector) { return selector === 'code' ? this.children.find((child) => child.tag === 'code') : null; }
    select() {}
    focus() { document.activeElement = this; }
  }
  const nav = new Element();
  const footer = new Element();
  nodes.set('site-nav', nav); nodes.set('site-footer', footer);
  const pre = new Element('pre');
  const code = new Element('code'); code.textContent = 'node "$TRUTHSRC_CLI" --help\n'; pre.appendChild(code);
  const body = new Element('body'); body.dataset.page = notFound ? 'not-found' : '';
  const html = new Element('html'); html.setAttribute('lang', lang);
  const document = { documentElement: html, body, activeElement: null,
    getElementById: (id) => nodes.get(id) || null,
    createElement: (tag) => new Element(tag),
    querySelectorAll: (selector) => selector === 'pre.code' ? [pre] : [],
    execCommand: () => fallbackWorks,
  };
  const location = { pathname: path, search, hash };
  const context = { document, location,
    window: { addEventListener: (name, fn) => { if (!windowEvents.has(name)) windowEvents.set(name, []); windowEvents.get(name).push(fn); } },
    localStorage: { getItem() { if (blockedRead) throw new Error('storage blocked'); return saved; }, setItem() { if (blockedWrite) throw new Error('storage blocked'); } },
    navigator: { clipboard: { async writeText(text) { if (clipboardFails) throw new Error('denied'); clipboard.push(text); } } },
    setTimeout: (fn) => { timers.set(++timerId, fn); return timerId; }, clearTimeout: (id) => timers.delete(id),
  };
  vm.runInNewContext(source, context);
  return { nodes, nav, pre, code, html, clipboard, location, timers,
    fireWindow(name) { for (const fn of windowEvents.get(name) || []) fn(); },
  };
}

test('known routes preserve current language, query and fragment', () => {
  const p = page({ path: '/guide/index.html', search: '?example=counter', hash: '#l1' });
  const link = p.nodes.get('language-switch');
  assert.equal(link.getAttribute('href'), '/zh/guide/?example=counter#l1');
  p.location.hash = '#l2';
  p.fireWindow('hashchange');
  assert.equal(link.getAttribute('href'), '/zh/guide/?example=counter#l2');
  const zh = page({ lang: 'zh-CN', path: '/zh/status', hash: '#facts' });
  assert.equal(zh.nodes.get('language-switch').getAttribute('href'), '/status/#facts');
  zh.location.hash = '#ledger'; zh.fireWindow('site:locationchange');
  assert.equal(zh.nodes.get('language-switch').getAttribute('href'), '/status/#ledger');
});

test('404 and unknown requests recover to language homes without adding prefixes', () => {
  for (const path of ['/404.html', '/zh/404.html', '/zh/missing/', '/missing/']) {
    const p = page({ path, notFound: true, search: '?q=missing', hash: '#absent' });
    assert.equal(p.nodes.get('language-switch').getAttribute('href'), '/zh/');
  }
  assert.equal(page({ lang: 'zh-CN', path: '/zh/missing/', notFound: true }).nodes.get('language-switch').getAttribute('href'), '/');
});

test('URL contents are assigned as an attribute, not interpolated into nav HTML', () => {
  const p = page({ search: '?q=" onfocus="unexpected' });
  assert.equal(p.nav.innerHTML.includes('unexpected'), false);
  assert.equal(p.nodes.get('language-switch').getAttribute('href'), '/zh/guide/?q=" onfocus="unexpected');
});

test('blocked or invalid storage cannot disable theme or copy controls', async () => {
  for (const options of [{ blockedRead: true }, { saved: 'invalid' }, { saved: 'dark', blockedWrite: true }]) {
    const p = page(options);
    const before = p.html.getAttribute('data-theme');
    assert.ok(['auto', 'light', 'dark'].includes(before));
    await p.nodes.get('theme-toggle').fire('click');
    assert.notEqual(p.html.getAttribute('data-theme'), before);
    assert.ok(p.pre.children.some((child) => child.tag === 'button'));
  }
});

test('initial and repeated clipboard payload excludes both control and status text', async () => {
  for (const lang of ['en', 'zh-CN']) {
    const p = page({ lang });
    const button = p.pre.children.find((child) => child.tag === 'button');
    await button.fire('click');
    await button.fire('click');
    assert.deepEqual(p.clipboard, [p.code.textContent, p.code.textContent]);
    assert.equal(button.textContent, lang === 'en' ? 'copied' : '已复制');
  }
});

test('denied clipboard and failed fallback never announce success', async () => {
  const p = page({ clipboardFails: true });
  const button = p.pre.children.find((child) => child.tag === 'button');
  await button.fire('click');
  assert.equal(button.textContent, 'copy failed — select the code');
  assert.deepEqual(p.clipboard, []);
  const fallback = page({ clipboardFails: true, fallbackWorks: true });
  const fallbackButton = fallback.pre.children.find((child) => child.tag === 'button');
  await fallbackButton.fire('click');
  assert.equal(fallbackButton.textContent, 'copied');
});
