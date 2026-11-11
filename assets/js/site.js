/* co-arising.github.io — site chrome.
   SITE is the single source of truth for every repo URL and nav link.
   When a repository migrates orgs, edit it here and nowhere else. */

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
      items: [
        { href: "/why-co-arising/", label: "Why co-arising" },
        { href: "/dsl/", label: "The language" },
      ],
    },
    {
      group: "See it work",
      items: [
        { href: "/pipeline/", label: "Pipeline" },
        { href: "/bank-demo/", label: "Bank example" },
        { href: "/explorer/", label: "Explorer" },
      ],
    },
    {
      group: "Adopt",
      items: [
        { href: "/compare/", label: "Landscape" },
        { href: "/guide/", label: "Hands-on guide" },
        { href: "/status/", label: "Status" },
      ],
    },
  ],
  audited: "2026-11-11",
};

(function () {
  "use strict";

  /* ---------- nav + footer injection ---------- */
  const nav = document.getElementById("site-nav");
  const footer = document.getElementById("site-footer");
  const here = location.pathname.replace(/index\.html$/, "");
  const isRoot = here === "/" || here === "";

  if (nav) {
    const links = SITE.nav
      .map(
        (g) =>
          `<span class="group-label">${g.group}</span>` +
          g.items
            .map((it) => {
              const active =
                isRoot && it.href === "/"
                  ? ' aria-current="page"'
                  : here.startsWith(it.href)
                    ? ' aria-current="page"'
                    : "";
              return `<a class="nav-link" href="${it.href}"${active}>${it.label}</a>`;
            })
            .join("")
      )
      .join("");
    nav.innerHTML = `<div class="site-nav"><div class="row">
      <a class="brand" href="/"><span class="dot"></span>co-arising</a>
      ${links}
      <span class="spacer"></span>
      <button class="theme-btn" id="theme-toggle" type="button" title="Cycle theme (auto / light / dark)">◐ auto</button>
    </div></div>`;
  }

  if (footer) {
    footer.innerHTML = `<div class="site-footer"><div class="cols">
      <div>
        <h4>co-arising</h4>
        <p>Domain knowledge that co-arises — and compiles. An open organization for truth-source tooling around DDD, event-sourced systems and agentic development.</p>
        <p><a href="${SITE.urls.site}">This site on GitHub</a></p>
      </div>
      <div>
        <h4>Repositories</h4>
        <ul>
          <li><a href="${SITE.urls.truthsrc}">metarch-truthsrc (truthsrc)</a></li>
          <li><a href="${SITE.urls.bank}">bank-wealth-demo</a></li>
          <li><a href="${SITE.urls.saga}">saga-core</a></li>
        </ul>
      </div>
      <div>
        <h4>Engines</h4>
        <ul>
          <li><a href="${SITE.urls.monarchCore}">monarch-core</a></li>
          <li><a href="${SITE.urls.monarchPersistence}">monarch-persistence</a></li>
        </ul>
      </div>
      <div>
        <h4>Honesty</h4>
        <ul>
          <li><a href="/status/">Verified facts &amp; ledger</a></li>
          <li><a href="/status/#facts">SITE-FACTS</a></li>
          <li><a href="https://github.com/co-arising/co-arising.github.io/blob/main/LEDGER.md">LEDGER.md</a></li>
        </ul>
      </div>
    </div>
    <div class="colophon">
      <span>© 2026 co-arising contributors · site content CC BY 4.0 · site code MIT</span>
      <span>Last audited ${SITE.audited} · zero build, zero npm — this site practices what it documents</span>
    </div></div>`;
  }

  /* ---------- tri-state theme: auto → light → dark ---------- */
  const btn = document.getElementById("theme-toggle");
  const order = ["auto", "light", "dark"];
  let theme = localStorage.getItem("theme") || "auto";
  const apply = () => {
    document.documentElement.setAttribute("data-theme", theme);
    if (btn) btn.textContent = "◐ " + theme;
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
    btn.textContent = "copy";
    btn.addEventListener("click", () => {
      const text = pre.innerText;
      const done = () => { btn.textContent = "copied"; btn.classList.add("done"); setTimeout(() => { btn.textContent = "copy"; btn.classList.remove("done"); }, 1400); };
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
