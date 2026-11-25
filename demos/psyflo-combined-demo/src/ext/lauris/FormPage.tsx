import { useMemo } from "react";
import { fieldsOf, usDate } from "@/ext/engine";
import { useCurrent } from "@/ext/hooks";
import { useStore } from "@/ext/store";
import Chips, { chipsByField } from "./Chips";
import FieldBox from "./FieldBox";
import { Go, avatarOf, payerName } from "./util";

/** One document of one consumer, as Lauris shows it: a card per section, Save at the bottom. Psyflo types into the boxes; only a person saves. */
export default function FormPage() {
  const { clinic, docId, seed, spec, consumer, doc, scan } = useCurrent();
  const checking = useStore((s) => s.checking);
  const pause = useStore((s) => s.pause);
  const flash = useStore((s) => s.flash);
  const goConsumers = useStore((s) => s.goConsumers);
  const openConsumer = useStore((s) => s.openConsumer);
  const requestSave = useStore((s) => s.requestSave);

  const chips = useMemo(() => (scan ? chipsByField(scan.findings, scan.status) : {}), [scan]);

  if (!docId || !seed || !spec || !consumer || !doc) {
    return (
      <div className="l-page">
        <h2>Document not found</h2>
        <div className="card"><p>Lauris has no such document.</p><Go href="#/consumers" className="lb" onGo={goConsumers}>Back to Consumers</Go></div>
      </div>
    );
  }

  const known = new Set(fieldsOf(spec).map((f) => f.key));
  const loose = Object.entries(chips).filter(([k]) => !known.has(k)).flatMap(([, g]) => g);
  const stale = !!scan?.stale;
  const typedCount = Object.keys(doc.typed).length;
  const saved = doc.status === "saved";
  const checkingHere = checking === docId;
  const pausedHere = pause?.docId === docId ? pause : null;
  const flashHere = flash?.docId === docId ? flash : null;
  const alerts = pausedHere?.ids.length ?? 0;

  return (
    <>
      <div className="l-page form">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Go href="#/consumers" onGo={goConsumers}>Consumers</Go><span aria-hidden="true"> › </span>
          <Go href={`#/consumers/${consumer.id}`} onGo={() => openConsumer(consumer.id)}>{consumer.ini}</Go><span aria-hidden="true"> › </span>
          <span aria-current="page">{spec.short}</span>
        </nav>

        <div className="strip" data-testid="consumer-strip">
          <div className="av" aria-hidden="true">{avatarOf(consumer.ini)}</div>
          <div className="who">
            <div className="nm">{consumer.ini} · {consumer.age} · {consumer.site}</div>
            <div className="sub">Consumer # {consumer.id} · {consumer.program} · {payerName(clinic, consumer.payer)} · {consumer.clinician}</div>
          </div>
        </div>

        <div className="doc-h">
          <h2>{spec.title}</h2>
          <div className="meta">
            <span>{usDate(seed.date)}</span>
            <span className={`st ${saved ? "g" : "n"}`} data-testid="doc-status">{saved ? "Saved" : "Draft"}</span>
            {seed.author ? <span className="muted">Written by {seed.author}</span> : null}
          </div>
        </div>

        {loose.length ? (
          <div className="loose" data-testid="loose-alerts">
            <span className="lbl">Alerts on the document as a whole</span>
            <Chips groups={loose} label="this document" stale={stale} />
          </div>
        ) : null}

        <form aria-label={spec.title} noValidate onSubmit={(e) => e.preventDefault()}>
          {spec.sections.map((s) => (
            <section key={s.id} className="card sec" aria-labelledby={`lf-${docId}-sec-${s.id}`}>
              <h3 id={`lf-${docId}-sec-${s.id}`}>{s.title}</h3>
              <div className="secf">
                {s.fields.map((f) => <FieldBox key={f.key} docId={docId} field={f} doc={doc} chips={chips[f.key] ?? []} stale={stale} />)}
              </div>
            </section>
          ))}
        </form>
      </div>

      <div className="l-actions">
        <div className="l-msgs" aria-live="polite">
          {checkingHere ? (
            <div className="l-checking" data-testid="lauris-checking" role="status">
              <span className="pmk" aria-hidden="true">p<em>.</em></span>
              <span className="spin" aria-hidden="true" />
              <span>Psyflo is checking this document before it saves…</span>
            </div>
          ) : null}
          {pausedHere ? (
            <div className="l-pause" data-testid="lauris-pause" role="alert">
              <span className="pmk" aria-hidden="true">p<em>.</em></span>
              <span><b>Psyflo paused this save:</b> {alerts} {alerts === 1 ? "alert needs" : "alerts need"} a look. Fix {alerts === 1 ? "it" : "them"} in the Psyflo panel, or press Save again to save anyway.</span>
            </div>
          ) : null}
          {flashHere ? <div className={`flash ${flashHere.tone === "warn" ? "w" : "ok"}`} data-testid="lauris-flash" role="status">{flashHere.text}</div> : null}
        </div>
        <div className="row">
          <button type="button" className="lb pri" data-testid="lauris-save" disabled={!!checking} onClick={() => requestSave(docId)}>Save</button>
          <button type="button" className="lb" aria-disabled="true" title="Not part of this demo">Cancel</button>
          <span className="small muted" aria-live="polite">
            {typedCount > 0 ? `${typedCount} ${typedCount === 1 ? "field" : "fields"} typed by Psyflo, not saved yet` : saved && doc.savedAt ? `Saved ${usDate(doc.savedAt)}` : ""}
          </span>
        </div>
      </div>
    </>
  );
}
