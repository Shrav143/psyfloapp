// The workflow engine (round 5, Settings > Workflows). PURE ESM: the server, the app and the tests import it. It never writes, never
// reads the machine's clock, never sends, calls, files or signs anything: a workflow only decides which bell items, suggestions and reminders
// a person sees. Same state + same workflow + same `today` = same answer (matches are sorted; ids come from records and nodes).
//
//   validate(wf, s?)            -> { ok, problems:[{ level:'error'|'warn', node?, edge?, text }] }
//   run(s, wf, { today?, actor? }) -> { matches:[{ record:{type,id}, client, label, path:[nodeId], effects:[effect], stopped:null|{ node, why } }],
//                                      counts:{ candidates, matched, stopped, effects, limited } }
//   workflowItems(s, actor)     -> [notification-shaped items] for the enabled workflows, effects for the actor's role after the guardrails
//   tidy(wf)                    -> a copy of wf laid out left to right (triggers first; Yes above No), x and y multiples of GRID
//   newId(prefix?, taken?)      -> 'n-xxxx' (unique among `taken`, an array or a Set)
// Also exported for the screens and the action file: normalize(wf), ensureLocked(wf), effectiveParams(s, node), problemsFor(...) helpers,
// LOCKED_ID, LAYOUT, PORT_LABEL, TEMPLATE_RE.
//
// MODEL (see catalog.js): a workflow is nodes + edges. A trigger ("When") yields candidate records from the state (a request, a patient, a note);
// a condition ("If") sends the record down its yes or no exit; an action ("Then") adds an effect; a guardrail ("Always") is a pass-through
// block that changes what comes AFTER it on the path (roles_only, person_confirms, max_per_day) or stops the path (source_required,
// evidence_required). Several links may leave one exit (a fan-out); a trigger can have no incoming link; the locked never_auto guardrail
// takes no links at all: it is on in every workflow and is the one node that need not be reachable. A rule-bound parameter (a block param with
// `rule`) always reads the live rules table, so editing the rule in Settings changes the workflow and the rest of the demo with it.
//
// Safety: effects are only 'notify' (a bell item), 'suggest_flag' (a bell item that points at the flag button) and 'add_task' (a reminder for a
// person). Messages may use only {patient} (initials), {payer} and {date}; the engine never reads note text (it reads status: stages, dates,
// unit counts, and the evidence index's structural gaps, which are counted from stored notes without opening their text).
import { BLOCKS, GRID, KINDS, ROLE_OPTIONS, STAGE_GROUPS, portsOf, defaultParams } from './catalog.js';
import * as M from '../model.js';
import { addDays, daysBetween, fmtDate } from '../dates.js';
import { rule, ruleValue, decisionDay } from '../rules.js';
import { can } from '../permissions.js';
import { deadline, reqView, ownerOf, DI_STAGES } from '../sel/auth.js';
import { noteTimeliness } from '../sel/mywork.js';
import { evidenceIndex } from '../enhance.js';

export const LOCKED_ID = 'never_auto';
export const LAYOUT = { x0: 40, y0: 40, colW: 300, rowH: 140 };
export const PORT_LABEL = { out: 'Next', yes: 'Yes', no: 'No' };
export const TEMPLATE_RE = /\{([a-z_]+)\}/gi;
const FILL = ['patient', 'payer', 'date'];
const ROLE_IDS = ROLE_OPTIONS.map(r => r[0]);
const STAFF_ROLES = ['direct_support', 'supervisor', 'clinician', 'admin'];
const MAX_NODES = 60, MAX_EDGES = 120;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const STRUCTURAL_GAPS = new Set(['days', 'weeks', 'months', 'units']);   // counted from stored notes; independent of who may read their text
const STAGE_OF = { info: ['info_requested'], partial: ['partial_decide'], denied: ['denied'], p2p: ['peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting'], overdue: ['overdue'] };
const KIND_OF_WHICH = { renewal: ['renewal', 'auth_end'], decision: ['decision', 'followup', 'overdue', 'reply', 'reply_by', 'p2p'], appeal: ['appeal'] };
const NOTE_TYPE = { dpn: 'daily', weekly: 'weekly_guardian', collateral: 'monthly_collateral' };
const NOTE_LABEL = { daily: 'Daily note', weekly_guardian: 'Weekly guardian call', monthly_collateral: 'Monthly collateral' };
const PORT_ORDER = { out: 0, yes: 1, no: 2 };
const FLAG_WORD = { needs_decision: 'Needs a decision', units_low: 'Units low', evidence: 'Evidence missing', family: 'Waiting on the family', other: 'Other' };
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const isoDay = d => String(d || '').slice(0, 10);
const byIdMap = arr => new Map((arr || []).map(x => [x.id, x]));
const stable = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ---------------------------------------------------------------------------------------------------------------- ids and small helpers
export function newId(prefix = 'n', taken) {
  const used = taken instanceof Set ? taken : new Set(taken || []);
  for (let i = 0; i < 200; i++) { const id = `${prefix}-${Math.random().toString(36).slice(2, 6).padEnd(4, '0')}`; if (!used.has(id)) return id; }
  return `${prefix}-${Date.now().toString(36).slice(-6)}`;
}
const snap = v => Math.round((Number.isFinite(+v) ? +v : 0) / GRID) * GRID;

