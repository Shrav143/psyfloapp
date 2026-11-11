// 27 · Supervisor review queue (Live). Supervisor approval is only for staff flagged to need it
// (staff.review_mode 'every_note': new hires and anyone on review). Their notes land here with review
// 'pending' (seeded, or live via note.processed); everyone else is spot check and goes straight through.
// Approve / Return with a note / That didn't happen call note.review. "Who needs approval" turns approval
// on or off per staffer (staff.reviewMode, server/psyflo/actions/x-staff-review.js). Shows what the
// staffer wrote next to what Psyflo added, and the rule-13 pattern.
import { register, Screen, M, raw, esc, modal, toast } from '../app.js';
import { CHECKS } from '../shared/draft.js';

// ---------- pure selectors (shared with the staff dashboard) ----------
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
// Only notes captured while the staffer was on approval are 'pending' (note.processed sets it from
// review_mode), so the queue holds approval-required notes only.
export function pendingFor(s, me) {
  const lvl = SHORT_LEVEL[me?.role] || 0;
  const mine = n => { const st = M.byId(s.staff, n.staff); return lvl >= 3 || (st && st.reviewer === me?.id); };
  const order = s.staff.map(x => x.id);
  return s.notes.filter(n => n.review === 'pending' && mine(n))
    .map((n, i) => ({ n, i }))
    .sort((a, b) => (order.indexOf(a.n.staff) - order.indexOf(b.n.staff)) || (b.n.date || '').localeCompare(a.n.date || '') || a.i - b.i)
    .map(x => x.n);
}

