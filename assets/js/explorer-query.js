/* Shared by the browser worker and Node tests. All execution uses a disposable DB. */
(function (root) {
  "use strict";
  const LIMITS = Object.freeze({ sqlBytes: 16 * 1024, sets: 4, rows: 200, columns: 32, cellBytes: 8192, responseBytes: 512 * 1024 });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const propagates = "'owns','issues','produces','emits','triggers','derives-from','has-step'";
  const PRESETS = Object.freeze({
    census: ["SELECT kind, COUNT(*) AS n FROM nodes GROUP BY kind ORDER BY n DESC", "SELECT relation, COUNT(*) AS n FROM edges GROUP BY relation ORDER BY n DESC"],
    describe: ["SELECT e.relation, e.to_id, n.kind AS to_kind FROM edges e LEFT JOIN nodes n ON n.id=e.to_id WHERE e.from_id='aggregate:CreditBalance' ORDER BY e.relation,e.to_id"],
    blast: ["WITH RECURSIVE hit(id,depth) AS (SELECT 'event:SipInstallmentFailed',0 UNION SELECT CASE WHEN e.from_id=h.id THEN e.to_id ELSE e.from_id END,h.depth+1 FROM edges e JOIN hit h ON e.from_id=h.id OR e.to_id=h.id WHERE h.depth<3 AND e.relation IN (" + propagates + ")) SELECT n.kind,n.id,MIN(h.depth) AS depth FROM nodes n JOIN hit h ON n.id=h.id GROUP BY n.id,n.kind ORDER BY n.kind,n.id"],
    lineage: ["SELECT e.from_id AS read_model, e.relation, e.to_id AS declared_source FROM edges e WHERE e.relation='derives-from' ORDER BY e.from_id,e.to_id"],
    orphans: ["SELECT n.id,n.name,0 AS incoming_produces FROM nodes n WHERE n.kind='event' AND NOT EXISTS (SELECT 1 FROM edges e WHERE e.to_id=n.id AND e.relation='produces') ORDER BY n.id"],
    sagas: ["SELECT id,kind FROM nodes WHERE kind IN ('saga','pipeline','saga-phase','saga-step','saga-participant','step') ORDER BY kind,id"],
    invariants: ["SELECT id,atom AS authored_slice FROM nodes WHERE id='slice:ReserveFunds'"],
  });

  function execute(SQL, bytes, request) {
    if (request.mode !== "preset" && request.mode !== "sandbox") throw new Error("Unknown query mode");
    const queries = request.mode === "preset"
      ? (Object.hasOwn(PRESETS, request.key) ? PRESETS[request.key] : null)
      : [request.sql];
    if (!queries || queries.some((sql) => typeof sql !== "string" || encoder.encode(sql).length > LIMITS.sqlBytes)) {
      throw new Error("Unknown preset or SQL exceeds 16 KiB");
    }
    if (!queries.some((sql) => sql.trim())) throw new Error("Enter a SQL statement");
    const database = new SQL.Database(new Uint8Array(bytes));
    const tables = [];
    const notices = new Set();
    let statementCount = 0;
    let responseSize = 0;
    let stopped = false;
    const boundedText = (value) => {
      const text = value instanceof Uint8Array ? "[blob " + value.byteLength + " bytes]" : String(value);
      const encoded = encoder.encode(text);
      if (encoded.length <= LIMITS.cellBytes) return text;
      notices.add("cell");
      let end = LIMITS.cellBytes - encoder.encode("…").length;
      while ((encoded[end] & 0xc0) === 0x80) end--; // Keep the prefix on a complete UTF-8 boundary.
      return decoder.decode(encoded.subarray(0, end)) + "…";
    };
    try {
      for (const sql of queries) {
        if (stopped) break;
        for (const statement of database.iterateStatements(sql)) {
          if (++statementCount > 64) { notices.add("statements"); stopped = true; break; }
          const allColumns = statement.getColumnNames();
          if (allColumns.length && tables.length === LIMITS.sets) { notices.add("sets"); stopped = true; break; }
          const cols = allColumns.slice(0, LIMITS.columns).map(boundedText);
          if (allColumns.length > LIMITS.columns) notices.add("columns");
          const table = { cols, rows: [], truncated: false };
          if (cols.length) {
            responseSize += encoder.encode(JSON.stringify(cols)).length + 64;
            if (responseSize > LIMITS.responseBytes - 4096) { notices.add("bytes"); stopped = true; break; }
            tables.push(table);
          }
          while (statement.step()) {
            if (table.rows.length === LIMITS.rows) {
              table.truncated = true;
              notices.add("rows");
              stopped = true;
              break;
            }
            const row = statement.get(null, { useBigInt: true }).slice(0, LIMITS.columns)
              .map((value) => value === null ? null : boundedText(value));
            const size = encoder.encode(JSON.stringify(row)).length + 1;
            if (responseSize + size > LIMITS.responseBytes - 4096) {
              table.truncated = true;
              notices.add("bytes");
              stopped = true;
              break;
            }
            table.rows.push(row);
            responseSize += size;
          }
          if (stopped) break;
        }
      }
      let neighborhood = null;
      const center = request.mode === "preset" && (request.key === "describe" ? "aggregate:CreditBalance" : request.key === "blast" ? "event:SipInstallmentFailed" : null);
      if (center) {
        const statement = database.prepare("SELECT e.relation,CASE WHEN e.from_id=? THEN e.to_id ELSE e.from_id END AS other FROM edges e WHERE e.from_id=? OR e.to_id=? ORDER BY e.seq LIMIT 24");
        statement.bind([center, center, center]);
        const edges = [];
        try { while (statement.step()) edges.push(statement.get()); }
        finally { statement.free(); }
        neighborhood = { center, edges };
      }
      return { tables, notices: [...notices], statementCount, disposable: true, neighborhood };
    } finally {
      /* Closing frees all prepared statements, including a truncated iterator. */
      database.close();
    }
  }
  root.ExplorerQuery = Object.freeze({ LIMITS, PRESETS, execute });
})(globalThis);
