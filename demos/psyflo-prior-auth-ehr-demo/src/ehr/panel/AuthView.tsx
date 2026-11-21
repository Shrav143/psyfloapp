import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ChevronRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AgentBadge, Button, Field, Modal, Pill, TextArea } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import type { FocusId, Rec } from "@/data/caseDetail";
import { FOCUS, withFocus } from "@/data/caseDetailFocus";
import { CONTEXT_PTS_MAX, currentChance, projectedChance } from "@/data/caseModel";
import { applyArgsFor, missingInputs, targetOf, type EhrCase } from "@/ehr/model";
import { plural } from "@/lib/format";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { DismissModal } from "@/pages/authorizations/tabs/DismissModal";
import { RefineModal } from "@/pages/authorizations/tabs/RefineModal";
import { CaseStrip, GoLink, PCard, PanelFooter, PanelTitle, Tick, TypedChip, ptsPill, useTypingBeat } from "./parts";

const st = () => useStore.getState();

/** One suggestion: include it, see where it goes and what it is worth, give the words it needs, read why, or dismiss it. */
function SuggestionCard({ rec, n, c, showError, onDismiss }: { rec: Rec; n: number; c: EhrCase; showError: boolean; onDismiss: () => void }) {
  const [why, setWhy] = useState(false);
  const selected = !c.work.excluded.includes(rec.id);
  const answer = c.work.inputs[rec.id] ?? "";
  const answered = answer.trim().length > 0;
  const agent = AGENTS[rec.agent].name;
  return (
    <li>
      <PCard id={`ehr-rec-${rec.id}`} tone={selected ? "selected" : undefined} className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-bg text-[12px] font-semibold text-neutral-ink" aria-hidden="true">{n}</span>
          <Tick checked={selected} label={`Include "${rec.title}"`} onChange={() => st().toggleRec(c.key, rec.id)} />
          <span className="min-w-0 flex-1 cursor-pointer text-[14px] leading-snug font-semibold" onClick={() => st().toggleRec(c.key, rec.id)}>{rec.title}</span>
          {ptsPill(rec)}
        </div>
        <div className="ml-[34px] flex flex-wrap items-center gap-1.5">
          <Pill tone="neutral">Goes in: {targetOf(c.detail, rec)}</Pill>
          {rec.input ? (answered ? <Pill tone="good">Your words added</Pill> : <Pill tone="mid">Needs your words</Pill>) : null}
          {rec.focus ? <Pill tone="neutral">Added for your focus</Pill> : null}
        </div>
        {rec.bullets[0] ? <div className="ml-[34px] flex items-start gap-1.5 text-[13px] text-ink2"><ArrowRight size={13} className="ico mt-[3px] shrink-0 text-muted" aria-hidden="true" /><span className="min-w-0">{rec.bullets[0]}</span></div> : null}
        {rec.input ? (
          <div className="ml-[34px]">
            <Field label={rec.input.label} required error={showError && selected && !answered ? `Type your answer before ${agent} can type this.` : undefined}>
              <TextArea rows={2} className="min-h-14!" value={answer} onChange={(e) => st().setRecInput(c.key, rec.id, e.target.value)} placeholder={rec.input.placeholder} />
            </Field>
          </div>
        ) : null}
        {why ? <div className="ml-[34px] rounded-lg bg-tile px-2.5 py-2 text-[13px] text-ink2">{rec.why}</div> : null}
        <div className="ml-[34px] flex flex-wrap items-center gap-1">
          <AgentBadge agent={rec.agent} size={16} />
          <span className="mr-1 text-[12px] text-muted">{agent}</span>
          <button type="button" onClick={() => setWhy(!why)} aria-expanded={why} className="inline-flex min-h-7 items-center gap-0.5 rounded-md px-1 text-[12px] font-semibold text-forest hover:bg-sage-bg">
            {why ? <ChevronDown size={13} className="ico" aria-hidden="true" /> : <ChevronRight size={13} className="ico" aria-hidden="true" />}Why
          </button>
          <span className="flex-1" />
          <Button size="sm" variant="ghost" icon={X} onClick={onDismiss} className="!text-muted" aria-label={`Dismiss "${rec.title}"`}>Dismiss</Button>
        </div>
      </PCard>
    </li>
  );
}

