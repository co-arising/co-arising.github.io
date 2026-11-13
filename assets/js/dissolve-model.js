/* Guard coverage is a model property, not a claim of executing business rules. */
(function (root) {
  "use strict";
  function create(data) {
    const edges = data.edges;
    const slices = data.nodes.filter((node) => node.kind === "slice");
    const removed = new Set();
    const requireIndex = (index) => {
      if (!Number.isInteger(index) || index < 0 || index >= edges.length) throw new Error("Unknown edge");
    };
    return {
      present(index) { requireIndex(index); return !removed.has(index); },
      set(index, present) { requireIndex(index); if (present) removed.delete(index); else removed.add(index); },
      all(present) { removed.clear(); if (!present) edges.forEach((edge, i) => removed.add(i)); },
      removeGuards() { edges.forEach((edge, i) => { if (edge.relation === "guarded-by") removed.add(i); }); },
      summary() {
        const coverage = slices.map((slice) => {
          const guards = edges.map((edge, i) => ({ ...edge, i })).filter((edge) => edge.from === slice.id && edge.relation === "guarded-by");
          const present = guards.filter((edge) => !removed.has(edge.i)).length;
          return { id: slice.id, total: guards.length, present,
            state: guards.length === 0 ? "undeclared" : present === guards.length ? "complete" : present === 0 ? "none" : "partial" };
        });
        return { edges: edges.length, presentEdges: edges.length - removed.size, coverage,
          complete: coverage.filter((slice) => slice.state === "complete").length };
      },
    };
  }
  root.DissolveModel = Object.freeze({ create });
})(globalThis);
