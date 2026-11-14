/* co-arising.github.io — shared repository bases, navigation and bilingual chrome.
   Static fallbacks and copyable examples retain their own HTML; maintenance checks
   keep those in sync. Each edition declares its language via <html lang>. */

const SITE = {
  org: "co-arising",
  urls: {
    // Flagship toolchain. Transferred to the co-arising org on 2026-11-11;
    // the old zhongdj/metarch-truthsrc address redirects automatically.
    truthsrc: "https://github.com/co-arising/metarch-truthsrc",
    bank: "https://github.com/co-arising/bank-wealth-demo",
    monarchCore: "https://github.com/MadPolaris/monarch-core",
    monarchPersistence: "https://github.com/MadPolaris/monarch-persistence",
    saga: "https://github.com/MadPolaris/saga-core",
    site: "https://github.com/co-arising/co-arising.github.io",
  },
  nav: [
    {
      group: "Start here",
      groupZh: "从这里开始",
      items: [
        { href: "/why-co-arising/", label: "Why co-arising", labelZh: "理念" },
        { href: "/dsl/", label: "Language", labelZh: "语言" },
        { href: "/bank-demo/", label: "Bank example", labelZh: "银行示例" },
        { href: "/explorer/", label: "Explorer", labelZh: "探索器" },
        { href: "/guide/", label: "Get started", labelZh: "开始使用" },
      ],
    },
    {
      group: "Reference & evidence",
      groupZh: "参考与证据",
      items: [
        { href: "/pipeline/", label: "Pipeline", labelZh: "生成流程" },
        { href: "/compare/", label: "Landscape", labelZh: "工具对比" },
        { href: "/status/", label: "Status & evidence", labelZh: "状态与证据" },
      ],
    },
  ],
  audited: "2026-11-11",
  contentUpdated: "2026-11-14",
};

const STR = {
  en: {
    langSwitch: "中文",
    langSwitchTitle: "阅读中文版（Chinese edition）",
    themeTitle: "Cycle theme (auto / light / dark)",
    themeLabel: { auto: "auto", light: "light", dark: "dark" },
    copy: "copy",
    copied: "copied",
    copying: "copying…",
    copyFailed: "copy failed — select the code",
    skip: "Skip to content",
    footerTagline:
      "Shared domain knowledge, verifiable implementations and traceable changes. Open tooling for people and agents working with DDD and event-sourced systems.",
    siteOnGitHub: "This site on GitHub",
    colRepos: "Repositories",
    colEngines: "Engines",
    colHonesty: "Honesty",
    statusLabel: "Verified facts &amp; ledger",
    colophon1: "© 2026 co-arising contributors · site content CC BY 4.0 · site code MIT",
    colophon2: `Content updated ${SITE.contentUpdated} · evidence dates and scope are recorded per fact · zero-build static site`,
  },
  zh: {
    langSwitch: "EN",
    langSwitchTitle: "Switch to the English edition",
    themeTitle: "循环切换主题（自动 / 浅色 / 深色）",
    themeLabel: { auto: "自动", light: "浅色", dark: "深色" },
    copy: "复制",
    copied: "已复制",
    copying: "复制中…",
    copyFailed: "复制失败，请选择代码",
    skip: "跳至正文",
    footerTagline:
      "让业务知识可共识、实现可验证、变更可追溯。面向人和智能体的开放工具链，以 DDD 与事件溯源约束协作开发。",
    siteOnGitHub: "本站在 GitHub 上",
    colRepos: "仓库",
    colEngines: "引擎",
    colHonesty: "诚实层",
    statusLabel: "已验证事实与台账",
    colophon1: "© 2026 co-arising 贡献者 · 站点内容 CC BY 4.0 · 站点代码 MIT",
    colophon2: `内容更新 ${SITE.contentUpdated} · 证据日期与范围逐项登记 · 零构建静态站`,
  },
};