// the parameters of a node as the engine reads them: the stored value, or the default, and for a rule-bound parameter the live rule value
export function effectiveParams(s, node) {
  const b = BLOCKS[node && node.block]; const out = {};
  if (!b) return out;
  for (const [k, p] of Object.entries(b.params || {})) {
    let v = node.params && node.params[k] !== undefined ? node.params[k] : (Array.isArray(p.default) ? p.default.slice() : p.default);
    if (p.rule && s) v = ruleValue(s, p.rule, v);
    out[k] = v;
  }
  return out;
}
// every rule key a node relies on: the rows attached to it and the rules its rule-bound parameters read
const ruleKeysOf = node => { const b = BLOCKS[node && node.block]; const ks = new Set(Array.isArray(node && node.rules) ? node.rules : []); if (b) for (const p of Object.values(b.params || {})) if (p.rule) ks.add(p.rule); return [...ks]; };

// ---------------------------------------------------------------------------------------------------------------- normalize / locked guardrail
// ensureLocked(wf): exactly one never_auto node (the first one stays); added at the bottom right when absent. Returns a new workflow.
export function ensureLocked(wf) {
  const nodes = (wf.nodes || []).filter(Boolean); const seen = nodes.filter(n => n.block === LOCKED_ID);
  const rest = nodes.filter(n => n.block !== LOCKED_ID);
  const keep = seen[0] || (() => {
    const mx = rest.reduce((a, n) => Math.max(a, +n.x || 0), 0), my = rest.reduce((a, n) => Math.max(a, +n.y || 0), 0);
    const ids = new Set(rest.map(n => n.id)); const id = ids.has(LOCKED_ID) ? newId('n', ids) : LOCKED_ID;
    return { id, block: LOCKED_ID, x: snap(mx), y: snap(my + LAYOUT.rowH), params: {}, rules: [] };
  })();
  const edges = (wf.edges || []).filter(e => e && e.from !== keep.id && e.to !== keep.id && !seen.slice(1).some(n => n.id === e.from || n.id === e.to));
  return { ...wf, nodes: [...rest, keep], edges };
}
// normalize(wf): the stored shape. x,y snapped to GRID, parameters filled from the catalog and unknown ones dropped, rules a list of strings,
// the locked guardrail present, links de-duplicated. Does not repair what validate reports (unknown blocks, missing nodes stay, so they are reported).
export function normalize(wf) {
  const w = isObj(wf) ? wf : {};
  const nodes = (Array.isArray(w.nodes) ? w.nodes : []).filter(isObj).map(n => {
    const b = BLOCKS[n.block]; const given = isObj(n.params) ? n.params : {};
    const params = b ? Object.fromEntries(Object.entries(defaultParams(n.block)).map(([k, d]) => [k, given[k] !== undefined ? given[k] : d])) : { ...given };
    return { id: String(n.id == null ? '' : n.id), block: String(n.block || ''), x: snap(n.x), y: snap(n.y), params, rules: [...new Set((Array.isArray(n.rules) ? n.rules : []).map(String))] };
  });
  const seenEdge = new Set();
  const edges = (Array.isArray(w.edges) ? w.edges : []).filter(isObj).map((e, i) => ({ id: String(e.id == null || e.id === '' ? `e-${i + 1}` : e.id), from: String(e.from == null ? '' : e.from), to: String(e.to == null ? '' : e.to), port: String(e.port || 'out') }))
    .filter(e => { const k = `${e.from}|${e.port}|${e.to}`; if (seenEdge.has(k)) return false; seenEdge.add(k); return true; });
  return ensureLocked({ ...w, nodes, edges });
}