/** The extension on an authorization form: the suggestions for this request, typed into the Lauris form when the person says so. */
export function AuthView({ c, tabs }: { c: EhrCase; tabs: ReactNode }) {
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

  const add = () => {
    const missing = missingInputs(included, work);
    if (missing.length) {
      setShowErrors(true);
      st().toast({ title: "Add your answer first", body: `${missing.length === 1 ? "One selected suggestion needs" : `${missing.length} selected suggestions need`} your words before they can be typed into Lauris.`, tone: "mid" });
      document.getElementById(`ehr-rec-${missing[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
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
  const gating = (ids: string[]) => detail.checks.some((ch) => ch.blockedBy.some((b) => ids.includes(b)));

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        <button type="button" onClick={() => navigate(paths.lauris())} className="-mb-1 inline-flex min-h-8 items-center gap-1.5 self-start rounded-md text-[13px] font-semibold text-forest hover:underline">
          <ArrowLeft size={14} className="ico" aria-hidden="true" />All consumers
        </button>
        {tabs}
        <CaseStrip c={c} />

        <section aria-label="Suggested by Psyflo" className="flex flex-col gap-2">
          <PanelTitle count={groups.open.length}>Suggested by Psyflo</PanelTitle>
          {groups.open.length ? (
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {groups.open.map((r, i) => <SuggestionCard key={r.id} rec={r} n={i + 1} c={c} showError={showErrors} onDismiss={() => setDismissing([{ id: r.id, title: r.title }])} />)}
            </ol>
          ) : (
            <div className={cn("flex items-center gap-2 text-[13px] font-semibold", groups.applied.length ? "text-good-ink" : "text-muted")}>
              {groups.applied.length ? <><CheckCircle2 size={16} className="ico text-good" aria-hidden="true" />Every recommendation is added</> : "No recommendations for this authorization."}
            </div>
          )}
        </section>

        {typed.length ? (
          <section aria-label="Typed in Lauris" className="flex flex-col gap-2">
            <PanelTitle count={typed.length}>Typed in Lauris</PanelTitle>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {typed.map((r) => {
                const unsaved = c.form.unsaved.includes(r.id);
                return (
                  <li key={r.id}>
                    <PCard tone={unsaved ? "typed" : undefined} className="flex flex-col gap-1">
                      <div className="flex items-start gap-2"><span className="min-w-0 flex-1 text-[13px] font-semibold">{r.title}</span><TypedChip unsaved={unsaved} /></div>
                      <div className="text-[12px] text-muted">Goes in: {targetOf(detail, r)}</div>
                    </PCard>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {inPsyflo.length ? (
          <section aria-label="Added in Psyflo" className="flex flex-col gap-1">
            <div className="text-[12px] font-semibold text-muted">Added in Psyflo</div>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-[13px] text-muted">
              {inPsyflo.map((r) => <li key={r.id} className="flex items-start gap-1.5"><CheckCircle2 size={13} className="ico mt-[3px] shrink-0" aria-hidden="true" />{r.title}</li>)}
            </ul>
          </section>
        ) : null}
      </div>

      <PanelFooter>
        <p role="status" aria-live="polite" className="sr-only">{said}</p>
        {groups.open.length ? (
          <>
            <Button variant="primary" loading={busy} disabled={included.length === 0} onClick={add}>{busy ? "Typing into Lauris…" : `Add ${included.length} to the Lauris form`}</Button>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" disabled={busy} onClick={() => setRefineOpen(true)}>Refine</Button>
              <Button size="sm" disabled={busy} onClick={() => setCtxOpen(true)}>Add clinical context</Button>
              <Button size="sm" variant="danger" disabled={busy || included.length === 0} onClick={() => setDismissing(included.map((r) => ({ id: r.id, title: r.title })))}>Dismiss</Button>
            </div>
          </>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-1 text-[12px] text-muted">Or add them in Psyflo<GoLink to={paths.case(detail.id)} external>Open in Psyflo</GoLink></div>
      </PanelFooter>

      {dismissing ? (
        <DismissModal
          titles={dismissing.map((d) => d.title)} gating={dismissing.filter((d) => gating([d.id])).map((d) => d.title)} onClose={() => setDismissing(null)}
          onConfirm={(reason) => { st().dismissRecs(key, detail.requestId, dismissing, reason); setDismissing(null); }}
        />
      ) : null}
      {refineOpen ? <RefineModal current={work.focus} onClose={() => setRefineOpen(false)} onApply={refine} /> : null}
      <Modal
        open={ctxOpen} onClose={() => setCtxOpen(false)} title="Add clinical context" size="sm"
        footer={<><Button onClick={() => setCtxOpen(false)}>Cancel</Button><Button variant="primary" disabled={!ctxText.trim()} onClick={() => { addContext(ctxText.trim()); setCtxText(""); setCtxOpen(false); }}>Add context</Button></>}
      >
        <TextArea rows={4} autoFocus value={ctxText} onChange={(e) => setCtxText(e.target.value)} placeholder="e.g. He called the program himself on 10/19 and asked for a bed." aria-label="Clinical context" />
        <div className="mt-2 text-[12px] text-muted">+1 pt each, up to {CONTEXT_PTS_MAX}. Not sent to the payer.</div>
      </Modal>
    </>
  );
}
