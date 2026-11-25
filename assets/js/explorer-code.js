/* The Code view consumes only a validated public snapshot. It never runs source code. */
(function (root) {
  "use strict";
  const api = root.ExplorerSnapshot;
  const panel = document.getElementById("code");
  if (!api || !panel) return;
  const zh = document.documentElement.lang.toLowerCase().startsWith("zh");
  const t = zh ? {
    loading: "正在核对公开快照…", unavailable: "代码快照尚未发布：需要通过完整验证的配对项目。现有 Graph 仍可查询，但不能据此推断代码位置。",
    failed: "快照不可用", choose: "选择一个文件，或从 Graph 的代码位置进入。", verified: "导出时整体验证通过 · 下载字节逐项核对 · 未执行运行时验收",
    generated: "生成代码", handwritten: "手写实现", author: "作者文件", withheld: "未公开", noFiles: "没有匹配的文件。", noLocation: "没有直接生成代码位置；不等于业务不存在。",
    noBridge: "此 Graph 节点尚无经过核对的身份桥接，不猜测代码位置。", span: "精确字节区间", file: "文件级候选", indirect: "显式关联（非直接生成）",
    source: "实际作者位置", knowledge: "关联知识", noGraph: "此身份没有对应的 canonical Graph 节点。", graph: "返回 Graph", noMatch: "这一行没有精确区间命中；下方仅为该文件的关联候选。",
    selectLine: "点击行号反查知识。", authorNote: "作者文件及 pointer 已核对；行位置用于导航，不是生成代码回锚。", handwrittenNote: "手写隔离区实现代码（与生成代码分层解耦，重生成时不覆盖）。", location: "代码位置", all: "全部位置", copy: "复制固定快照链接", copied: "链接已复制", copyFailed: "复制失败；可使用旁边的固定链接。", share: "固定链接", line: "行",
    noIdentity: "此快照没有该知识身份。", loadingFile: "正在核对文件字节…", matched: "匹配行", noText: "文件内没有匹配文本。", count: "发布 / 文件总数", unverified: "未发布代码快照", ambiguous: "保留多个候选身份，不自动合并。",
    publication: "公开范围", sources: "来源", bytes: "UTF-8 字节", reveal: "显示所有关联", none: "没有记录的关联。",
  } : {
    loading: "Checking the public snapshot…", unavailable: "Code snapshot not published: a fully verified matching project is required. The existing Graph remains queryable, but code locations cannot be inferred from it.",
    failed: "Snapshot unavailable", choose: "Choose a file, or follow a code location from Graph.", verified: "Verified at export · downloaded bytes checked · runtime acceptance not run",
    generated: "Generated", handwritten: "Handwritten", author: "Author", withheld: "Withheld", noFiles: "No matching files.", noLocation: "No directly generated code location. This does not imply missing business behavior.",
    noBridge: "No verified identity bridge for this Graph node. Code locations are not guessed.", span: "Exact byte span", file: "File candidate", indirect: "Declared relation (not directly generated)",
    source: "Actual author location", knowledge: "Related knowledge", noGraph: "This identity has no corresponding canonical Graph node.", graph: "Back to Graph", noMatch: "No exact span overlaps this line; below are file-level association candidates only.",
    selectLine: "Click a line number to query its knowledge.", authorNote: "Author file and pointer checked; line navigation is not a generated code anchor.", handwrittenNote: "Handwritten isolation-zone implementation (decoupled from generated code and preserved across regeneration).", location: "Code locations", all: "All locations", copy: "Copy snapshot link", copied: "Link copied", copyFailed: "Copy failed; use the fixed link beside this button.", share: "Fixed link", line: "Line",
    noIdentity: "No such knowledge identity in this snapshot.", loadingFile: "Checking file bytes…", matched: "Matching lines", noText: "No matching text in this file.", count: "published / total files", unverified: "Code snapshot not published", ambiguous: "Multiple candidate identities are retained, not merged.",
    publication: "Publication scope", sources: "Sources", bytes: "UTF-8 bytes", reveal: "Show all associations", none: "No recorded associations.",
  };
  const el = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const badge = el("xp-snapshot-status"), filesBox = el("xp-code-files"), viewer = el("xp-code-viewer"), knowledgeBox = el("xp-code-knowledge");
  const graph = el("nodes"), consoleSection = el("xp-advanced"), header = el("xp-code-heading"), message = el("xp-code-message");
  const tabs = [...document.querySelectorAll("[data-explorer-view]")];
  const filesPanel = el("xp-files-panel"), knowledgePanel = el("xp-knowledge-panel");
  const fileToggle = el("xp-toggle-files"), knowledgeToggle = el("xp-toggle-knowledge"), focusButton = el("xp-focus");
  const filePath = el("xp-code-path"), fileEvidence = el("xp-file-evidence");
  const filesResizer = el("xp-files-resizer"), codeLayout = panel.querySelector(".xp-code-layout");
  const MIN_FILES_WIDTH = 220, DEFAULT_FILES_WIDTH = 270, MAX_FILES_WIDTH = 600, MIN_CODE_WIDTH = 480;
  let preferredFilesWidth = DEFAULT_FILES_WIDTH, resizeDrag = null;
  const widthBand = () => innerWidth >= 1440 ? "wide" : innerWidth >= 900 ? "medium" : "small";
  let band = widthBand(), panels = { files: band !== "small", knowledge: band === "wide" }, focusSaved = null;
  let currentView, graphScroll = 0, treeSelection, treeWasFiltered = false;
  const openDirectories = new Map();
  const basename = path => path.split("/").at(-1);
  function scrollWithin(container, item, center = false) {
    if (!item || container.clientHeight === 0) return;
    const bounds = container.getBoundingClientRect(), rect = item.getBoundingClientRect();
    if (center) container.scrollTop += rect.top - bounds.top - (container.clientHeight - rect.height) / 2;
    else if (rect.top < bounds.top) container.scrollTop += rect.top - bounds.top;
    else if (rect.bottom > bounds.bottom) container.scrollTop += rect.bottom - bounds.bottom;
  }
  function filesWidthLimit() {
    const reserved = band === "wide" && panels.knowledge ? 344 : 12;
    return Math.max(MIN_FILES_WIDTH, Math.min(MAX_FILES_WIDTH, codeLayout.clientWidth - reserved - MIN_CODE_WIDTH - 2));
  }
  function applyFilesWidth() {
    const available = currentView === "code" && band !== "small" && panels.files;
    const maximum = filesWidthLimit();
    const width = Math.max(MIN_FILES_WIDTH, Math.min(preferredFilesWidth, maximum));
    codeLayout.style.setProperty("--xp-files-width", width + "px");
    filesResizer.hidden = !available;
    filesResizer.setAttribute("aria-valuemax", String(maximum));
    filesResizer.setAttribute("aria-valuenow", String(width));
    filesResizer.setAttribute("aria-valuetext", width + (zh ? " 像素" : " pixels"));
    if (!available && document.activeElement === filesResizer) fileToggle.focus();
    if (!available) stopResize();
  }
  function changeFilesWidth(width) {
    preferredFilesWidth = Math.max(MIN_FILES_WIDTH, Math.min(Math.round(width), filesWidthLimit()));
    applyFilesWidth();
  }
  function stopResize() {
    const drag = resizeDrag;
    resizeDrag = null;
    delete document.body.dataset.resizingFiles;
    if (drag && filesResizer.hasPointerCapture(drag.id)) filesResizer.releasePointerCapture(drag.id);
  }
  filesResizer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || filesResizer.hidden) return;
    event.preventDefault();
    filesResizer.focus();
    resizeDrag = { id: event.pointerId, x: event.clientX, width: filesPanel.getBoundingClientRect().width };
    filesResizer.setPointerCapture(event.pointerId);
    document.body.dataset.resizingFiles = "true";
  });
  filesResizer.addEventListener("pointermove", (event) => {
    if (resizeDrag?.id === event.pointerId) changeFilesWidth(resizeDrag.width + event.clientX - resizeDrag.x);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) filesResizer.addEventListener(event, stopResize);
  filesResizer.addEventListener("dblclick", () => changeFilesWidth(DEFAULT_FILES_WIDTH));
  filesResizer.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 40 : 10;
    const width = Number(filesResizer.getAttribute("aria-valuenow"));
    const choices = { ArrowLeft: width - step, ArrowRight: width + step, Home: MIN_FILES_WIDTH, End: filesWidthLimit(), Enter: DEFAULT_FILES_WIDTH };
    if (event.key === "Escape" && resizeDrag) { const initial = resizeDrag.width; stopResize(); changeFilesWidth(initial); event.preventDefault(); }
    else if (Object.hasOwn(choices, event.key)) { event.preventDefault(); changeFilesWidth(choices[event.key]); }
  });
  window.addEventListener("blur", stopResize);
  function updatePanels() {
    filesPanel.hidden = !panels.files;
    knowledgePanel.hidden = !panels.knowledge;
    document.body.dataset.filesOpen = String(panels.files);
    document.body.dataset.knowledgeOpen = String(panels.knowledge);
    fileToggle.setAttribute("aria-expanded", String(panels.files));
    knowledgeToggle.setAttribute("aria-expanded", String(panels.knowledge));
    focusButton.setAttribute("aria-pressed", String(!!focusSaved));
    focusButton.textContent = focusSaved ? zh ? "退出专注" : "Exit focus" : zh ? "专注阅读" : "Focus reading";
    applyFilesWidth();
  }
  function togglePanel(name, value = !panels[name], restoreFocus = false) {
    focusSaved = null;
    panels[name] = value;
    if (value && band === "small") panels[name === "files" ? "knowledge" : "files"] = false;
    updatePanels();
    if (value && name === "files") syncTree(true);
    const trigger = name === "files" ? fileToggle : knowledgeToggle;
    if (!value && restoreFocus) trigger.focus();
    else if (value && (band === "small" || name === "knowledge" && band === "medium")) el(name === "files" ? "xp-code-search" : "xp-close-knowledge").focus();
  }
  fileToggle.addEventListener("click", () => togglePanel("files"));
  knowledgeToggle.addEventListener("click", () => togglePanel("knowledge"));
  el("xp-close-files").addEventListener("click", () => togglePanel("files", false, true));
  el("xp-close-knowledge").addEventListener("click", () => togglePanel("knowledge", false, true));
  focusButton.addEventListener("click", () => {
    if (focusSaved) { panels = focusSaved; focusSaved = null; }
    else { focusSaved = { ...panels }; panels = { files: false, knowledge: false }; }
    updatePanels();
  });
  window.addEventListener("resize", () => {
    const next = widthBand();
    if (next === band) { applyFilesWidth(); return; }
    stopResize();
    band = next; focusSaved = null; panels = { files: band !== "small", knowledge: band === "wide" };
    const active = document.activeElement;
    updatePanels();
    if (filesPanel.hidden && filesPanel.contains(active)) fileToggle.focus();
    if (knowledgePanel.hidden && knowledgePanel.contains(active)) knowledgeToggle.focus();
    syncTree(true);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || currentView !== "code") return;
    if (panels.knowledge && band !== "wide") { event.preventDefault(); togglePanel("knowledge", false, true); }
    else if (panels.files && band === "small") { event.preventDefault(); togglePanel("files", false, true); }
  });
  document.addEventListener("focusin", (event) => {
    if (currentView !== "code") return;
    if (panels.files && band === "small" && !filesPanel.contains(event.target) && event.target !== fileToggle) { panels.files = false; updatePanels(); }
    if (panels.knowledge && band !== "wide" && !knowledgePanel.contains(event.target) && event.target !== knowledgeToggle) { panels.knowledge = false; updatePanels(); }
  });
  function dismissDrawers() {
    if (band === "small") panels.files = false;
    if (band !== "wide") panels.knowledge = false;
    updatePanels();
  }
  function showActionError(error) {
    const notice = t.failed + ": " + error.message;
    badge.textContent = notice;
    badge.closest("details").open = true;
    if (currentView === "code") message.textContent = notice;
  }
  let snapshot, loadedFile, sequence = 0, lastSelection = "", settled = false;
  const lifetime = new AbortController();
  const leavePage = () => { stopResize(); sequence++; lifetime.abort(); };
  window.addEventListener("pagehide", leavePage);
  window.addEventListener("beforeunload", leavePage);
  window.addEventListener("pageshow", (event) => { if (event.persisted && lifetime.signal.aborted) location.reload(); });
  const startRoute = api.route(location.href);
  let activeRequested = startRoute.snapshot;
  const url = (changes) => api.link(location.href, { ...(snapshot ? { snapshot: snapshot.manifest.id } : {}), ...changes });
  const anchor = (label, changes, className = "") => "<a data-xp-route data-xp-changes='" + esc(JSON.stringify(Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, value ?? null])))) + "' class='" + className + "' href='" + esc(url(changes)) + "'>" + esc(label) + "</a>";
  const codeRoute = (fileId, knowledge, line, end) => ({ view: "code", file: fileId, knowledge, line, end });
  function navigate(changes) {
    const next = url(changes);
    if (next !== location.pathname + location.search + location.hash) history.pushState(null, "", next);
    window.dispatchEvent(new Event("site:locationchange"));
  }
  function switchView(view) {
    const changed = currentView !== view;
    if (changed && view === "code") graphScroll = window.scrollY;
    const previous = currentView;
    currentView = view;
    document.body.dataset.explorerView = view;
    panel.hidden = view !== "code";
    graph.hidden = view === "code";
    if (consoleSection) consoleSection.hidden = view === "code";
    updatePanels();
    tabs.forEach((tab) => {
      const selected = tab.dataset.explorerView === view;
      tab.setAttribute("aria-pressed", String(selected)); tab.classList.toggle("active", selected);
    });
    if (changed) {
      if (view === "code") window.scrollTo({ top: 0, behavior: "instant" });
      else if (previous === "code") window.scrollTo({ top: graphScroll, behavior: "instant" });
    }
  }
  function sourceLinks(identity, compact = false) {
    return identity.sources.map((source) => {
      const file = snapshot.maps.files.get(source.fileId);
      const text = compact ? basename(file.path) : file.path + " #" + source.pointer;
      const line = source.pointerLocated === true ? source.startLine : undefined;
      const link = file.state === "published" ? anchor(text, codeRoute(file.id, identity.id, line, line ? source.endLine : undefined), compact ? "xp-short-path" : "") : esc(text) + " · " + esc(t.withheld);
      return "<li>" + link + (compact ? "<span class='xp-pointer-hint'>" + esc(source.pointer) + "</span>" : "") + "</li>";
    }).join("");
  }
  function locationLinks(identityId) {
    const locations = snapshot.byIdentity.get(identityId) || [];
    if (!locations.length) return "<p class='small'>" + esc(t.noLocation) + "</p>";
    const rows = locations.map((loc) => {
      const file = snapshot.maps.files.get(loc.fileId);
      const precision = loc.precision === "span" ? t.span + " [" + loc.span.start + ", " + loc.span.end + ")" : t.file;
      const label = file.path + " · " + precision;
      return "<li>" + (file.state === "published" ? "<button type='button' class='xp-code-location' data-xp-location='" + esc(loc.id) + "'>" + esc(label) + "</button>" : esc(label) + " · " + esc(t.withheld)) + "</li>";
    }).join("");
    const firstSpan = locations.find((loc) => loc.precision === "span" && snapshot.maps.files.get(loc.fileId).state === "published");
    const primary = firstSpan ? "<p><button type='button' class='xp-code-location' data-xp-location='" + esc(firstSpan.id) + "'>" + esc(t.span + " → " + snapshot.maps.files.get(firstSpan.fileId).path) + "</button></p>" : "";
    return primary + "<details class='xp-locations'" + (locations.length <= 4 ? " open" : "") + "><summary>" + esc(t.all) + " (" + locations.length + ")</summary><ul>" + rows + "</ul></details>";
  }
  function identityHTML(identityId, includeLocations = true, compact = false) {
    const identity = snapshot.maps.identities.get(identityId);
    if (!identity) return "<p>" + esc(t.noIdentity) + "</p>";
    let html = "<article class='xp-identity'><h4>" + esc(identity.name) + "</h4>";
    const identityText = "<p class='small'><code>" + esc(identity.id) + "</code></p>";
    html += compact ? "<details><summary>" + esc(zh ? "身份与完整来源" : "Identity & full sources") + "</summary>" + identityText + "<ul>" + sourceLinks(identity) + "</ul></details>" : identityText;
    html += identity.graphNodeIds.length ? "<p>" + identity.graphNodeIds.map((node) => anchor(t.graph + ": " + node, { view: "graph", node, knowledge: identityId, file: null, line: null, end: null })).join("<br>") + "</p>" : "<p class='small'>" + esc(t.noGraph) + "</p>";
    if (identity.sources.length) html += "<h5>" + esc(t.source) + "</h5><ul>" + sourceLinks(identity, compact) + "</ul>";
    else html += "<p class='small'>" + esc(zh ? "本快照未公开该身份的作者文件；不等于没有来源。" : "No author file for this identity is published in this snapshot; this does not mean it has no source.") + "</p>";
    if (includeLocations) html += locationLinks(identityId);
    if (identity.relations?.length) html += "<details><summary>" + esc(t.indirect) + "</summary><ul>" + identity.relations.map((rel) => "<li>" + esc(rel.carrier) + " → " + anchor(snapshot.maps.identities.get(rel.identity).name, { view: "code", knowledge: rel.identity, file: null, line: null, end: null }) + "</li>").join("") + "</ul></details>";
    return html + "</article>";
  }
  function renderAnchors(nodeId, target) {
    if (!target) return;
    if (!snapshot) { target.innerHTML = "<h4>" + esc(t.location) + "</h4><p>" + esc(settled ? t.unavailable : t.loading) + "</p>"; return; }
    const node = snapshot.maps.nodes.get(nodeId);
    let html = "<h4>" + esc(t.location) + "</h4>";
    if (!node?.identities.length) html += "<p>" + esc(t.noBridge) + "</p>";
    else {
      if (node.state === "ambiguous" || node.identities.length > 1) html += "<p class='small'>" + esc(t.ambiguous) + "</p>";
      html += node.identities.map((id) => identityHTML(id)).join("");
    }
    target.innerHTML = html;
  }
  function syncTree(reveal = false) {
    const id = api.route(location.href).file;
    const changed = treeSelection !== id;
    treeSelection = id;
    let selected;
    filesBox.querySelectorAll("a[data-file-id]").forEach((link) => {
      if (link.dataset.fileId === id) { link.setAttribute("aria-current", "true"); selected = link; }
      else link.removeAttribute("aria-current");
    });
    el("xp-reveal-file").hidden = !id || !!selected;
    if (!selected || !(changed || reveal)) return;
    for (let parent = selected.parentElement; parent && parent !== filesBox; parent = parent.parentElement) if (parent.tagName === "DETAILS") { parent.open = true; openDirectories.set(parent.dataset.directory, true); }
    if (panels.files) requestAnimationFrame(() => scrollWithin(filesBox, selected));
  }
  function fileTree() {
    if (!snapshot) return;
    if (!treeWasFiltered) filesBox.querySelectorAll("details[data-directory]").forEach((entry) => openDirectories.set(entry.dataset.directory, entry.open));
    const search = el("xp-code-search").value.toLowerCase(), role = el("xp-code-role").value;
    treeWasFiltered = !!search;
    const files = snapshot.index.files.filter((file) => (!role || file.role === role) && file.path.toLowerCase().includes(search));
    el("xp-code-count").textContent = files.length + " / " + snapshot.index.files.length;
    const tree = new Map();
    for (const file of files) {
      let current = tree;
      const parts = [file.role, ...file.path.split("/")];
      for (const part of parts.slice(0, -1)) { if (!current.has(part)) current.set(part, new Map()); current = current.get(part); }
      current.set(parts.at(-1), file);
    }
    const collator = new Intl.Collator(zh ? "zh-CN" : "en", { numeric: true, sensitivity: "base" });
    const roleOrder = { generated: 0, handwritten: 1, author: 2 };
    const roleLabel = r => r === "generated" ? t.generated : r === "handwritten" ? t.handwritten : t.author;
    const draw = (branch, prefix = "") => "<ul>" + [...branch].sort(([a, av], [b, bv]) => {
      if (!prefix) return (roleOrder[a] ?? 9) - (roleOrder[b] ?? 9);
      return Number(bv instanceof Map) - Number(av instanceof Map) || collator.compare(a, b);
    }).map(([name, entry]) => {
      const key = prefix ? prefix + "/" + name : name;
      if (entry instanceof Map) return "<li><details data-directory='" + esc(key) + "'" + (search || (openDirectories.get(key) ?? !prefix) ? " open" : "") + "><summary title='" + esc(key) + "'><span class='xp-tree-label'>" + esc(prefix ? name : roleLabel(name)) + "</span></summary>" + draw(entry, key) + "</details></li>";
      const link = anchor(name, codeRoute(entry.id, undefined), "xp-file-link");
      return "<li>" + link.replace("<a ", () => "<a data-file-id='" + esc(entry.id) + "' title='" + esc(entry.path) + "' aria-label='" + esc(entry.path + (entry.state === "withheld" ? " · " + t.withheld : "")) + "' ").replace(">" + esc(name) + "</a>", () => "><span class='xp-tree-label'>" + esc(name) + "</span>" + (entry.state === "withheld" ? "<span class='xp-tree-withheld'>" + esc(t.withheld) + "</span>" : "") + "</a>") + "</li>";
    }).join("") + "</ul>";
    filesBox.innerHTML = files.length ? draw(tree) : "<p>" + esc(t.noFiles) + "</p>";
    syncTree(true);
  }
  function showKnowledge(state) {
    if (!snapshot) return;
    let html = "<h3>" + esc(t.knowledge) + "</h3>";
    if (loadedFile && loadedFile.file.role === "generated") {
      const result = snapshot.reverse(loadedFile.file.id, loadedFile.ranges, state.line);
      html += "<p class='small'>" + esc(state.line && result.precision !== "span" ? t.noMatch : result.precision === "span" ? t.span : t.selectLine) + "</p>";
      const identities = [...new Set(result.locations.map((loc) => loc.identity))];
      html += identities.length ? "<details open><summary>" + esc(t.reveal) + " (" + identities.length + ")</summary>" + identities.map((id) => identityHTML(id, false, true)).join("") + "</details>" : "<p>" + esc(t.none) + "</p>";
      if (state.knowledge && !identities.includes(state.knowledge)) html += "<details><summary>" + esc(zh ? "导航来源（不匹配此行）" : "Navigation origin (not a match for this line)") + "</summary>" + identityHTML(state.knowledge, true, true) + "</details>";
    } else if (state.knowledge) html += identityHTML(state.knowledge, true, true);
    else if (loadedFile && loadedFile.file.role === "handwritten") {
      html += "<p class='small'>" + esc(t.handwrittenNote) + "</p>";
    } else if (loadedFile) {
      const identities = snapshot.index.identities.filter((identity) => identity.sources.some((source) => source.fileId === loadedFile.file.id));
      html += "<p class='small'>" + esc(t.authorNote) + "</p>" + identities.map((identity) => identityHTML(identity.id, false, true)).join("");
    }
    knowledgeBox.innerHTML = html;
  }
  function describeFile(file) {
    header.textContent = file ? basename(file.path) : t.choose;
    header.title = file?.path || "";
    filePath.textContent = file?.path || "";
    filePath.title = file?.path || "";
    const rows = file ? [
      [zh ? "快照内路径（不是本机路径）" : "Path within snapshot (not a local path)", file.path],
      [zh ? "文件类别" : "Source set", file.role === "generated" ? t.generated : file.role === "handwritten" ? t.handwritten : t.author],
      [zh ? "实际读取位置" : "Read from", file.resource ? "/assets/data/explorer/snapshots/" + snapshot.manifest.id + "/" + file.resource.path : t.withheld],
      ["SHA-256", file.sha256], ["Snapshot", snapshot.manifest.id],
      [zh ? "验证范围" : "Verification scope", t.verified],
    ] : [];
    fileEvidence.innerHTML = rows.map(([key, value]) => "<dt>" + esc(key) + "</dt><dd>" + esc(value) + "</dd>").join("");
  }
  function showLines(state) {
    const lines = loadedFile.text.split("\n");
    const end = state.end ?? state.line;
    const valid = state.line === undefined || Number.isSafeInteger(state.line) && state.line > 0 && state.line <= lines.length && Number.isSafeInteger(end) && end >= state.line && end <= lines.length;
    if (!valid) throw new Error("Invalid source line range");
    viewer.innerHTML = "<div class='xp-source-lines'>" + lines.map((line, i) => {
      const n = i + 1, selected = state.line && n >= state.line && n <= end;
      return "<div class='xp-source-line" + (selected ? " selected" : "") + "' id='xp-line-" + n + "'><a data-xp-route class='xp-line-number' href='" + esc(url(codeRoute(loadedFile.file.id, state.knowledge, n))) + "' aria-label='" + esc(t.line + " " + n) + "'>" + n + "</a><code>" + esc(line.endsWith("\r") ? line.slice(0, -1) : line) + "</code></div>";
    }).join("") + "</div>";
    message.textContent = loadedFile.file.role === "author" ? t.authorNote : loadedFile.file.role === "handwritten" ? t.handwrittenNote : t.selectLine;
    if (state.line) scrollWithin(viewer, el("xp-line-" + state.line), true);
    showKnowledge(state);
    el("xp-code-find-result").textContent = "";
  }
  async function renderRoute() {
    const state = api.route(location.href);
    switchView(state.view);
    if (consoleSection && ["console", "census", "describe", "blast", "lineage", "orphans", "sagas", "invariants"].includes(location.hash.slice(1))) consoleSection.open = true;
    if (state.snapshot !== activeRequested) { sequence++; location.reload(); return; }
    if (!snapshot) return;
    const selection = JSON.stringify([state.snapshot, state.view, state.node, state.file, state.knowledge, state.line, state.end]);
    if (selection === lastSelection) return;
    lastSelection = selection;
    const serial = ++sequence;
    viewer.setAttribute("aria-busy", "false");
    el("xp-code-find-result").textContent = "";
    if (state.view !== "code") return;
    el("xp-code-share").setAttribute("href", url({ view: "code" }));
    syncTree();
    if (!state.file) {
      loadedFile = null; describeFile(null); viewer.innerHTML = ""; message.textContent = "";
      knowledgeBox.innerHTML = state.knowledge ? identityHTML(state.knowledge, true, true) : ""; return;
    }
    const file = snapshot.maps.files.get(state.file);
    loadedFile = null; viewer.innerHTML = ""; knowledgeBox.innerHTML = "";
    describeFile(file);
    if (!file) header.textContent = state.file;
    if (file?.state === "withheld") { message.textContent = t.withheld + ": " + file.reason; if (state.knowledge) knowledgeBox.innerHTML = identityHTML(state.knowledge, true, true); return; }
    message.textContent = t.loadingFile; viewer.setAttribute("aria-busy", "true");
    try {
      const loaded = await snapshot.loadFile(state.file);
      if (serial !== sequence) return;
      loadedFile = loaded; showLines(state);
    } catch (error) { if (serial === sequence) { lastSelection = ""; loadedFile = null; viewer.innerHTML = ""; message.textContent = t.failed + ": " + error.message; } }
    finally { if (serial === sequence) viewer.setAttribute("aria-busy", "false"); }
  }
  async function openLocation(id) {
    const loc = snapshot?.maps.locations.get(id);
    if (!loc) return;
    const serial = ++sequence;
    try {
      const file = await snapshot.loadFile(loc.fileId);
      if (serial !== sequence) return;
      const lines = loc.span ? api.spanLines(file.ranges, loc.span) : [];
      dismissDrawers();
      navigate(codeRoute(loc.fileId, loc.identity, lines[0], lines.at(-1)));
      viewer.focus();
    } catch (error) { if (serial === sequence) showActionError(error); }
  }
  document.addEventListener("click", (event) => {
    const locationButton = event.target.closest("button[data-xp-location]");
    if (locationButton) { openLocation(locationButton.dataset.xpLocation); return; }
    const a = event.target.closest("a[data-xp-route]");
    if (!a || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const destination = api.route(a.href);
    const opensFile = destination.view === "code" && destination.file;
    if (opensFile && (a.closest("#xp-code-files") || a.closest("#xp-code-knowledge"))) dismissDrawers();
    if (a.dataset.xpChanges) navigate(JSON.parse(a.dataset.xpChanges));
    else {
      history.pushState(null, "", a.getAttribute("href"));
      window.dispatchEvent(new Event("site:locationchange"));
    }
    if (opensFile) viewer.focus();
  });
  tabs.forEach((tab) => tab.addEventListener("click", () => navigate({ view: tab.dataset.explorerView })));
  el("xp-code-search").addEventListener("input", fileTree);
  el("xp-code-role").addEventListener("change", fileTree);
  el("xp-reveal-file").addEventListener("click", () => { el("xp-code-search").value = ""; el("xp-code-role").value = ""; fileTree(); });
  el("xp-code-find").addEventListener("input", () => {
    const query = el("xp-code-find").value.toLowerCase();
    const matches = loadedFile && query ? loadedFile.text.split("\n").flatMap((line, i) => line.toLowerCase().includes(query) ? [i + 1] : []) : [];
    el("xp-code-find-result").innerHTML = !query ? "" : !matches.length ? esc(t.noText) : esc(t.matched) + " (" + matches.length + "): " + matches.map((line) => anchor(String(line), codeRoute(loadedFile.file.id, api.route(location.href).knowledge, line))).join(" · ");
  });
  el("xp-code-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(new URL(url({ view: "code" }), location.href).href); el("xp-code-copy-status").textContent = t.copied; }
    catch { el("xp-code-copy-status").textContent = t.copyFailed; }
  });
  el("xp-tour").addEventListener("click", () => {
    if (!snapshot) return;
    // Select the explicit bridge; the tour does not construct a code filename.
    const node = snapshot.maps.nodes.get("command:ReserveFunds");
    if (node?.identities.length) navigate({ view: "graph", node: node.id, knowledge: null, file: null, line: null, end: null });
  });
  for (const event of ["popstate", "hashchange", "site:locationchange"]) window.addEventListener(event, () => { renderRoute(); });
  badge.textContent = t.loading;
  renderRoute();
  const ready = (async () => {
    try {
      const loaded = await api.load({ snapshot: startRoute.snapshot, signal: lifetime.signal });
      if (lifetime.signal.aborted) return { state: "cancelled" };
      if (api.route(location.href).snapshot !== activeRequested) throw new Error("Snapshot changed during initialization");
      settled = true;
      if (loaded.state !== "ready") {
        badge.textContent = t.unverified; message.textContent = t.unavailable;
        return loaded;
      }
      snapshot = loaded;
      // Pin the resolved material without changing a traditional preset fragment.
      activeRequested = snapshot.manifest.id;
      const pinned = new URL(location.href);
      pinned.searchParams.set("snapshot", activeRequested);
      for (const key of [...pinned.searchParams.keys()]) if (key.toLowerCase() === "sql") pinned.searchParams.delete(key);
      history.replaceState(null, "", pinned.pathname + pinned.search + pinned.hash);
      window.dispatchEvent(new Event("site:locationchange"));
      const ev = snapshot.manifest.evidence;
      const verifiedLabel = ev.runtime === "compile-and-test-passed" && ev.runtimeEvidence
        ? (zh
          ? "导出时整体验证通过 · 下载字节逐项核对 · 编译与单测通过（" + ev.runtimeEvidence.suitesPassed + " 套件 / " + ev.runtimeEvidence.testsPassed + " 用例）"
          : "Verified at export · downloaded bytes checked · compile & tests passed (" + ev.runtimeEvidence.suitesPassed + " suites / " + ev.runtimeEvidence.testsPassed + " tests)")
        : t.verified;
      badge.textContent = snapshot.manifest.project.name + " · " + snapshot.manifest.verifiedAt + " · " + verifiedLabel;
      const thesis = document.querySelector(".page-hero .thesis");
      if (thesis) thesis.textContent = zh ? "从同一份公开快照浏览知识与代码：" + snapshot.manifest.graph.nodeCount + " 个图节点、" + snapshot.manifest.graph.edgeCount + " 条声明关系。所有查询在浏览器执行，不发送给服务器；导出验证不等于运行验收。" : "Explore knowledge and code from one published snapshot: " + snapshot.manifest.graph.nodeCount + " graph nodes and " + snapshot.manifest.graph.edgeCount + " declared relationships. Queries execute in your browser, not on a server. Export verification is not runtime acceptance.";
      const graphIntro = document.querySelector("#nodes > .sec-sub");
      if (graphIntro) graphIntro.textContent = zh ? "按 ID 或名称浏览图节点，并通过明确的身份映射打开作者文件和生成代码。限定别名保留独立节点。" : "Browse graph nodes by ID or name, then follow explicit identity mappings to author files and generated code. Qualified aliases retain their own node IDs.";
      const guide = el("xp-anchor-guide");
      if (guide) guide.innerHTML = zh ? "节点详情中的代码位置属于本次固定快照；本机实时核验请参阅 <a href='/zh/guide/#counter-reverse-query'>Counter 反查教程</a>。" : "Code locations in node details belong to this fixed snapshot. For current local verification, follow the <a href='/guide/#counter-reverse-query'>Counter reverse-query guide</a>.";
      el("xp-code-scope").textContent = snapshot.manifest.counts.publishedFiles + " / " + snapshot.manifest.counts.files + " " + t.count + " · " + snapshot.manifest.counts.withheldFiles + " " + t.withheld;
      el("xp-tour").disabled = !snapshot.maps.nodes.get("command:ReserveFunds")?.identities.length;
      fileTree();
      // Graph readiness depends on manifest/index, never a source download.
      renderRoute();
      return loaded;
    } catch (error) {
      if (lifetime.signal.aborted) return { state: "cancelled" };
      settled = true; showActionError(error);
      return { state: "error", error };
    }
  })();
  root.ExplorerCode = Object.freeze({ ready, renderAnchors, nodeURL: (id) => url({ view: "graph", node: id, file: null, line: null, end: null, knowledge: null }),
    scope: () => snapshot ? t.verified + " · " + snapshot.manifest.id : null });
})(globalThis);