// ---------------------------------------------------------------------------------------------------------------- validate
function paramProblems(s, node, push) {
  const b = BLOCKS[node.block]; if (!b) return;
  const given = isObj(node.params) ? node.params : {};
  const at = (text, level = 'error') => push({ level, node: node.id, text: `${b.short || b.label}: ${text}` });
  for (const k of Object.keys(given)) if (!(k in (b.params || {}))) at(`"${k}" is not a setting of this block`, 'warn');
  for (const [k, p] of Object.entries(b.params || {})) {
    const v = given[k]; if (v === undefined) continue;   // missing = the default
    const name = p.label || k;
    switch (p.type) {
      case 'number':
        if (typeof v !== 'number' || !Number.isFinite(v)) at(`${name} must be a number`);
        else if (!Number.isInteger(v)) at(`${name} must be a whole number`);
        else if ((p.min != null && v < p.min) || (p.max != null && v > p.max)) at(`${name} must be between ${p.min} and ${p.max}${p.unit ? ' ' + p.unit : ''}`);
        break;
      case 'select':
        if (!(p.options || []).some(o => o[0] === v)) at(`${name} must be one of the choices`);
        break;
      case 'multi':
        if (!Array.isArray(v) || v.some(x => !(p.options || []).some(o => o[0] === x))) at(`${name} must be chosen from the list`);
        else if (new Set(v).size !== v.length) at(`${name} lists a choice twice`);
        else if (!v.length) at(`Pick at least one in "${name}": with none, nothing starts`, 'warn');
        break;
      case 'roles':
        if (!Array.isArray(v) || v.some(x => !ROLE_IDS.includes(x))) at(`${name} must be chosen from the roles`);
        else if (new Set(v).size !== v.length) at(`${name} lists a role twice`);
        else if (!v.length) at(`Pick at least one role in "${name}": with none, nobody receives it`, 'warn');
        break;
      case 'payers': {
        const ids = s && Array.isArray(s.payers) && s.payers.length ? new Set(s.payers.map(x => x.id)) : null;
        if (!Array.isArray(v) || v.some(x => typeof x !== 'string')) at(`${name} must be a list of payers`);
        else if (ids && v.some(x => !ids.has(x))) at(`${name} names a payer that is not in the list`);
        else if (!v.length) at('Pick at least one payer: with none, the answer is always No', 'warn');
        break;
      }
      case 'text':
        if (typeof v !== 'string') at(`${name} must be text`);
        else {
          if (p.max && v.length > p.max) at(`${name} is longer than ${p.max} characters`);
          if (!v.trim()) at(`${name} is empty: the default message is used`, 'warn');
          const bad = [...v.matchAll(TEMPLATE_RE)].map(m => m[1].toLowerCase()).filter(x => !FILL.includes(x));
          if (bad.length) at(`${name} uses {${[...new Set(bad)].join('}, {')}}: only {patient}, {payer} and {date} fill in`, 'warn');
        }
        break;
      case 'bool':
        if (typeof v !== 'boolean') at(`${name} must be on or off`);
        break;
      default: break;
    }
  }
}

