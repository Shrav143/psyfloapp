import { Building2, CircleAlert, MessagesSquare } from "lucide-react";
import { usDate } from "@/engine";
import { tally, useCurrent } from "@/hooks";
import { useStore } from "@/store";
import type { DocSeed } from "@/types";
import "../panel-scan.css";

/** Psyflo's home: who is signed in, what is waiting, and how the tool works. Reads every name from the clinic config. */
export default function HomeView() {
  const { clinic, docId: openId } = useCurrent();
  const docs = useStore((s) => s.docs);
  const scans = useStore((s) => s.scans);
  const scribe = useStore((s) => s.scribe);
  const openDoc = useStore((s) => s.openDoc);
  const scribeOpen = useStore((s) => s.scribeOpen);
  const scribeResume = useStore((s) => s.scribeResume);
  const scribeDiscard = useStore((s) => s.scribeDiscard);
  const setTab = useStore((s) => s.setTab);

  const first = clinic.user.name.trim().split(/\s+/)[0] || "there";
  const consumerOf = (id: string) => clinic.consumers.find((c) => c.id === id);
  const shortOf = (seed: DocSeed) => clinic.forms[seed.kind]?.short ?? seed.title ?? "Document";

  /* A recording that was cut off when the person left the document. */
  const recSeed = scribe.stage === "recover" && scribe.docId ? clinic.docs.find((d) => d.id === scribe.docId) : undefined;
  const recWho = recSeed ? [consumerOf(recSeed.consumerId)?.ini, shortOf(recSeed)].filter(Boolean).join(" · ") : "";

  /* Waiting for you: a draft, anything Psyflo typed that nobody saved, or findings still open. */
  const waiting = clinic.docs
    .map((seed) => {
      const st = docs[seed.id];
      const sc = scans[seed.id];
      const t = sc ? tally(sc.findings, sc.status) : null;
      return { seed, st, typed: st ? Object.keys(st.typed).length : 0, open: t?.open ?? 0, severe: t?.severe ?? 0 };
    })
    .filter((r) => r.st && (r.st.status === "draft" || r.typed > 0 || r.open > 0));

  /* A recording that is running or interrupted belongs to one document: do not start another over it. */
  const recordingElsewhere = (id: string) => !!scribe.docId && scribe.docId !== id && (scribe.stage === "capturing" || scribe.stage === "recover");
  const scribeOn = (id: string) => { openDoc(id); scribeOpen(id); };
  const scanOn = (id: string) => { openDoc(id); setTab("scan"); };

  return (
    <div className="psy-body">
      <h2 className="p-big hm-hello">Hello, {first}</h2>
      <p className="hm-lead">Psyflo reads the page you are on in Lauris. It types, you check, you save.</p>

      {recSeed ? (
        <section className="p-card hm-recover" data-testid="home-recover" role="alert">
          <h3 className="p-title"><CircleAlert size={17} aria-hidden="true" />A recording was interrupted</h3>
          <p>You left {recWho || "the document"} while Psyflo was listening. Nothing was typed. Pick up where it stopped, or throw the recording away.</p>
          <div className="p-row">
            <button type="button" className="p-btn pri" data-testid="home-resume" onClick={scribeResume}>Resume</button>
            <button type="button" className="p-btn" data-testid="home-discard" onClick={scribeDiscard}>Discard</button>
          </div>
        </section>
      ) : null}

      <h3 className="p-h">Waiting for you{" "}<span className="hm-count">{waiting.length}</span></h3>
      {waiting.length ? (
        <ul className="hm-docs">
          {waiting.map(({ seed, st, typed, open, severe }) => {
            const ini = consumerOf(seed.consumerId)?.ini;
            const hasScribe = clinic.scribe.some((s) => s.docId === seed.id);
            const blocked = recordingElsewhere(seed.id);
            return (
              <li key={seed.id} className={`p-card hm-doc${openId === seed.id ? " here" : ""}`} data-testid="home-doc" data-doc={seed.id}>
                <div className="hm-doc-top">
                  {ini ? <b>{ini}</b> : null}
                  <span className="what">{shortOf(seed)}</span>
                  <span className="when">{usDate(seed.date)}</span>
                </div>
                <div className="hm-chips">
                  {st.status === "saved" ? <span className="p-chip saved">Saved</span> : <span className="p-chip">Draft</span>}
                  {typed > 0 ? <span className="p-chip typed">{typed} yellow, not saved</span> : null}
                  {open > 0 ? <span className={`p-chip ${severe > 0 ? "sev-severe" : "sev-medium"}`}>{open} to review</span> : null}
                  {openId === seed.id ? <span className="p-chip teal">Open now</span> : null}
                </div>
                <div className="hm-btns">
                  <button type="button" className="p-btn sm" onClick={() => openDoc(seed.id)}>Open in Lauris</button>
                  {hasScribe ? (
                    <button type="button" className="p-btn sm" disabled={blocked} title={blocked ? "A recording is open on another document. Resume or discard it first." : undefined} onClick={() => scribeOn(seed.id)}>Scribe</button>
                  ) : null}
                  <button type="button" className="p-btn sm" onClick={() => scanOn(seed.id)}>Scan</button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="hm-none">Nothing is waiting. Open a document in Lauris to scribe it or scan it.</div>
      )}

      <section className="p-card hm-how" aria-labelledby="hm-how-h">
        <h3 className="p-title" id="hm-how-h">How Psyflo works here</h3>
        <ol className="hm-steps">
          <li><span className="n" aria-hidden="true">1</span><span><b>It reads the page.</b> Every field, every kind.</span></li>
          <li><span className="n" aria-hidden="true">2</span><span><b>Scribe</b> a session, or <b>Scan &amp; Enhance</b> what is already written.</span></li>
          <li><span className="n" aria-hidden="true">3</span><span>Psyflo types into the fields. What it typed is <span className="hm-sw y" aria-hidden="true" />yellow.</span></li>
          <li><span className="n" aria-hidden="true">4</span><span>You check it and press Save in Lauris. <b>Psyflo never saves for you.</b></span></li>
        </ol>
      </section>

      <div className="hm-links">
        <button type="button" className="p-chip btn" onClick={() => setTab("ask")}><MessagesSquare size={14} aria-hidden="true" />Ask Psyflo</button>
        <button type="button" className="p-chip btn" onClick={() => setTab("clinic")}><Building2 size={14} aria-hidden="true" />Clinic profile</button>
      </div>
    </div>
  );
}
