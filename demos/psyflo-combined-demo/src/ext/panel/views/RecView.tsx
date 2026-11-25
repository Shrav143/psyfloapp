import { CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Link2, OctagonAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AGENTS } from "@/data/agents";
import type { FocusId, Rec } from "@/data/caseDetail";
import { FOCUS, withFocus } from "@/data/caseDetailFocus";
import { CONTEXT_PTS_MAX, currentChance, gainOf, projectedChance } from "@/data/caseModel";
import { RESUBMIT_LABEL, applyArgsFor, gatingRecs, missingInputs, targetOf, useEhrCase, type EhrCase } from "@/ehr/model";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import { useStore as usePlatform } from "@/store";
import { useStore } from "@/ext/store";
import { DismissModal } from "@/pages/authorizations/tabs/DismissModal";
import { RefineModal } from "@/pages/authorizations/tabs/RefineModal";
import "../panel-scan.css";
import "../panel-rec.css";

/* The recommendation section of the extension, for an authorization form open in Lauris. Psyflo suggests what the request still needs, the person decides which to include and gives their own
   words where a suggestion needs them, and the extension types the result into Lauris's own form (yellow until the person saves). It never presses Save.
   Nothing here writes clinical text: a suggestion types the sentence the case's own model already holds for it. */

const st = () => usePlatform.getState();
const prefersReduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The short "Typing into Lauris…" beat before the extension types, about 700 ms. Skipped for reduced motion. */
function useTypingBeat(): { busy: boolean; run: (fn: () => void) => void } {
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const run = (fn: () => void) => {
    if (busy) return;
    if (prefersReduced()) { fn(); return; }
    setBusy(true);
    timer.current = window.setTimeout(() => { setBusy(false); fn(); }, 700);
  };
  return { busy, run };
}

const Footer = () => <footer className="psy-foot sn-foot"><i aria-hidden="true" />Psyflo types. You check it and press Save in Lauris.</footer>;

/** The authorization form is open: who it is for, what is due, and what the approval chance is now and with every suggestion added. */
function CaseStrip({ c }: { c: EhrCase }) {
  const { detail } = c;
  const applied = c.work.applied.length > 0;
  return (
    <section className="p-card rec-strip" data-testid="rec-strip" aria-label="This authorization">
      <div className="p-row sp">
        <div><b className="p-title">{c.consumer.initials}, {c.consumer.age}</b> <span className="p-note">Lauris #{c.consumer.no} · {detail.id}</span></div>
        {c.due ? <span className="p-chip warn">{c.due}</span> : null}
      </div>
      <div className="p-note">{c.consumer.payerName} · {c.consumer.level}{detail.days ? ` · ${detail.days} ${detail.program === "IOP" ? "units" : "days"} requested` : ""}</div>
      <div className="rec-chance" aria-live="polite" data-testid="rec-chance">
        <span className="lbl">{detail.phase === "denial" ? "Chance to overturn" : "Approval chance"}</span>
        <b>{detail.baseChance}%</b><span aria-hidden="true">→</span><b className="to">{applied ? c.chance : c.projected}%</b>
        <span className="p-note">{applied ? "now" : "with every suggestion added"}</span>
      </div>
    </section>
  );
}