export function validate(wf, s) {
  const problems = []; const push = p => problems.push(p);
  if (!isObj(wf)) return { ok: false, problems: [{ level: 'error', text: 'The workflow is missing.' }] };
  const nodes = Array.isArray(wf.nodes) ? wf.nodes : []; const edges = Array.isArray(wf.edges) ? wf.edges : [];
  if (nodes.length > MAX_NODES) push({ level: 'error', text: `A workflow can have up to ${MAX_NODES} blocks.` });
  if (edges.length > MAX_EDGES) push({ level: 'error', text: `A workflow can have up to ${MAX_EDGES} links.` });
  const ids = new Map(); const rulesKnown = s && Array.isArray(s.rules) && s.rules.length ? new Set(s.rules.map(r => r.key)) : null;
  // blocks
  for (const n of nodes) {
    if (!isObj(n) || typeof n.id !== 'string' || !n.id) { push({ level: 'error', text: 'A block has no id.' }); continue; }
    if (!ID_RE.test(n.id)) { push({ level: 'error', text: 'A block id may use letters, digits, - and _ (up to 40 characters).' }); continue; }
    if (ids.has(n.id)) { push({ level: 'error', node: n.id, text: `Two blocks share the id ${n.id}.` }); continue; }
    ids.set(n.id, n);
    const b = BLOCKS[n.block];
    if (!b) { push({ level: 'error', node: n.id, text: `Unknown block "${n.block}".` }); continue; }
    if (!Number.isFinite(+n.x) || !Number.isFinite(+n.y)) push({ level: 'error', node: n.id, text: `${b.short || b.label}: the block has no position.` });
    paramProblems(s, n, push);
    if (n.rules != null && !Array.isArray(n.rules)) push({ level: 'error', node: n.id, text: `${b.short || b.label}: rules must be a list of rule keys.` });
    for (const k of (Array.isArray(n.rules) ? n.rules : [])) if (typeof k !== 'string' || (rulesKnown && !rulesKnown.has(k))) push({ level: 'error', node: n.id, text: `${b.short || b.label}: "${k}" is not in the rules table.` });
    if (b.locked && n.block === LOCKED_ID && nodes.filter(x => x && x.block === LOCKED_ID).length > 1 && n !== nodes.find(x => x && x.block === LOCKED_ID)) push({ level: 'error', node: n.id, text: 'The locked guardrail is in the workflow once.' });
  }
  if (!nodes.some(n => n && BLOCKS[n.block] && BLOCKS[n.block].kind === 'trigger')) push({ level: 'error', text: 'Add a "When" block: a workflow needs something that starts it.' });
  // links
  const okEdges = []; const edgeIds = new Set();
  for (const e of edges) {
    if (!isObj(e)) { push({ level: 'error', text: 'A link is malformed.' }); continue; }
    if (typeof e.id !== 'string' || !ID_RE.test(e.id) || edgeIds.has(e.id)) { push({ level: 'error', edge: e.id, text: `A link id is missing or used twice (${e.id || 'no id'}).` }); continue; }
    edgeIds.add(e.id);
    const a = ids.get(e.from), z = ids.get(e.to);
    if (!a || !z) { push({ level: 'error', edge: e.id, text: `A link ${!a ? 'starts from' : 'goes to'} a block that is not there.` }); continue; }
    const ab = BLOCKS[a.block], zb = BLOCKS[z.block]; if (!ab || !zb) continue;
    if (!portsOf(a.block).includes(e.port)) { push({ level: 'error', edge: e.id, node: a.id, text: ab.locked ? `${ab.short} takes no links.` : `${ab.short || ab.label} has no "${PORT_LABEL[e.port] || e.port}" exit.` }); continue; }
    if (zb.kind === 'trigger') { push({ level: 'error', edge: e.id, node: z.id, text: `A "When" block starts a workflow: nothing can link into ${zb.short || zb.label}.` }); continue; }
    if (zb.locked) { push({ level: 'error', edge: e.id, node: z.id, text: 'Nothing links into the locked guardrail: it is always on.' }); continue; }
    okEdges.push(e);
  }
  // cycles (depth-first with a path set), then reachability from the triggers
  const out = new Map(); for (const e of okEdges) { if (!out.has(e.from)) out.set(e.from, []); out.get(e.from).push(e.to); }
  const color = new Map(); let cyc = null;
  const dfs = id => { color.set(id, 1); for (const to of out.get(id) || []) { if (color.get(to) === 1) { cyc = cyc || to; } else if (!color.get(to)) dfs(to); } color.set(id, 2); };
  for (const id of ids.keys()) if (!color.get(id)) dfs(id);
  if (cyc) push({ level: 'error', node: cyc, text: 'The links go round in a circle: a path may not return to a block it has already passed.' });
  const reach = new Set(); const seen = [];
  for (const n of nodes) if (isObj(n) && BLOCKS[n.block] && BLOCKS[n.block].kind === 'trigger') seen.push(n.id);
  const stack = [...seen]; while (stack.length) { const id = stack.pop(); if (reach.has(id)) continue; reach.add(id); for (const to of out.get(id) || []) stack.push(to); }
  for (const n of nodes) {
    const b = isObj(n) && BLOCKS[n.block]; if (!b || b.locked) continue;
    if (!reach.has(n.id)) push({ level: 'error', node: n.id, text: `${b.short || b.label} is not connected to a "When" block, so it would never run.` });
  }
  // warnings: a trigger that leads to no action, an exit that leads nowhere
  for (const t of seen) {
    const sub = new Set(); const st = [t]; while (st.length) { const id = st.pop(); if (sub.has(id)) continue; sub.add(id); for (const to of out.get(id) || []) st.push(to); }
    if (![...sub].some(id => BLOCKS[(ids.get(id) || {}).block] && BLOCKS[ids.get(id).block].kind === 'action')) push({ level: 'warn', node: t, text: `Nothing happens after ${BLOCKS[ids.get(t).block].short}: add a "Then" block.` });
  }
  for (const n of nodes) {
    const b = isObj(n) && BLOCKS[n.block]; if (!b || b.kind !== 'condition') continue;
    for (const port of ['yes', 'no']) if (!okEdges.some(e => e.from === n.id && e.port === port)) push({ level: 'warn', node: n.id, text: `The "${PORT_LABEL[port]}" exit of ${b.short} leads nowhere.` });
  }
  return { ok: !problems.some(p => p.level === 'error'), problems };
}

