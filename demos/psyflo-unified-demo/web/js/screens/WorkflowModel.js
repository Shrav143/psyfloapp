// Settings > Workflows (round 5): the pure part of the map builder. No DOM here: geometry, the one-line summary of a block, and the edits a person
// makes to a draft workflow (add, move, link, unlink, remove). The canvas, the outline and the inspector all go through these, so the map, the outline
// and the keyboard can never disagree. The draft is a plain copy of the workflow ({ name, description, nodes, edges }).
import { BLOCKS, GRID, KIND_LABEL, ROLE_OPTIONS, STAGE_GROUPS, portsOf, newNode } from '../shared/workflows/catalog.js';
import { rule } from '../shared/rules.js';

export const NODE_W = 220, NODE_H = 80;                 // 11 x 4 grid cells
export const PORT_Y = { out: 40, yes: 24, no: 56 };     // where an exit dot sits on the right edge of a card
export const snap = v => Math.max(0, Math.round((Number(v) || 0) / GRID) * GRID);
export const clone = o => JSON.parse(JSON.stringify(o));
export const isLocked = node => !!(BLOCKS[node && node.block] && BLOCKS[node.block].locked);
export const PORT_LABEL = { out: 'Next', yes: 'Yes', no: 'No' };

// ---- what a draft is (the part a person edits; version, history and pending belong to the store) ----
export const draftOf = wf => ({ name: wf.name || '', description: wf.description || '', nodes: clone(wf.nodes || []), edges: clone(wf.edges || []) });
export const draftKey = d => JSON.stringify([d.name, d.description, [...d.nodes].sort((a, b) => (a.id < b.id ? -1 : 1)).map(n => [n.id, n.block, n.x, n.y, n.params, n.rules]), [...d.edges].sort((a, b) => (a.id < b.id ? -1 : 1)).map(e => [e.id, e.from, e.to, e.port])]);

// ---- values and summaries ----
const rolesText = (list, empty = 'nobody') => { const names = (list || []).map(r => (ROLE_OPTIONS.find(o => o[0] === r) || [, r])[1].toLowerCase()); return names.length ? names.join(', ') : empty; };
const optLabel = (opts, v) => (opts.find(o => o[0] === v) || [, v])[1];
// a rule-bound number is the rule itself: show the live value, not the copy stored in the node
export function paramValue(s, node, key) {
  const p = ((BLOCKS[node.block] || {}).params || {})[key]; const v = (node.params || {})[key];
  if (p && p.rule) { const r = rule(s, p.rule); if (!r.missing && typeof r.value === 'number') return r.value; }
  return v === undefined && p ? p.default : v;
}
const payerNames = (s, ids) => (ids || []).map(id => { const p = ((s && s.payers) || []).find(x => x.id === id); return p ? p.name : id; });
export function summaryOf(s, node) {
  const b = BLOCKS[node.block]; if (!b) return 'Unknown block';
  const v = k => paramValue(s, node, k);
  switch (node.block) {
    case 'units_used': return `Units used reach ${v('pct')}%`;
    case 'deadline_near': return `${v('which') === 'any' ? 'A deadline' : optLabel(b.params.which.options, v('which'))} within ${v('days')} days`;
    case 'payer_reply': return 'Reply: ' + ((v('stages') || []).map(x => optLabel(STAGE_GROUPS, x).toLowerCase()).join(', ') || 'none picked');
    case 'followup_day': return `Follow-up on day ${v('day')}`;
    case 'note_late': return v('type') === 'any' ? 'Any note is past due' : optLabel(b.params.type.options, v('type')) + ' past due';
    case 'eligibility_due': return `Eligibility older than ${v('days')} days`;
    case 'payer_is': { const n = payerNames(s, v('payers')); return n.length ? 'Payer is ' + n.join(', ') : 'Pick a payer'; }
    case 'service_is': return v('service') === 'any' ? 'Any service' : 'Service is ' + v('service');
    case 'units_left': return `Units left are ${v('pct')}% or less`;
    case 'evidence_missing': return 'Stored evidence has gaps';
    case 'partial_award': return 'A partial offer is waiting';
    case 'owner_role': return 'Owner is ' + rolesText(v('roles'), 'pick a role');
    case 'notify': return 'Notify ' + rolesText(v('roles'));
    case 'suggest_flag': return `Suggest a flag (${optLabel(b.params.reason.options, v('reason')).toLowerCase()}) to ${rolesText(v('roles'))}`;
    case 'add_task': return 'Task for ' + rolesText(v('roles'));
    case 'never_auto': return b.label;
    case 'person_confirms': return rolesText(v('roles'), 'a person') + ' confirms first';
    case 'roles_only': return 'Only ' + rolesText(v('roles'), 'nobody');
    case 'two_person': return 'A second person agrees to changes';
    case 'source_required': return 'Stop without a verified source';
    case 'evidence_required': return 'Stop when evidence is missing';
    case 'max_per_day': return `At most ${v('n')} alerts a day`;
    default: return b.label;
  }
}
export const nodeTitle = node => (BLOCKS[node.block] || {}).short || node.block;

