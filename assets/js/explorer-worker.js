/* One job per Worker: no connection or user SQL survives into another query. */
"use strict";
self.onmessage = async (event) => {
  const { id, bytes, wasm, request, protocol } = event.data;
  const expected = "co-arising.explorer-query/v1";
  try {
    if (protocol !== expected) throw new Error("Explorer worker protocol mismatch");
    importScripts("/assets/vendor/sqljs/sql-wasm.js", "/assets/js/explorer-query.js");
    if (ExplorerQuery.PROTOCOL !== expected) throw new Error("Explorer query protocol mismatch");
    const SQL = await initSqlJs({ wasmBinary: new Uint8Array(wasm) });
    const start = performance.now();
    const result = ExplorerQuery.execute(SQL, bytes, request);
    self.postMessage({ id, protocol: expected, ok: true, result, milliseconds: performance.now() - start });
  } catch (error) {
    self.postMessage({ id, protocol: expected, ok: false, error: String(error && error.message || error).slice(0, 2000) });
  } finally {
    self.close();
  }
};