// ---------------------------------------------------------------------------------------------------------------- tidy
// A layered layout: depth from the triggers sets the column (the longest path wins), and rows follow the links: the first link out of a block
// continues on its row, every further link (the No exit) takes a new row below, so Yes sits above No. Blocks nobody links to go in a column at
// the right; the locked guardrail sits bottom right.
export function tidy(wf) {
  const w = normalize(wf); const nodes = w.nodes.filter(n => n.block !== LOCKED_ID); const locked = w.nodes.filter(n => n.block === LOCKED_ID);
  const byId = new Map(nodes.map(n => [n.id, n])); const out = new Map();
  w.edges.filter(e => byId.has(e.from) && byId.has(e.to)).map((e, i) => ({ e, i })).sort((a, b) => (PORT_ORDER[a.e.port] || 0) - (PORT_ORDER[b.e.port] || 0) || a.i - b.i)
    .forEach(({ e }) => { if (!out.has(e.from)) out.set(e.from, []); out.get(e.from).push(e.to); });
  const isTrig = n => BLOCKS[n.block] && BLOCKS[n.block].kind === 'trigger';
  const trig = nodes.filter(isTrig);
  const depth = new Map(); const onPath = new Set();
  const setDepth = (id, d) => { if (onPath.has(id)) return; if ((depth.get(id) ?? -1) >= d) return; depth.set(id, d); onPath.add(id); for (const to of out.get(id) || []) setDepth(to, d + 1); onPath.delete(id); };
  for (const t of trig) setDepth(t.id, 0);
  const row = new Map(); let nextRow = 0; const col = id => depth.get(id);
  const place = (id, r) => { if (row.has(id)) return; row.set(id, r); let first = true; for (const to of out.get(id) || []) { if (row.has(to)) continue; if (first) { place(to, r); first = false; } else place(to, nextRow++); } };
  for (const t of trig) { const r = nextRow++; place(t.id, r); }
  const maxCol = Math.max(-1, ...[...depth.values()]);
  let strayRow = 0; const stray = [];
  for (const n of nodes) if (!row.has(n.id)) { stray.push(n); }
  const laid = nodes.map(n => {
    if (row.has(n.id)) return { ...n, x: LAYOUT.x0 + col(n.id) * LAYOUT.colW, y: LAYOUT.y0 + row.get(n.id) * LAYOUT.rowH };
    const i = strayRow++; return { ...n, x: LAYOUT.x0 + (maxCol + 1) * LAYOUT.colW, y: LAYOUT.y0 + i * LAYOUT.rowH };
  });
  const maxY = Math.max(0, ...laid.map(n => n.y)); const maxX = Math.max(LAYOUT.x0, ...laid.map(n => n.x));
  const lockedAt = locked.map(n => ({ ...n, x: maxX, y: maxY + LAYOUT.rowH }));
  const idx = new Map(w.nodes.map((n, i) => [n.id, i])); const merged = [...laid, ...lockedAt].sort((a, b) => idx.get(a.id) - idx.get(b.id));
  return { ...w, nodes: merged };
}

// ---------------------------------------------------------------------------------------------------------------- the run
// context for one run: the state, the day, and small caches (every selector below is a pure read)
function context(s, today) {
  const sx = today && today !== (s.clock && s.clock.date || s.today) ? { ...s, today, clock: { ...(s.clock || {}), date: today } } : s;
  const tdt = c => !(c && c.service_line && c.service_line !== 'tdt');
  const clients = (s.clients || []).filter(tdt); const clientById = byIdMap(clients);
  const requests = (s.requests || []).filter(r => r && tdt(r) && tdt(M.byId(s.clients, r.client) || {}));   // a request whose patient is only a label (R-0399) stays
  const reqById = byIdMap(requests);
  const open = new Map(); for (const q of requests) if (q.stage !== 'closed' && !open.has(q.client)) open.set(q.client, q);
  const gapCache = new Map(); const sEv = { ...sx, evidence_marks: [] };
  const dlCache = new Map();
  return {
    s: sx, today: sx.today, clients, clientById, requests, reqById, open,
    gaps(clientId) { if (!gapCache.has(clientId)) { let g = []; try { g = evidenceIndex(sEv, clientId).gaps.filter(x => x.kind === 'missing' && STRUCTURAL_GAPS.has(x.id)); } catch { g = []; } gapCache.set(clientId, g); } return gapCache.get(clientId); },
    dl(q) { if (!dlCache.has(q.id)) { let d = null; try { d = deadline(sx, reqView(sx, q)); } catch { d = null; } dlCache.set(q.id, d); } return dlCache.get(q.id); }
  };
}
const label = (X, clientId) => { const c = X.clientById.get(clientId); return c ? c.initials : clientId; };
const payerName = (X, id) => (id ? (id === 'ffs' ? 'Medicaid FFS' : M.payerShort(X.s, id)) : '');
const sevOfDl = d => (d === 'overdue' ? 'r' : 'y');
const atOf = (d, today) => { const x = String(d || today || ''); return x.length === 10 ? x + 'T00:00' : x.slice(0, 16); };

