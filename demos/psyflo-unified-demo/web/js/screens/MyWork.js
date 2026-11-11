// My Work (route MyWork, ?section=todo|review|team|day|referrals). One role-filtered home: what needs this person, and nothing else.
//   direct support  My day                          supervisor  Review · Team · To do
//   clinician       To do · Review · Team · Referrals   admin  Operations · Team (status, units, deadlines; no clinical text)
// Everything is computed by web/js/shared/sel/mywork.js from stored records and the clock service. The actor is the signed-in session:
// with nobody signed in the screen shows a sign-in notice (it never falls back to a default person).
// Old routes DoNext, ReviewQueue and StaffDashboard redirect here (flags in shared/redirects-live.js; ?legacy=1 opens the old screens).
import { register, Screen, M, raw, ui, esc, session, hrefFor, canOpen } from '../app.js';
import { BY_ID, resolveRoute } from '../registry.js';
import { ROLE_LABEL, can } from '../shared/permissions.js';
import { rule } from '../shared/rules.js';
import { today as clockToday, now as clockNow } from '../shared/clock.js';
import { sectionsFor, resolveSection, worklist, dayView, teamView, reviewQueue, viewedStaff, tabCounts, canSeeDay, SECTION_LABEL } from '../shared/sel/mywork.js';
import { todoHtml, dayHtml, teamHtml, reviewHtml, reviewModel, tabsHtml, confirmAccess, withDate } from './MyWorkViews.js';

