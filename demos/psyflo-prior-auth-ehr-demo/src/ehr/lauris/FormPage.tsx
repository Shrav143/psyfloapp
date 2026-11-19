import { Link, useParams } from "react-router-dom";
import { useEhrCase } from "@/ehr/model";
import { clockTime, longDate, toDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import FieldBox from "./FieldBox";

const TABS = ["General Information", "Authorization Information", "Documents", "Authorization form", "Medications", "Allergies"];

/** The authorization form of one case, in Lauris. The sections are text boxes; the Psyflo extension types the recommendations into them. Nothing here sends anything to a payer. */
export default function FormPage() {
  const { id = "" } = useParams();
  const c = useEhrCase(decodeURIComponent(id));
  const returnTo = useStore((s) => s.ehr.returnTo);
  const ehrSave = useStore((s) => s.ehrSave);
  const ehrOverride = useStore((s) => s.ehrOverride);

  if (!c) {
    return (
      <>
        <h2>Authorization not found</h2>
        <div className="card">
          <p style={{ margin: "0 0 10px" }}>Lauris has no authorization {id ? <b>{decodeURIComponent(id)}</b> : null}.</p>
          <Link className="lb" to={paths.lauris()}>Back to Consumers</Link>
        </div>
      </>
    );
  }

  const { detail, consumer, fields, form, key, denial } = c;
  const unit = detail.program === "IOP" ? "units" : "days";
  const dirty = c.unsavedCount > 0 || !form.saved;
  const savedAt = form.savedAt !== undefined ? `${longDate(form.savedAt)} ${clockTime(toDate(form.savedAt))}` : null;
  const back = returnTo ?? paths.case(detail.id);

  return (
    <>
      {denial ? <div className="flash r" role="status">Denied · {denial.req.id} · {denial.meta.summary}</div> : null}
      <div className="hdr">
        <div className="av" aria-hidden="true">{consumer.initials.replace(/[^A-Z]/g, "")}</div>
        <div>
          <div className="nm">{consumer.initials}, {consumer.age}</div>
          <div className="sub">Lauris # {consumer.no} · {consumer.payerName} · {consumer.program === consumer.level ? consumer.level : `${consumer.program} · ${consumer.level}`} · {consumer.site}</div>
        </div>
        <div className="units">
          <span>{detail.days} {unit} requested</span>
          {c.due ? <span className="st y">{c.due}</span> : null}
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Consumer record">
        {TABS.map((t) => {
          const on = t === "Authorization form";
          return <button key={t} type="button" role="tab" aria-selected={on} aria-disabled={on ? undefined : true} title={on ? undefined : "Not part of this demo"} className={`tab${on ? " on" : ""}`}>{t}</button>;
        })}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ehrSave(key, detail.requestId); }} aria-label="Authorization form">
        <div className="grid">
          <div><span className="lbl">Member</span><div className="in g">{consumer.initials} · ID on file</div></div>
          <div><span className="lbl">Payer</span><div className="in g">{consumer.payerName}</div></div>
          <div><span className="lbl">Level of care</span><div className="in g">{detail.levelLabel}</div></div>
          <div><span className="lbl">Request type</span><div className="in g">{detail.type}</div></div>
          <div><span className="lbl">Requested</span><div className="in g">{detail.days} {unit}</div></div>
        </div>

        {fields.map((f) => <FieldBox key={f.id} field={f} onChange={(text) => ehrOverride(key, f.id, text)} />)}

        <div className="actions">
          <button type="submit" className="lb pri" disabled={!dirty}>Save</button>
          <Link to={back}>Back to Psyflo</Link>
          <span className="small muted" aria-live="polite">{c.unsavedCount > 0 ? `${c.unsavedCount} ${c.unsavedCount === 1 ? "entry" : "entries"} typed by Psyflo, not saved yet` : savedAt && form.saved ? `Saved ${savedAt}` : ""}</span>
        </div>
      </form>
    </>
  );
}