// triggers: each returns the candidate records: { record:{type,id}, client, sev, at, date, why }
const TRIGGERS = {
  units_used(X, P) {
    const out = [];
    for (const c of X.clients) {
      const a = c.authorization; if (!a || !(a.units > 0) || a.used == null) continue;
      const pct = Math.round(100 * a.used / a.units); if (pct < P.pct) continue;
      const left = Math.max(0, a.units - a.used);
      out.push({ record: { type: 'client', id: c.id }, client: c.id, sev: left === 0 ? 'r' : 'y', at: atOf(a.exhausted, X.today), date: a.end || '', why: left === 0 ? `No units left of ${a.units}` : `${pct}% of units used · ${left} left of ${a.units}` });
    }
    return out;
  },
  deadline_near(X, P) {
    const out = []; const kinds = KIND_OF_WHICH[P.which] || null;
    for (const q of X.requests) {
      if (q.stage === 'closed') continue; const dl = X.dl(q);
      if (!dl || !dl.date || dl.sev === 'none') continue;
      if (kinds && !kinds.includes(dl.kind)) continue;
      if (daysBetween(X.today, isoDay(dl.date)) > P.days) continue;
      out.push({ record: { type: 'request', id: q.id }, client: q.client, sev: sevOfDl(dl.sev), at: atOf(dl.date, X.today), date: isoDay(dl.date), why: [dl.text, dl.sub].filter(Boolean).join(' · ') });
    }
    return out;
  },
  payer_reply(X, P) {
    const stages = new Set((P.stages || []).flatMap(k => STAGE_OF[k] || []));
    const out = [];
    for (const q of X.requests) {
      if (!stages.has(q.stage)) continue; const dl = X.dl(q);
      const when = q.stage === 'info_requested' ? q.info_requested_at : q.stage === 'partial_decide' ? q.offer_call : q.stage === 'denied' ? q.denied_on : /^peer_to_peer|^p2p/.test(q.stage) ? (q.p2p_at || q.offer_call) : q.sent;
      const date = isoDay(q.reply_by || q.reply_due || (dl && dl.date) || '');
      const word = { info_requested: 'The payer asked for information', partial_decide: 'The payer offered part of the units', denied: 'The payer denied the request', overdue: 'The decision is overdue' }[q.stage] || 'Peer-to-peer with the payer';
      out.push({ record: { type: 'request', id: q.id }, client: q.client, sev: dl && dl.sev === 'overdue' || q.stage === 'overdue' ? 'r' : 'y', at: atOf(when, X.today), date, why: [word, dl && dl.text && dl.text !== '—' ? dl.text : ''].filter(Boolean).join(' · ') });
    }
    return out;
  },
  followup_day(X, P) {
    const out = [];
    for (const q of X.requests) {
      if (q.stage !== 'submitted') continue;
      const dd = decisionDay(X.s, q.sent, X.today, q.payer); if (!dd || dd.day < P.day) continue;
      out.push({ record: { type: 'request', id: q.id }, client: q.client, sev: dd.overdue ? 'r' : 'y', at: atOf(q.sent, X.today), date: dd.followup_date, why: `Day ${dd.day} after sending · follow-up is day ${dd.followup_day}` });
    }
    return out;
  },
  note_late(X, P) {
    const want = NOTE_TYPE[P.type] || null; const out = [];
    const staff = [...new Set(X.clients.map(c => c.staff).filter(Boolean))].sort();
    for (const sid of staff) {
      let tl; try { tl = noteTimeliness(X.s, sid); } catch { continue; }
      for (const b of tl.behind) {
        if (want && b.type !== want) continue; if (!X.clientById.has(b.c.id)) continue;
        out.push({ record: { type: 'note', id: `${b.c.id}:${b.type}:${b.date}` }, client: b.c.id, sev: 'y', at: atOf(b.dueAt, X.today), date: isoDay(b.dueAt), why: `${NOTE_LABEL[b.type] || 'Note'} past due · was due ${fmtDate(isoDay(b.dueAt))}` });
      }
    }
    return out;
  },
  eligibility_due(X, P) {
    const out = [];
    for (const c of X.clients) {
      const ck = c.medicaid && c.medicaid.checked_on; if (!ck) continue;
      const age = daysBetween(isoDay(ck), X.today); if (age <= P.days) continue;
      out.push({ record: { type: 'client', id: c.id }, client: c.id, sev: 'y', at: atOf(ck, X.today), date: isoDay(ck), why: `Eligibility last checked ${fmtDate(isoDay(ck))} · ${age} days ago` });
    }
    return out;
  }
};

// conditions: (X, P, cand) -> boolean. A record with no request (a unit balance, a note) reads the patient's open request, or the authorization row.
const reqOf = (X, cand) => (cand.record.type === 'request' ? X.reqById.get(cand.record.id) : X.open.get(cand.client)) || null;
const CONDITIONS = {
  payer_is(X, P, cand) { const q = reqOf(X, cand); const c = X.clientById.get(cand.client); const id = q ? q.payer : c && c.authorization && c.authorization.payer; return !!id && (P.payers || []).includes(id); },
  service_is(X, P, cand) {
    if (P.service === 'any') return true;
    const q = reqOf(X, cand); const c = X.clientById.get(cand.client);
    const ug = q ? /H2016-UG/.test(q.service || '') || /after-school/i.test(q.service || '') : !!(c && c.authorization && /after/.test(c.authorization.service || ''));
    const known = !!q || !!(c && c.authorization && c.authorization.service) || !!(c && c.authorization);
    return P.service === 'H2016-UG' ? ug : known && !ug;
  },
  units_left(X, P, cand) { const c = X.clientById.get(cand.client); const a = c && c.authorization; if (!a || !(a.units > 0) || a.used == null) return false; return Math.round(100 * Math.max(0, a.units - a.used) / a.units) <= P.pct; },
  evidence_missing(X, P, cand) { return X.gaps(cand.client).length > 0; },
  partial_award(X, P, cand) { const q = reqOf(X, cand); return !!q && q.stage === 'partial_decide'; },
  owner_role(X, P, cand) {
    const q = reqOf(X, cand); let id = null;
    if (q) id = ownerOf(X.s, q).id; else { const c = X.clientById.get(cand.client); id = c && c.staff; }
    const st = M.byId(X.s.staff, id); return !!st && (P.roles || []).includes(st.role);
  }
};

