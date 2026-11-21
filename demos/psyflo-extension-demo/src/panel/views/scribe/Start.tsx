import { ChevronDown, ChevronRight, Info, Mic, Users } from "lucide-react";
import { useState } from "react";
import { fieldsOf, isEmpty, usDate } from "@/engine";
import { useStore } from "@/store";
import { recordsOf, type ScribeCtx } from "./shared";

/** Step 1: a new session. Choose live or dictation, check who Psyflo listens to, see what it reads first, then continue. */
export default function Start({ ctx }: { ctx: ScribeCtx }) {
  const { docId, seed, spec, consumer, scenario } = ctx;
  const mode = useStore((s) => s.scribe.mode);
  const telehealth = useStore((s) => s.scribe.telehealth);
  const doc = useStore((s) => s.docs[docId]);
  const scribeMode = useStore((s) => s.scribeMode);
  const scribeTelehealth = useStore((s) => s.scribeTelehealth);
  const scribeContinue = useStore((s) => s.scribeContinue);
  const [fold, setFold] = useState(false);

  // text a person (or Lauris from the record) already put in: Scribe adds to it, never overwrites
  const written = doc ? fieldsOf(spec).filter((f) => !f.lock && !seed.prefilled?.includes(f.key) && !isEmpty(doc.values[f.key])).length : 0;
  const records = recordsOf(consumer, scenario.context);

  return (
    <div className="psy-body">
      <section className="p-card" aria-labelledby="scr-new">
        <h2 className="p-title" id="scr-new" tabIndex={-1} data-stage-heading="">New session</h2>
        <div className="scr-kv">
          <div><span className="k">Document:</span> <b>{spec.short}</b></div>
          <div><span className="k">Consumer:</span> <b>{consumer ? `${consumer.ini}, ${consumer.age}` : "not found"}</b></div>
        </div>

        <span className="p-lbl" id="scr-type-lbl" style={{ marginTop: 10 }}>Type of session</span>
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

        <div className="scr-kv scr-mt">
          <div><span className="k">Listening to:</span> {scenario.who}</div>
          <div><span className="k">Microphone:</span> built-in (simulated)</div>
        </div>
      </section>

      <section className="p-card scr-foldcard">
        <button type="button" className="scr-fold" aria-expanded={fold} aria-controls="scr-chart" onClick={() => setFold((v) => !v)}>
          {fold ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          <span>Chart summary — what Psyflo reads first</span>
        </button>
        {fold ? (
          <ul className="scr-recs" id="scr-chart">
            {records.length === 0 ? <li className="p-note">No stored records are listed for this document.</li> : records.map((r) => (
              <li key={r.id}>
                <div className="p-row sp"><b>{r.label}</b><span className="p-note">{usDate(r.date)}</span></div>
                <p className="clip">{r.text}</p>
              </li>
            ))}
          </ul>
        ) : null}
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
