// 21 · Say what happened (phone, Flow B). Live: the big mic uses the Web Speech API when the browser has it and falls back
// to the scripted example dictation when it does not (or is blocked); typing always works. The presenter command
// { psyflo: 'present', cmd: 'example' } fills the example dictation. enhanceDictation turns the words into note language
// with the ISP intervention and goal named and the source chips. Looks right → dictation.save (+ dictation.annotate with the
// daily-note paragraph). The dictation then waits in Psyflo until the staffer opens the student's daily note in Lauris;
// nothing is sent anywhere in the background.
import { register, Screen, M, raw, esc, toast } from '../app.js';
import { enhanceDictation } from '../shared/draft.js';
import { phoneUser, myStudents, hdWho, phoneHeader, phoneNav, dueAssessments, SR, onPresent, C_CSS } from './MobileApp.js';

register('MobileDictate', class extends Screen {
  init() {
    this.state = { spoken: this.s.preset === 'canvas' ? this.sample() : '', heard: '', listening: false, fixing: false, fixed: null, saved: null, pickC: null };
    onPresent(this, cmd => { if (cmd === 'example') this.example(); });
  }
  sample() { return this.s.notes_sample?.[0]?.dictation || ''; }
  user() { return phoneUser(this.s); }
  client() {
    const s = this.s; const u = this.user(); const st = myStudents(s, u.id); const t = s.timers?.[u.id] || {};
    return M.byId(s.clients, this.state.pickC) || M.byId(s.clients, this.params.client) || st.find(c => c.id === t.client) || st[0] || M.byId(s.clients, 'MR');
  }
  enhanced() {
    const s = this.s; const c = this.client(); const text = (this.state.spoken || '').trim();
    if (!text) return null;
    const recent = s.notes.filter(n => n.staff === this.user().id && n.enhanced).map(n => n.enhanced).slice(-30);
    return enhanceDictation({ text, client: c, goals: c.goals || [], interventions: s.interventions, blocks: (s.timers?.[this.user().id]?.blocks) || [], recent });
  }
  renderVals() {
    const s = this.s; const u = this.user(); const c = this.client();
    const e = this.enhanced();
    const phone = this.state.fixed ?? e?.phone ?? '';
    const hl = esc(phone).replace(/(movement intervention \([^)]*\)|visual timer|Goal \d|Obj\. \d|Objective \d)/g, '<span class="c-hl">$1</span>');
    const L = this.state.listening; const saved = this.state.saved;
    return {
      hd: phoneHeader(hdWho(s, u)), nav: phoneNav('today', dueAssessments(s, u.id).length),
      chips: myStudents(s, u.id).map(x => ({ ini: x.initials, on: x.id === c.id ? ' on' : '', pick: () => this.setState({ pickC: x.id, fixed: null, saved: null, fixing: false }) })),
      listening: L, heard: this.state.heard || '…', spoken: this.state.spoken,
      micCls: L ? ' live' : e ? '' : ' pri', micLabel: L ? 'Stop' : 'Speak', mic: () => L ? this.stopListening() : this.listen(),
      typed: ev => { this.state.spoken = ev.target.value; this.state.fixed = null; this.state.saved = null; this.setState({}); },
      e: !!e, phone, phoneHtml: raw(hl), fixing: this.state.fixing, fixLabel: this.state.fixing ? 'Done fixing' : 'Fix it',
      fixInput: ev => { this.state.fixed = ev.target.value; },
      chipsSrc: (e?.chips || []).map(x => ({ text: x.text, from: x.from })),
      saved: !!saved, stateChip: saved ? 'Saved' : this.state.fixed != null ? 'Edited' : 'Check it', stateCls: saved ? 'ok' : 'y'
    };
  }
  after(root) { if (this.params.type && !this._focused) { this._focused = true; root.querySelector('#spoken')?.focus(); } }
  get css() { return C_CSS; }
  // the scripted fallback: the seed dictation, for the student it is about
  example(why) {
    if (this.state.listening) this.stopListening();
    const mr = myStudents(this.s, this.user().id).find(c => c.id === 'MR');
    this.setState({ spoken: this.sample(), pickC: mr ? mr.id : this.state.pickC, fixed: null, saved: null, fixing: false });
    if (why) toast(why);
  }
  listen() {
    const R = SR();
    if (!R) return this.example('No microphone here · example used');
    const rec = new R(); this.rec = rec; rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true;
    const before = this.state.spoken ? this.state.spoken.trim() + ' ' : '';
    let final = '';
    rec.onresult = ev => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) { const r = ev.results[i]; if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript; }
      this.state.heard = (before + final + interim).trim();
      const el = document.getElementById('heard'); if (el && this.state.listening) el.textContent = this.state.heard;
    };
    rec.onerror = ev => { if (['not-allowed', 'service-not-allowed', 'network', 'audio-capture', 'language-not-supported'].includes(ev.error) && !this.state.spoken && !this.state.heard) { this._fallback = true; } else if (!['no-speech', 'aborted'].includes(ev.error)) toast('Microphone: ' + ev.error, 'err'); };
    rec.onend = () => {
      clearInterval(this._tick); this.rec = null; const text = (this.state.heard || '').trim();
      if (this._fallback) { this._fallback = false; this.state.listening = false; return this.example('Microphone blocked · example used'); }
      this.setState({ listening: false, spoken: text || this.state.spoken, fixed: null, saved: null });
    };
    try { rec.start(); } catch { return this.example('No microphone here · example used'); }
    this.setState({ listening: true, heard: before.trim() });
  }
  stopListening() { try { this.rec?.stop(); } catch { } }
  get anchors() {
    return {
      fix: () => this.setState({ fixing: !this.state.fixing }),
      use: async () => {
        const e = this.enhanced(); if (!e) return toast('Say or type what happened first', 'err');
        const c = this.client(); const u = this.user();
        if (this.state.saved) await this.do('dictation.discard', { id: this.state.saved });
        const phone = this.state.fixed ?? e.phone;
        const { id } = await this.do('dictation.save', { client: c.id, staff: u.id, spoken: e.spoken, rewritten: phone, narrative: e.narrative, chips: e.chips, checks: e.checks });
        await this.do('dictation.annotate', { id, patch: { narrative: e.narrative, objective: e.objective, interventions: e.interventions, mood: e.mood, progress: e.progress, fixed: e.fixed, edited: this.state.fixed != null } });
        this.setState({ saved: id, fixing: false });
        toast(`Saved · ready when you open ${c.initials} in Lauris`);
      }
    };
  }
  set anchors(v) { }
});