/** One suggestion: include it, see where it goes and what it is worth, give the words it needs, read why, or dismiss it. */
function SuggestionCard({ rec, n, c, showError, onDismiss }: { rec: Rec; n: number; c: EhrCase; showError: boolean; onDismiss: () => void }) {
  const [why, setWhy] = useState(false);
  const selected = !c.work.excluded.includes(rec.id);
  const answer = c.work.inputs[rec.id] ?? "";
  const answered = answer.trim().length > 0;
  const agent = AGENTS[rec.agent].name;
  const err = showError && selected && !!rec.input && !answered;
  return (
    <li>
      <div id={`rec-${rec.id}`} className={`p-card rec-card${selected ? " sel" : ""}`} data-testid="rec-card" data-rec={rec.id} data-included={selected}>
        <div className="rec-top">
          <span className="rec-n" aria-hidden="true">{n}</span>
          <input type="checkbox" className="rec-tick" checked={selected} aria-label={`Include "${rec.title}"`} data-testid="rec-include" onChange={() => st().toggleRec(c.key, rec.id)} />
          <button type="button" className="rec-title" onClick={() => st().toggleRec(c.key, rec.id)}>{rec.title}</button>
          <span className="p-chip ok" title="Points added to the approval chance">+{plural(gainOf(rec), "pt")}</span>
        </div>
        <div className="rec-meta">
          <span className="p-chip">Goes in: {targetOf(c.detail, rec)}</span>
          {rec.input ? (answered ? <span className="p-chip ok">Your words added</span> : <span className="p-chip warn">Needs your words</span>) : null}
          {rec.focus ? <span className="p-chip teal">Added for your focus</span> : null}
        </div>
        {rec.bullets[0] ? <p className="rec-line">{rec.bullets[0]}</p> : null}
        {rec.input ? (
          <div className="rec-ask">
            <label className="p-lbl" htmlFor={`rec-in-${rec.id}`}>{rec.input.label}</label>
            <textarea id={`rec-in-${rec.id}`} className="p-input" rows={2} data-testid="rec-input" value={answer} aria-invalid={err || undefined} onChange={(e) => st().setRecInput(c.key, rec.id, e.target.value)} placeholder={rec.input.placeholder} />
            {err ? <p className="rec-err" role="alert">Type your answer before {agent} can type this. Psyflo never writes these words for you.</p> : null}
          </div>
        ) : null}
        {why ? <p className="rec-why">{rec.why}</p> : null}
        <div className="rec-foot">
          <span className="p-note">{agent}</span>
          <button type="button" className="p-link rec-btn" aria-expanded={why} onClick={() => setWhy(!why)}>{why ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}Why</button>
          <span className="p-grow" />
          <button type="button" className="p-btn ghost sm" data-testid="rec-dismiss" aria-label={`Dismiss "${rec.title}"`} onClick={onDismiss}><X size={13} aria-hidden="true" />Dismiss</button>
        </div>
      </div>
    </li>
  );
}

