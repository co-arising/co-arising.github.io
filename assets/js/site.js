/* co-arising.github.io — site chrome.
   SITE is the single source of truth for every repo URL and nav link.
   When a repository migrates orgs, edit it here and nowhere else.
   Bilingual chrome: each page declares its language via <html lang>
   (root edition "en", /zh/ edition "zh-CN"); display strings live in STR.
   Nav hrefs stay canonical (English-root); the /zh/ prefix is added here,
   so a link still needs editing in exactly one place. */

const SITE = {
  org: "co-arising",
  urls: {
    // Flagship toolchain. Transferred to the co-arising org on 2026-11-11;
    // the old zhongdj/metarch-truthsrc address redirects automatically.
    truthsrc: "https://github.com/co-arising/metarch-truthsrc",
    // Ecosystem repos — currently on the MadPolaris org, migration deferred (DEF-11).
    bank: "https://github.com/MadPolaris/bank-wealth-demo",
    monarchCore: "https://github.com/MadPolaris/monarch-core",
    monarchPersistence: "https://github.com/MadPolaris/monarch-persistence",
    saga: "https://github.com/MadPolaris/saga-core",
    site: "https://github.com/co-arising/co-arising.github.io",
  },
  nav: [
    {
      group: "Understand",
      groupZh: "理解",
      items: [
        { href: "/why-co-arising/", label: "Why co-arising", labelZh: "为何 co-arising" },
        { href: "/dsl/", label: "The language", labelZh: "真源树语言" },
      ],
    },
    {
      group: "See it work",
      groupZh: "看它工作",
      items: [
        { href: "/pipeline/", label: "Pipeline", labelZh: "流水线" },
        { href: "/bank-demo/", label: "Bank example", labelZh: "银行示例" },
        { href: "/explorer/", label: "Explorer", labelZh: "Explorer" },
      ],
    },
    {
      group: "Adopt",
      groupZh: "采用",
      items: [
        { href: "/compare/", label: "Landscape", labelZh: "全景对比" },
        { href: "/guide/", label: "Hands-on guide", labelZh: "实战指南" },
        { href: "/status/", label: "Status", labelZh: "状态与台账" },
      ],
    },
  ],
  audited: "2026-11-11",
};

const STR = {
  en: {
    langSwitch: "中文",
    langSwitchTitle: "阅读中文版（Chinese edition）",
    themeTitle: "Cycle theme (auto / light / dark)",
    themeLabel: { auto: "auto", light: "light", dark: "dark" },
    copy: "copy",
    copied: "copied",
    footerTagline:
      "Domain knowledge that co-arises — and compiles. An open organization for truth-source tooling around DDD, event-sourced systems and agentic development.",
    siteOnGitHub: "This site on GitHub",
    colRepos: "Repositories",
    colEngines: "Engines",
    colHonesty: "Honesty",
    statusLabel: "Verified facts &amp; ledger",
    colophon1: "© 2026 co-arising contributors · site content CC BY 4.0 · site code MIT",
    colophon2: `Last audited ${SITE.audited} · zero build, zero npm — this site practices what it documents`,
  },
  zh: {
    langSwitch: "EN",
    langSwitchTitle: "Switch to the English edition",
    themeTitle: "循环切换主题（自动 / 浅色 / 深色）",
    themeLabel: { auto: "自动", light: "浅色", dark: "深色" },
    copy: "复制",
    copied: "已复制",
    footerTagline:
      "会缘起、可编译的领域知识。一个开放组织，围绕 DDD、事件溯源系统与智能体开发，构建真源（truth source）工具链。",
    siteOnGitHub: "本站在 GitHub 上",
    colRepos: "仓库",
    colEngines: "引擎",
    colHonesty: "诚实层",
    statusLabel: "已验证事实与台账",
    colophon1: "© 2026 co-arising 贡献者 · 站点内容 CC BY 4.0 · 站点代码 MIT",
    colophon2: `最近审计 ${SITE.audited} · 零构建、零 npm —— 本站亲身实践它所文档化的一切`,
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
  const hereRaw = location.pathname.replace(/index\.html$/, "");
  /* canonical (English-root) path of the current page: /zh/ pages map back */
  const here = LANG === "zh" ? hereRaw.replace(/^\/zh/, "") || "/" : hereRaw;
  const isRoot = here === "/" || here === "";

  /* the same page in the other language, carrying query + hash */
  const counterpart = () => {
    const tail = (location.search || "") + (location.hash || "");
    if (LANG === "zh") return (here === "/" ? "/" : hereRaw.replace(/^\/zh/, "") || "/") + tail;
    return (hereRaw === "/" ? "/zh/" : "/zh" + hereRaw) + tail;
  };

  /* ---------- nav + footer injection ---------- */
  if (nav) {
    const links = SITE.nav
      .map(
        (g) =>
          `<span class="group-label">${LANG === "zh" ? g.groupZh : g.group}</span>` +
          g.items
            .map((it) => {
              const active =
                isRoot && it.href === "/"
                  ? ' aria-current="page"'
                  : here.startsWith(it.href)
                    ? ' aria-current="page"'
                    : "";
              const href = LANG === "zh" ? "/zh" + it.href : it.href;
              const label = LANG === "zh" ? it.labelZh || it.label : it.label;
              return `<a class="nav-link" href="${href}"${active}>${label}</a>`;
            })
            .join("")
      )
      .join("");
    const langA = LANG === "zh" ? "en" : "zh-CN";
    nav.innerHTML = `<div class="topline"></div><div class="site-nav"><div class="row">
      <a class="brand" href="${LANG === "zh" ? "/zh/" : "/"}"><span class="dot"></span>co-arising</a>
      ${links}
      <span class="spacer"></span>
      <a class="nav-link" lang="${langA}" hreflang="${langA}" rel="alternate" href="${counterpart()}" title="${T.langSwitchTitle}">${T.langSwitch}</a>
      <button class="theme-btn" id="theme-toggle" type="button" title="${T.themeTitle}">◐ ${T.themeLabel.auto}</button>
    </div></div>`;
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

  /* ---------- tri-state theme: auto → light → dark ---------- */
  const btn = document.getElementById("theme-toggle");
  const order = ["auto", "light", "dark"];
  let theme = localStorage.getItem("theme") || "auto";
  const apply = () => {
    document.documentElement.setAttribute("data-theme", theme);
    if (btn) btn.textContent = "◐ " + T.themeLabel[theme];
    try { localStorage.setItem("theme", theme); } catch (e) { /* private mode */ }
  };
  apply();
  if (btn) {
    btn.addEventListener("click", () => {
      theme = order[(order.indexOf(theme) + 1) % order.length];
      apply();
    });
  }

  /* ---------- copy buttons on code blocks ---------- */
  document.querySelectorAll("pre.code, .term pre").forEach((pre) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = T.copy;
    btn.addEventListener("click", () => {
      const text = pre.innerText;
      const done = () => { btn.textContent = T.copied; btn.classList.add("done"); setTimeout(() => { btn.textContent = T.copy; btn.classList.remove("done"); }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
      } else {
        fallbackCopy(text, done);
      }
    });
    pre.appendChild(btn);
  });
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }
})();