// Mark what the enhancer added: seeded notes carry [[…]] marks; live ones are diffed word by word.
const STOP = new Set('a an the and or of to in on at for with by he she they his her him was is it that this when after before then as from into'.split(' '));
const stem = w => w.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(ing|ed|es|s)$/, '');
function markAdded(enh, wrote) {
  const t = textOf(enh);
  if (/\[\[/.test(t)) return esc(t).replace(/\[\[([\s\S]*?)\]\]/g, '<span style="background:#DDF1EF">$1</span>');
  const have = new Set(textOf(wrote).split(/\s+/).map(stem).filter(Boolean));
  const toks = t.split(/(\s+)/);
  const isNew = w => { const k = stem(w); return k && !have.has(k) && !STOP.has(k); };
  let out = '', run = [];
  const flush = () => { if (!run.length) return; let tail = ''; while (run.length && /^\s+$/.test(run[run.length - 1])) tail = run.pop() + tail; out += `<span style="background:#DDF1EF">${esc(run.join(''))}</span>` + tail; run = []; };
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

function noteChecks(s, n, repeat) {
  const text = plain(n.enhanced) || textOf(n.dictation);
  const ivs = (n.interventions || n.fields?.interventions || []).map(c => (s.interventions.find(i => i.code === c) || { name: c }).name).join(' ');
  const goal = CHECKS.objective(text).pass || !!(n.objective || n.fields?.objective);
  const iv = CHECKS.interventionsFromList(text + ' ' + ivs, s.interventions).pass;
  const time = !!(n.units || n.direct_time_min || n.contact_time?.length || n.fields?.units) || /\d+\s?(min|minutes|h)\b/.test(text);
  const obs = CHECKS.noObserved(text).pass;
  const varied = !(repeat && repeat.ids.includes(n.id) && !plain(n.enhanced));
  const item = (ok, label) => ok ? esc(label) : `<span class="chip r">${esc(label)} ✗</span>`;
  return raw([item(goal, 'goal named'), item(iv, 'intervention on the ISP list'), item(time, 'time present'), item(obs, 'no "observed"'), item(varied, 'differs from the last 30 notes (Harvest\'s export)')].join(' · '));
}

// Direct support staff a viewer manages: a supervisor's sites plus anyone routed to them; clinician/admin: all.
export function managedStaff(s, me) {
  const ds = s.staff.filter(x => x.role === 'direct_support');
  if (!me || me.sites === 'all' || (SHORT_LEVEL[me.role] || 0) >= 3) return ds;
  const sites = [].concat(me.sites || []);
  return ds.filter(x => x.reviewer === me.id || [].concat(x.sites || []).some(z => sites.includes(z)));
}
export const approvalLabel = st => st.review_mode === 'every_note'
  ? 'Approval required · ' + (st.review_reason || (st.credential === 'QMHP-T' ? 'new hire' : 'on review'))
  : 'Spot check · no approval';

register('ReviewQueue', class extends Screen {
  init() { this.state = { sel: this.params.id || null, all: false }; }
  approvals() {
    const s = this.s;
    return managedStaff(s, this.me).map(st => {
      const on = st.review_mode === 'every_note';
      const pend = s.notes.filter(n => n.staff === st.id && n.review === 'pending').length;
      const kids = s.clients.filter(c => c.staff === st.id && c.stage !== 'discharged').length;
      return {
        name: M.staffShort(s, st.id), sub: [st.credential, kids ? kids + ' student' + (kids === 1 ? '' : 's') : ''].filter(Boolean).join(' · '),
        chip: on ? 'chip y' : 'chip n', label: approvalLabel(st),
        note: on ? `every note approved by ${M.staffShort(s, st.reviewer || 'cdiaz')} before it goes to the EHR${pend ? ` · ${pend} waiting` : ''}` : (pend ? `${pend} captured while on approval still waiting` : 'notes go to the EHR at Process Form'),
        btn: on ? 'Turn approval off' : 'Require approval',
        toggle: () => on ? this.approvalOff(st) : this.approvalOn(st)
      };
    });
  }
  approvalOn(st) {
    const name = M.staffShort(this.s, st.id);
    modal(`<h2>Require approval · ${esc(name)}</h2><p style="margin:0 0 8px">From now on every note ${esc(name)} processes waits here for your approval before it goes to the EHR.</p>
      <label for="ap-r" style="display:block;font-size:13px;font-weight:600;margin-bottom:5px">Why</label>
      <select id="ap-r" style="width:100%;min-height:40px;border:1px solid #C9CDD3;border-radius:8px;padding:0 10px;font:inherit;font-size:14px"><option value="on review">On review (probation)</option><option value="new hire">New hire</option><option value="returning from leave">Returning from leave</option></select>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-ok>Require approval</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => {
        box.querySelector('[data-ok]').onclick = async () => {
          const reason = box.querySelector('#ap-r').value; close();
          await this.do('staff.reviewMode', { id: st.id, mode: 'every_note', reason, by: this.me?.id || 'cdiaz' });
          toast(`${name} · approval required (${reason}); new notes come to this queue`);
        };
      });
  }
  approvalOff(st) {
    const name = M.staffShort(this.s, st.id);
    const pend = this.s.notes.filter(n => n.staff === st.id && n.review === 'pending').length;
    modal(`<h2>Turn approval off · ${esc(name)}</h2><p style="margin:0 0 8px">${esc(name)} goes back to spot check: new notes go to the EHR at Process Form without waiting for you.${pend ? ` The ${pend} note${pend === 1 ? '' : 's'} already waiting stay${pend === 1 ? 's' : ''} here until you decide.` : ''}</p>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-ok>Turn approval off</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => {
        box.querySelector('[data-ok]').onclick = async () => {
          close();
          await this.do('staff.reviewMode', { id: st.id, mode: 'spot_check', by: this.me?.id || 'cdiaz' });
          toast(`${name} · back to spot check; no approval needed`);
        };
      });
  }
  queue() { return pendingFor(this.s, this.me); }
  current(q = this.queue()) { return q.find(n => n.id === this.state.sel) || q[0] || null; }
  renderVals() {
    const s = this.s, q = this.queue(), cur = this.current(q);
    const shown = this.state.all ? q : q.slice(0, 4);
    if (cur && !shown.includes(cur)) shown.push(cur);
    const items = shown.map((n, i) => {
      const on = cur && n.id === cur.id;
      const style = 'display:block;padding:10px 16px;text-decoration:none;color:#151B24' + (i ? ';border-top:1px solid #EFEBE4' : '') + (on ? ';background:#F2F9F8;border-left:3px solid #217A78' : '');
      const enh = !!plain(n.enhanced);
      return { href: '#n' + (i + 1), style, title: `${M.clientLabel(s, n.client, false)} · ${M.fmtDate(n.date)}`, sub: `${M.staffShort(s, n.staff)} · ${n.units || n.fields?.units || '?'} unit${(n.units || 0) === 1 ? '' : 's'}${n.type && n.type !== 'daily' ? ' · ' + n.type.replace(/_/g, ' ') : ''} · `, notEnhanced: !enh, enhancedTxt: enh };
    });
    this._shown = shown;
    let c = null, pattern = null;
    if (cur) {
      const st = M.staff(s, cur.staff);
      const repeat = repeatedParagraphs(s, cur.staff);
      if (repeat && repeat.count >= 2) pattern = repeat;
      const obj = cur.objective || cur.fields?.objective || (plain(cur.enhanced).match(/\b(?:Objective|Goal)\s*(\d)/i) || [])[1];
      const ivNames = (cur.interventions || cur.fields?.interventions || []).map(code => {
        const iv = s.interventions.find(i => i.code === code); const nm = iv ? iv.name : code;
        return /^Movement intervention$/.test(nm) ? 'Movement' : nm;
      });
      const mins = cur.direct_time_min || cur.fields?.direct_time_min;
      const evs = s.events.filter(e => e.record === cur.client && e.who === cur.staff && (e.at || '').slice(0, 10) === cur.date).map(e => `${M.fmtTime(e.at)} ${e.what}`);
      c = {
        staffLine: [M.staffShort(s, cur.staff), st.credential].filter(Boolean).join(' · '),
        heading: `${M.clientLabel(s, cur.client, false)} · ${(cur.type || 'daily').replace(/_/g, ' ').replace('daily', 'daily note')} · ${M.fmtDate(cur.date)}`,
        goalChip: obj || ivNames.length ? [obj ? 'Goal ' + obj : 'No goal named', [...new Set(ivNames)].join(', ')].filter(Boolean).join(' · ') : 'No goal named',
        timeChip: `${cur.units || cur.fields?.units || '?'} units` + (mins ? ` · ${Math.floor(mins / 60)} h ${mins % 60} m tracked` : cur.processed_at ? ' · processed ' + M.fmtDateTime(cur.processed_at) : ''),
        wroteLabel: `${M.staffShort(s, cur.staff)} ${/^dict/.test(cur.source || '') ? 'said' : 'wrote'}`,
        wrote: textOf(cur.dictation) || '(nothing typed or dictated: the note was written in Lauris directly)',
        enhanced: plain(cur.enhanced) ? raw(markAdded(cur.enhanced, cur.dictation)) : raw('<span style="color:#525B66">Not enhanced. The staffer typed it straight into Lauris without dictating it first, so there is nothing added to check; the checks below run on what they wrote.</span>'),
        checks: noteChecks(s, cur, repeat),
        trail: [`Processed in Lauris ${cur.processed_at ? M.fmtDateTime(cur.processed_at) : M.fmtDate(cur.date)}`, st.review_mode === 'every_note' ? `${approvalLabel(st).toLowerCase()} · every note routed to ${M.staffShort(s, st.reviewer || 'cdiaz')}` : 'captured while on approval; now spot check', ...evs].join(' · ')
      };
    }
    const done = s.notes.filter(n => n.reviewed_at && n.reviewed_at.slice(0, 10) === s.today && n.review !== 'pending').slice(-6).reverse().map(n => ({
      title: `${M.clientLabel(s, n.client, false)} · ${M.fmtDate(n.date)}`, staff: M.staffShort(s, n.staff),
      chip: 'chip ' + ({ approved: 'g', returned: 'y', flagged: 'r' }[n.review] || 'n'),
      label: { approved: 'approved', returned: 'returned with a note', flagged: "flagged: that didn't happen" }[n.review] || n.review,
      comment: n.review_comment ? ` · "${n.review_comment}"` : ''
    }));
    return {
      today: M.fmtDate(s.today, { dow: true }).replace(/^(\w+) /, '$1, '),
      waitingText: q.length + ' waiting', waitingChip: q.length ? 'chip y' : 'chip g',
      items, cur: c, pattern,
      more: !this.state.all && q.length > shown.length ? `${q.length - shown.length} more` : '',
      showAll: () => this.setState({ all: true }),
      empty: !q.length, emptyWhy: 'Notes from staff who need approval appear here when they press Process Form in Lauris.',
      ...(() => {
        const ap = this.approvals(); const on = ap.filter(a => a.chip === 'chip y');
        return { approvals: ap, noApprovals: !ap.length,
          approvalCount: `${on.length} of ${ap.length} on approval${on.length ? ' · ' + on.map(a => a.name).join(', ') : ''}`,
          approvalWhy: 'Approval is only for staff flagged to need it: new hires and anyone on review. Their notes wait here before they go to the EHR. Everyone else is spot check: their notes go through at Process Form.' };
      })(),
      done: done.length ? done : null
    };
  }
  async decide(decision, comment) {
    const cur = this.current(); if (!cur) return;
    const label = M.clientLabel(this.s, cur.client, false);
    await this.do('note.review', { id: cur.id, decision, comment, by: this.me?.id || 'cdiaz' });
    this.state.sel = null;
    toast(`${label} · ${M.fmtDate(cur.date)}: ${decision === 'approved' ? 'approved' : decision === 'returned' ? 'returned to ' + M.staffShort(this.s, cur.staff) + ' with your note' : 'flagged · the staffer is asked to fix it in Lauris'}`);
    this.repaint();
  }
  ask(title, hint, decision, btn) {
    const cur = this.current(); if (!cur) return;
    modal(`<h2>${esc(title)}</h2><p style="margin:0 0 8px">${esc(hint)}</p>
      <label for="rq-c" style="display:block;font-size:13px;font-weight:600;margin-bottom:5px">Note to ${esc(M.staffShort(this.s, cur.staff))}</label>
      <textarea id="rq-c" rows="4" style="width:100%;border:1px solid #C9CDD3;border-radius:8px;padding:10px 12px;font:inherit;font-size:14px"></textarea>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-ok>${esc(btn)}</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => {
        const ta = box.querySelector('#rq-c'); ta.focus();
        box.querySelector('[data-ok]').onclick = async () => { const v = ta.value.trim(); if (!v) { ta.style.borderColor = '#8A2E1C'; ta.placeholder = 'Say what to change'; return; } close(); await this.decide(decision, v); };
      });
  }
  get anchors() {
    const a = {
      approve: () => this.decide('approved'),
      return: () => this.ask('Return with a note', 'The note goes back to the staffer with your comment; they fix it in Lauris and it comes back here.', 'returned', 'Return the note'),
      madeup: () => this.ask("That didn't happen", 'Say which part did not happen. The note goes back to the staffer to fix in Lauris, and the flag stays on the note\'s audit trail.', 'flagged', 'Flag the note')
    };
    for (let i = 1; i <= 60; i++) a['n' + i] = () => { const n = (this._shown || [])[i - 1]; if (n) this.setState({ sel: n.id }); };
    return a;
  }
  set anchors(v) { }
});
