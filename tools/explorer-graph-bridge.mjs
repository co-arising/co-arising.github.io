import assert from 'node:assert/strict';
import { pointer } from './explorer-snapshot-security.mjs';

const esc = value => String(value).replaceAll('~', '~0').replaceAll('/', '~1');
export function pointerValue(value, path) {
  assert.ok(pointer(path), 'invalid canonical pointer');
  for (const key of path.split('/').slice(1)) {
    const decoded = key.replaceAll('~1', '/').replaceAll('~0', '~');
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, decoded)) return undefined;
    value = value[decoded];
  }
  return value;
}

/** Adapter for lib/query.mjs buildGraph's *emission slots*, not name matching.
 * Every entry records the canonical object and pointer passed to addNode.
 * Replaying the slots also detects objects discarded by first-wins addNode.
 * Unknown/new synthetic node kinds deliberately remain unmapped.
 */
function emissionSlots(c) {
  const slots = new Map();
  const add = (kind, key, atom, path) => {
    const id = `${kind}:${key}`;
    if (!slots.has(id)) slots.set(id, []);
    slots.get(id).push({ atom, pointer: path });
  };
  for (const [ai, a] of (c.aggregates || []).entries()) {
    const p = `/aggregates/${ai}`;
    add('aggregate', a.name, a, p);
    for (const [i, cmd] of (a.commands || []).entries()) if (cmd?.name) {
      add('command', cmd.name, cmd, `${p}/commands/${i}`);
      add('slice', cmd.name, cmd, `${p}/commands/${i}`);
    }
    for (const [i, event] of (a.events || []).entries()) if (event?.name) add('event', event.name, event, `${p}/events/${i}`);
  }
  for (const [si, s] of (c.sessions || []).entries()) for (const [bi, b] of (s.scopes || []).entries())
    for (const [i, n] of (b.notes || []).entries()) if (n?.name && ['role', 'policy', 'event', 'command', 'story'].includes(n.type))
      add(n.type, n.name, n, `/sessions/${si}/scopes/${bi}/notes/${i}`);
  for (const [i, rm] of (c.readModels || []).entries()) {
    add('read-model', rm.id || rm.name, rm, `/readModels/${i}`);
    for (const [j, f] of (rm.fields || []).entries()) if (f.source)
      add('field', String(f.source).replace(/^eventField:/, ''), f, `/readModels/${i}/fields/${j}`);
  }
  for (const [i, p] of (c.pipelines || []).entries()) if (p.id) {
    add('pipeline', p.id, p, `/pipelines/${i}`);
    for (const [j, step] of (p.steps || []).entries()) if (step?.id) add('step', `${p.id}.${step.id}`, step, `/pipelines/${i}/steps/${j}`);
  }
  for (const [i, s] of (c.scenarios || []).entries()) if (s.id || s.name) add('scenario', s.id || s.name, s, `/scenarios/${i}`);
  for (const [i, v] of (c.valueObjects || []).entries()) add('value-object', v.id || v.name, v, `/valueObjects/${i}`);
  for (const [i, s] of (c.stories || []).entries()) add('story', s.name, s, `/stories/${i}`);
  for (const [i, u] of (c.useCases?.useCases || []).entries()) add('use-case', u.useCase || u.name, u, `/useCases/useCases/${i}`);
  for (const [i, saga] of (c.sagas || []).entries()) if (saga.id) {
    add('saga', saga.id, saga, `/sagas/${i}`);
    if (saga.payload?.schemaVersion !== 'truthsrc.saga/v1') continue;
    for (const [family, kind] of [['participants', 'saga-participant'], ['steps', 'saga-step']]) {
      const rows = saga.payload[family] || [];
      for (const [j, row] of rows.entries()) if (row?.id && rows.filter(r => r?.id === row.id).length === 1)
        add(kind, `${saga.id}.${row.id}`, row, `/sagas/${i}/payload/${family}/${j}`);
    }
    // saga-phase atoms are copied/enriched by buildGraph; no original object
    // reference survives, so this adapter does NOT guess a phase identity.
  }
  return slots;
}

export function buildExplorerGraphBridge({ canonical, graph, sourceIndex, resolveSourcePointer }) {
  assert.equal(graph.canonical, canonical, 'graph must retain this captured canonical object');
  const slots = emissionSlots(canonical), result = [];
  for (const [id, node] of graph.nodes) {
    assert.equal(id, node.id, 'graph node key mismatch');
    let candidates = slots.get(id) || [], unsupported = false;
    if (node.qualifiedRef && ['command', 'event'].includes(node.kind)) {
      const ref = node.qualifiedRef;
      const owners = (canonical.aggregates || []).map((atom, i) => ({ atom, i })).filter(row => row.atom.name === ref.aggregate);
      const owned = owners.flatMap(({ atom, i }) => (atom[node.kind === 'command' ? 'commands' : 'events'] || [])
        .map((atom, j) => ({ atom, pointer: `/aggregates/${i}/${node.kind === 'command' ? 'commands' : 'events'}/${j}` }))
        .filter(row => row.atom.name === ref.name));
      if (owners.length !== 1 || owned.length !== 1 || owned[0].atom !== node.atom) unsupported = true;
      else candidates = [...candidates, ...owned];
    }
    // The concrete emitted node must be tied by object identity, never by a
    // matching display name, copied object content, or an ID prefix.
    if (!node.atom || !candidates.some(row => row.atom === node.atom)) unsupported = true;
    const pointers = unsupported ? [] : [...new Set(candidates.map(row => row.pointer))].sort();
    const identities = new Set();
    let multipleOccurrences = false;
    for (const path of pointers) {
      assert.ok(candidates.some(row => row.pointer === path && row.atom === pointerValue(canonical, path)), 'emission slot/object mismatch');
      const resolved = resolveSourcePointer(sourceIndex, path).filter(row => row.relation !== 'unresolved');
      if (resolved.length > 1) multipleOccurrences = true;
      for (const row of resolved) {
        assert.ok(sourceIndex.records.some(record => record.identity === row.identity), 'bridge identity is outside captured index');
        if (row.relation !== 'unresolved') identities.add(row.identity);
      }
    }
    result.push({ id, state: pointers.length > 1 || multipleOccurrences ? 'ambiguous' : identities.size ? (identities.size > 1 ? 'ambiguous' : 'mapped') : 'unmapped',
      pointers, identities: [...identities].sort() });
  }
  return result.sort((a, b) => a.id.localeCompare(b.id));
}
