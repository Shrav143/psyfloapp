// 21 · Say what happened (phone, S1). The staffer says or types a short factual description for ONE student, confirmed by an identity card:
// the student comes only from the route or a tap (never a default, never initials), the Harvest # is sent with the save and the server checks it
// (action phone.dictation). enhanceDictation is facts-only: the draft is the staffer's own words, what is not said becomes a question.
// States are explicit screens: microphone consent, microphone blocked, no speech support, offline. Typing needs no microphone and no consent.
// The note's state chip is Draft (not saved) · Waiting for Lauris (saved here) · Processed in Lauris (only after a processed note was observed).
// Nothing is sent to Lauris from here: the saved text waits until the student's daily note is open, and a person presses Process Form.
import { register, Screen, M, raw, toast, go, session, ui, app } from '../app.js';
import { enhanceDictation } from '../shared/draft.js';
import { today as clockToday } from '../shared/clock.js';
import { isHosted } from '../shared/links.js';
import { identityCard, micConsentOf } from '../shared/identity.js';
import { phoneUser, myStudents, whoLine, dueAssessments, tick, patientBar, STATE_CHIP } from './MobileApp.js';

const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
const key = id => 'phone:say:' + id;

register('MobileDictate', class extends Screen {
  init() {
    const s = this.s; const ok = this.mine(this.params.client);
    this.state = { client: ok ? this.params.client : null, bad: this.params.client && !ok ? this.params.client : null, spoken: '', heard: '', listening: false, fixing: false, fixed: null, saved: null, replace: null, viaVoice: false,
      micState: '', micNote: '', changing: false, confirming: false, busy: false, online: typeof navigator === 'undefined' || navigator.onLine !== false };
    const edit = this.params.edit && (s.dictations || []).find(d => d.id === this.params.edit && d.status === 'waiting' && d.staff === this.user()?.id && d.client === this.state.client);
    if (edit) { this.state.spoken = edit.spoken; this.state.replace = edit.id; ui.draft.set(key(edit.client), edit.spoken); }
    else if (ok) this.state.spoken = ui.draft.get(key(this.params.client), '');
    // a presenter can load the example sentence (seed dictation) with ?example=1; people never see it unless the presenter handle is on
    if (ok && this.params.example && this.presenter()) this.useExample();
    // listeners belong to this screen only: they remove themselves once another screen is on show
    this.onOnline = () => { if (app.current?.inst !== this) return this.dispose(); this.setState({ online: true }); };
    this.onOffline = () => { if (app.current?.inst !== this) return this.dispose(); if (this.state.listening) this.stopListening(); this.setState({ online: false }); };
    window.addEventListener('online', this.onOnline); window.addEventListener('offline', this.onOffline);
    try { navigator.permissions && navigator.permissions.query({ name: 'microphone' }).then(r => { if (r.state === 'denied') this.setState({ micState: 'denied' }); r.onchange = () => this.setState({ micState: r.state === 'denied' ? 'denied' : '' }); }).catch(() => { }); } catch { }
  }
  dispose() { window.removeEventListener('online', this.onOnline); window.removeEventListener('offline', this.onOffline); this.stopListening(); }
  // demo chrome only while the presenter's dock is on (Ctrl+Shift+P, ?present=1, or Explore mode); a person using the phone never sees it
  presenter() { return !!(session.actor && session.actor.presenter) && (isHosted() || !!(app.dock && app.dock.state && app.dock.state !== 'hidden')); }   // hosted preview: no microphone and no ribbon, so the example is always offered
  user() { return phoneUser(this.s); }
  mine(id) { const u = this.user(); return !!id && !!u && myStudents(this.s, u.id).some(c => c.id === id); }
  client() { return this.state.client && this.mine(this.state.client) ? M.byId(this.s.clients, this.state.client) : null; }
  enhanced() {
    const s = this.s; const c = this.client(); const u = this.user(); const text = (this.state.spoken || '').trim();
    if (!c || !u || !text) return null;
    const recent = (s.notes || []).filter(n => n.staff === u.id && n.enhanced).map(n => n.enhanced).slice(-30);
    return enhanceDictation({ text, client: c, goals: c.goals || [], interventions: s.interventions, recent });
  }
  micView() {
    const consent = micConsentOf(this.s, this.user()?.id);
    if (!SR()) return 'unsupported';
    if (!consent.granted) return 'consent';
    if (this.state.micState === 'denied') return 'denied';
    if (this.state.micState === 'nomic') return 'nomic';
    return this.state.listening ? 'listening' : 'ready';
  }
  renderVals() {
    const s = this.s; const u = this.user(); const c = this.client(); const st = this.state;
    const mv = this.micView(); const e = this.enhanced(); const saved = !!st.saved;
    const mine = u ? myStudents(s, u.id) : [];
    const phone = st.fixed ?? e?.phone ?? '';
    const card = c ? identityCard(s, c.id) : null;
    const stt = saved ? 'waiting' : 'draft';
    const offline = !st.online;
    const canSave = !!e && !saved && !offline;
    const picker = mine.map(x => ({ ini: x.initials, line: identityCard(s, x.id).line, pick: () => this.choose(x.id) }));
    return {
      who: u ? whoLine(s, u).split(' · ').slice(0, 2).join(' · ') : '', bar: raw(patientBar(s, c && c.id, { change: !!c && !saved })),
      hasClient: !!c, noClient: !c, bad: !!st.bad, badIni: st.bad ? (M.byId(s.clients, st.bad) || {}).initials || 'That student' : '', pickList: picker, hasPick: picker.length > 0,
      offline, online: st.online,
      isConsent: mv === 'consent', isDenied: mv === 'denied', isNoMic: mv === 'nomic', isUnsupported: mv === 'unsupported', isReady: mv === 'ready', isListening: mv === 'listening',
      showMic: !saved, micOn: !saved && (mv === 'ready' || mv === 'listening'),
      heard: st.heard || '…', spoken: st.spoken, micNote: st.micNote, micBtn: st.listening ? 'Stop listening' : 'Speak', presenter: this.presenter(),
      typed: ev => { this.state.spoken = ev.target.value; this.state.fixed = null; this.state.viaVoice = this.state.viaVoice && !!ev.target.value; if (this.state.saved) { this.state.replace = this.state.saved; this.state.saved = null; } if (c) ui.draft.set(key(c.id), ev.target.value); this.repaint(); },
      hasDraft: !!e, phone, stateChip: raw((STATE_CHIP[stt])()), fixing: st.fixing, fixLabel: st.fixing ? 'Done fixing' : 'Fix it', fixInput: ev => { this.state.fixed = ev.target.value; },
      chips: (e?.chips || []).map(x => ({ text: x.text, from: x.from })),
      questions: (e?.questions || []).map(q => ({ q: q.q })), hasQuestions: !!(e && e.questions && e.questions.length),
      flagged: (e?.flagged || []).map(w => ({ w })), hasFlag: !!(e && e.flagged && e.flagged.length),
      saved, notSaved: !saved && !!e, readyLine: saved && c ? `Waiting until ${c.initials}'s daily note is open in Lauris (Harvest # ${c.harvest_no}). You review the words and press Process Form yourself.` : '',
      canSave, canSaveNot: !canSave, primaryLabel: saved ? 'Done' : e ? (offline ? 'Offline · cannot save' : 'Looks right') : 'Done',
      confirming: st.confirming && !!c && !!e, confirmTitle: c ? `Save to ${c.initials} (${card.grade != null ? 'grade ' + card.grade + ', ' : ''}${card.schoolShort})?` : '', confirmLine: card ? `Harvest # ${card.harvest_no} · age ${card.age ?? '—'}` : '', confirmYes: c ? `Save to ${c.initials}` : 'Save', busy: st.busy,
      changing: st.changing, dueN: u ? dueAssessments(s, u.id).length : 0
    };
  }
  after(root) {
    if (this.params.type && !this._focused && this.client()) { this._focused = true; root.querySelector('#spoken')?.focus(); }
  }
  choose(id) { const was = this.state.client; this.state = { ...this.state, client: id, bad: null, changing: false, confirming: false, spoken: ui.draft.get(key(id), was === id ? this.state.spoken : ''), fixed: null, fixing: false, saved: null, replace: null, viaVoice: false };
    this.repaint(); if (was && was !== id) toast(`Student changed to ${M.client(this.s, id).initials}. Check the words.`); }
  useExample() { const c = this.client(); const t = c && this.s.phone_examples && this.s.phone_examples[c.id] || ''; if (!t) return toast(c ? `There is no example sentence for ${c.initials}.` : 'Pick a student first.', 'err'); if (this.state.listening) this.stopListening(); this.state.spoken = t; this.state.fixed = null; this.state.fixing = false; this.state.viaVoice = false; if (this.state.client) ui.draft.set(key(this.state.client), t); if (this.state.saved) { this.state.replace = this.state.saved; this.state.saved = null; } this.repaint(); }
  listen() {
    const R = SR();
    if (!R) { this.repaint(); return; }
    if (!this.state.online) return toast('You are offline. Type it instead.', 'err');
    const rec = new R(); this.rec = rec; rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true;
    const before = this.state.spoken ? this.state.spoken.trim() + ' ' : '';
    let final = '';
    rec.onresult = ev => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) { const r = ev.results[i]; if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript; }
      this.state.heard = (before + final + interim).trim();
      const el = document.querySelector('#heard'); if (el && this.state.listening) el.textContent = '"' + this.state.heard + '"';
    };
    rec.onerror = ev => {
      const e = ev && ev.error;
      if (e === 'not-allowed' || e === 'service-not-allowed') this.setState({ micState: 'denied', listening: false });
      else if (e === 'audio-capture') this.setState({ micState: 'nomic', listening: false });
      else if (e === 'network') this.setState({ micNote: 'The speech service could not be reached. Type it instead.', listening: false });
      else if (e === 'no-speech') this.setState({ micNote: 'Nothing was heard. Try again, or type it.' });
      else if (e !== 'aborted') this.setState({ micNote: 'Microphone: ' + e });
    };
    rec.onend = () => { clearInterval(this._tick); this.rec = null; const text = (this.state.heard || '').trim(); if (!this.state.listening) return; if (text) this.state.viaVoice = true; this.setState({ listening: false, spoken: text || this.state.spoken, fixed: null, micNote: this.state.micNote }); if (this.client()) ui.draft.set(key(this.client().id), this.state.spoken); };
    try { rec.start(); } catch (e) { this.setState({ micNote: 'The microphone could not start. Type it instead.' }); return; }
    const t0 = Date.now();
    if (this.state.saved) { this.state.replace = this.state.saved; this.state.saved = null; }
    this.setState({ listening: true, heard: before.trim(), micNote: '' });
    tick(this, () => { const el = document.getElementById('mictime'); if (el && this.state.listening) { const sec = Math.round((Date.now() - t0) / 1000); el.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; } });
  }
  stopListening() { try { this.rec && this.rec.stop(); } catch { } }
  async save() {
    const c = this.client(); const e = this.enhanced(); if (!c || !e || this.state.busy) return;
    const card = identityCard(this.s, c.id);
    this.state.busy = true;
    try {
      const phone = this.state.fixed ?? e.phone;
      const r = await this.do('phone.dictation', { client: c.id, harvest_no: card.harvest_no, input: this.state.viaVoice ? 'voice' : 'typed', spoken: e.spoken, rewritten: phone, narrative: e.narrative, chips: e.chips, checks: e.checks, objective: e.objective, interventions: e.interventions, mood: e.mood, progress: e.progress, fixed: e.fixed, edited: this.state.fixed != null, replace: this.state.replace || undefined });
      ui.draft.clear(key(c.id));
      this.setState({ saved: r.id, replace: null, fixing: false, confirming: false, busy: false });
      toast(`Saved for ${c.initials} · waiting for Lauris`);
    } catch (err) { this.setState({ busy: false, confirming: false }); }
  }
  async allowMic() { try { await this.do('dictation.micConsent', { granted: true }); } catch { return; } this.setState({ micState: '' }); this.listen(); }
  get anchors() {
    return {
      mic: () => this.state.listening ? this.stopListening() : this.listen(),
      allow: () => this.allowMic(),
      typeinstead: () => { this.repaint(); document.getElementById('spoken')?.focus(); },
      retry: () => { this.setState({ micState: '', micNote: '' }); this.listen(); },
      micoff: async () => { try { await this.do('dictation.micConsent', { granted: false }); toast('Microphone turned off. You can type.'); } catch { } },
      example: () => this.useExample(), script: () => this.useExample(),
      done: () => { if (this.state.listening) return this.stopListening(); go('MobileApp', this.client() ? { client: this.client().id } : {}); },
      fix: () => this.setState({ fixing: !this.state.fixing }),
      change: () => this.setState({ changing: true, confirming: false }),
      closepick: () => this.setState({ changing: false }),
      use: () => { if (this.state.saved) return go('MobileApp', { client: this.client()?.id }); const e = this.enhanced(); if (!e) return toast('Say or type what happened first', 'err'); if (!this.state.online) return toast('You are offline. It cannot be saved.', 'err'); this.setState({ confirming: true }); },
      confirm: () => this.save(),
      cancelconfirm: () => this.setState({ confirming: false }),
      edit: () => { this.state.replace = this.state.saved; this.setState({ saved: null }); document.getElementById('spoken')?.focus(); }
    };
  }
  set anchors(v) { }
});
