import { clockTime, longDate, toDate } from "@/lib/time";
import { gatingRecs, useEhrCase } from "@/ehr/model";
import { paths } from "@/routes";
import { useNavigate } from "react-router-dom";
import { useStore as usePlatform } from "@/store";
import { useStore } from "@/ext/store";
import AuthFieldBox from "./AuthFieldBox";
import { Go, avatarOf } from "./util";

/** The authorization form of one consumer, in Lauris. The sections are text boxes; the Psyflo extension types the recommendations into them. The case itself lives in the Psyflo platform;
    nothing here sends anything to a payer. Save is Lauris's own button; Check before save can pause it while recommendations the request needs are still open. */
export default function AuthPage({ caseId }: { caseId: string }) {
  const c = useEhrCase(caseId);
  const navigate = useNavigate();
  const goConsumers = useStore((s) => s.goConsumers);
  const openConsumer = useStore((s) => s.openConsumer);
  const authSave = useStore((s) => s.authSave);
  const requestAuthSave = useStore((s) => s.requestAuthSave);
  const ehrSave = usePlatform((s) => s.ehrSave);
  const ehrOverride = usePlatform((s) => s.ehrOverride);

  if (!c) {
    return (
      <div className="l-page">
        <h2>Authorization not found</h2>
        <div className="card"><p>Lauris has no authorization {caseId}.</p><Go href="#/consumers" className="lb" onGo={goConsumers}>Back to Consumers</Go></div>
      </div>
    );
  }

  const { detail, consumer, fields, form, key, denial } = c;
  const unit = detail.program === "IOP" ? "units" : "days";
  const dirty = c.unsavedCount > 0 || !form.saved;
  const savedAt = form.savedAt !== undefined ? `${longDate(form.savedAt)} ${clockTime(toDate(form.savedAt))}` : null;
  const mine = authSave?.caseId === detail.id ? authSave : null;
  const gating = gatingRecs(c);
  const open = c.groups.open;

  return (
    <>
      <div className="l-page form" data-testid="auth-page">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Go href="#/consumers" onGo={goConsumers}>Consumers</Go><span aria-hidden="true"> › </span>
          <Go href={`#/consumers/${consumer.no}`} onGo={() => openConsumer(consumer.no)}>{consumer.initials}</Go><span aria-hidden="true"> › </span>
          <span aria-current="page">Authorization form</span>
        </nav>

        {denial ? <div className="flash r" role="status">Denied · {denial.req.id} · {denial.meta.summary}</div> : null}

        <div className="strip" data-testid="consumer-strip">
          <div className="av" aria-hidden="true">{avatarOf(consumer.initials)}</div>
          <div className="who">
            <div className="nm">{consumer.initials}, {consumer.age} · {consumer.site}</div>
            <div className="sub">Consumer # {consumer.no} · {consumer.program === consumer.level ? consumer.level : `${consumer.program} · ${consumer.level}`} · {consumer.payerName}</div>
          </div>
          <div className="units"><span>{detail.days} {unit} requested</span>{c.due ? <> <span className="st y">{c.due}</span></> : null}</div>
        </div>

        <div className="doc-h">
          <h2>Authorization request · {detail.type}</h2>
          <div className="meta">
            <span>{detail.id}</span>
            <span className={`st ${form.saved && c.unsavedCount === 0 ? "g" : "n"}`} data-testid="doc-status">{form.saved && c.unsavedCount === 0 ? "Saved" : "Draft"}</span>
            <span className="muted">The request itself is prepared in Psyflo; this form is the clinic's copy in Lauris.</span>
          </div>
        </div>

        <form aria-label="Authorization form" noValidate onSubmit={(e) => e.preventDefault()}>
          <section className="card sec" aria-label="Request">
            <h3>Request</h3>
            <div className="grid">
              <div><span className="lbl">Member</span><div className="in g">{consumer.initials} · ID on file</div></div>
              <div><span className="lbl">Payer</span><div className="in g">{consumer.payerName}</div></div>
              <div><span className="lbl">Level of care</span><div className="in g">{detail.levelLabel}</div></div>
              <div><span className="lbl">Request type</span><div className="in g">{detail.type}</div></div>
              <div><span className="lbl">Requested</span><div className="in g">{detail.days} {unit}</div></div>
            </div>
          </section>
          <section className="card sec" aria-label="Why this request">
            <h3>Why this request</h3>
            <div className="secf">
              {fields.map((f) => <AuthFieldBox key={f.id} field={f} open={open.filter((r) => r.add?.section === f.id)} onChange={(text) => ehrOverride(key, f.id, text)} />)}
            </div>
          </section>
        </form>
      </div>

      <div className="l-actions">
        <div className="l-msgs" aria-live="polite">
          {mine?.stage === "checking" ? (
            <div className="l-checking" data-testid="lauris-checking" role="status"><span className="pmk" aria-hidden="true">p<em>.</em></span><span className="spin" aria-hidden="true" /><span>Psyflo is checking this request before it saves…</span></div>
          ) : null}
          {mine?.stage === "paused" ? (
            <div className="l-pause" data-testid="lauris-pause" role="alert">
              <span className="pmk" aria-hidden="true">p<em>.</em></span>
              <span><b>Psyflo paused this save:</b> {gating.length} {gating.length === 1 ? "suggestion this request needs is" : "suggestions this request needs are"} still open. Add {gating.length === 1 ? "it" : "them"} in the Psyflo panel, or press Save again to save anyway.</span>
            </div>
          ) : null}
          {!mine && form.saved && c.unsavedCount === 0 && savedAt ? <div className="flash ok" data-testid="lauris-flash" role="status">Saved in Lauris {savedAt}.</div> : null}
        </div>
        <div className="row">
          <button type="button" className="lb pri" data-testid="lauris-save" disabled={mine?.stage === "checking" || !dirty} onClick={() => requestAuthSave(detail.id, gating.length, () => ehrSave(key, detail.requestId))}>Save</button>
          <button type="button" className="lb" onClick={() => navigate(paths.case(detail.id))}>Open in Psyflo</button>
          <span className="small muted" aria-live="polite">{c.unsavedCount > 0 ? `${c.unsavedCount} ${c.unsavedCount === 1 ? "entry" : "entries"} typed by Psyflo, not saved yet` : ""}</span>
        </div>
      </div>
    </>
  );
}
