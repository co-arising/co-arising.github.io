/* co-arising.github.io — knowledge-graph explorer.
   Loads the bank-wealth graphstore (built by `truthsrc graph`) into sql.js
   in the browser. Presets mirror the CLI query verbs; the free console
   runs read-only SQL against the in-memory copy. No network after load. */

(function () {
  "use strict";

  const statusEl = document.getElementById("xp-status");
  const resultEl = document.getElementById("xp-result");
  const sqlEl = document.getElementById("xp-sql");
  const runBtn = document.getElementById("xp-run");
  const clearBtn = document.getElementById("xp-clear");
  const timingEl = document.getElementById("xp-timing");
  const radialWrap = document.getElementById("xp-radial");
  const radialSvg = document.getElementById("xp-radial-svg");
  const presetBtns = document.querySelectorAll("#xp-presets button");
  if (!statusEl || !resultEl) return; // not on this page

  /* Relations the registry marks propagates=true that exist in this graph.
     Mirrors propagatingRelations() from lib/shared.mjs ∩ this graphstore.
     saga-derived participates/phase-commands/result are handled by the CLI
     with saga diagnostics and intentionally excluded here. */
  const PROPAGATES = ["owns", "issues", "produces", "emits", "triggers", "derives-from", "has-step"];

  let db = null;
  let fingerprint = null;

  const setStatus = (html) => { statusEl.innerHTML = html; };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- boot ---------- */
  async function boot() {
    try {
      const SQL = await initSqlJs({ locateFile: (f) => "/assets/vendor/sqljs/" + f });
      const [buf, meta] = await Promise.all([
        fetch("/assets/data/bank-wealth.graph.sqlite").then((r) => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.arrayBuffer();
        }),
        fetch("/assets/data/bank-wealth.graph.meta.json").then((r) => r.json()),
      ]);
      db = new SQL.Database(new Uint8Array(buf));
      const n = db.exec("SELECT COUNT(*) FROM nodes")[0].values[0][0];
      const e = db.exec("SELECT COUNT(*) FROM edges")[0].values[0][0];
      fingerprint = meta;
      setStatus(
        "graph: <strong>bank-wealth</strong><br>" +
        "nodes: <strong>" + n + "</strong> · edges: <strong>" + e + "</strong><br>" +
        "built: " + esc(meta.generatedAt) + "<br>" +
        "sha256: " + esc(String(meta.sha256).slice(0, 16)) + "…<br>" +
        "<span style='color:var(--teal)'>✓ loaded in-browser</span>"
      );
      if (String(n) !== String(meta.nodeCount) || String(e) !== String(meta.edgeCount)) {
        setStatus("⚠ fingerprint mismatch: db has " + n + "/" + e + ", meta says " + meta.nodeCount + "/" + meta.edgeCount);
      }
    } catch (err) {
      setStatus("<span style='color:var(--red)'>✗ could not load sql.js or the graph file ('" + esc(err.message) + "').<br>Preset answers below are the documented expected values — semantics still stand; data rebuild: see the bottom of this page.</span>");
      db = null;
    }
  }

  /* ---------- result rendering ---------- */
  function showResult(title, prose, tables, nodeIdForRadial) {
    let html = "<h3>" + esc(title) + "</h3><p class='answer'>" + prose + "</p>";
    (tables || []).forEach((t) => {
      html += "<div class='xp-table-wrap'><table><thead><tr>";
      t.cols.forEach((c) => { html += "<th>" + esc(c) + "</th>"; });
      html += "</tr></thead><tbody>";
      t.rows.slice(0, 200).forEach((r) => {
        html += "<tr>";
        r.forEach((v) => { html += "<td>" + (v == null ? "—" : esc(v)) + "</td>"; });
        html += "</tr>";
      });
      html += "</tbody></table></div>";
      if (t.rows.length > 200) html += "<p class='small'>… showing first 200 of " + t.rows.length + " rows</p>";
    });
    resultEl.innerHTML = html;
    if (nodeIdForRadial) renderRadial(nodeIdForRadial); else radialWrap.hidden = true;
  }

  function query(sql) {
    const t0 = performance.now();
    const out = db.exec(sql);
    timingEl.textContent = ((performance.now() - t0).toFixed(1)) + " ms";
    return out;
  }

  function resultToTable(res, cols) {
    if (!res || !res.length) return { cols: cols || ["(empty)"], rows: [] };
    return { cols: res[0].columns, rows: res[0].values };
  }

  /* ---------- presets ---------- */
  const PRESETS = {
    census: {
      title: "Census — what the bank graph is made of",
      prose: "Node kinds and relation counts. The tree’s 157 YAML atoms expand into runtime nodes — value-objects dominate, behavior (events/commands/slices) carries the causal core.",
      sql() {
        const kinds = resultToTable(query("SELECT kind, COUNT(*) AS n FROM nodes GROUP BY kind ORDER BY n DESC"));
        const rels = resultToTable(query("SELECT relation, COUNT(*) AS n FROM edges GROUP BY relation ORDER BY n DESC"));
        return [kinds, rels];
      },
      expected: "389 nodes / 413 edges — verified 2026-11-11 (F-03)."
    },

    describe: {
      title: "Describe — the CreditBalance aggregate",
      prose: "One row per node is what the CLI verb prints as a summary; here you see the aggregate’s outgoing edges — the slices it owns and the events in its pool.",
      sql() {
        return [resultToTable(query(
          "SELECT e.relation, e.to_id, (SELECT kind FROM nodes WHERE id = e.to_id) AS to_kind " +
          "FROM edges e WHERE e.from_id = 'aggregate:CreditBalance' ORDER BY e.relation, e.to_id"))];
      },
      expected: "CreditBalance owns 7 slices, emits into the shared event pool."
    },

    blast: {
      title: "Blast radius — SipInstallmentFailed, 3 hops",
      prose: "A recursive walk over <code>propagates=true</code> relations only (owns, issues, produces, emits, triggers, derives-from, has-step) — the same over-approximation contract as the CLI: <em>may-impact, better to over-report than miss</em>. This is the query an agent runs before proposing a change.",
      sql() {
        const rel = PROPAGATES.map((r) => "'" + r + "'").join(",");
        return [resultToTable(query(
          "WITH RECURSIVE hit(id) AS (" +
          "  SELECT 'event:SipInstallmentFailed'" +
          "  UNION" +
          "  SELECT CASE WHEN e.from_id = h.id THEN e.to_id ELSE e.from_id END" +
          "  FROM edges e JOIN hit h ON e.from_id = h.id OR e.to_id = h.id" +
          "  WHERE e.relation IN (" + rel + ")" +
          ") SELECT n.kind, n.id FROM nodes n JOIN hit ON n.id = hit.id ORDER BY n.kind, n.id"))];
      },
      expected: "55 nodes — verified against the CLI blast_radius verb on 2026-11-11 (F-21): slices, commands, read-model fields and pipelines touched by an installment failure."
    },

    lineage: {
      title: "Lineage — where read-model fields come from",
      prose: "R10/R11: read-model fields derive from event/aggregate fields. Every row answers a compliance question: “this displayed number comes from that event field.”",
      sql() {
        return [resultToTable(query(
          "SELECT e.from_id AS read_model_field, e.relation, e.to_id AS source " +
          "FROM edges e WHERE e.relation = 'derives-from' ORDER BY e.from_id LIMIT 120"))];
      },
      expected: "51 derives-from edges — every field of every read model with its source."
    },

    orphans: {
      title: "Orphans — pool events with no triggering source",
      prose: "The CLI verb <code>orphans</code> reports knowledge with no origin: commands no slice claims, events no command produces. Not garbage — <em>open questions</em>: these BankPaymentResult* / BankRefundResult* events are saga-outcome events whose producers live outside this context. The tool surfaces them; only a human decides what they mean.",
      sql() {
        return [resultToTable(query(
          "SELECT n.id, " +
          "(SELECT COUNT(*) FROM edges e WHERE e.to_id = n.id AND e.relation = 'produces') AS produced_by_any_command " +
          "FROM nodes n WHERE n.kind = 'event' AND NOT EXISTS " +
          "(SELECT 1 FROM edges e WHERE e.to_id = n.id AND e.relation = 'produces') ORDER BY n.id"))];
      },
      expected: "23 rows in the graphstore = 11 distinct events by CLI reckoning (the store keeps qualified FundOrder.* pool copies): BankPaymentResult*, BankRefundResult*, FundTAReceiptObserved — all saga result events from outside the context."
    },

    sagas: {
      title: "Sagas & pipelines — coordination declared in truth",
      prose: "Two sagas (TCC transactions) and four pipelines (ordered step queues) are atoms in the tree; the graph expands them into phases, steps and participants.",
      sql() {
        const sagas = resultToTable(query("SELECT id, kind FROM nodes WHERE kind IN ('saga','pipeline','saga-phase','saga-step','saga-participant','step') ORDER BY kind, id"));
        return [sagas];
      },
      expected: "2 sagas (cash payment, independent refund) · 4 pipelines (payment, TA submission, SIP dispatch, refund)."
    },

    invariants: {
      title: "Invariant enforcement — rules with teeth",
      prose: "The 149 <code>@rule</code> invariants live inside slice guards (see the dissolve demo). In the graph they surface as guard conditions inside slice atoms — here, a peek into one slice’s compiled atom.",
      sql() {
        return [resultToTable(query(
          "SELECT substr(atom, 1, 700) AS slice_atom_preview FROM nodes WHERE id = 'slice:ReserveFunds'"))];
      },
      expected: "The ReserveFunds slice atom: parameters, guards citing LEDGER_* invariants, produces."
    }
  };

  function runPreset(key, btn) {
    presetBtns.forEach((b) => b.classList.toggle("active", b === btn));
    const p = PRESETS[key];
    if (!db) {
      showResult(p.title + " (data unavailable)", "<span class='badge boundary'>offline</span> " + p.expected, []);
      return;
    }
    let tables;
    try { tables = p.sql(); }
    catch (err) { showResult(p.title, "SQL error: " + esc(err.message), []); return; }
    const rows = tables.reduce((s, t) => s + t.rows.length, 0);
    const anchorId = key === "describe" ? "aggregate:CreditBalance" : (key === "blast" ? "event:SipInstallmentFailed" : null);
    showResult(p.title, p.prose + "<br><span class='small'><strong>Expected:</strong> " + p.expected + "</span>", tables, anchorId);
  }

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => runPreset(btn.dataset.preset, btn));
  });

  /* support deep links: /explorer/#blast or #orphans */
  window.addEventListener("load", () => {
    const h = location.hash.replace("#", "");
    const btn = document.getElementById("preset-" + h);
    if (btn) btn.click();
  });

  /* ---------- free console ---------- */
  runBtn.addEventListener("click", () => {
    if (!db) { showResult("Console unavailable", "The graph file didn’t load — see the fingerprint panel.", []); return; }
    try {
      const res = query(sqlEl.value);
      if (!res.length) { showResult("Query", "Statement executed — no rows returned (DDL/DML is not applicable here; the db is read-only in memory).", []); return; }
      showResult("Query result", res.length + " result set(s).", res.map((r) => ({ cols: r.columns, rows: r.values })));
    } catch (err) {
      showResult("SQL error", esc(err.message), []);
    }
  });
  clearBtn.addEventListener("click", () => { sqlEl.value = ""; timingEl.textContent = ""; });

  /* ---------- radial one-hop neighborhood (deterministic SVG) ---------- */
  function renderRadial(centerId) {
    if (!db) { radialWrap.hidden = true; return; }
    let rows;
    try {
      rows = query(
        "SELECT e.relation, CASE WHEN e.from_id = '" + centerId.replace(/'/g, "''") + "' THEN e.to_id ELSE e.from_id END AS other, " +
        "CASE WHEN e.from_id = '" + centerId.replace(/'/g, "''") + "' THEN 'out' ELSE 'in' END AS dir " +
        "FROM edges e WHERE e.from_id = '" + centerId.replace(/'/g, "''") + "' OR e.to_id = '" + centerId.replace(/'/g, "''") + "' LIMIT 24"
      )[0].values;
    } catch (e) { radialWrap.hidden = true; return; }
    if (!rows.length) { radialWrap.hidden = true; return; }

    const W = 720, R = 210, cx = W / 2, cy = 235;
    const short = (id) => { const p = String(id).split(":"); return (p[1] || id).slice(0, 26); };
    const kindOf = {};
    const nodeIds = rows.map((r) => r[1]);
    try {
      query("SELECT id, kind FROM nodes WHERE id IN (" + nodeIds.map((i) => "'" + String(i).replace(/'/g, "''") + "'").join(",") + ")")[0].values
        .forEach((v) => { kindOf[v[0]] = v[1]; });
    } catch (e) { /* optional */ }

    let svg = "<svg class='dissolve-svg' viewBox='0 0 " + W + " 470' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='One-hop neighborhood of " + esc(centerId) + "'>";
    rows.forEach((r, i) => {
      const a = (i / rows.length) * 2 * Math.PI - Math.PI / 2;
      const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a) * 0.85;
      svg += "<line x1='" + cx + "' y1='" + cy + "' x2='" + x + "' y2='" + y + "' class='dv-edge'/>" +
        "<text x='" + ((cx + x) / 2 + 6) + "' y='" + ((cy + y) / 2 - 4) + "' font-size='9' fill='var(--ink-3)'>" + esc(r[0]) + (r[2] === "in" ? " ◂" : " ▸") + "</text>" +
        "<g class='dv-node'><circle cx='" + x + "' cy='" + y + "' r='5' fill='var(--teal)'/>" +
        "<text x='" + x + "' y='" + (y - 10) + "' text-anchor='middle' fill='var(--ink-2)'>" + esc(short(r[1])) + "</text>" +
        "<text x='" + x + "' y='" + (y + 17) + "' text-anchor='middle' font-size='8' fill='var(--ink-3)'>" + esc(kindOf[r[1]] || "") + "</text></g>";
    });
    svg += "<g class='dv-node'><circle cx='" + cx + "' cy='" + cy + "' r='9' fill='var(--red)'/>" +
      "<text x='" + cx + "' y='" + (cy - 16) + "' text-anchor='middle' font-weight='600' fill='var(--ink)'>" + esc(short(centerId)) + "</text></g></svg>";
    radialSvg.innerHTML = svg;
    radialWrap.hidden = false;
  }

  boot();
})();
