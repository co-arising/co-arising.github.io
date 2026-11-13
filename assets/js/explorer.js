/* Fixed presets and a disposable SQL sandbox share bytes, never mutable state. */
(function () {
  "use strict";
  const status = document.getElementById("xp-status");
  if (!status) return;
  const result = document.getElementById("xp-result");
  const input = document.getElementById("xp-sql");
  const run = document.getElementById("xp-run");
  const cancel = document.getElementById("xp-cancel");
  const timing = document.getElementById("xp-timing");
  const radial = document.getElementById("xp-radial");
  const svgBox = document.getElementById("xp-radial-svg");
  const buttons = [...document.querySelectorAll("#xp-presets button")];
  const zh = document.documentElement.lang.toLowerCase().startsWith("zh");
  const text = zh ? {
    loading: "正在下载本站的图谱与 SQLite 引擎…",
    ready: "已核对 SHA-256，图谱就绪。查询只在本机执行。",
    failed: "图谱不可用；以下仅为文档期望，查询未执行。",
    running: "正在隔离副本中查询…",
    query: "SQL 沙盒结果",
    preset: "浏览器本次执行 · 固定快照",
    sandbox: "浏览器本次执行 · 一次性副本，修改不保存",
    empty: "语句已执行，没有返回结果集。副本已销毁。",
    error: "查询失败",
    stopped: "查询已取消，副本已丢弃。",
    timeout: "查询超过 5 秒，已取消并丢弃副本。",
    expected: "固定快照的文档期望：",
    limit: "触发显示/执行预算，结果或后续语句已截断：",
    leave: "切换语言会丢弃未保存的 SQL 草稿，继续吗？",
    radial: "一跳邻接示意；查询表格提供相同的关系信息。",
    census: ["普查", "YAML 作者原子与展开图节点是不同计数层。", "389 节点、413 边（F-03），不是本页重新运行了银行服务。"],
    describe: ["CreditBalance 的出边", "列出模型已记录的关系，不推断运行时副作用。", "CreditBalance 的已声明切片与事件池。"],
    blast: ["SipInstallmentFailed · 最多三跳", "仅遍历本预设列出的传播关系；影响范围受已建模关系约束，不是所有业务依赖的完整证明。", "55 节点：1 聚合、18 命令、18 事件、18 切片；本结果没有读模型、字段或流水线（F-21）。"],
    lineage: ["模型 → 声明来源", "R10 关系不是目的字段级映射。部分来源仅为文档描述，不是可执行投影；没有推断 R11 字段链。", "51 条 derives-from 边；来源粒度和覆盖须结合作者声明阅读。"],
    orphans: ["无 incoming produces 的图节点", "这是原始图节点查询，不等于 canonical 的去重事件诊断。限定别名保留原ID，不靠删除前缀合并。", "23 行、13 个名称；其中 FundOrder 的结算/退款请求别名有本地生产者。canonical 的无源池事件为11个（F-22）。"],
    sagas: ["Saga 与流水线", "声明式协调结构，不是此刻运行中的交易。", "2 个 saga、4 条流水线及其展开节点。"],
    invariants: ["ReserveFunds 的守卫声明", "展示切片原子中的条件。查看声明不是执行或证明了全部不变量。", "ReserveFunds 参数、守卫与产出事件；长单元格会明确截断。"],
  } : {
    loading: "Loading the graph and SQLite engine from this site…",
    ready: "SHA-256 checked; graph ready. Queries execute locally.",
    failed: "Graph unavailable; documented expectations only. No query was executed.",
    running: "Querying an isolated copy…",
    query: "SQL sandbox result",
    preset: "Executed in this browser · fixed snapshot",
    sandbox: "Executed in this browser · disposable copy; changes are not saved",
    empty: "Statement executed with no result sets. The copy has been discarded.",
    error: "Query failed",
    stopped: "Query cancelled; the copy was discarded.",
    timeout: "Query exceeded 5 seconds; cancelled and discarded.",
    expected: "Documented expectation for this snapshot:",
    limit: "Display/execution budget reached; results or later statements were truncated:",
    leave: "Switching language discards the unsaved SQL draft. Continue?",
    radial: "One-hop illustration; the query table provides the corresponding relationships.",
    census: ["Census", "Author YAML atoms and expanded graph nodes are different counting layers.", "389 nodes, 413 edges (F-03); this does not rerun the bank service."],
    describe: ["CreditBalance outgoing edges", "Declared model relationships, not inferred runtime effects.", "CreditBalance's declared slices and event pool."],
    blast: ["SipInstallmentFailed · at most three hops", "Traverses the preset's listed propagating relations only. Coverage is bounded by modeled connections, not every possible business dependency.", "55 nodes: 1 aggregate, 18 commands, 18 events, 18 slices; no read models, fields or pipelines in this result (F-21)."],
    lineage: ["Model → declared source", "R10 does not identify each destination field. Some sources are documentary, not executable projections; no R11 field chain is inferred.", "51 derives-from edges; inspect author declarations for field-level meaning and coverage."],
    orphans: ["Graph nodes with no incoming produces", "Raw node query, not the canonical deduplicated event diagnostic. Qualified aliases retain their IDs; no prefix-stripping merge is assumed.", "23 rows, 13 names, including two FundOrder settlement/refund-request aliases with local producers. Canonical sourceless pool events: 11 (F-22)."],
    sagas: ["Sagas and pipelines", "Declared coordination structure, not live transactions.", "2 sagas, 4 pipelines and their expanded nodes."],
    invariants: ["ReserveFunds guard declarations", "The stored slice conditions. Reading declarations does not execute or prove all invariants.", "ReserveFunds parameters, guards and produced events; long cells are explicitly truncated."],
  };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nodesText = zh ? {
    all: "全部类型", empty: "没有匹配的节点。请修改筛选或重置。", choose: "选择一个节点查看其真实记录与双向邻接关系。",
    unknown: "此快照中没有这个完整 ID。", detail: "节点详情", name: "名称", kind: "类型", outgoing: "出边", incoming: "入边", noEdges: "没有记录的边。",
    scope: "浏览器本次执行 · canonical graphstore 固定快照，捕获于 2026-11-11。这不是项目知识/回锚数据库；别名保留独立完整 ID。",
    provenance: "存储的来源声明", noProvenance: "此节点未提供已知 provenance 字段。", provenanceNote: "以下是 atom 中的声明，不是经核验的作者文件位置；sourcePointers 也不视为源码锚点。",
    extra: "存储的展开元数据", anchor: "代码回锚", unavailable: "unavailable — 此快照未提供代码位置或身份映射。不能推断作者路径、文件行号或 GitHub 源码链接。",
    atom: "存储的 atom（文本）", atomNote: "仅展示快照记录，不代表已验证生成代码或运行时行为。", clipped: "已截断至最多 8192 UTF-8 字节，文本可能不是完整 JSON。",
    share: "此节点的分享链接", counts: (n, total, from, to) => `匹配 ${n} / 全部 ${total} 节点 · 显示 ${from}–${to}`,
    page: (p, count) => `第 ${p} / ${count} 页 · 每页 40 个`, edges: (shown, total) => `显示 ${shown} / ${total}`,
  } : {
    all: "All kinds", empty: "No matching nodes. Change the filters or reset.", choose: "Select a node to inspect its stored record and incoming/outgoing relationships.",
    unknown: "No node with this exact full ID exists in this snapshot.", detail: "Node inspector", name: "Name", kind: "Kind", outgoing: "Outgoing edges", incoming: "Incoming edges", noEdges: "No recorded edges.",
    scope: "Executed in this browser · canonical graphstore snapshot captured 2026-11-11. Not the project knowledge/anchor database; aliases retain separate full IDs.",
    provenance: "Stored provenance declarations", noProvenance: "No known provenance fields were provided for this node.", provenanceNote: "These are stored atom declarations, not verified author-file locations; sourcePointers are not treated as code anchors.",
    extra: "Stored expansion metadata", anchor: "Code anchors", unavailable: "unavailable — not provided by this snapshot. No code-location or identity mapping; author paths, file lines and GitHub source URLs cannot be inferred.",
    atom: "Stored atom (text)", atomNote: "A snapshot record, not verified generated code or runtime behavior.", clipped: "Truncated to at most 8192 UTF-8 bytes; the text may not be complete JSON.",
    share: "Share this node", counts: (n, total, from, to) => `${n} matching / ${total} total nodes · showing ${from}–${to}`,
    page: (p, count) => `Page ${p} / ${count} · 40 per page`, edges: (shown, total) => `${shown} / ${total} shown`,
  };
  const nodeSearch = document.getElementById("xp-node-search");
  const nodeKind = document.getElementById("xp-node-kind");
  const nodeCount = document.getElementById("xp-node-count");
  const nodeList = document.getElementById("xp-node-list");
  const nodeDetail = document.getElementById("xp-node-detail");
  const nodePrev = document.getElementById("xp-node-prev");
  const nodeNext = document.getElementById("xp-node-next");
  const nodePage = document.getElementById("xp-node-page");
  const nodeCancel = document.getElementById("xp-node-cancel");
  /* Selection is independent of the console's preset/draft and of directory filters. */
  let selectedNodeId = null;
  let kindOptions = "";
  const directory = { search: "", kind: "", page: 0, pageCount: 0 };
  const directoryJob = { generation: 0, worker: null, timer: null };
  const inspectJob = { generation: 0, worker: null, timer: null };
  let lastLocation = "";
  const keys = new Set(buttons.map((button) => button.dataset.preset));
  let state = "loading";
  let bytes;
  let wasm;
  let meta;
  let pending = null;
  let worker = null;
  let timer;
  let generation = 0;
  let draft = false;
  status.textContent = text.loading;

  function heading(title, body) {
    radial.hidden = true;
    result.innerHTML = "<h3>" + esc(title) + "</h3><p class='answer'>" + esc(body) + "</p>";
  }
  function stop(message) {
    generation++;
    clearTimeout(timer);
    if (worker) worker.terminate();
    worker = null;
    cancel.disabled = true;
    run.disabled = state !== "ready";
    result.setAttribute("aria-busy", "false");
    if (message) heading(message, "");
  }
  function show(data, request) {
    const info = request.mode === "preset" ? text[request.key] : [text.query, "", ""];
    let html = "<h3>" + esc(info[0]) + "</h3><p class='small'>" + esc(request.mode === "preset" ? text.preset : text.sandbox) + "</p>";
    if (info[1]) html += "<p class='answer'>" + esc(info[1]) + "</p>";
    if (info[2]) html += "<p class='small'>" + esc(text.expected + " " + info[2]) + "</p>";
    if (!data.tables.length) html += "<p>" + esc(text.empty) + "</p>";
    for (const table of data.tables) {
      html += "<div class='xp-table-wrap' tabindex='0'><table><thead><tr>" + table.cols.map((col) => "<th scope='col'>" + esc(col) + "</th>").join("") + "</tr></thead><tbody>";
      for (const row of table.rows) html += "<tr>" + row.map((cell) => "<td>" + (cell === null ? "—" : esc(cell)) + "</td>").join("") + "</tr>";
      html += "</tbody></table></div>";
    }
    if (data.notices.length) html += "<p class='callout' role='status'>" + esc(text.limit + " " + data.notices.join(", ")) + "</p>";
    result.innerHTML = html;
    renderRadial(data.neighborhood);
  }
  function execute(request) {
    pending = request;
    stop();
    buttons.forEach((button) => {
      const selected = request.mode === "preset" && button.dataset.preset === request.key;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (state !== "ready") {
      const title = request.mode === "preset" ? text[request.key][0] : text.query;
      heading(title, state === "loading" ? text.loading : text.failed + " " + (request.mode === "preset" ? text[request.key][2] : ""));
      return;
    }
    if (request.mode === "sandbox" && new TextEncoder().encode(request.sql).length > 16 * 1024) {
      heading(text.error, zh ? "SQL 超过16 KiB上限。" : "SQL exceeds the 16 KiB limit.");
      return;
    }
    const id = generation;
    heading(request.mode === "preset" ? text[request.key][0] : text.query, text.running);
    result.setAttribute("aria-busy", "true");
    timing.textContent = "";
    cancel.disabled = false;
    run.disabled = true;
    try {
      worker = new Worker("/assets/js/explorer-worker.js");
      worker.onmessage = (event) => {
        if (event.data.id !== generation) return;
        const response = event.data;
        stop();
        if (!response.ok) heading(text.error, response.error);
        else {
          show(response.result, request);
          timing.textContent = response.milliseconds.toFixed(1) + " ms";
        }
      };
      worker.onerror = () => { if (id === generation) stop(text.error); };
      timer = setTimeout(() => { if (id === generation) stop(text.timeout); }, 5000);
      /* Structured clone leaves the verified originals intact for the next job. */
      worker.postMessage({ id, bytes, wasm, request });
    } catch (error) { stop(); heading(text.error, error.message); }
  }
  function stopNodeJob(job) {
    job.generation++;
    clearTimeout(job.timer);
    if (job.worker) job.worker.terminate();
    job.worker = null;
    nodeCancel.disabled = !directoryJob.worker && !inspectJob.worker;
  }
  function nodeQuery(job, request, target, showResult, showError) {
    stopNodeJob(job);
    target.setAttribute("aria-busy", "false");
    if (state !== "ready") { showError(state === "loading" ? text.loading : text.failed); return; }
    const id = job.generation;
    target.setAttribute("aria-busy", "true");
    const fail = (message) => {
      stopNodeJob(job);
      target.setAttribute("aria-busy", "false");
      showError(message);
    };
    try {
      job.worker = new Worker("/assets/js/explorer-worker.js");
      nodeCancel.disabled = false;
      job.worker.onmessage = (event) => {
        if (id !== job.generation || event.data.id !== id) return;
        stopNodeJob(job);
        target.setAttribute("aria-busy", "false");
        if (event.data.ok) showResult(event.data.result);
        else showError(text.error + ": " + event.data.error);
      };
      job.worker.onerror = () => { if (id === job.generation) fail(text.error); };
      job.timer = setTimeout(() => { if (id === job.generation) fail(text.timeout); }, 5000);
      /* No transfer list: each job gets a fresh clone of the verified originals. */
      job.worker.postMessage({ id, bytes, wasm, request });
    } catch (error) { fail(text.error + ": " + error.message); }
  }
  function nodeURL(id) {
    const params = new URLSearchParams(location.search);
    /* SQL drafts never enter shared URLs, including an untrusted incoming sql key. */
    for (const key of [...params.keys()]) if (key.toLowerCase() === "sql") params.delete(key);
    if (id === null) params.delete("node"); else params.set("node", id);
    const query = params.toString();
    return location.pathname + (query ? "?" + query : "") + "#nodes";
  }
  function locationKey() { return location.pathname + location.search + location.hash; }
  function shareNode(id) {
    const url = nodeURL(id);
    if (url !== locationKey()) history.pushState(null, "", url);
    lastLocation = locationKey();
    window.dispatchEvent(new Event("site:locationchange"));
  }
  function markSelected() {
    nodeList.querySelectorAll("button[data-node]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.node === selectedNodeId));
    });
  }
  function nodeButton(node) {
    return "<button type='button' class='xp-node-button' data-node='" + esc(node.id) + "' aria-controls='xp-node-detail' aria-pressed='" + (node.id === selectedNodeId) + "'><code>" + esc(node.id) + "</code>" +
      (node.name === undefined ? "" : "<span class='xp-node-name'>" + esc(node.name) + "</span>") +
      (node.kind === undefined ? "" : "<span class='xp-node-kind'>" + esc(node.kind) + "</span>") + "</button>";
  }
  function directoryError(message) {
    nodeCount.textContent = message;
    nodeList.innerHTML = "";
    nodePrev.disabled = nodeNext.disabled = true;
    nodePage.textContent = "";
    directory.pageCount = 0;
  }
  function loadDirectory() {
    directoryError(state === "ready" ? text.running : text.loading);
    nodeQuery(directoryJob, { mode: "directory", search: directory.search, kind: directory.kind, page: directory.page }, nodeList, (data) => {
      directory.page = data.page;
      directory.pageCount = data.pageCount;
      const options = "<option value=''>" + esc(nodesText.all) + "</option>" + data.kinds.map((row) => "<option value='" + esc(row.kind) + "'>" + esc(row.kind) + " (" + row.count + ")</option>").join("");
      if (kindOptions !== options) { nodeKind.innerHTML = options; kindOptions = options; }
      nodeKind.value = directory.kind;
      nodeKind.disabled = false;
      const from = data.nodes.length ? data.page * data.pageSize + 1 : 0;
      const to = data.page * data.pageSize + data.nodes.length;
      nodeCount.textContent = nodesText.counts(data.filtered, data.total, from, to);
      nodeList.innerHTML = data.nodes.length ? data.nodes.map((node) => "<li>" + nodeButton(node) + "</li>").join("") : "<li class='xp-empty'>" + esc(nodesText.empty) + "</li>";
      nodePage.textContent = nodesText.page(data.pageCount ? data.page + 1 : 0, data.pageCount);
      nodePrev.disabled = data.page === 0;
      nodeNext.disabled = data.page + 1 >= data.pageCount;
    }, directoryError);
  }
  function detailMessage(message) {
    nodeDetail.innerHTML = "<h3>" + esc(nodesText.detail) + "</h3><p>" + esc(message) + "</p>";
  }
  function renderDetail(data) {
    if (!data.node) { detailMessage(nodesText.unknown); return; }
    const node = data.node;
    const fields = (rows) => "<dl class='xp-node-fields'>" + rows.map((row) => "<dt>" + esc(row.field) + "</dt><dd>" + esc(row.value) + "</dd>").join("") + "</dl>";
    let html = "<h3>" + esc(nodesText.detail) + "</h3><p class='xp-node-id'><code>" + esc(node.id) + "</code></p>";
    html += fields([{ field: nodesText.kind, value: node.kind }, { field: nodesText.name, value: node.name }]);
    html += "<p class='small'>" + esc(nodesText.scope) + "</p><p><a class='xp-node-share' href='" + esc(nodeURL(selectedNodeId)) + "'>" + esc(nodesText.share) + "</a></p>";
    html += "<div class='xp-node-anchors'><h4>" + esc(nodesText.anchor) + "</h4><p>" + esc(nodesText.unavailable) + "</p></div>";
    html += "<h4>" + esc(nodesText.provenance) + "</h4><p class='small'>" + esc(nodesText.provenanceNote) + "</p>" + (node.provenance.length ? fields(node.provenance) : "<p>" + esc(nodesText.noProvenance) + "</p>");
    if (node.extra.length) html += "<h4>" + esc(nodesText.extra) + "</h4>" + fields(node.extra);
    for (const [direction, title] of [["outgoing", nodesText.outgoing], ["incoming", nodesText.incoming]]) {
      const group = data[direction];
      html += "<div class='xp-node-edges'><h4>" + esc(title) + "</h4><p class='small'>" + esc(nodesText.edges(group.edges.length, group.total)) + "</p>";
      html += group.edges.length ? "<ul>" + group.edges.map((edge) => "<li><span class='xp-node-relation'>" + esc(edge.relation) + "</span> " + nodeButton(edge) + "</li>").join("") + "</ul>" : "<p>" + esc(nodesText.noEdges) + "</p>";
      html += "</div>";
    }
    html += "<details class='xp-node-atom'><summary>" + esc(nodesText.atom) + "</summary><p class='small'>" + esc(nodesText.atomNote) + "</p>" + (node.atomTruncated ? "<p class='callout'>" + esc(nodesText.clipped) + "</p>" : "") + "<pre><code>" + esc(node.atom) + "</code></pre></details>";
    if (data.notices.length) html += "<p class='callout'>" + esc(text.limit + " " + data.notices.join(", ")) + "</p>";
    nodeDetail.innerHTML = html;
  }
  function inspectNode() {
    detailMessage(state === "ready" ? text.running : text.loading);
    nodeQuery(inspectJob, { mode: "inspect", id: selectedNodeId }, nodeDetail, renderDetail, detailMessage);
  }
  function selectNode(id, share) {
    selectedNodeId = id;
    stopNodeJob(inspectJob);
    nodeDetail.setAttribute("aria-busy", "false");
    if (share) shareNode(id);
    markSelected();
    if (id === null) detailMessage(nodesText.choose);
    else inspectNode();
  }
  function resetNodes() {
    directory.search = directory.kind = "";
    directory.page = 0;
    nodeSearch.value = nodeKind.value = "";
    selectNode(null, true);
    loadDirectory();
  }
  function restoreLocation() {
    if (lastLocation === locationKey()) return; // popstate + hashchange may describe the same traversal.
    lastLocation = locationKey();
    const id = new URLSearchParams(location.search).get("node");
    if (id !== selectedNodeId) selectNode(id, false);
    const key = location.hash.slice(1);
    if (keys.has(key)) select(key, false);
  }
  for (const target of [nodeList, nodeDetail]) target.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-node]");
    if (button && target.contains(button)) {
      selectNode(button.dataset.node, true);
      // Keep keyboard focus on the stable inspector, including adjacency navigation.
      nodeDetail.focus();
    }
  });
  nodeSearch.addEventListener("input", () => { directory.search = nodeSearch.value; directory.page = 0; loadDirectory(); });
  nodeKind.addEventListener("change", () => { directory.kind = nodeKind.value; directory.page = 0; loadDirectory(); });
  document.getElementById("xp-node-reset").addEventListener("click", resetNodes);
  nodePrev.addEventListener("click", () => { if (directory.page > 0) { directory.page--; loadDirectory(); } });
  nodeNext.addEventListener("click", () => { if (directory.page + 1 < directory.pageCount) { directory.page++; loadDirectory(); } });
  nodeCancel.addEventListener("click", () => {
    if (directoryJob.worker) { stopNodeJob(directoryJob); nodeList.setAttribute("aria-busy", "false"); directoryError(text.stopped); }
    if (inspectJob.worker) { stopNodeJob(inspectJob); nodeDetail.setAttribute("aria-busy", "false"); detailMessage(text.stopped); }
  });

  function select(key, share) {
    if (!keys.has(key)) return;
    if (share) {
      history.replaceState(null, "", location.pathname + location.search + "#" + key);
      lastLocation = locationKey();
      window.dispatchEvent(new Event("site:locationchange"));
    }
    execute({ mode: "preset", key });
  }
  buttons.forEach((button) => button.addEventListener("click", () => select(button.dataset.preset, true)));
  window.addEventListener("hashchange", restoreLocation);
  window.addEventListener("popstate", restoreLocation);
  run.addEventListener("click", () => execute({ mode: "sandbox", sql: input.value }));
  cancel.addEventListener("click", () => { pending = null; stop(text.stopped); });
  document.getElementById("xp-clear").addEventListener("click", () => {
    pending = null; stop(text.stopped); input.value = ""; draft = false; timing.textContent = "";
  });
  input.addEventListener("input", () => { draft = true; });
  const languageLink = document.getElementById("language-switch");
  if (languageLink) languageLink.addEventListener("click", (event) => {
    if (draft && !window.confirm(text.leave)) event.preventDefault();
  });
  run.disabled = true;
  cancel.disabled = true;
  loadDirectory();
  restoreLocation();

  async function fetchBytes(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.arrayBuffer();
  }
  (async () => {
    try {
      const loaded = await Promise.all([
        fetchBytes("/assets/data/bank-wealth.graph.sqlite"),
        fetchBytes("/assets/vendor/sqljs/sql-wasm.wasm"),
        fetch("/assets/data/bank-wealth.graph.meta.json").then((response) => {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        }),
      ]);
      const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", loaded[0]))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      if (digest !== loaded[2].sha256) throw new Error("SHA-256 mismatch");
      [bytes, wasm, meta] = loaded;
      state = "ready";
      status.textContent = text.ready + "\n" + meta.nodeCount + " / " + meta.edgeCount + " · " + meta.generatedAt + "\nsha256 " + digest;
      run.disabled = false;
      loadDirectory();
      if (selectedNodeId !== null) inspectNode();
      if (pending) execute(pending);
    } catch (error) {
      state = "error";
      stop();
      status.textContent = text.failed + " (" + String(error.message).slice(0, 300) + ")";
      loadDirectory();
      if (selectedNodeId !== null) inspectNode();
      if (pending) execute(pending);
    }
  })();

  function renderRadial(neighborhood) {
    radial.hidden = true;
    if (!neighborhood || !neighborhood.edges.length) return;
    const short = (id) => String(id).split(":").slice(1).join(":").slice(0, 24);
    const rows = neighborhood.edges;
    let svg = "<svg viewBox='0 0 720 470' role='img' aria-label='" + esc(text.radial) + "' xmlns='http://www.w3.org/2000/svg'>";
    rows.forEach(([relation, other], i) => {
      const angle = i / rows.length * Math.PI * 2 - Math.PI / 2;
      const x = 360 + 235 * Math.cos(angle), y = 235 + 180 * Math.sin(angle);
      svg += "<line class='dv-edge' x1='360' y1='235' x2='" + x + "' y2='" + y + "'/><circle cx='" + x + "' cy='" + y + "' r='5' fill='var(--teal)'/><text x='" + x + "' y='" + (y - 12) + "' text-anchor='middle' fill='var(--ink-2)' font-size='10'>" + esc(short(other)) + "</text><text x='" + ((360 + x) / 2) + "' y='" + ((235 + y) / 2) + "' fill='var(--ink-3)' font-size='8'>" + esc(relation) + "</text>";
    });
    svg += "<circle cx='360' cy='235' r='8' fill='var(--red)'/><text x='360' y='217' text-anchor='middle' fill='var(--ink)' font-size='12'>" + esc(short(neighborhood.center)) + "</text></svg>";
    svgBox.innerHTML = svg;
    radial.hidden = false;
  }
})();