(function () {
  "use strict";

  /* ---------- language & counterpart URL ---------- */
  const LANG = (document.documentElement.getAttribute("lang") || "en").toLowerCase().startsWith("zh")
    ? "zh"
    : "en";
  const T = STR[LANG];
  const nav = document.getElementById("site-nav");
  const footer = document.getElementById("site-footer");
  /* The document, not a missing request's pathname, identifies the 404. */
  const routes = new Set(["/", ...SITE.nav.flatMap((group) => group.items.map((item) => item.href))]);
  const rawPath = location.pathname.replace(/index\.html$/, "");
  const stripped = rawPath.replace(/^\/zh(?=\/|$)/, "") || "/";
  const normalized = stripped.endsWith("/") ? stripped : stripped + "/";
  const notFound = document.body.dataset.page === "not-found" || !routes.has(normalized);
  const here = notFound ? null : normalized;
  const isRoot = here === "/";

  const counterpart = () => {
    const base = LANG === "zh" ? (here || "/") : "/zh" + (here || "/");
    return base + (notFound ? "" : (location.search || "") + (location.hash || ""));
  };

  /* ---------- nav + footer injection ---------- */
  if (nav) {
    const links = (group) => group.items.map((item) => {
      const active = here === item.href ? ' aria-current="page"' : "";
      const href = LANG === "zh" ? "/zh" + item.href : item.href;
      const label = LANG === "zh" ? item.labelZh : item.label;
      return `<a class="nav-link" href="${href}"${active}>${label}</a>`;
    }).join("");
    const secondary = SITE.nav[1];
    const inReference = secondary.items.some((item) => item.href === here);
    const langA = LANG === "zh" ? "en" : "zh-CN";
    nav.innerHTML = `<div class="topline"></div><div class="site-nav"><div class="row nav-enhanced">
      <a class="brand" href="${LANG === "zh" ? "/zh/" : "/"}"${isRoot ? ' aria-current="page"' : ""}><span class="dot"></span>co-arising</a>
      <div class="nav-primary" id="nav-primary">${links(SITE.nav[0])}</div>
      <div class="nav-actions">
        <details class="nav-reference${inReference ? " current" : ""}" id="nav-reference">
          <summary>${LANG === "zh" ? "参考" : "Reference"}</summary>
          <div class="nav-reference-links">${links(secondary)}</div>
        </details>
        <a class="nav-link" id="language-switch" lang="${langA}" hreflang="${langA}" rel="alternate" href="${LANG === "zh" ? "/" : "/zh/"}" title="${T.langSwitchTitle}">${T.langSwitch}</a>
        <button class="theme-btn" id="theme-toggle" type="button" title="${T.themeTitle}">◐ ${T.themeLabel.auto}</button>
      </div>
      <p class="nav-scroll-hint" id="nav-scroll-hint" hidden>${LANG === "zh" ? "左右滑动查看更多导航链接" : "Scroll sideways for more navigation links"}</p>
    </div></div>`;
    const menu = document.getElementById("nav-reference");
    if (menu) menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        menu.open = false;
        menu.querySelector("summary").focus();
      }
    });
  }

  if (footer) {
    const statusHref = LANG === "zh" ? "/zh/status/" : "/status/";
    footer.innerHTML = `<div class="site-footer"><div class="cols">
      <div>
        <h4>co-arising</h4>
        <p>${T.footerTagline}</p>
        <p><a href="${SITE.urls.site}">${T.siteOnGitHub}</a></p>
      </div>
      <div>
        <h4>${T.colRepos}</h4>
        <ul>
          <li><a href="${SITE.urls.truthsrc}">metarch-truthsrc (truthsrc)</a></li>
          <li><a href="${SITE.urls.bank}">bank-wealth-demo</a></li>
          <li><a href="${SITE.urls.saga}">saga-core</a></li>
        </ul>
      </div>
      <div>
        <h4>${T.colEngines}</h4>
        <ul>
          <li><a href="${SITE.urls.monarchCore}">monarch-core</a></li>
          <li><a href="${SITE.urls.monarchPersistence}">monarch-persistence</a></li>
        </ul>
      </div>
      <div>
        <h4>${T.colHonesty}</h4>
        <ul>
          <li><a href="${statusHref}">${T.statusLabel}</a></li>
          <li><a href="${statusHref}#facts">SITE-FACTS</a></li>
          <li><a href="https://github.com/co-arising/co-arising.github.io/blob/main/LEDGER.md">LEDGER.md</a></li>
        </ul>
      </div>
    </div>
    <div class="colophon">
      <span>${T.colophon1}</span>
      <span>${T.colophon2}</span>
    </div></div>`;
  }

  /* Wrapped navigation changes height on narrow screens and after font loading. */
  if (nav && typeof nav.getBoundingClientRect === "function") {
    const primary = document.getElementById("nav-primary");
    const hint = document.getElementById("nav-scroll-hint");
    const updateNavOffset = () => {
      hint.hidden = primary.scrollWidth <= primary.clientWidth;
      if (hint.hidden) primary.removeAttribute("aria-describedby");
      else primary.setAttribute("aria-describedby", hint.id);
      document.documentElement.style.setProperty("--nav-offset", Math.ceil(nav.getBoundingClientRect().height + 12) + "px");
    };
    updateNavOffset();
    window.addEventListener("resize", updateNavOffset);
    if (typeof ResizeObserver === "function") new ResizeObserver(updateNavOffset).observe(nav);
    window.addEventListener("load", () => {
      updateNavOffset();
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
      const target = id && document.getElementById(id);
      if (target) target.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }

  const languageLink = document.getElementById("language-switch");
  const updateLanguageLink = () => { if (languageLink) languageLink.setAttribute("href", counterpart()); };
  updateLanguageLink();
  window.addEventListener("hashchange", updateLanguageLink);
  window.addEventListener("popstate", updateLanguageLink);
  window.addEventListener("site:locationchange", updateLanguageLink);
  if (languageLink) {
    languageLink.addEventListener("pointerdown", updateLanguageLink);
    languageLink.addEventListener("click", updateLanguageLink);
  }

  /* ---------- tri-state theme: auto → light → dark ---------- */
  const btn = document.getElementById("theme-toggle");
  const order = ["auto", "light", "dark"];
  let theme = "auto";
  try {
    const saved = localStorage.getItem("theme");
    if (order.includes(saved)) theme = saved;
  } catch (e) { /* Storage is optional, including blocked reads. */ }
  const apply = () => {
    document.documentElement.setAttribute("data-theme", theme);
    if (btn) btn.textContent = "◐ " + T.themeLabel[theme];
    try { localStorage.setItem("theme", theme); } catch (e) { /* in-memory theme */ }
  };
  apply();
  if (btn) {
    btn.addEventListener("click", () => {
      theme = order[(order.indexOf(theme) + 1) % order.length];
      apply();
    });
  }

  /* Controls never become part of the payload; terminal transcripts are not commands. */
  document.querySelectorAll("pre.code").forEach((pre) => {
    const code = pre.querySelector("code");
    if (!code || pre.dataset.copy === "none") return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-btn";
    button.textContent = T.copy;
    button.setAttribute("aria-label", T.copy);
    const status = document.createElement("span");
    status.className = "sr-only";
    status.setAttribute("role", "status");
    let timer;
    let copying = false;
    button.addEventListener("click", async () => {
      if (copying) return;
      copying = true;
      clearTimeout(timer);
      button.textContent = T.copying;
      button.classList.remove("done");
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try { await navigator.clipboard.writeText(code.textContent); copied = true; }
          catch (e) { copied = fallbackCopy(code.textContent); }
        } else copied = fallbackCopy(code.textContent);
      } catch (e) { copied = false; }
      copying = false;
      const message = copied ? T.copied : T.copyFailed;
      button.textContent = message;
      button.classList.toggle("done", copied);
      status.textContent = message;
      timer = setTimeout(() => {
        button.textContent = T.copy;
        button.classList.remove("done");
        status.textContent = "";
      }, copied ? 1400 : 4000);
    });
    pre.appendChild(button);
    pre.appendChild(status);
  });
  function fallbackCopy(text) {
    const previous = document.activeElement;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.setAttribute("readonly", "");
    document.body.appendChild(ta);
    ta.select();
    let copied = false;
    try { copied = document.execCommand("copy") === true; }
    catch (e) { /* manual selection remains available */ }
    finally {
      ta.remove();
      if (previous && typeof previous.focus === "function") previous.focus({ preventScroll: true });
    }
    return copied;
  }
})();