/** The suggestions for the authorization, typed into the Lauris form when the person says so. */
function Suggestions({ c }: { c: EhrCase }) {
  const navigate = useNavigate();
  const { detail, work, key, groups } = c;
  const included = groups.open.filter((r) => !work.excluded.includes(r.id));
  const [showErrors, setShowErrors] = useState(false);
  const [dismissing, setDismissing] = useState<{ id: string; title: string }[] | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxText, setCtxText] = useState("");
  const [said, setSaid] = useState("");
  const { busy, run } = useTypingBeat();

  const typed = groups.applied.filter((r) => c.form.viaEhr.includes(r.id));
  const inPsyflo = groups.applied.filter((r) => !c.form.viaEhr.includes(r.id));
  const authSave = useStore((s) => s.authSave);
  const requestAuthSave = useStore((s) => s.requestAuthSave);
  const gating = gatingRecs(c);

  const add = () => {
    const missing = missingInputs(included, work);
    if (missing.length) {
      setShowErrors(true);
      st().toast({ title: "Add your answer first", body: `${missing.length === 1 ? "One selected suggestion needs" : `${missing.length} selected suggestions need`} your words before they can be typed into Lauris.`, tone: "mid" });
      document.getElementById(`rec-${missing[0].id}`)?.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "center" });
      return;
    }
    const recs = included;
    setSaid("Typing into Lauris…");
    run(() => {
      st().ehrAddRecs(applyArgsFor(detail, work, key, recs));
      setShowErrors(false);
      setSaid(`Added ${plural(recs.length, "item")} to the Lauris form`);
    });
  };
  // The same refine and context behavior as the case page, so the numbers agree.
  const refine = (focus: FocusId) => {
    setRefineOpen(false);
    const next = withFocus(detail, { ...work, focus });
    st().setFocus(key, focus, projectedChance(next, work) - currentChance(next, work));
    const added = next.recs.some((r) => r.focus === focus);
    st().toast({ title: "Recommendations refined", body: `${FOCUS[focus].label}${added ? " · one card added" : ""} · ${projectedChance(next, work)}% with every action`, tone: "good" });
  };
  const addContext = (text: string) => {
    const next = { ...work, context: [...work.context, text] };
    const after = currentChance(detail, next);
    st().addContext({ caseId: key, requestId: detail.requestId, text, syncDashboard: detail.fromQueue, chance: after, liftLeft: projectedChance(detail, next) - after });
  };
  const gates = (ids: string[]) => detail.checks.some((ch) => ch.blockedBy.some((b) => ids.includes(b)));

  return (
    <>
      <div className="psy-body" data-testid="rec-view">
        {authSave?.caseId === c.detail.id && authSave.stage === "paused" ? (
          <section className="p-card sn-pause" data-testid="pause-card" role="alert">
            <div className="head"><OctagonAlert size={18} aria-hidden="true" /><h3 className="p-title">Save paused</h3></div>
            {gating.length ? (
              <>
                <p>{gating.length === 1 ? "1 suggestion this request needs is" : `${gating.length} suggestions this request needs are`} still open, so a check before sending stays red.</p>
                <ul className="rec-plist">{gating.map((r) => <li key={r.id}><button type="button" className="rec-pitem" data-testid="pause-item" onClick={() => document.getElementById(`rec-${r.id}`)?.scrollIntoView({ block: "center" })}>{r.title}</button></li>)}</ul>
                <div className="sn-acts">
                  <button type="button" className="p-btn pri" data-testid="fix-first" onClick={() => document.getElementById(`rec-${gating[0].id}`)?.scrollIntoView({ block: "center" })}>Add them first</button>
                  <button type="button" className="p-btn" data-testid="save-anyway" onClick={() => requestAuthSave(detail.id, gating.length, () => st().ehrSave(key, detail.requestId))}>Save anyway</button>
                </div>
              </>
            ) : <p>Nothing this request needs is open any more. Press Save in Lauris to save.</p>}
          </section>
        ) : null}
        {authSave?.caseId === c.detail.id && authSave.stage === "checking" ? (
          <section className="p-card sn-checking" role="status" aria-live="polite" data-testid="checking-card"><span className="p-spin" aria-hidden="true" /><b>Checking before save…</b></section>
        ) : null}

        <CaseStrip c={c} />

        <h3 className="p-h">Suggested by Psyflo <span className="p-chip" data-testid="rec-count">{groups.open.length}</span></h3>
        {groups.open.length ? (
          <ol className="rec-list">
            {groups.open.map((r, i) => <SuggestionCard key={r.id} rec={r} n={i + 1} c={c} showError={showErrors} onDismiss={() => setDismissing([{ id: r.id, title: r.title }])} />)}
          </ol>
        ) : (
          <p className={`rec-done${groups.applied.length ? " ok" : ""}`} data-testid="rec-none">
            {groups.applied.length ? <><CheckCircle2 size={16} aria-hidden="true" />Every suggestion is added</> : "No suggestions for this authorization."}
          </p>
        )}

        {typed.length ? (
          <>
            <h3 className="p-h">Typed in Lauris <span className="p-chip">{typed.length}</span></h3>
            <ul className="rec-list" data-testid="rec-typed">
              {typed.map((r) => {
                const unsaved = c.form.unsaved.includes(r.id);
                return (
                  <li key={r.id}>
                    <div className={`p-card rec-card${unsaved ? " typed" : ""}`} data-typed={r.id}>
                      <div className="p-row sp"><b className="p-title">{r.title}</b><span className={`p-chip ${unsaved ? "typed" : "saved"}`}>{unsaved ? "Typed · not saved" : "Saved in Lauris"}</span></div>
                      <div className="p-note">Goes in: {targetOf(detail, r)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        {inPsyflo.length ? (
          <>
            <h3 className="p-h">Added in Psyflo</h3>
            <ul className="rec-plain">{inPsyflo.map((r) => <li key={r.id}><CheckCircle2 size={13} aria-hidden="true" />{r.title}</li>)}</ul>
          </>
        ) : null}
      </div>

      <footer className="psy-foot rec-foot-bar">
        <p role="status" aria-live="polite" className="sr-only">{said}</p>
        {groups.open.length ? (
          <>
            <button type="button" className="p-btn pri block" data-testid="rec-add" disabled={busy || included.length === 0} onClick={add}>{busy ? "Typing into Lauris…" : `Add ${included.length} to the Lauris form`}</button>
            <div className="p-row">
              <button type="button" className="p-btn sm" data-testid="rec-refine" disabled={busy} onClick={() => setRefineOpen(true)}>Refine</button>
              <button type="button" className="p-btn sm" data-testid="rec-context" disabled={busy} onClick={() => setCtxOpen(true)}>Add clinical context</button>
              <button type="button" className="p-btn sm danger" data-testid="rec-dismiss-all" disabled={busy || included.length === 0} onClick={() => setDismissing(included.map((r) => ({ id: r.id, title: r.title })))}>Dismiss</button>
            </div>
          </>
        ) : null}
        <div className="rec-or">Or add them in Psyflo <button type="button" className="p-link" data-testid="rec-open-psyflo" onClick={() => navigate(paths.case(detail.id))}>Open in Psyflo <ExternalLink size={12} aria-hidden="true" /></button></div>
      </footer>

      {dismissing ? (
        <DismissModal
          titles={dismissing.map((d) => d.title)} gating={dismissing.filter((d) => gates([d.id])).map((d) => d.title)} onClose={() => setDismissing(null)}
          onConfirm={(reason) => { st().dismissRecs(key, detail.requestId, dismissing, reason); setDismissing(null); }}
        />
      ) : null}
      {refineOpen ? <RefineModal current={work.focus} onClose={() => setRefineOpen(false)} onApply={refine} /> : null}
      {ctxOpen ? <ContextDialog onClose={() => setCtxOpen(false)} text={ctxText} setText={setCtxText} onAdd={(t) => { addContext(t); setCtxText(""); setCtxOpen(false); }} /> : null}
    </>
  );
}

/** A small dialog for one more fact the clinician knows. +1 point each, up to the cap. Not sent to the payer. */
function ContextDialog({ onClose, text, setText, onAdd }: { onClose: () => void; text: string; setText: (t: string) => void; onAdd: (t: string) => void }) {
  return (
    <div className="rec-dlg" role="dialog" aria-modal="true" aria-label="Add clinical context" data-testid="rec-context-dialog">
      <div className="box">
        <h3 className="p-title">Add clinical context</h3>
        <textarea className="p-input" rows={4} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. He called the program himself on 10/19 and asked for a bed." aria-label="Clinical context" data-testid="rec-context-input" />
        <p className="p-note">+1 pt each, up to {CONTEXT_PTS_MAX}. Not sent to the payer.</p>
        <div className="p-row sp"><button type="button" className="p-btn" onClick={onClose}>Cancel</button><button type="button" className="p-btn pri" data-testid="rec-context-add" disabled={!text.trim()} onClick={() => onAdd(text.trim())}>Add context</button></div>
      </div>
    </div>
  );
}

/** The corrections a denial's findings suggest, typed into Lauris. The appeal letter stays in Psyflo. */
function Corrections({ c, denial }: { c: EhrCase; denial: NonNullable<EhrCase["denial"]> }) {
  const navigate = useNavigate();
  const [sel, setSel] = useState<Set<string>>(() => new Set(c.fixes.filter((f) => !f.typed && f.finding.sev === "Critical").map((f) => f.finding.id)));
  const [said, setSaid] = useState("");
  const { busy, run } = useTypingBeat();
  const selected = c.fixes.filter((f) => !f.typed && sel.has(f.finding.id));
  const open = c.fixes.filter((f) => !f.typed).length;
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const add = () => {
    const fixes = selected.map((f) => ({ id: f.finding.id, title: f.finding.title }));
    setSaid("Typing into Lauris…");
    run(() => { st().ehrAddFixes({ key: c.key, requestId: c.detail.requestId, fixes }); setSaid(`Added ${plural(fixes.length, "correction")} to the Lauris form`); });
  };
  return (
    <>
      <div className="psy-body" data-testid="denial-view">
        <section className="p-card rec-strip" aria-label="This denial">
          <div className="p-row sp"><b className="p-title">{denial.req.id}</b><span className="p-chip warn">{denial.meta.type}</span></div>
          <div className="p-note">{c.consumer.initials}, {c.consumer.age} · Lauris #{c.consumer.no} · {c.consumer.payerName} · {c.consumer.level}</div>
        </section>
        <h3 className="p-h">Corrections for the authorization <span className="p-chip">{c.fixes.length}</span></h3>
        <p className="p-note">Goes in: {RESUBMIT_LABEL}</p>
        {c.fixes.length ? (
          <ul className="rec-list">
            {c.fixes.map((f) => {
              const checked = sel.has(f.finding.id);
              return (
                <li key={f.finding.id}>
                  <div id={`fix-${f.finding.id}`} className={`p-card rec-card${f.typed ? (f.unsaved ? " typed" : "") : checked ? " sel" : ""}`} data-testid="denial-fix" data-fix={f.finding.id} data-typed={f.typed}>
                    <div className="rec-top">
                      {f.typed ? <CheckCircle2 size={17} className="rec-ok" aria-hidden="true" /> : <input type="checkbox" className="rec-tick" checked={checked} aria-label={`Include "${f.finding.title}"`} onChange={() => toggle(f.finding.id)} />}
                      <button type="button" className="rec-title" disabled={f.typed} onClick={() => toggle(f.finding.id)}>{f.finding.title}</button>
                      <span className={`p-chip ${f.finding.sev === "Critical" ? "danger" : "warn"}`}>{f.finding.sev}</span>
                    </div>
                    <div className="rec-meta">
                      <span className="p-chip"><Link2 size={11} aria-hidden="true" />{f.finding.source}</span>
                      {f.typed ? <span className={`p-chip ${f.unsaved ? "typed" : "saved"}`}>{f.unsaved ? "Typed · not saved" : "Saved in Lauris"}</span> : null}
                      {f.inEvidence ? <span className="p-chip">In the appeal evidence</span> : null}
                    </div>
                    <div className="rec-quote"><span className="p-lbl">Typed as</span><blockquote>{f.line}</blockquote></div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <p className="p-note">The analysis found nothing to correct.</p>}
        <section className="p-card" aria-label="Appeal letter">
          <h3 className="p-title">Appeal letter</h3>
          <p className="p-sub">Written in Psyflo, not in Lauris.</p>
          <button type="button" className="p-btn sm" data-testid="rec-open-appeal" onClick={() => navigate(paths.denials(denial.req.id))}><ExternalLink size={13} aria-hidden="true" />Open the appeal in Psyflo</button>
        </section>
      </div>
      <footer className="psy-foot rec-foot-bar">
        <p role="status" aria-live="polite" className="sr-only">{said}</p>
        {open ? (
          <button type="button" className="p-btn pri block" data-testid="denial-add" disabled={busy || selected.length === 0} onClick={add}>{busy ? "Typing into Lauris…" : `Add ${selected.length} to the Lauris form`}</button>
        ) : <p className="rec-done ok"><CheckCircle2 size={16} aria-hidden="true" />Every correction is typed</p>}
      </footer>
    </>
  );
}

/** Scan & Enhance on an authorization form: what would make the approval likelier, typed into the Lauris form. A denied authorization also has its denial corrections. */
export default function RecView({ caseId, view }: { caseId: string; view?: "auth" | "denial" }) {
  const c = useEhrCase(caseId);
  const [tab, setTab] = useState<"auth" | "denial">(view === "denial" ? "denial" : "auth");
  useEffect(() => setTab(view === "denial" ? "denial" : "auth"), [view, caseId]);
  if (!c) {
    return (
      <>
        <div className="psy-body"><section className="p-card"><h2 className="p-big">No authorization here</h2><p className="p-sub">Psyflo has no authorization request for this consumer.</p></section></div>
        <Footer />
      </>
    );
  }
  const denial = c.denial;
  return (
    <>
      {denial ? (
        <div className="p-seg rec-seg" role="tablist" aria-label="What the extension shows">
          <button type="button" role="tab" aria-selected={tab === "auth"} aria-pressed={tab === "auth"} data-testid="rec-tab-auth" onClick={() => setTab("auth")}>Suggestions</button>
          <button type="button" role="tab" aria-selected={tab === "denial"} aria-pressed={tab === "denial"} data-testid="rec-tab-denial" onClick={() => setTab("denial")}>Denial corrections</button>
        </div>
      ) : null}
      {denial && tab === "denial" ? <Corrections c={c} denial={denial} /> : <Suggestions c={c} />}
    </>
  );
}
