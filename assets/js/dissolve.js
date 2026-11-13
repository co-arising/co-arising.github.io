/* A local, reversible relationship exercise over the exported CreditBalance subgraph. */
(function () {
  "use strict";
  const stage = document.getElementById("dissolve-stage");
  if (!stage || !window.DISSOLVE_SUBGRAPH || !window.DissolveModel) return;
  const data = window.DISSOLVE_SUBGRAPH;
  const model = DissolveModel.create(data);
  const zh = document.documentElement.lang.toLowerCase().startsWith("zh");
  const T = zh ? {
    mode: "模式", dissolve: "消解", arise: "重建", switch: "切换模式", reset: "恢复全部关系", remove: "移除全部守卫",
    controls: "关系清单：勾选表示关系在场，可用键盘操作", coverage: "守卫覆盖", complete: "完整", partial: "部分缺失", none: "全部缺失", undeclared: "未声明",
    caption: "这只改变当前演示中的关系，不修改作者树、知识图谱或银行服务。守卫覆盖不等于业务验收。",
    intro: "点击图中的边或下方复选框，可移除或恢复关系。",
    changed: "关系已更新。", resetDone: "已恢复全部关系。", ariseDone: "从全部关系缺失开始；勾选清单或点击边重建。",
    guardsGone: "演示中的守卫边已移除，其他关系保留。", present: "在场关系", full: "守卫完整的切片", graph: "CreditBalance 关系图；下方清单提供等价操作",
  } : {
    mode: "Mode", dissolve: "Dissolve", arise: "Arise", switch: "Switch mode", reset: "Restore all relations", remove: "Remove all guards",
    controls: "Relation checklist: checked means present; keyboard accessible", coverage: "Guard coverage", complete: "complete", partial: "partial", none: "none", undeclared: "undeclared",
    caption: "This changes only this exercise, not the author tree, graph database or bank service. Guard coverage is not business acceptance.",
    intro: "Click an edge or use the checkboxes to remove or restore a relation.",
    changed: "Relation updated.", resetDone: "All relations restored.", ariseDone: "Starting with every relation absent. Check a box or click an edge to rebuild.",
    guardsGone: "Guard edges removed from this exercise; other relations remain.", present: "Relations present", full: "Slices with complete guards", graph: "CreditBalance relationships; the checklist below provides equivalent controls",
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slices = data.nodes.filter((node) => node.kind === "slice");
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const pos = {};
  const centerId = "aggregate:" + data.aggregate;
  pos[centerId] = { x: 470, y: 280 };
  slices.forEach((slice, index) => {
    const angle = index / slices.length * 2 * Math.PI - Math.PI / 2;
    const x = 470 + 195 * Math.cos(angle), y = 280 + 195 * Math.sin(angle);
    pos[slice.id] = { x, y };
    const members = data.edges.filter((edge) => edge.from === slice.id).map((edge) => byId.get(edge.to)).filter(Boolean);
    for (const [kind, offset, distance, spread] of [["command", -.55, 86, .5], ["event", .55, 86, .5], ["invariant", -Math.PI / 2, 108, 1.9]]) {
      const group = members.filter((node) => node.kind === kind);
      group.forEach((node, i) => {
        const a = angle + offset + (group.length === 1 ? 0 : (i / (group.length - 1) - .5) * spread);
        pos[node.id] = { x: x + distance * Math.cos(a), y: y + distance * Math.sin(a) };
      });
    }
  });
  const name = (id) => byId.get(id)?.name || id;
  const edgeLabel = (edge) => name(edge.from) + " — " + edge.relation + " → " + name(edge.to);
  let mode = "dissolve";
  stage.innerHTML = "<div class='dissolve-controls'><span>" + T.mode + ": <strong id='dz-mode-label'></strong></span><button type='button' id='dz-mode'>" + T.switch + "</button><button type='button' id='dz-reset'>" + T.reset + "</button><button type='button' id='dz-remove-guards'>" + T.remove + "</button></div>" +
    "<p class='small' id='dz-summary'></p><div id='dz-svg'></div><p id='dz-caption' role='status' aria-live='polite'></p><p class='small'>" + T.caption + "</p><div id='dz-coverage'></div>" +
    "<details><summary>" + T.controls + "</summary><div class='dz-edge-list'>" + data.edges.map((edge, index) => "<label><input type='checkbox' data-edge='" + index + "'> <span>" + esc(edgeLabel(edge)) + (byId.get(edge.to)?.cond ? "<small>" + esc(byId.get(edge.to).cond) + "</small>" : "") + "</span></label>").join("") + "</div></details>";
  const svgBox = stage.querySelector("#dz-svg");
  const inputs = [...stage.querySelectorAll("input[data-edge]")];
  function update(message) {
    const summary = model.summary();
    stage.querySelector("#dz-mode-label").textContent = T[mode];
    stage.querySelector("#dz-summary").innerHTML = T.present + ": " + summary.presentEdges + "/" + summary.edges + " · " + T.full + ": <strong id='dz-count'>" + summary.complete + "/" + slices.length + "</strong>";
    stage.querySelector("#dz-caption").textContent = message;
    stage.querySelector("#dz-coverage").innerHTML = "<ul class='dz-coverage-list'>" + summary.coverage.map((row) => "<li>" + esc(name(row.id)) + ": " + T[row.state] + " (" + row.present + "/" + row.total + ")</li>").join("") + "</ul>";
    inputs.forEach((input) => { input.checked = model.present(Number(input.dataset.edge)); });
    let svg = "<svg class='dissolve-svg' viewBox='0 -36 940 596' role='img' aria-label='" + T.graph + "' xmlns='http://www.w3.org/2000/svg'>";
    svg += "<circle cx='470' cy='280' r='133' fill='none' stroke='var(--red)' stroke-width='2' stroke-dasharray='" + (summary.complete === slices.length ? "none" : "10 14") + "'/>";
    data.edges.forEach((edge, index) => {
      const from = pos[edge.from], to = pos[edge.to];
      if (!from || !to) return;
      svg += "<line class='dv-edge" + (model.present(index) ? "" : " removed") + "' data-edge='" + index + "' x1='" + from.x + "' y1='" + from.y + "' x2='" + to.x + "' y2='" + to.y + "'><title>" + esc(edgeLabel(edge)) + "</title></line>";
    });
    data.nodes.forEach((node) => {
      const p = pos[node.id];
      if (!p) return;
      const fill = node.kind === "aggregate" ? "var(--red)" : node.kind === "invariant" ? "var(--amber)" : "var(--teal)";
      svg += "<g class='dv-node'><circle cx='" + p.x + "' cy='" + p.y + "' r='" + (node.kind === "aggregate" ? 10 : 5) + "' fill='" + fill + "'/><title>" + esc(node.cond || node.name || node.id) + "</title>";
      if (node.kind !== "invariant") svg += "<text x='" + p.x + "' y='" + (p.y - 12) + "' text-anchor='middle' fill='var(--ink-2)'>" + esc(String(node.name || node.id).slice(0, 24)) + "</text>";
      svg += "</g>";
    });
    svgBox.innerHTML = svg + "</svg>";
  }
  /* Delegated handlers survive SVG redraws; checklist controls keep their focus. */
  svgBox.addEventListener("click", (event) => {
    const edge = event.target.closest("[data-edge]");
    if (!edge) return;
    const index = Number(edge.dataset.edge);
    model.set(index, !model.present(index));
    update(T.changed);
  });
  inputs.forEach((input) => input.addEventListener("change", () => { model.set(Number(input.dataset.edge), input.checked); update(T.changed); }));
  stage.querySelector("#dz-mode").addEventListener("click", () => {
    mode = mode === "dissolve" ? "arise" : "dissolve";
    model.all(mode === "dissolve");
    update(mode === "arise" ? T.ariseDone : T.resetDone);
  });
  stage.querySelector("#dz-reset").addEventListener("click", () => { mode = "dissolve"; model.all(true); update(T.resetDone); });
  stage.querySelector("#dz-remove-guards").addEventListener("click", () => { model.removeGuards(); update(T.guardsGone); });
  update(T.intro);
})();