const idOf = to => String(to || '').replace(/^\.?\//, '').replace(/^#\/?/, '').split('?')[0].replace(/\.dc\.html$/, '');
const KNOWN = ['todo', 'review', 'team', 'day', 'referrals'];

register('MyWork', class extends Screen {
  init() { this.state = { all: false, week: false, waiting: false, dueAll: false, allNotes: false, sel: this.params.id || null, sort: null }; }
  get actor() { return session.actor; }

  // where a row's button goes: the route when it is registered and this role may open it, else the case view, else a stated reason
  resolve(it) {
    // the route a link really opens: the redirect table first (a live redirect may hand an old id to its new screen), then the permission table
    const ok = to => {
      if (!to) return null;
      const [, qs] = String(to).split('?'); const r = resolveRoute({ id: idOf(to), params: Object.fromEntries(new URLSearchParams(qs || '')) }, { role: this.actor && this.actor.role });
      const id = r.presenter ? idOf(to) : r.id;
      return BY_ID[id] && canOpen(id) ? hrefFor(to) : null;
    };
    const href = ok(it.to) || (it.record && /^R-\d+$/.test(it.record) ? ok('Authorizations.dc.html?id=' + it.record) : null);
    if (href) return { href };
    return { disabled: this.actor && this.actor.role === 'admin' ? 'Clinical content is hidden for your role' : 'Needs a clinician' };
  }
  // a reminder whose screen does not exist becomes a plain "Mark done"
  prep(items) { return items.map(it => it.reminder && !this.resolve(it).href ? { ...it, verb: 'Mark done', doneOnly: true } : it); }

  section() { return resolveSection(this.actor && this.actor.role, this.params.section); }

  renderVals() {
    const s = this.s, a = this.actor;
    const date = M.fmtDate(clockToday(s), { dow: true }) + ' · ' + M.fmtTime(clockNow(s));
    if (!a || !a.role) return { dateText: date, roleChip: raw(''), hiddenChip: raw(''), tabs: raw(''), body: raw(ui.emptyState({ tone: 'denied', title: 'Sign in to see your work', body: 'My Work is built for the signed-in role.', action: { label: 'Sign in', href: '#/Login' } })) };
    const role = a.role, list = sectionsFor(role), wanted = this.params.section;
    const sec = this.section();
    const blocked = !!wanted && KNOWN.includes(wanted) && !list.includes(wanted) && !(wanted === 'day' && list.includes('team')) && !(wanted === 'todo' && role === 'direct_support');
    const counts = tabCounts(s, a);
    const tabs = tabsHtml(role, blocked ? null : sec, counts, list.map(id => ({ id, href: '#/MyWork?section=' + id })));
    const hidden = !can(a, 'notes.view');
    const roleChip = ui.chip(ROLE_LABEL[role] || role, { tone: 'neutral', size: 'sm' });
    const hiddenChip = hidden ? ui.chip('Clinical text hidden for your role', { tone: 'neutral', icon: 'lock', size: 'sm' }) : '';
    const o = { role, resolve: it => this.resolve(it), rule24: rule(s, 'notes.daily_due_hours') };
    let body = '';
    if (blocked) {
      body = ui.emptyState({ tone: 'denied', title: `${SECTION_LABEL[wanted]} needs a different role`, body: role === 'admin' ? 'Clinical text hidden for your role. Operations and Team show status, units and deadlines.' : `${SECTION_LABEL[wanted]} is not part of the ${(ROLE_LABEL[role] || role).toLowerCase()} role.`, action: { label: 'Go to ' + SECTION_LABEL[sec], href: '#/MyWork?section=' + sec } });
    } else if (sec === 'todo' || sec === 'referrals') {
      const w = worklist(s, a); const wr = { ...w, today: this.prep(w.today), week: this.prep(w.week), waiting: this.prep(w.waiting) };
      body = todoHtml(wr, this.state, { ...o, only: sec });
    } else if (sec === 'day') {
      body = dayHtml(dayView(s, a, a.id), this.state, o);
    } else if (sec === 'team') {
      const t = teamView(s, a);
      const sid = this.params.staff && canSeeDay(s, a, this.params.staff) ? this.params.staff : null;
      body = teamHtml(t, { ...o, canApprove: can(a, 'notes.review'), sort: this.state.sort, onSort: sort => this.setState({ sort }), selected: sid, ruleChip: withDate(o.rule24) });
      if (sid) { const v = dayView(s, a, sid); body += `<section class="mw-staff" aria-label="${esc(v.name)}'s day"><h2 class="mw-h2">${esc(v.name)}'s day <a class="ui-linkbtn" href="#/MyWork?section=team">Close</a></h2>${dayHtml(v, this.state, o)}</section>`; }
    } else if (sec === 'review') {
      const q = reviewQueue(s, a);
      const cur = q.pending.find(n => n.id === this.state.sel) || q.pending[0] || null;
      body = reviewHtml(q, cur, this.state, { s, role, canText: can(a, 'notes.view'), detail: cur ? reviewModel(s, cur, { text: can(a, 'notes.view') }) : null });
    }
    return { dateText: date, roleChip: raw(roleChip), hiddenChip: raw(hidden && role !== 'direct_support' ? hiddenChip : ''), tabs: raw(list.length > 1 ? `<nav class="mw-tabs" aria-label="My Work sections">${tabs}</nav>` : ''), body: raw(body) };
  }

  // ---- wiring: every control carries data-x (the kit's own components wire themselves)
  after(root) {
    root.querySelectorAll('[data-x]').forEach(el => { el.onclick = e => { e.preventDefault(); this.act(el.dataset.x, el.dataset, el); }; });
  }
  async act(name, d, el) {
    try {
      if (name === 'all') this.setState({ all: !this.state.all });
      else if (name === 'toggle') this.setState({ [d.key]: !this.state[d.key] });
      else if (name === 'dueAll') this.setState({ dueAll: !this.state.dueAll });
      else if (name === 'allNotes') this.setState({ allNotes: true });
      else if (name === 'pick') this.setState({ sel: d.id });
      else if (name === 'approve') await this.decide('approved');
      else if (name === 'return') this.ask('Return with a note', 'The note goes back to the staffer with your comment. They fix it in Lauris and it comes back here.', 'returned', 'Return the note', el);
      else if (name === 'flag') this.ask("That didn't happen", "Say which part did not happen. The note goes back to the staffer to fix in Lauris; the flag stays on the note's audit trail.", 'flagged', 'Flag the note', el);
      else if (name === 'apprOn') this.approvalOn(d.id, el);
      else if (name === 'apprOff') this.approvalOff(d.id, el);
      else if (name === 'done') { await this.do('reminder.done', { id: d.id }); this.toast('Marked done'); }
      else if (name === 'confirm') confirmAccess({ s: this.s, kind: d.kind, id: d.id, me: this.actor.id, opener: el, run: async (a, args) => { const r = await this.do(a, args); this.toast(args.decision === 'approve' ? 'Confirmed · written to the audit log' : 'Declined · written to the audit log'); return r; } });
    } catch (e) { /* this.do already showed the refusal */ }
  }

  current() { const q = reviewQueue(this.s, this.actor); return { q, cur: q.pending.find(n => n.id === this.state.sel) || q.pending[0] || null }; }
  async decide(decision, comment) {
    const { cur } = this.current(); if (!cur) return;
    const label = M.clientLabel(this.s, cur.client, false), who = M.staffShort(this.s, cur.staff);
    await this.do('note.review', { id: cur.id, decision, comment });
    this.state.sel = null;
    this.toast(`${label} · ${M.fmtDate(cur.date)}: ${decision === 'approved' ? 'approved' : decision === 'returned' ? 'returned to ' + who + ' with your note' : 'flagged · ' + who + ' is asked to fix it in Lauris'}`);
    this.repaint();
  }
  ask(title, hint, decision, btn, opener) {
    const { cur } = this.current(); if (!cur) return;
    ui.modal({
      title, size: 'sm', returnFocus: opener,
      body: `<p>${esc(hint)}</p><div class="ui-field"><label class="ui-field__l" for="mw-c">Note to ${esc(M.staffShort(this.s, cur.staff))}</label><textarea class="ui-input ui-textarea" id="mw-c" rows="4"></textarea><div class="mw-err" id="mw-c-err" role="alert"></div></div>`,
      initialFocus: '#mw-c',
      actions: [{ label: 'Cancel', tone: 'secondary' }, { label: btn, tone: 'primary', onClick: async h => {
        const v = h.dialog.querySelector('#mw-c').value.trim();
        if (!v) { h.dialog.querySelector('#mw-c-err').textContent = 'Say what to change.'; return false; }
        try { await this.decide(decision, v); } catch { return false; }
      } }]
    });
  }
  approvalOn(id, opener) {
    const st = M.byId(this.s.staff, id); if (!st) return; const name = M.staffShort(this.s, id);
    const reviewers = (this.s.staff || []).filter(x => ['supervisor', 'clinician'].includes(x.role));
    const dflt = this.actor.role === 'supervisor' ? this.actor.id : (st.reviewer || (reviewers[0] || {}).id);
    ui.modal({
      title: `Require approval · ${name}`, size: 'sm', returnFocus: opener,
      body: `<p>From now on every note ${esc(name)} processes waits here for approval before it goes to the EHR.</p><div class="ui-field"><label class="ui-field__l" for="mw-ap-r">Why</label><select class="ui-select" id="mw-ap-r"><option value="on review">On review (probation)</option><option value="new hire">New hire</option><option value="returning from leave">Returning from leave</option></select></div><div class="ui-field"><label class="ui-field__l" for="mw-ap-v">Reviewer</label><select class="ui-select" id="mw-ap-v">${reviewers.map(x => `<option value="${esc(x.id)}"${x.id === dflt ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>`,
      actions: [{ label: 'Cancel', tone: 'secondary' }, { label: 'Require approval', tone: 'primary', onClick: async h => {
        const reason = h.dialog.querySelector('#mw-ap-r').value, reviewer = h.dialog.querySelector('#mw-ap-v').value;
        try { await this.do('staff.reviewMode', { id, mode: 'every_note', reason, reviewer }); } catch { return false; }
        this.toast(`${name} · approval required (${reason}); new notes come to Review`);
      } }]
    });
  }
  approvalOff(id, opener) {
    const name = M.staffShort(this.s, id);
    const pend = (this.s.notes || []).filter(n => n.staff === id && n.review === 'pending').length;
    ui.modal({
      title: `Turn approval off · ${name}`, size: 'sm', returnFocus: opener,
      body: `<p>${esc(name)} goes back to spot check: new notes go to the EHR at Process Form without waiting.${pend ? ` The ${pend} note${pend === 1 ? '' : 's'} already waiting stay${pend === 1 ? 's' : ''} in Review until decided.` : ''}</p>`,
      actions: [{ label: 'Cancel', tone: 'secondary' }, { label: 'Turn approval off', tone: 'primary', onClick: async () => {
        try { await this.do('staff.reviewMode', { id, mode: 'spot_check' }); } catch { return false; }
        this.toast(`${name} · back to spot check`);
      } }]
    });
  }
});
