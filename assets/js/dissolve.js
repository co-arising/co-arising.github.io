/* co-arising.github.io — the Aggregate Dissolve / Arise demo.
   Real CreditBalance subgraph (28 nodes / 35 edges) exported from the bank
   knowledge graph. Two modes:
   - Dissolve: click relations to remove them; a slice whose guards are all
     gone loses its enforcement; the aggregate shell cracks as slices fall.
   - Arise: replay the build-up from scattered workshop notes.
   Deterministic layout (no physics): aggregate center, slices around it,
   each slice's command/events/guards in a local cluster.
   Captions/controls are bilingual: the page's <html lang> picks the dict;
   deep links into the explorer follow the page's edition (/zh/ or root). */

(function () {
  "use strict";
  const stage = document.getElementById("dissolve-stage");
  if (!stage || !window.DISSOLVE_SUBGRAPH) return;

  const ZH = (document.documentElement.getAttribute("lang") || "").toLowerCase().startsWith("zh");
  const XP = ZH ? "/zh/explorer/" : "/explorer/";
  const T = ZH ? {
    modeName: { dissolve: "消解", arise: "涌现" },
    modeLabel: "模式：",
    switchTo: (m) => "⇄ 切换到" + m,
    reset: "↺ 重置",
    removeAllGuards: "移除全部守卫边",
    holding: (a, b) => "不变量仍被强制执行的切片：<strong id='dz-count'>" + a + "/" + b + "</strong>",
    ariaSubgraph: "CreditBalance 聚合子图",
    guardEdge: "守卫",
    captions: {
      intro:
        "<strong>这是真实数据</strong>——来自银行完整示例的 CreditBalance 聚合，从编译后的知识图谱导出（28 节点 · 35 边 · 守卫由切片原子展开）。<em>点击任意一条边将其移除。</em>最快的玩法：点「移除全部守卫边」。",
      ariseStart:
        "<strong>涌现模式。</strong>所有关系都不在场——领域只是一墙工作坊便签。<em>点击任意一条边把它加回来</em>，看结构重新成形。先从 <code>owns</code> 开始（聚合认领它的切片），再 <code>issues</code>，最后 <code>guarded-by</code>。",
      dissolveStart:
        "<strong>消解模式。</strong>完整装配的 CreditBalance 聚合——从真实银行图谱导出。<em>点击任意一条边将其移除。</em>试试移除同一个切片的全部 <code>guard</code> 边。",
      reset:
        "<strong>已重置。</strong>35 条关系全部在场——3 个切片、3 条命令、3 个事件、18 条不变量，由 NNN 个被强制的切片持有。",
      allGuardsGone:
        "<em>守卫全部消失。</em>命令依然通过类型检查，事件依然存在——但<strong>没有任何一处不变量被强制执行</strong>。在本体论里，这些对象仍安坐在它们的分类位上；在 co-arising（缘起）里，聚合已经<em>消解</em>：剩下的只是不受约束的变更。这正是图谱动词 <code>orphans</code> 机械化报告的东西。<a href='" + XP + "#orphans'>在完整图谱上运行 ↗</a>",
      someGuardsLeft: (a, b) =>
        "<strong>" + a + "/" + b + "</strong> 个切片仍在强制它们的不变量。继续——或者换个思路：移除 <code>emits</code> 边，会留下永远不会折叠进状态的历史。",
      edgeRemoved: (a, b) =>
        "已移除一条关系。聚合仍然成立——<strong>" + a + "/" + b + "</strong> 个切片被完整强制。",
      dissolved:
        "<em>聚合已消解。</em>它的碎片只是便签：没有规则的命令、没有折叠的事件。在本体论里，对象仍安坐其分类位——在 co-arising（缘起）里，它不再成立。<a href='" + XP + "#orphans'>运行 orphans ↗</a>",
      sliceUnchecked: (a, b) =>
        "一个切片失去了它全部的守卫——它的不变量现在<em>无人检查</em>。聚合完整性：<strong>" + a + "/" + b + "</strong>。",
      fullyArisen:
        "<em>完全涌现。</em>命令由切片发出，守卫引用不变量，事件折叠进状态——聚合重新成为一座成立的结构。",
      forming: (a, b) =>
        "结构正在成形——<strong>" + a + "/" + b + "</strong> 个切片被完整强制。加上 <code>guarded-by</code> 边，让命令重新拥有规则。",
    },
  } : {
    modeName: { dissolve: "dissolve", arise: "arise" },
    modeLabel: "mode:",
    switchTo: (m) => "⇄ switch to " + m,
    reset: "↺ reset",
    removeAllGuards: "remove ALL guard edges",
    holding: (a, b) => "aggregates holding invariants: <strong id='dz-count'>" + a + "/" + b + "</strong>",
    ariaSubgraph: "CreditBalance aggregate subgraph",
    guardEdge: "guard",
    captions: {
      intro:
        "<strong>This is real data</strong> — the CreditBalance aggregate from the bank worked example, exported from the compiled knowledge graph (28 nodes · 35 edges · guards expanded from slice atoms). <em>Click any edge to remove it.</em> The fastest story: hit “remove ALL guard edges”.",
      ariseStart:
        "<strong>Arise mode.</strong> Every relation is absent — the domain is a wall of workshop notes. <em>Click any edge to add it back</em> and watch structure re-form. Start with <code>owns</code> (the aggregate claims its slices), then <code>issues</code>, then <code>guarded-by</code>.",
      dissolveStart:
        "<strong>Dissolve mode.</strong> The CreditBalance aggregate fully assembled — exported from the real bank graph. <em>Click any edge to remove it.</em> Try removing every <code>guard</code> edge of one slice.",
      reset:
        "<strong>Reset.</strong> All 35 relations present — 3 slices, 3 commands, 3 events, 18 invariants held by NNN enforced slices.",
      allGuardsGone:
        "<em>All guards gone.</em> The commands still type-check, the events still exist — but <strong>no invariant is enforced anywhere</strong>. In an ontology, these objects still sit in their taxon. In co-arising, the aggregate has <em>dissolved</em>: it is now unenforced mutation. This is exactly what the graph verb <code>orphans</code> reports mechanically. <a href='" + XP + "#orphans'>Run it on the full graph ↗</a>",
      someGuardsLeft: (a, b) =>
        "<strong>" + a + "/" + b + "</strong> slices still enforce their invariants. Keep going — or switch the caption’s advice: removing <code>emits</code> edges leaves history that never folds into state.",
      edgeRemoved: (a, b) =>
        "Relation removed. The aggregate still holds — <strong>" + a + "/" + b + "</strong> slices fully enforced.",
      dissolved:
        "<em>The aggregate has dissolved.</em> Its pieces are now just notes: commands without rules, events without folds. In an ontology the object still sits in its taxon — in co-arising it no longer holds. <a href='" + XP + "#orphans'>Run orphans ↗</a>",
      sliceUnchecked: (a, b) =>
        "A slice lost all its guards — its invariants are now <em>unchecked</em>. Aggregate integrity: <strong>" + a + "/" + b + "</strong>.",
      fullyArisen:
        "<em>Fully arisen.</em> Commands issue from slices, guards cite invariants, events fold into state — the aggregate is a standing structure again.",
      forming: (a, b) =>
        "Structure forming — <strong>" + a + "/" + b + "</strong> slices fully enforced. Add <code>guarded-by</code> edges to give commands their rules.",
    },
  };

  const DATA = window.DISSOLVE_SUBGRAPH;
  const NODES = DATA.nodes;
  const EDGES = DATA.edges.map((e, i) => ({ ...e, i }));
  const AGG = DATA.aggregate + ""; // "CreditBalance"
  const AGG_ID = "aggregate:" + AGG;

  /* ---------- deterministic layout ----------
     One cluster per slice, arranged on a ring; aggregate in the middle.
     Inside a cluster: command (top), events (right), invariants (left). */
  const W = 940, H = 560, cx = W / 2, cy = H / 2;
  const slices = NODES.filter((n) => n.kind === "slice");
  const R = 195;
  const pos = {};
  pos[AGG_ID] = { x: cx, y: cy };

  slices.forEach((s, si) => {
    const a = (si / slices.length) * 2 * Math.PI - Math.PI / 2;
    const sx = cx + R * Math.cos(a), sy = cy + R * Math.sin(a);
    pos[s.id] = { x: sx, y: sy };
    // cluster members
    const members = EDGES.filter((e) => e.from === s.id && e.relation !== "owns")
      .map((e) => NODES.find((n) => n.id === e.to)).filter(Boolean);
    const cmds = members.filter((m) => m.kind === "command");
    const evs = members.filter((m) => m.kind === "event");
    const invs = members.filter((m) => m.kind === "invariant");
    const place = (arr, baseAngle, spread, dist) => arr.forEach((m, i) => {
      const aa = baseAngle + (arr.length === 1 ? 0 : (i / (arr.length - 1) - 0.5) * spread);
      pos[m.id] = { x: sx + dist * Math.cos(aa), y: sy + dist * Math.sin(aa) };
    });
    const outward = Math.atan2(sy - cy, sx - cx);
    place(cmds, outward - 0.55, 0.5, 86);
    place(evs, outward + 0.55, 0.5, 86);
    place(invs, outward - Math.PI / 2 + (Math.random() * 0), 1.9, 108); // fan on the outer side
  });

  const shortName = (n) => {
    let s = n.name || n.id.split(":")[1] || n.id;
    if (n.kind === "invariant") return s.replace(/_/g, " ").length > 22 ? s : s;
    return s.length > 22 ? s.slice(0, 21) + "…" : s;
  };
  const nodeFill = (k) => ({ aggregate: "var(--red)", slice: "var(--teal)", command: "#26677e", event: "#8a6b1f", invariant: "var(--amber)" }[k] || "var(--ink-3)");

  /* ---------- state ---------- */
  let removed = new Set(); // edge indices
  let mode = "dissolve";

  const sliceGuardEdges = (sliceId) => EDGES.filter((e) => e.from === sliceId && e.relation === "guarded-by");
  const sliceEventEdges = (sliceId) => EDGES.filter((e) => e.from === sliceId && e.relation === "emits" || (e.from === sliceId && e.relation === "produces"));
  const sliceUnenforced = (sliceId) => sliceGuardEdges(sliceId).length > 0 && sliceGuardEdges(sliceId).every((e) => removed.has(e.i));
  const enforcedCount = () => slices.filter((s) => !sliceUnenforced(s.id)).length;

  /* ---------- render ---------- */
  function render(caption) {
    /* Label tops of the topmost slice land above y=0 in the layout frame,
       so the viewBox extends 36px upward to keep them visible. */
    let svg = "<svg class='dissolve-svg' viewBox='0 -36 " + W + " " + (H + 36) + "' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='" + T.ariaSubgraph + "'>";
    // aggregate shell — cracks as slices lose enforcement
    const alive = enforcedCount();
    const shellOpacity = 0.25 + 0.75 * (alive / slices.length);
    const cracked = alive < slices.length;
    svg += "<circle cx='" + cx + "' cy='" + cy + "' r='" + (R - 62) + "' fill='none' stroke='var(--red)' stroke-width='" + (cracked ? "1.5" : "3") + "' stroke-dasharray='" + (cracked ? "10 14" : "none") + "' opacity='" + shellOpacity.toFixed(2) + "'/>";

    // edges
    EDGES.forEach((e) => {
      const p1 = pos[e.from], p2 = pos[e.to];
      if (!p1 || !p2) return;
      const gone = removed.has(e.i);
      svg += "<line class='dv-edge" + (gone ? " removed" : "") + "' data-edge='" + e.i + "' x1='" + p1.x + "' y1='" + p1.y + "' x2='" + p2.x + "' y2='" + p2.y + "'/>";
      if (!gone && (e.relation === "guarded-by")) {
        const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
        svg += "<text x='" + mx + "' y='" + my + "' font-size='8.5' fill='var(--ink-3)' text-anchor='middle'>" + T.guardEdge + "</text>";
      }
    });

    // nodes
    NODES.forEach((n) => {
      const p = pos[n.id];
      if (!p) return;
      const isSlice = n.kind === "slice";
      const dead = isSlice && sliceUnenforced(n.id);
      const r = n.kind === "aggregate" ? 11 : isSlice ? 8 : 4.5;
      svg += "<g class='dv-node" + (dead ? " dead" : "") + "' data-id='" + n.id + "' opacity='" + (dead ? "0.3" : "1") + "'>" +
        "<circle cx='" + p.x + "' cy='" + p.y + "' r='" + r + "' fill='" + (dead ? "var(--ink-3)" : nodeFill(n.kind)) + "' stroke='var(--bg-raised)' stroke-width='1.5'/>" +
        (n.kind === "aggregate" || isSlice || n.kind === "command" || n.kind === "event"
          ? "<text x='" + p.x + "' y='" + (p.y - r - 6) + "' text-anchor='middle' fill='var(--ink-2)'>" + shortName(n) + "</text>" : "") +
        (n.kind === "invariant" ? "<title>" + (n.cond || n.name) + "</title>" : "") +
        "</g>";
    });

    svg += "</svg>";
    stage.innerHTML =
      "<div class='dissolve-controls'>" +
      "<span class='mode'>" + T.modeLabel + " <strong>" + T.modeName[mode] + "</strong></span>" +
      "<button id='dz-mode'>" + T.switchTo(T.modeName[mode === "dissolve" ? "arise" : "dissolve"]) + "</button>" +
      "<button id='dz-reset'>" + T.reset + "</button>" +
      "<button id='dz-remove-guards'>" + T.removeAllGuards + "</button>" +
      "<span style='flex:1'></span>" +
      "<span class='small'>" + T.holding(alive, slices.length) + "</span>" +
      "</div>" + svg +
      "<div class='dissolve-caption' id='dz-caption'>" + caption + "</div>";

    wire();
  }

  function wire() {
    document.getElementById("dz-mode").onclick = () => {
      mode = mode === "dissolve" ? "arise" : "dissolve";
      if (mode === "arise") {
        // start from everything removed, add back on click
        removed = new Set(EDGES.map((e) => e.i));
        render(T.captions.ariseStart);
      } else {
        removed = new Set();
        render(T.captions.dissolveStart);
      }
    };
    document.getElementById("dz-reset").onclick = () => {
      removed = new Set();
      mode = "dissolve";
      render(T.captions.reset.replace("NNN", slices.length));
    };
    document.getElementById("dz-remove-guards").onclick = () => {
      EDGES.filter((e) => e.relation === "guarded-by").forEach((e) => removed.add(e.i));
      const alive = enforcedCount();
      render(alive === 0
        ? T.captions.allGuardsGone
        : T.captions.someGuardsLeft(alive, slices.length));
    };

    stage.querySelectorAll(".dv-edge:not(.removed)").forEach((el) => {
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        const i = +el.dataset.edge;
        if (mode === "dissolve") removed.add(i); else removed.delete(i);
        const alive = enforcedCount();
        let cap;
        if (mode === "dissolve") {
          cap = alive === slices.length
            ? T.captions.edgeRemoved(alive, slices.length)
            : alive === 0
              ? T.captions.dissolved
              : T.captions.sliceUnchecked(alive, slices.length);
        } else {
          cap = alive === slices.length
            ? T.captions.fullyArisen
            : T.captions.forming(alive, slices.length);
        }
        render(cap);
      });
    });
  }

  render(T.captions.intro);
})();
