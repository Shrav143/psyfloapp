// 21 · Say what happened (phone, Flow B). Live: microphone via the Web Speech API when the browser has it, typing
// otherwise, or "Use the example" (the seed dictation). enhanceDictation turns it into note language with the ISP
// intervention and goal named and the three source chips. Looks right → dictation.save (+ dictation.annotate with
// the daily-note paragraph). The dictation then waits in Psyflo until the staffer opens the student's daily note in
// Lauris; nothing is sent anywhere in the background.
import { register, Screen, M, raw, esc, toast, go } from '../app.js';
import { enhanceDictation } from '../shared/draft.js';
import { clock12, mins } from '../shared/dates.js';
import { phoneUser, myStudents, whoLine, dueAssessments, tick } from './MobileApp.js';

const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;

register('MobileDictate', class extends Screen {
  init() {
    const sample = this.s.notes_sample?.[0]?.dictation || '';
    this.state = { spoken: this.s.preset === 'canvas' ? sample : '', heard: '', listening: false, fixing: false, fixed: null, saved: null, micNote: '' };
  }
  user() { return phoneUser(this.s); }
  client() {
    const s = this.s; const u = this.user(); const st = myStudents(s, u.id); const t = s.timers?.[u.id] || {};
    return M.byId(s.clients, this.params.client) || st.find(c => c.id === t.client) || st[0] || M.byId(s.clients, 'MR');
  }
  blocks(c) {
    const s = this.s; const t = s.timers?.[this.user().id] || {};
    return (t.blocks || []).filter(b => b[2] === c.id || (!M.byId(s.clients, b[2]) && t.client === c.id));
  }
  enhanced() {
    const s = this.s; const c = this.client(); const text = (this.state.spoken || '').trim();
    if (!text) return null;
    const recent = s.notes.filter(n => n.staff === this.user().id && n.enhanced).map(n => n.enhanced).slice(-30);
    return enhanceDictation({ text, client: c, goals: c.goals || [], interventions: s.interventions, blocks: (s.timers?.[this.user().id]?.blocks) || [], recent });
  }
  renderVals() {
    const s = this.s; const u = this.user(); const c = this.client(); const t = s.timers?.[u.id] || {};
    const bl = this.blocks(c).filter(b => !b[3]).at(-1);
    const range = b => { const a = clock12(b[0]), z = clock12(b[1]); return (a.slice(-2) === z.slice(-2) ? a.slice(0, -3) : a) + '–' + z; };
    const blockLine = bl ? `${c.initials} · ${range(bl)} · ${mins(bl[1]) - mins(bl[0])} min` : t.started && t.client === c.id ? `${c.initials} · timer running since ${clock12(t.started.slice(11, 16))}` : c.initials;
    const e = this.enhanced();
    const phone = this.state.fixed ?? e?.phone ?? '';
    const hl = esc(phone).replace(/(movement intervention \([^)]*\)|visual timer|Goal \d|Obj\. \d|Objective \d)/g, '<span style="background:#DDF1EF">$1</span>');
    const L = this.state.listening; const saved = this.state.saved;
    return {
      who: whoLine(s, u).split(' · ').slice(0, 2).join(' · '), blockLine,
      listening: L, heard: this.state.heard || '…', spoken: this.state.spoken,
      micBorder: L ? '#B9541F' : '#E6E1D9', micDot: L ? '#B9541F' : '#8E99A6', micTitle: L ? 'Listening' : this.state.spoken ? 'What you said' : 'Say what happened',
      micTime: L ? '0:00' : (SR() ? 'mic ready' : 'type it'), micBtn: L ? 'Stop listening' : 'Speak', micNote: this.state.micNote,
      typed: (ev) => { this.state.spoken = ev.target.value; this.state.fixed = null; this.state.saved = null; this.setState({}); },
      e: !!e, phone, phoneHtml: raw(hl), fixing: this.state.fixing, fixLabel: this.state.fixing ? 'Done fixing' : 'Fix it',
      fixInput: ev => { this.state.fixed = ev.target.value; },
      chips: (e?.chips || []).map(x => ({ text: x.text, from: x.from })),
      chipFrom: e?.chips?.length ? 'From ' + e.chips.map(x => x.from.replace(/^from /, '')).join(' · ') : '',
      saved: !!saved, stateChip: saved ? 'saved' : this.state.fixed != null ? 'edited · check it' : 'check it', stateCls: saved ? 'g' : 'y',
      readyLine: saved ? `Ready for you when you open ${c.initials} in Lauris · it waits in Psyflo until you open ${c.initials}'s daily note there` : `Ready for you when you open ${c.initials} in Lauris`,
      dueN: dueAssessments(s, u.id).length
    };
  }
  after(root) { if (this.params.type && !this._focused) { this._focused = true; root.querySelector('#spoken')?.focus(); } }
  listen() {
    const R = SR();
    if (!R) { this.setState({ micNote: 'This browser has no speech recognition. Type it above, or use the example.' }); document.getElementById('spoken')?.focus(); return; }
    const rec = new R(); this.rec = rec; rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true;
    const before = this.state.spoken ? this.state.spoken.trim() + ' ' : '';
    let final = '';
    rec.onresult = ev => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) { const r = ev.results[i]; if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript; }
      this.state.heard = (before + final + interim).trim();
      const el = document.querySelector('#root .tile .s'); if (el && this.state.listening) el.textContent = '"' + this.state.heard + '"';
    };
    rec.onerror = ev => { toast(ev.error === 'not-allowed' || ev.error === 'service-not-allowed' ? 'Microphone blocked · type it or use the example' : 'Microphone: ' + ev.error, 'err'); };
    rec.onend = () => { clearInterval(this._tick); this.rec = null; const text = (this.state.heard || '').trim(); this.setState({ listening: false, spoken: text || this.state.spoken, fixed: null, saved: null }); };
    try { rec.start(); } catch (e) { toast('Microphone could not start · type it instead', 'err'); return; }
    const t0 = Date.now();
    this.setState({ listening: true, heard: before.trim(), micNote: '' });
    tick(this, () => { const el = document.getElementById('mictime'); if (el && this.state.listening) { const sec = Math.round((Date.now() - t0) / 1000); el.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; } });
  }
  stopListening() { try { this.rec?.stop(); } catch { } }
  get anchors() {
    return {
      mic: () => this.state.listening ? this.stopListening() : this.listen(),
      example: () => { if (this.state.listening) this.stopListening(); this.setState({ spoken: this.s.notes_sample?.[0]?.dictation || '', fixed: null, saved: null, fixing: false }); },
      done: () => { if (this.state.listening) return this.stopListening(); go('MobileApp'); },
      fix: () => this.setState({ fixing: !this.state.fixing }),
      use: async () => {
        const e = this.enhanced(); if (!e) return toast('Say or type what happened first', 'err');
        const c = this.client(); const u = this.user();
        if (this.state.saved) await this.do('dictation.discard', { id: this.state.saved });
        const phone = this.state.fixed ?? e.phone;
        const { id } = await this.do('dictation.save', { client: c.id, staff: u.id, spoken: e.spoken, rewritten: phone, narrative: e.narrative, chips: e.chips, checks: e.checks });
        await this.do('dictation.annotate', { id, patch: { narrative: e.narrative, objective: e.objective, interventions: e.interventions, mood: e.mood, progress: e.progress, fixed: e.fixed, edited: this.state.fixed != null } });
        this.setState({ saved: id, fixing: false });
        toast(`Saved · ready for you when you open ${c.initials} in Lauris`);
      }
    };
  }
  set anchors(v) { }
});
