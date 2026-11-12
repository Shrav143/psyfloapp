// Documentation · Chart review (screen 27). Approval is only for staff on 100% review (staff.review_mode 'every_note': new hires and
// anyone on review). Their notes land here with review 'pending' (seeded, or live via note.processed); everyone else is Sampled and
// goes straight through. One row per note; Review opens a right-hand drawer with what the staffer wrote next to what Psyflo added,
// and the three actions: Approve, Return with note, That didn't happen (all call note.review). Nothing here changes Lauris.
import { register, Screen, M, raw, esc, modal, toast, helpIcon } from '../app.js';
import { CHECKS } from '../shared/draft.js';
import { VIEWS, METRIC, FILTER, HELP, PAGE_TITLE, PART } from '../shared/labels.js';

// ---------- pure selectors (shared with the note timeliness view) ----------
export const textOf = x => x == null ? '' : typeof x === 'string' ? x : (x.narrative || x.text || x.value || '');
const plain = t => textOf(t).replace(/\[\[|\]\]/g, '');
const SHORT_LEVEL = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4 };

// Sentences a staffer reuses across notes (drafting rule 13). Initials are normalised so
// "Redirected J.T. …" and "Redirected D.P. …" count as the same paragraph.
const norm = s => s.replace(/\b[A-Z]\.[A-Z]\.?/g, 'X').toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
function sentences(t) { return plain(t).replace(/\b([A-Z])\.([A-Z])\./g, '$1§$2§').split(/(?<=[.!?])\s+/).map(x => x.replace(/§/g, '.').trim()).filter(x => x.split(/\s+/).length >= 7); }
export function repeatedParagraphs(s, staffId) {
  const notes = s.notes.filter(n => n.staff === staffId && textOf(n.dictation)).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 30);
  const seen = new Map();
  for (const n of notes) for (const sen of new Set(sentences(n.dictation))) {
    const k = norm(sen); if (!seen.has(k)) seen.set(k, { sample: sen, notes: [] });
    const e = seen.get(k); if (!e.notes.includes(n)) e.notes.push(n);
  }
  let best = null;
  for (const e of seen.values()) if (e.notes.length >= 2 && (!best || e.notes.length > best.notes.length)) best = e;
  if (!best) return null;
  const st = M.staff(s, staffId);
  return { staff: staffId, who: M.staffShort(s, staffId), name: st.name, count: best.notes.length, of: notes.length, sample: best.sample, ids: best.notes.map(n => n.id),
    dates: [...new Set(best.notes.map(n => n.date))].sort().map(d => M.fmtDate(d)).join(', ') };
}

// Whose notes a viewer reviews: supervisors see the staff routed to them; clinicians and admin see all.
// Only notes captured while the staffer was on 100% review are 'pending' (note.processed sets it from review_mode).
export function pendingFor(s, me) {
  const lvl = SHORT_LEVEL[me?.role] || 0;
  const mine = n => { const st = M.byId(s.staff, n.staff); return lvl >= 3 || (st && st.reviewer === me?.id); };
  const order = s.staff.map(x => x.id);
  return s.notes.filter(n => n.review === 'pending' && mine(n))
    .map((n, i) => ({ n, i }))
    .sort((a, b) => (order.indexOf(a.n.staff) - order.indexOf(b.n.staff)) || (b.n.date || '').localeCompare(a.n.date || '') || a.i - b.i)
    .map(x => x.n);
}

// Direct support staff a viewer manages: a supervisor's sites plus anyone routed to them; clinician/admin: all.
export function managedStaff(s, me) {
  const ds = s.staff.filter(x => x.role === 'direct_support');
  if (!me || me.sites === 'all' || (SHORT_LEVEL[me.role] || 0) >= 3) return ds;
  const sites = [].concat(me.sites || []);
  return ds.filter(x => x.reviewer === me.id || [].concat(x.sites || []).some(z => sites.includes(z)));
}
// "All sites" dropdown: the sites the given staff work at
export function siteOptions(s, staff) {
  const ids = [...new Set(staff.flatMap(x => [].concat(x.sites || [])))];
  const short = id => M.school(s, id).name.replace(' County · ', ' ').replace(' City · ', ' ');
  return [{ id: 'all', name: FILTER.site }, ...ids.map(id => ({ id, name: short(id) }))];
}