const fill = (text, X, cand) => String(text || '').replace(TEMPLATE_RE, (m, k) => {
  const key = k.toLowerCase(); const q = reqOf(X, cand); const c = X.clientById.get(cand.client);
  if (key === 'patient') return label(X, cand.client);
  if (key === 'payer') return payerName(X, q ? q.payer : c && c.authorization && c.authorization.payer) || 'the payer';
  if (key === 'date') return fmtDate(isoDay(cand.date || X.today));
  return m;
});

function walk(X, wf, trig, cand, graph) {
  const effects = []; const path = []; const pathSet = new Set(); let stopped = null;
  const emitted = new Set();
  const visit = (id, ctx, onPath) => {
    if (onPath.has(id)) return; const node = graph.nodes.get(id); const b = node && BLOCKS[node.block]; if (!b) return;
    const here = new Set(onPath).add(id); if (!pathSet.has(id)) { pathSet.add(id); path.push(id); }
    const P = effectiveParams(X.s, node); const rulesSoFar = new Set([...ctx.ruleNodes, id]);
    const next = (port, c2) => { for (const to of graph.out.get(id + '|' + port) || []) visit(to, c2, here); };
    const base = { ...ctx, ruleNodes: rulesSoFar };
    switch (b.kind) {
      case 'trigger': next('out', base); break;
      case 'condition': { const ok = !!CONDITIONS[node.block](X, P, cand); next(ok ? 'yes' : 'no', base); break; }
      case 'guardrail': {
        if (node.block === 'roles_only') next('out', { ...base, roles: base.roles ? base.roles.filter(r => (P.roles || []).includes(r)) : (P.roles || []).slice() });
        else if (node.block === 'person_confirms') next('out', { ...base, confirm: [...base.confirm, { node: id, roles: (P.roles || []).slice() }] });
        else if (node.block === 'max_per_day') next('out', { ...base, limits: [...base.limits, { node: id, n: P.n }] });
        else if (node.block === 'source_required') {
          let why = null;
          for (const nid of rulesSoFar) for (const key of ruleKeysOf(graph.nodes.get(nid))) { const r = rule(X.s, key); if (r.missing || r.category === 'UNVERIFIED-DEMO-ASSUMPTION') { why = why || `The rule "${r.label || key}" has no verified source (${r.missing ? 'not in the rules table' : 'unverified demo assumption'}).`; } }
          if (why) { stopped = stopped || { node: id, why }; } else next('out', base);
        } else if (node.block === 'evidence_required') {
          if (X.gaps(cand.client).length) stopped = stopped || { node: id, why: 'The stored evidence for this patient has gaps.' };
          else next('out', base);
        } else next('out', base);   // two_person: about changes to the workflow, nothing at run time
        break;
      }
      case 'action': {
        const mine = (P.roles || []).filter(r => ROLE_IDS.includes(r)); const roles = base.roles ? mine.filter(r => base.roles.includes(r)) : mine;
        if (!roles.length) { stopped = stopped || { node: id, why: mine.length ? 'No role named in the guardrail receives this.' : 'No role is chosen to receive this.' }; next('out', base); break; }
        const key = id + '|' + roles.join(',');
        if (!emitted.has(key)) {
          emitted.add(key);
          const msg = node.block === 'suggest_flag' ? `${label(X, cand.client)} · ${payerName(X, (reqOf(X, cand) || {}).payer) || 'no payer'}: consider flagging (${FLAG_WORD[P.reason] || 'Marked for attention'})` : fill(String(P.message || '').trim() || BLOCKS[node.block].params.message.default, X, cand);
          effects.push({ node: id, action: node.block, roles, text: msg, sev: cand.sev, confirm: base.confirm.map(c => ({ node: c.node, roles: c.roles.slice() })), limit: base.limits.length ? base.limits[base.limits.length - 1] : null, ...(node.block === 'suggest_flag' ? { reason: P.reason } : {}) });
        }
        next('out', base); break;
      }
      default: break;
    }
  };
  visit(trig.id, { roles: null, confirm: [], limits: [], ruleNodes: [] }, new Set());
  return { effects, path, stopped };
}

function graphOf(wf) {
  const nodes = new Map((wf.nodes || []).filter(n => n && n.id).map(n => [n.id, n])); const out = new Map();
  for (const e of wf.edges || []) { if (!e || !nodes.has(e.from) || !nodes.has(e.to)) continue; const k = e.from + '|' + e.port; if (!out.has(k)) out.set(k, []); out.get(k).push(e.to); }
  return { nodes, out };
}
const inScope = (X, actor, clientId) => {
  if (!actor) return true; if (!STAFF_ROLES.includes(actor.role)) return false;
  const c = X.clientById.get(clientId); if (!c) return false;
  return actor.role === 'direct_support' ? c.staff === actor.id : true;
};

