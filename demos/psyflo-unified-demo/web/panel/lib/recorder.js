// Recording for Scribe (E5): the browser's speech recognition, or the scripted call the presenter plays. Audio goes only to the browser's
// own speech engine; Psyflo keeps the TEXT. A recording starts only after a recorded consent (lib/consent.js).
// State lives in the view's scratch object (st.rec = { kind, mode, start, transcript, interim }) so a repaint never loses it.
let live = null;   // { sr, timer, tick }
export const hasSpeech = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);
export const isLive = () => !!live;
export function stop(st) {
  if (!live) return;
  clearInterval(live.timer); clearInterval(live.tick);
  try { live.sr && live.sr.stop(); } catch (e) { }
  live = null;
  if (st && st.rec) st.rec.live = false;
}
export function begin(ctx, st, kind, mode) {
  stop(st);
  st.rec = { kind, mode, start: Date.now(), transcript: '', interim: '', live: true };
  live = { tick: setInterval(() => ctx.draw(), 1000) };
  ctx.draw();
}
export const elapsed = st => { const d = Math.floor((Date.now() - ((st.rec && st.rec.start) || Date.now())) / 1000); return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`; };
export function text(st) { const r = st.rec; return r ? [r.transcript.trim(), r.interim.trim()].filter(Boolean).join(r.transcript ? '\n' : '') : ''; }

// microphone: kind names what is being recorded ('sc' screening call, 'dpn' daily note, 'weekly', 'collateral', 'cna')
export function startMic(ctx, st, kind) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { ctx.flash('Speech recognition is not available in this browser. Type it instead' + (kind === 'sc' ? ', or play the scripted call.' : '.'), 'y'); return false; }
  begin(ctx, st, kind, 'mic');
  const rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
  rec.onresult = e => {
    let fin = '', inter = '';
    for (let k = e.resultIndex; k < e.results.length; k++) { const t = e.results[k][0].transcript; if (e.results[k].isFinal) fin += t.trim() + '\n'; else inter += t; }
    if (fin) st.rec.transcript += fin; st.rec.interim = inter; ctx.draw();
  };
  rec.onerror = ev => {
    if (ev.error === 'no-speech' || ev.error === 'aborted') return;
    const blocked = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(ev.error);
    if (blocked && live && live.sr === rec) { stop(st); st.rec = null; }
    ctx.flash('Microphone: ' + ev.error + (ev.error === 'not-allowed' ? ' (allow the microphone for this page)' : '') + '. Type it instead.', 'y');
  };
  rec.onend = () => { if (live && live.sr === rec) try { rec.start(); } catch (e) { } };
  live.sr = rec; try { rec.start(); } catch (e) { ctx.flash(String(e), 'r'); }
  return true;
}
// the scripted call: plays seed/scripts/screening_TW.txt line by line (the worked example; presenter and tests)
export async function startScript(ctx, st, kind, url = '/seed/scripts/screening_TW.txt') {
  const txt = await fetch(url).then(r => r.text());
  const lines = txt.split('\n').filter(Boolean);
  begin(ctx, st, kind, 'script');
  let i = 0; const fast = !!(window.__psyfloPanel && window.__psyfloPanel.ui && window.__psyfloPanel.ui.fast);
  live.timer = setInterval(() => {
    if (!live || !st.rec || i >= lines.length) { if (live) { clearInterval(live.timer); if (st.rec) st.rec.interim = '(call ended — press Stop)'; ctx.draw(); } return; }
    st.rec.transcript += lines[i++] + '\n'; ctx.draw();
  }, fast ? 250 : 1300);
}
