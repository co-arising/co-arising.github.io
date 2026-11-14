import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../../assets/js/site.js', import.meta.url), 'utf8');

function page({ lang = 'en', path = '/guide/', search = '', hash = '', notFound = false, saved = null, blockedRead = false, blockedWrite = false, clipboardFails = false, fallbackWorks = false, layout = null } = {}) {
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
        for (const id of ['language-switch', 'theme-toggle', 'nav-primary', 'nav-scroll-hint']) {
          const element = new Element(id === 'theme-toggle' ? 'button' : 'a');
          element.id = id;
          nodes.set(id, element);
        }
        if (layout) Object.assign(nodes.get('nav-primary'), layout);
      }
    }
    setAttribute(key, value) { this.attributes[key] = value; }
    getAttribute(key) { return this.attributes[key]; }
    removeAttribute(key) { delete this.attributes[key]; }
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
  html.style.setProperty = (key, value) => { html.style[key] = value; };
  if (layout) nav.getBoundingClientRect = () => ({ height: nodes.get('nav-scroll-hint').hidden ? 110 : 135 });
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

test('brand and community links keep localized homes separate from the permanent invite', () => {
  for (const [lang, path, label] of [
    ['en', '/', 'Join the Discord community'],
    ['zh-CN', '/zh/', '加入 Discord 社区'],
  ]) {
    const p = page({ lang, path });
    assert.ok(p.nav.innerHTML.includes(`<a class="brand" href="${path}" aria-current="page">`));
    assert.ok(p.nav.innerHTML.includes('<img class="brand-icon" src="/assets/img/co-arising-icon.png" width="32" height="32" alt="" />co-arising</a>'));
    assert.equal(p.nav.innerHTML.includes('discord.gg'), false);
    const footer = p.nodes.get('site-footer').innerHTML;
    assert.ok(footer.includes(`<a href="https://discord.gg/PwYrRpJu75">${label}`));
    const staticHome = readFileSync(new URL(`../..${path}index.html`, import.meta.url), 'utf8');
    const community = staticHome.match(/<section id="community"[\s\S]*?<\/section>/)?.[0];
    assert.ok(community, 'the invitation must be available without JavaScript');
    assert.ok(community.includes(`href="https://discord.gg/PwYrRpJu75">${label}`));
    assert.ok(community.includes('src="/assets/img/co-arising-tree.webp" width="960" height="960"'));
    assert.equal(community.includes('target="_blank"'), false);
  }
});

test('all content pages and the shared 404 declare the same local favicon', () => {
  const routes = ['', 'why-co-arising/', 'dsl/', 'pipeline/', 'bank-demo/', 'explorer/', 'compare/', 'guide/', 'status/'];
  const paths = ['', 'zh/'].flatMap((prefix) => routes.map((route) => `${prefix}${route}index.html`));
  for (const path of [...paths, '404.html']) {
    const html = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
    assert.ok(html.includes('<link rel="icon" href="/assets/img/co-arising-icon.png" type="image/png" sizes="64x64" />'), path);
    assert.equal(html.includes('href="/assets/img/favicon.svg"'), false, path);
  }
});

test('scroll guidance tracks actual overflow and updates the navigation offset', () => {
  const p = page({ layout: { clientWidth: 320, scrollWidth: 426 } });
  const primary = p.nodes.get('nav-primary');
  const hint = p.nodes.get('nav-scroll-hint');
  assert.equal(hint.hidden, false);
  assert.equal(primary.getAttribute('aria-describedby'), 'nav-scroll-hint');
  assert.equal(p.html.style['--nav-offset'], '147px');
  primary.clientWidth = 500;
  p.fireWindow('resize');
  assert.equal(hint.hidden, true);
  assert.equal(primary.getAttribute('aria-describedby'), undefined);
  assert.equal(p.html.style['--nav-offset'], '122px');
  primary.scrollWidth = 600;
  p.fireWindow('load');
  assert.equal(hint.hidden, false);
  assert.equal(p.html.style['--nav-offset'], '147px');
});

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