export function run(s, wf, opts = {}) {
  const none = { matches: [], counts: { candidates: 0, matched: 0, stopped: 0, effects: 0, limited: 0 } };
  if (!s || !isObj(wf) || !Array.isArray(wf.nodes)) return none;
  const X = context(s, opts.today); const actor = opts.actor || null; const graph = graphOf(wf);
  const matches = []; let candidates = 0;
  for (const trig of wf.nodes) {
    const b = trig && BLOCKS[trig.block]; if (!b || b.kind !== 'trigger') continue;
    const cands = (TRIGGERS[trig.block](X, effectiveParams(X.s, trig)) || []).sort((a, c) => stable(a.record.id, c.record.id));
    for (const cand of cands) {
      if (!inScope(X, actor, cand.client)) continue;
      candidates++;
      const w = walk(X, wf, trig, cand, graph);
      const effects = actor ? w.effects.filter(e => e.roles.includes(actor.role)) : w.effects;
      if (!effects.length && !w.stopped) continue;
      matches.push({ record: cand.record, client: cand.client, label: label(X, cand.client), path: w.path, effects, stopped: w.stopped, _cand: cand });
    }
  }
  // alert limit: per role, the first n effects of a limiting guardrail stay (most urgent first, then by record), the rest are counted and marked
  const groups = new Map();
  for (const m of matches) for (const e of m.effects) if (e.limit) for (const r of (actor ? [actor.role] : e.roles)) { const k = e.limit.node + '|' + r; if (!groups.has(k)) groups.set(k, []); groups.get(k).push({ m, e, n: e.limit.n }); }
  const sevN = { r: 0, y: 1, n: 2 };
  for (const list of groups.values()) {
    list.sort((a, c) => (sevN[a.e.sev] - sevN[c.e.sev]) || stable(a.m.record.id, c.m.record.id) || stable(a.e.node, c.e.node));
    list.forEach((x, i) => { if (i >= x.n) x.e.limited = true; });
  }
  let effectsN = 0, limited = 0, stoppedN = 0, matched = 0;
  for (const m of matches) { effectsN += m.effects.length; limited += m.effects.filter(e => e.limited).length; if (m.stopped) stoppedN++; if (m.effects.length) matched++; }
  return { matches: matches.map(({ _cand, ...m }) => ({ ...m, why: _cand.why, sev: _cand.sev, at: _cand.at, date: _cand.date })), counts: { candidates, matched, stopped: stoppedN, effects: effectsN, limited } };
}

// ---------------------------------------------------------------------------------------------------------------- the bell
const WORD = { notify: 'Notice', add_task: 'Task', suggest_flag: 'Suggested flag' };
function toFor(X, actor, m) {
  const canAuth = can(actor, 'authorizations'), canDI = can(actor, 'denials');
  const q = m.record.type === 'request' ? X.reqById.get(m.record.id) : null;
  if (q && canAuth) return DI_STAGES.includes(q.stage) && canDI ? `DenialCase.dc.html?id=${q.id}` : `Authorization.dc.html?id=${q.id}`;
  if (m.record.type === 'client') { const o = X.open.get(m.client); if (o && canAuth) return `Authorization.dc.html?id=${o.id}`; return `Patient?id=${m.client}&section=authorization`; }
  if (m.record.type === 'note') return `Patient?id=${m.client}&section=documentation`;
  return `Patient?id=${m.client}&section=authorization`;
}
// workflowItems(s, actor): the enabled workflows' effects for this person's role. Ids are 'wf:<workflow>:<record>:<node>' so a new situation on the
// same record is a new item. Direct support only gets items about their own patients; portal actors get none; nothing leaves the bell.
export function workflowItems(s, actor) {
  if (!s || !actor || !STAFF_ROLES.includes(actor.role)) return [];
  const out = new Map(); const X = context(s);
  for (const wf of Array.isArray(s.workflows) ? s.workflows : []) {
    if (!wf || !wf.enabled || !Array.isArray(wf.nodes)) continue;
    const res = run(s, wf, { actor });
    for (const m of res.matches) {
      for (const e of m.effects) {
        if (e.limited) continue;
        const id = `wf:${wf.id}:${m.record.id}:${e.node}`; if (out.has(id)) continue;
        const confirm = e.confirm.some(c => c.roles.includes(actor.role));
        out.set(id, { id, at: m.at, kind: 'workflow', sev: e.sev, title: e.text, sub: `${WORD[e.action] || 'Notice'} · ${m.why}`, record: m.record.type === 'request' ? m.record.id : m.client, to: toFor(X, actor, m), group: 'Workflows', source: { workflow: wf.id, name: wf.name || '', node: e.node, action: e.action }, needsConfirm: confirm });
      }
    }
  }
  return [...out.values()];
}
