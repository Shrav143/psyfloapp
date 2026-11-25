import { Info, Mic, Users } from "lucide-react";
import { fieldsOf, isEmpty } from "@/engine";
import { useStore } from "@/store";
import Picker from "./Picker";
import "../../panel-nav.css";
import type { ScribeCtx } from "./shared";

/** Step 1: a new session. Choose live or dictation, check who Psyflo listens to, see what it reads first, then continue. */
export default function Start({ ctx }: { ctx: ScribeCtx }) {
  const { docId, seed, spec, scenario } = ctx;
  const mode = useStore((s) => s.scribe.mode);
  const telehealth = useStore((s) => s.scribe.telehealth);
  const doc = useStore((s) => s.docs[docId]);
  const scribeMode = useStore((s) => s.scribeMode);
  const scribeTelehealth = useStore((s) => s.scribeTelehealth);
  const scribeContinue = useStore((s) => s.scribeContinue);
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);

  // text a person (or Lauris from the record) already put in: Scribe adds to it, never overwrites
  const written = doc ? fieldsOf(spec).filter((f) => !f.lock && !seed.prefilled?.includes(f.key) && !isEmpty(doc.values[f.key])).length : 0;

  return (
    <div className="psy-body">
      <section className="p-card" aria-labelledby="scr-new">
        <h2 className="p-big" id="scr-new" tabIndex={-1} data-stage-heading="">Start a new session</h2>
        <Picker />

        <span className="p-lbl" id="scr-type-lbl">Type of session</span>
        <div className="p-seg" role="group" aria-labelledby="scr-type-lbl">
          <button type="button" data-mode="live" aria-pressed={mode === "live"} onClick={() => scribeMode("live")}><Users size={15} aria-hidden="true" />Live session</button>
          <button type="button" data-mode="dictation" aria-pressed={mode === "dictation"} onClick={() => scribeMode("dictation")}><Mic size={15} aria-hidden="true" />Dictation</button>
        </div>
        <p className="p-note scr-mt">
          {mode === "live" ? "Psyflo listens to the conversation and writes a draft from it." : "You speak the note. Psyflo writes a draft from what you say."}
        </p>

        <div className="scr-sw">
          <button type="button" role="switch" aria-checked={telehealth} className="p-switch" onClick={() => scribeTelehealth(!telehealth)} data-testid="scribe-telehealth">
            <i aria-hidden="true" /><span>Telehealth / headphones</span>
          </button>
          <p className="p-note">Turn this on when the other voice comes through a call or headphones.</p>
        </div>

        <div className="st-field">
          <label className="p-lbl" htmlFor="scr-mic">Microphone</label>
          <select id="scr-mic" className="p-input" value={prefs.mic} onChange={(e) => setPrefs({ mic: e.target.value })}>
            <option>Built-in microphone (simulated)</option>
            <option>Headset microphone (simulated)</option>
          </select>
        </div>
        <div className="st-field">
          <label className="p-lbl" htmlFor="scr-lang">Language</label>
          <select id="scr-lang" className="p-input" value={prefs.language} onChange={(e) => setPrefs({ language: e.target.value })}>
            <option>English</option>
            <option disabled>Spanish (not in this demo)</option>
          </select>
        </div>
        <div className="scr-kv scr-mt"><div><span className="k">Listening to:</span> {scenario.who}</div></div>
      </section>

      {written >= 2 ? (
        <p className="p-note scr-info"><Info size={14} aria-hidden="true" /><span>This document already has text in {written} fields. Scribe adds to what is already there. It never overwrites.</span></p>
      ) : null}

      <button type="button" className="p-btn pri block" data-testid="scribe-start" onClick={scribeContinue}>
        {mode === "live" ? "Continue" : "Start dictation"}
      </button>
      <p className="p-note scr-sim">Simulated recording: the demo plays a scripted conversation.</p>
    </div>
  );
}
