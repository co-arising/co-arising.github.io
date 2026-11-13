/* One job per Worker: no connection or user SQL survives into another query. */
"use strict";
self.onmessage = async (event) => {
  const { id, bytes, wasm, request } = event.data;
  try {
    importScripts("/assets/vendor/sqljs/sql-wasm.js", "/assets/js/explorer-query.js");
    const SQL = await initSqlJs({ wasmBinary: new Uint8Array(wasm) });
    const start = performance.now();
    const result = ExplorerQuery.execute(SQL, bytes, request);
    self.postMessage({ id, ok: true, result, milliseconds: performance.now() - start });
  } catch (error) {
    self.postMessage({ id, ok: false, error: String(error && error.message || error).slice(0, 2000) });
  } finally {
    self.close();
  }
};