// Mark what the enhancer added: seeded notes carry [[…]] marks; live ones are diffed word by word.
const STOP = new Set('a an the and or of to in on at for with by he she they his her him was is it that this when after before then as from into'.split(' '));
const stem = w => w.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(ing|ed|es|s)$/, '');
function markAdded(enh, wrote) {
  const t = textOf(enh);
  if (/\[\[/.test(t)) return esc(t).replace(/\[\[([\s\S]*?)\]\]/g, '<mark class="b3-add">$1</mark>');
  const have = new Set(textOf(wrote).split(/\s+/).map(stem).filter(Boolean));
  const toks = t.split(/(\s+)/);
  const isNew = w => { const k = stem(w); return k && !have.has(k) && !STOP.has(k); };
  let out = '', run = [];
  const flush = () => { if (!run.length) return; let tail = ''; while (run.length && /^\s+$/.test(run[run.length - 1])) tail = run.pop() + tail; out += `<mark class="b3-add">${esc(run.join(''))}</mark>` + tail; run = []; };
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i];
    if (/^\s+$/.test(w)) { if (run.length) run.push(w); else out += w; continue; }
    if (isNew(w)) run.push(w);
    else if (run.length && STOP.has(stem(w)) && toks[i + 2] && isNew(toks[i + 2])) run.push(w);
    else { flush(); out += esc(w); }
  }
  flush();
  return out;
}

// the five documentation checks that run on a note
function noteChecks(s, n, repeat) {
  const text = plain(n.enhanced) || textOf(n.dictation);
  const ivs = (n.interventions || n.fields?.interventions || []).map(c => (s.interventions.find(i => i.code === c) || { name: c }).name).join(' ');
  const goal = CHECKS.objective(text).pass || !!(n.objective || n.fields?.objective);
  const iv = CHECKS.interventionsFromList(text + ' ' + ivs, s.interventions).pass;
  const time = !!(n.units || n.direct_time_min || n.contact_time?.length || n.fields?.units) || /\d+\s?(min|minutes|h)\b/.test(text);
  const obs = CHECKS.noObserved(text).pass;
  const varied = !(repeat && repeat.ids.includes(n.id) && !plain(n.enhanced));
  return [[goal, 'goal named'], [iv, 'intervention on the list'], [time, 'time present'], [obs, 'no "observed"'], [varied, 'differs from recent notes']].map(([ok, label]) => ({ ok, label }));
}

