/* Reading enhancements only: static text, anchors and disclosure work without JS. */
(function () {
  "use strict";
  const body = document.getElementById("article-body");
  const progress = document.getElementById("reading-progress");
  const position = document.getElementById("reading-position");
  const toc = document.querySelector(".article-toc");
  if (!body || !toc) return;
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const headings = links.map((link) => document.getElementById(link.hash.slice(1)));
  const mobile = window.matchMedia("(max-width: 760px)");
  // Only set the initial disclosure state; subsequent user choices remain theirs.
  if (mobile.matches && !location.hash) toc.open = false;
  let pending = false;
  function update() {
    pending = false;
    const nav = document.getElementById("site-nav");
    const offset = (nav ? nav.getBoundingClientRect().height : 0) + 24;
    const rect = body.getBoundingClientRect();
    const distance = Math.max(1, rect.height - Math.max(1, innerHeight - offset));
    const fraction = Math.max(0, Math.min(1, (offset - rect.top) / distance));
    if (progress) progress.style.transform = `scaleX(${fraction})`;
    if (position) position.textContent = `阅读进度 · ${Math.round(fraction * 100)}%`;
    let current = -1;
    headings.forEach((heading, index) => {
      if (heading && heading.getBoundingClientRect().top <= offset + 40) current = index;
    });
    links.forEach((link, index) => {
      if (index === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  function schedule() {
    if (!pending) { pending = true; requestAnimationFrame(update); }
  }
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  addEventListener("load", () => {
    // Font reflow can move a long Chinese heading after the browser restores a hash.
    const alignFragment = () => {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch (error) { return; }
      const target = id && document.getElementById(id);
      if (target && body.contains(target)) target.scrollIntoView({ block: "start", behavior: "instant" });
      schedule();
    };
    if (document.fonts) document.fonts.ready.then(alignFragment);
    else alignFragment();
  });
  if (typeof ResizeObserver === "function") new ResizeObserver(schedule).observe(body);
  links.forEach((link) => link.addEventListener("click", () => {
    if (mobile.matches) toc.open = false;
    schedule();
  }));
  update();
})();