// ---- the worst verification among a block's rules (for the badge): 0 official .. 3 unverified ----
const RANK = { 'OFFICIAL-VERIFIED': 0, 'PAYER-SPECIFIC': 1, 'HARVEST-REPORTED': 2, 'UNVERIFIED-DEMO-ASSUMPTION': 3 };
export function worstRule(s, node) {
  let worst = null;
  for (const k of node.rules || []) { const r = rule(s, k); if (r.missing) continue; if (!worst || (RANK[r.category] ?? 3) > (RANK[worst.category] ?? 3)) worst = r; }
  return worst;
}

// ---- the graph ----
export const edgesFrom = (wf, id, port) => wf.edges.filter(e => e.from === id && (port == null || e.port === port));
export const edgeFrom = (wf, id, port) => wf.edges.find(e => e.from === id && e.port === port) || null;
export const nodeById = (wf, id) => wf.nodes.find(n => n.id === id) || null;
export const nextIds = (wf, id) => wf.edges.filter(e => e.from === id).map(e => e.to);
export function reaches(wf, from, to) {
  const seen = new Set([from]); const q = [from];
  while (q.length) { const x = q.shift(); if (x === to) return true; for (const y of nextIds(wf, x)) if (!seen.has(y)) { seen.add(y); q.push(y); } }
  return false;
}
// may `from` (through `port`) link to `to`? Returns { ok, why }
export function canLink(wf, from, port, to) {
  const a = nodeById(wf, from), t = nodeById(wf, to);
  if (!a || !t) return { ok: false, why: 'That block is not on the map.' };
  if (from === to) return { ok: false, why: 'A block cannot link to itself.' };
  if (!portsOf(a.block).includes(port)) return { ok: false, why: 'That block has no exit to link from.' };
  if (BLOCKS[t.block].kind === 'trigger') return { ok: false, why: 'A When block starts a workflow, so nothing links into it.' };
  if (isLocked(t)) return { ok: false, why: 'The locked guardrail is always on; nothing links to it.' };
  if (wf.edges.some(e => e.from === from && e.port === port && e.to === to)) return { ok: false, why: 'Those two blocks are already linked.' };
  if (reaches(wf, to, from)) return { ok: false, why: 'That link would loop back to where it started.' };
  return { ok: true, why: '' };
}
// link from -> to through `port`. An exit may fan out to several blocks, so a new link never replaces another. Returns the new edge, or null.
export function link(wf, from, port, to, newId) {
  if (!canLink(wf, from, port, to).ok) return null;
  const e = { id: newId('e'), from, to, port }; wf.edges.push(e); return e;
}
export const unlink = (wf, edgeId) => { wf.edges = wf.edges.filter(e => e.id !== edgeId); };
export function removeNode(wf, id) { const n = nodeById(wf, id); if (!n || isLocked(n)) return false; wf.nodes = wf.nodes.filter(x => x.id !== id); wf.edges = wf.edges.filter(e => e.from !== id && e.to !== id); return true; }

// ---- placing blocks ----
const occupied = (wf, x, y) => wf.nodes.some(n => Math.abs(n.x - x) < NODE_W && Math.abs(n.y - y) < NODE_H);
export function freeSpot(wf, near) {
  const live = wf.nodes.filter(n => !isLocked(n));
  let x, y;
  if (near) { x = near.x + NODE_W + 80; y = near.y; } else { x = GRID * 2; y = live.length ? Math.max(...live.map(n => n.y)) + 120 : GRID * 2; }
  let guard = 0; while (occupied(wf, x, y) && guard++ < 40) y += 100;
  return { x: snap(x), y: snap(y) };
}
// the first exit of a block with no link yet ('out', 'yes' or 'no'), or null
export const portsFree = (wf, node) => portsOf(node.block).find(p => !edgesFrom(wf, node.id, p).length) || null;
export function addNode(wf, block, x, y, newId) {
  const n = newNode(newId('n'), block, x, y); wf.nodes.push(n); return n;
}

// ---- the outline: the graph as an indented tree. Returns [{ node, kids:[{ port, edge, child }|{ port, empty:true }], ref? }] plus orphans ----
export function outlineTree(wf) {
  const nodes = wf.nodes.filter(n => !isLocked(n) && BLOCKS[n.block]); const seen = new Set();
  const build = (id, trail) => {
    const node = nodeById(wf, id); if (!node) return null;
    if (seen.has(id)) return { node, ref: true, kids: [] };
    seen.add(id);
    const kids = portsOf(node.block).map(port => ({ port, links: edgesFrom(wf, id, port).filter(e => !trail.has(e.to) && nodeById(wf, e.to) && !isLocked(nodeById(wf, e.to))).map(e => ({ edge: e, child: build(e.to, new Set([...trail, id])) })).filter(l => l.child) }));
    return { node, kids };
  };
  const roots = nodes.filter(n => BLOCKS[n.block].kind === 'trigger').sort((a, b) => a.y - b.y || a.x - b.x).map(n => build(n.id, new Set()));
  const hasIn = new Set(wf.edges.map(e => e.to));
  const orphans = nodes.filter(n => !seen.has(n.id) && !hasIn.has(n.id)).sort((a, b) => a.y - b.y || a.x - b.x).map(n => build(n.id, new Set())).filter(Boolean);
  nodes.filter(n => !seen.has(n.id)).forEach(n => { const t = build(n.id, new Set()); if (t) orphans.push(t); });
  return { roots, orphans };
}

export const KIND_ORDER = ['trigger', 'condition', 'action', 'guardrail'];
export { KIND_LABEL, GRID };