register('ReviewQueue', class extends Screen {
  init() {
    this.state = { sel: this.params.id || null, site: 'all' };
    // Escape closes the drawer (a modal opened from it closes first, through the shell)
    if (window.__b3Esc) window.removeEventListener('keydown', window.__b3Esc, true);
    window.__b3Esc = e => {
      if (e.key !== 'Escape' || window.psyflo?.current?.inst !== this || !this.state.sel) return;
      const m = document.getElementById('modal'); if (m && !m.hidden) return;
      this.setState({ sel: null });
    };
    window.addEventListener('keydown', window.__b3Esc, true);
  }
  queue() {
    const site = this.state.site;
    return pendingFor(this.s, this.me).filter(n => site === 'all' || [].concat(M.staff(this.s, n.staff).sites || []).includes(site));
  }
  renderVals() {
    const s = this.s, q = this.queue(); const all = pendingFor(s, this.me);
    const cur = this.state.sel ? all.find(n => n.id === this.state.sel) || null : null;
    const staff = managedStaff(s, this.me); const sites = siteOptions(s, staff);
    const rows = q.map(n => {
      const type = (n.type || 'daily') === 'daily' ? '' : n.type.replace(/_/g, ' ') + ' · ';
      const units = n.units || n.fields?.units;
      return { id: n.id, date: M.fmtDate(n.date), who: M.clientLabel(s, n.client), staff: M.staffShort(s, n.staff), what: `${type}${units ? units + ' unit' + (+units === 1 ? '' : 's') : ''}`.replace(/ · $/, ''), open: () => this.setState({ sel: n.id }) };
    });
    let c = null;
    if (cur) {
      const st = M.staff(s, cur.staff);
      const repeat = repeatedParagraphs(s, cur.staff);
      const checks = noteChecks(s, cur, repeat); const passed = checks.filter(x => x.ok).length;
      const obj = cur.objective || cur.fields?.objective || (plain(cur.enhanced).match(/\b(?:Objective|Goal)\s*(\d)/i) || [])[1];
      const ivNames = (cur.interventions || cur.fields?.interventions || []).map(code => {
        const iv = s.interventions.find(i => i.code === code); const nm = iv ? iv.name : code;
        return /^Movement intervention$/.test(nm) ? 'Movement' : nm;
      });
      const units = cur.units || cur.fields?.units; const mins = cur.direct_time_min || cur.fields?.direct_time_min;
      c = {
        heading: `${M.clientLabel(s, cur.client)} · ${M.fmtDate(cur.date)}`,
        staffLine: [M.staffShort(s, cur.staff), (cur.type || 'daily') === 'daily' ? '' : cur.type.replace(/_/g, ' ')].filter(Boolean).join(' · '),
        units: units ? `${units} unit${+units === 1 ? '' : 's'}${mins ? ` · ${Math.floor(mins / 60)} h ${mins % 60} min` : ''}` : '',
        goal: obj ? 'Goal ' + obj : 'No goal named', goalChip: obj ? 'info' : 'late',
        iv: [...new Set(ivNames)].join(', '),
        same: repeat && repeat.ids.includes(cur.id) ? `Same words in ${repeat.count} notes` : '',
        wroteLabel: `${M.staffShort(s, cur.staff)} ${/^dict/.test(cur.source || '') ? 'said' : 'wrote'}`,
        wrote: textOf(cur.dictation) || 'Written in Lauris directly',
        enhanced: plain(cur.enhanced) ? raw(markAdded(cur.enhanced, cur.dictation)) : raw('<span class="u-mut">Not enhanced</span>'),
        checksText: `${passed} of ${checks.length} ✓`, checksChip: passed === checks.length ? 'ok' : 'watch',
        failed: checks.filter(x => !x.ok).map(x => x.label + ' ✗'),
        help: raw(helpIcon(HELP.checks, PART.docChecks)), docChecks: PART.docChecks
      };
    }
    return {
      title: PAGE_TITLE.StaffDashboard, today: M.fmtDate(s.today, { dow: true }).replace(/^(\w+) /, '$1, '),
      viewNote: VIEWS.documentation.compliance, viewReview: VIEWS.documentation.review,
      sites: sites.map(o => ({ ...o, sel: o.id === this.state.site ? 'selected' : '' })), pickSite: e => this.setState({ site: e.target.value, sel: null }),
      rows, empty: !rows.length, cur: c, close: () => this.setState({ sel: null }),
      approve: () => this.decide('approved'),
      ret: () => this.ask('Return with note', 'returned', 'Return'),
      madeup: () => this.ask("That didn't happen", 'flagged', 'Flag note'),
      emptyText: 'Nothing to review'
    };
  }
  async decide(decision, comment) {
    const cur = this.s.notes.find(n => n.id === this.state.sel); if (!cur) return;
    const label = `${M.clientLabel(this.s, cur.client)} · ${M.fmtDate(cur.date)}`;
    this.state.sel = null;
    await this.do('note.review', { id: cur.id, decision, comment, by: this.me?.id || 'cdiaz' });
    toast(`${label} · ${decision === 'approved' ? 'Approved' : decision === 'returned' ? 'Returned to ' + M.staffShort(this.s, cur.staff) : 'Flagged · ' + M.staffShort(this.s, cur.staff) + ' fixes it in Lauris'}`);
    this.repaint();
  }
  ask(title, decision, btn) {
    const cur = this.s.notes.find(n => n.id === this.state.sel); if (!cur) return;
    modal(`<h2>${esc(title)}</h2>
      <label for="rq-c" style="display:block;font-size:13px;font-weight:600;margin:8px 0 5px">Note to ${esc(M.staffShort(this.s, cur.staff))}</label>
      <textarea id="rq-c" rows="4" class="u-in" style="width:100%;padding:10px 12px;line-height:20px"></textarea>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-ok>${esc(btn)}</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => {
        const ta = box.querySelector('#rq-c'); ta.focus();
        box.querySelector('[data-ok]').onclick = async () => { const v = ta.value.trim(); if (!v) { ta.style.borderColor = 'var(--late-fg)'; ta.placeholder = 'What should change?'; return; } close(); await this.decide(decision, v); };
      });
  }
  // keyboard: the drawer takes focus when it opens and the row's Review button gets it back when it closes
  after(root) {
    const d = root.querySelector('.u-drawer');
    if (d) { if (!d.contains(document.activeElement)) d.focus({ preventScroll: true }); this._opener = this.state.sel; }
    else if (this._opener) { const b = root.querySelector(`[data-note="${this._opener}"]`); this._opener = null; if (b) b.focus({ preventScroll: true }); }
  }
  get css() { return 'mark.b3-add{background:var(--teal-tint);color:inherit;border-radius:3px;padding:0 1px}.u-drawer:focus{outline:none}.b3-click{cursor:pointer}.b3-click:hover{background:#FBFAF7}'; }
});
