/* co-arising.github.io — the Aggregate Dissolve / Arise demo.
   Real CreditBalance subgraph (24 nodes / 35 edges) exported from the bank
   knowledge graph. Two modes:
   - Dissolve: click relations to remove them; a slice whose guards are all
     gone loses its enforcement; the aggregate shell cracks as slices fall.
   - Arise: replay the build-up from scattered workshop notes.
   Deterministic layout (no physics): aggregate center, slices around it,
   each slice's command/events/guards in a local cluster. */

(function () {
  "use strict";
  const stage = document.getElementById("dissolve-stage");
  if (!stage || !window.DISSOLVE_SUBGRAPH) return;

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
    let svg = "<svg class='dissolve-svg' viewBox='0 0 " + W + " " + H + "' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='CreditBalance aggregate subgraph'>";
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
        svg += "<text x='" + mx + "' y='" + my + "' font-size='8.5' fill='var(--ink-3)' text-anchor='middle'>guard</text>";
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
      "<span class='mode'>mode: <strong>" + mode + "</strong></span>" +
      "<button id='dz-mode'>⇄ switch to " + (mode === "dissolve" ? "arise" : "dissolve") + "</button>" +
      "<button id='dz-reset'>↺ reset</button>" +
      "<button id='dz-remove-guards'>remove ALL guard edges</button>" +
      "<span style='flex:1'></span>" +
      "<span class='small'>aggregates holding invariants: <strong id='dz-count'>" + alive + "/" + slices.length + "</strong></span>" +
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
        render("<strong>Arise mode.</strong> Every relation is absent — the domain is a wall of workshop notes. <em>Click any edge to add it back</em> and watch structure re-form. Start with <code>owns</code> (the aggregate claims its slices), then <code>issues</code>, then <code>guarded-by</code>.");
      } else {
        removed = new Set();
        render("<strong>Dissolve mode.</strong> The CreditBalance aggregate fully assembled — exported from the real bank graph. <em>Click any edge to remove it.</em> Try removing every <code>guard</code> edge of one slice.");
      }
    };
    document.getElementById("dz-reset").onclick = () => {
      removed = new Set();
      mode = "dissolve";
      render("<strong>Reset.</strong> All 35 relations present — 3 slices, 3 commands, 3 events, 14 invariants held by " + slices.length + " enforced slices.");
    };
    document.getElementById("dz-remove-guards").onclick = () => {
      EDGES.filter((e) => e.relation === "guarded-by").forEach((e) => removed.add(e.i));
      const alive = enforcedCount();
      render(alive === 0
        ? "<em>All guards gone.</em> The commands still type-check, the events still exist — but <strong>no invariant is enforced anywhere</strong>. In an ontology, these objects still sit in their taxon. In co-arising, the aggregate has <em>dissolved</em>: it is now unenforced mutation. This is exactly what the graph verb <code>orphans</code> reports mechanically. <a href='/explorer/#orphans'>Run it on the full graph ↗</a>"
        : "<strong>" + alive + "/" + slices.length + "</strong> slices still enforce their invariants. Keep going — or switch the caption’s advice: removing <code>emits</code> edges leaves history that never folds into state.");
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
            ? "Relation removed. The aggregate still holds — <strong>" + alive + "/" + slices.length + "</strong> slices fully enforced."
            : alive === 0
              ? "<em>The aggregate has dissolved.</em> Its pieces are now just notes: commands without rules, events without folds. In an ontology the object still sits in its taxon — in co-arising it no longer holds. <a href='/explorer/#orphans'>Run orphans ↗</a>"
              : "A slice lost all its guards — its invariants are now <em>unchecked</em>. Aggregate integrity: <strong>" + alive + "/" + slices.length + "</strong>.";
        } else {
          cap = alive === slices.length
            ? "<em>Fully arisen.</em> Commands issue from slices, guards cite invariants, events fold into state — the aggregate is a standing structure again."
            : "Structure forming — <strong>" + alive + "/" + slices.length + "</strong> slices fully enforced. Add <code>guarded-by</code> edges to give commands their rules.";
        }
        render(cap);
      });
    });
  }

  render("<strong>This is real data</strong> — the CreditBalance aggregate from the bank worked example, exported from the compiled knowledge graph (24 nodes · 35 edges · guards expanded from slice atoms). <em>Click any edge to remove it.</em> The fastest story: hit “remove ALL guard edges”.");
})();
