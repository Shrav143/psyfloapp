import { Check, ChevronDown, Lock, OctagonAlert, ScanSearch, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { KIND_LABEL, SEV_LABEL, SEV_RANK, checksFor, fieldByKey, fieldsOf, isEmpty, usDate } from "@/ext/engine";
import { tally, useCurrent } from "@/ext/hooks";
import { useStore, type ScanState } from "@/ext/store";
import Picker from "./scribe/Picker";
import RecView from "./RecView";
import type { Check as AuditCheck, Consumer, DocSeed, DocState, Finding, FormSpec, Severity } from "@/ext/types";
import "../panel-scan.css";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const prefersReduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Can "Add all that are ready" take this one? Mirrors the store: a stored sentence, or an answer the person gave. */
const isReady = (f: Finding, answers: Record<string, string>): boolean => {
  const fix = f.fix;
  if (!fix) return false;
  if (fix.kind === "text") return true;
  const a = answers[f.id];
  return fix.kind === "ask" ? !!(a ?? "").trim() : !!a && fix.options.includes(a);
};

const Footer = () => (
  <footer className="psy-foot sn-foot"><i aria-hidden="true" />Psyflo types. You check it and press Save in Lauris.</footer>
);

/** Scan & Enhance and Check before save. */
export default function ScanView() {
  const { clinic, page, docId, seed, spec, consumer, doc, scan } = useCurrent();
  if (page.kind === "auth") return <RecView key={`${page.caseId}:${page.view ?? ""}`} caseId={page.caseId} view={page.view} />;
  if (!docId || !seed || !spec || !doc) return <NoDocument />;
  return <DocScan key={docId} clinicShort={clinic.profile.short} docId={docId} seed={seed} spec={spec} consumer={consumer} doc={doc} scan={scan} />;
}

/* ------------------------------------------------------ no document open */

function NoDocument() {
  return (
    <>
      <div className="psy-body">
        <section className="p-card" data-testid="scan-empty" aria-labelledby="sn-nodoc">
          <h2 className="p-big" id="sn-nodoc">Scan a document</h2>
          <p className="p-sub">Scan &amp; Enhance checks whatever document is open in Lauris. Open one there, or choose it here.</p>
          <Picker then="scan" />
        </section>
      </div>
      <Footer />
    </>
  );
}

/* ------------------------------------------------------ a document is open */

interface DocScanProps { clinicShort: string; docId: string; seed: DocSeed; spec: FormSpec; consumer: Consumer | undefined; doc: DocState; scan: ScanState | undefined }

function DocScan({ clinicShort, docId, seed, spec, consumer, doc, scan }: DocScanProps) {
  const clinic = useStore((s) => s.clinic);
  const focus = useStore((s) => s.focus);
  const checking = useStore((s) => s.checking);
  const pause = useStore((s) => s.pause);
  const settings = useStore((s) => s.settings);
  const scanRun = useStore((s) => s.scanRun);
  const fixAllReady = useStore((s) => s.fixAllReady);
  const focusFinding = useStore((s) => s.focusFinding);
  const requestSave = useStore((s) => s.requestSave);
  const setTab = useStore((s) => s.setTab);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const nodes = useRef(new Map<string, HTMLElement>());
  const doneFor = useRef<string | null>(null);

  const fields = fieldsOf(spec);
  const checks = checksFor(clinic, seed.kind);
  const scanned = !!scan?.scannedAt;
  const answers = scan?.answers ?? {};
  const status = scan?.status ?? {};
  const open = scan ? scan.findings.filter((f) => status[f.id] === "open") : [];
  const handled = scan ? scan.findings.filter((f) => status[f.id] === "added" || status[f.id] === "dismissed") : [];
  const counts = scan ? tally(scan.findings, status) : null;
  const payer = clinic.profile.payers.find((p) => p.id === consumer?.payer)?.name;

  const scrollTo = (id: string) => nodes.current.get(id)?.scrollIntoView({ block: "start", behavior: prefersReduced() ? "auto" : "smooth" });
  const jump = (id: string) => {
    setCollapsed((c) => (c[id] ? { ...c, [id]: false } : c));
    focusFinding(id);
    requestAnimationFrame(() => scrollTo(id));
  };

  /* The person clicked a Psyflo chip in Lauris: show that card. Scroll once per click, never take keyboard focus. */
  useEffect(() => {
    if (!focus) { doneFor.current = null; return; }
    if (doneFor.current === focus || !nodes.current.has(focus)) return;
    doneFor.current = focus;
    setCollapsed((c) => (c[focus] ? { ...c, [focus]: false } : c));
    requestAnimationFrame(() => scrollTo(focus));
  });

  /* Acting on a card other than the highlighted one clears the highlight. */
  const acting = (id?: string) => { if (focus && focus !== id) focusFinding(null); };

  /* Check before save */
  const pausedHere = pause?.docId === docId;
  const pausedOpen = pausedHere && scan ? pause.ids.map((id) => scan.findings.find((f) => f.id === id)).filter((f): f is Finding => !!f && status[f.id] === "open") : [];
  const checkOn = settings.onSave && settings.pauseAt !== "never";
  const levelName = settings.pauseAt === "never" ? "" : SEV_LABEL[settings.pauseAt];

  return (
    <>
      <div className="psy-body">
        {pausedHere ? (
          <section className="p-card sn-pause" data-testid="pause-card" role="alert">
            <div className="head"><OctagonAlert size={18} aria-hidden="true" /><h3 className="p-title">Save paused</h3></div>
            {pausedOpen.length ? (
              <>
                <p>{pausedOpen.length === 1 ? "1 alert" : `${pausedOpen.length} alerts`} at {levelName || "the chosen level"} or above {pausedOpen.length === 1 ? "is" : "are"} still open.</p>
                <ul className="sn-plist">
                  {pausedOpen.map((f) => (
                    <li key={f.id}>
                      <button type="button" className="sn-pitem" data-testid="pause-item" data-finding-ref={f.id} onClick={() => jump(f.id)}>
                        <span className={`p-chip sev-${f.severity}`}>{SEV_LABEL[f.severity]}</span>
                        <span className="tx">{f.title}<small>→ {fieldByKey(spec, f.fieldKey)?.label ?? f.fieldKey}</small></span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="sn-acts">
                  <button type="button" className="p-btn pri" data-testid="fix-first" onClick={() => jump(pausedOpen[0].id)}>Fix them first</button>
                  <button type="button" className="p-btn" data-testid="save-anyway" onClick={() => requestSave(docId)}>Save anyway</button>
                </div>
                <p className="note">Save anyway saves what is in Lauris now and records the open alerts in History.</p>
              </>
            ) : (
              <p>Nothing at {levelName || "the chosen level"} or above is open any more. Press Save in Lauris to save.</p>
            )}
          </section>
        ) : null}

        {checking === docId ? (
          <section className="p-card sn-checking" role="status" aria-live="polite" data-testid="checking-card">
            <span className="p-spin" aria-hidden="true" />
            <b>Checking before save…</b>
          </section>
        ) : null}

        {scan?.stale && !scan.running ? (
          <div className="sn-stale" role="status" data-testid="scan-stale">
            <TriangleAlert size={16} aria-hidden="true" />
            <span>You changed the document after the scan. Scan again.</span>
          </div>
        ) : null}

        {scan?.running ? (
          <section className="p-card sn-busy" role="status" aria-live="polite" data-testid="scan-running">
            <span className="p-spin" aria-hidden="true" />
            <div>
              <b>Reading {plural(fields.length, "field")}… checking {plural(checks.length, "check")}</b>
              <span className="sub">Psyflo reads, it does not type, until you ask it to.</span>
            </div>
          </section>
        ) : !scanned ? (
          <section className="p-card sn-intro" data-testid="scan-intro">
            <div className="head">
              <span className="sn-ico" aria-hidden="true"><ScanSearch size={16} /></span>
              <h3 className="p-title">Scan &amp; Enhance</h3>
            </div>
            <p className="p-sub">
              Reads this document the way a reviewer would, checks it against {clinicShort}'s rules and {payer ? `${payer}'s` : "the payer's"} criteria, and proposes fixes you can type into Lauris with one click.
            </p>
            <details className="sn-sees" data-testid="scan-sees">
              <summary><span>What Psyflo sees on this page</span><span className="p-note">{plural(fields.length, "field")}</span><ChevronDown size={15} aria-hidden="true" /></summary>
              <div className="body">
                {spec.sections.map((sec) => (
                  <div key={sec.id}>
                    <div className="sn-sec">{sec.title}</div>
                    <ul className="sn-fields">
                      {sec.fields.map((f) => (
                        <li key={f.key} className="sn-field" data-field-seen={f.key}>
                          <div className="tx">
                            <div className="lbl">{f.label}</div>
                            {f.lock ? <div className="perm lock"><Lock size={11} aria-hidden="true" />Clinician only</div> : <div className="perm">Psyflo may type here</div>}
                          </div>
                          <span className="p-kind">{KIND_LABEL[f.kind]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
            <button type="button" className="p-btn pri block" data-testid="scan-run" onClick={() => scanRun(docId)}>Scan this document</button>
          </section>
        ) : (
          <>
            <section className="p-card sn-top">
              <div className="sn-tally" data-testid="scan-tally" role="group" aria-label="What the scan found">
                {(["severe", "medium", "low"] as Severity[]).map((s) => (
                  <span key={s} className={`p-chip sev-${s}${counts![s] ? "" : " zero"}`} data-tally={s}>{SEV_LABEL[s]} <b>{counts![s]}</b></span>
                ))}
                <span className={`p-chip typed${counts!.added ? "" : " zero"}`} data-tally="typed">Typed <b>{counts!.added}</b></span>
              </div>
              <div className="sn-when">
                <span>Scanned {usDate(scan!.scannedAt!)}</span>
                <button type="button" className={`p-btn sm${scan!.stale ? " pri" : ""}`} data-testid="scan-run" onClick={() => scanRun(docId)}>Scan again</button>
              </div>
              {open.length ? (
                <button type="button" className="p-btn block" data-testid="fix-all" disabled={!open.some((f) => isReady(f, answers))} onClick={() => { acting(); fixAllReady(docId); }}>
                  Add all that are ready
                </button>
              ) : null}
            </section>

            {open.length ? (
              <>
                <h3 className="p-h">To review · {open.length}</h3>
                {open.map((f) => (
                  <FindingCard
                    key={f.id} f={f} spec={spec} scan={scan!} focused={focus === f.id} collapsed={!!collapsed[f.id]} doc={doc}
                    register={(el) => { if (el) nodes.current.set(f.id, el); else nodes.current.delete(f.id); }}
                    toggle={() => setCollapsed((c) => ({ ...c, [f.id]: !c[f.id] }))} acting={acting}
                  />
                ))}
              </>
            ) : (
              <div className="p-card done sn-clear" data-testid="scan-clear">
                <b>Nothing left to review</b>
                <span>{counts!.added ? "Everything Psyflo found is handled. Check what it typed, then Save in Lauris." : handled.length ? "Everything Psyflo found is handled." : "Every check passed."}</span>
              </div>
            )}

            {handled.length ? (
              <>
                <h3 className="p-h" data-testid="handled-head">Handled · {handled.length}</h3>
                {handled.map((f) => (
                  <FindingCard
                    key={f.id} f={f} spec={spec} scan={scan!} focused={focus === f.id} collapsed={false} doc={doc}
                    register={(el) => { if (el) nodes.current.set(f.id, el); else nodes.current.delete(f.id); }}
                    toggle={() => undefined} acting={acting}
                  />
                ))}
              </>
            ) : null}

            {checks.length ? <ChecksRun checks={checks} scan={scan!} /> : null}
          </>
        )}

        <p className="sn-status" data-testid="save-status">
          <ShieldCheck size={14} aria-hidden="true" />
          <span>
            Check before save is <b>{checkOn ? "on" : "off"}</b>{checkOn ? <> · pauses at <b>{levelName}</b> or above</> : null} (change it in <button type="button" className="p-link" onClick={() => setTab("settings")}>Settings</button>)
          </span>
        </p>
      </div>
      <Footer />
    </>
  );
}

/* ----------------------------------------------------------- one finding */

interface CardProps {
  f: Finding; spec: FormSpec; scan: ScanState; doc: DocState;
  focused: boolean; collapsed: boolean;
  register: (el: HTMLElement | null) => void;
  toggle: () => void;
  acting: (id?: string) => void;
}

function FindingCard({ f, spec, scan, doc, focused, collapsed, register, toggle, acting }: CardProps) {
  const fixAnswer = useStore((s) => s.fixAnswer);
  const fixApply = useStore((s) => s.fixApply);
  const fixDismiss = useStore((s) => s.fixDismiss);
  const fixRestore = useStore((s) => s.fixRestore);
  const st = scan.status[f.id];
  const field = fieldByKey(spec, f.fieldKey);
  const label = field?.label ?? f.fieldKey;
  const answer = scan.answers[f.id] ?? "";
  const common = { "data-testid": "finding", "data-finding": f.id, "data-sev": f.severity, "data-status": st } as const;

  if (st === "added") {
    return (
      <article ref={register} {...common} className={`p-card done sn-line${focused ? " sel" : ""}`}>
        <div className="row">
          <Check size={15} aria-hidden="true" color="var(--ok)" />
          <div>
            <div className="what">Typed into Lauris · check it, then Save in Lauris</div>
            <div className="of">{f.title} · {label}</div>
          </div>
        </div>
      </article>
    );
  }

  if (st === "dismissed") {
    return (
      <article ref={register} {...common} className={`p-card sn-line off${focused ? " sel" : ""}`}>
        <div className="row">
          <div>
            <div className="what">Dismissed · <button type="button" className="p-link" data-testid="fix-restore" onClick={() => { acting(f.id); fixRestore(f.id); }}>Restore</button></div>
            <div className="of">{f.title} · {label}</div>
          </div>
        </div>
      </article>
    );
  }

  const fix = f.fix;
  const body = `fb-${f.id}`;
  const cur = doc.values[f.fieldKey];
  const hasText = (field?.kind === "text" || field?.kind === "textarea") && !isEmpty(cur);
  const ready = isReady(f, scan.answers);
  const type = () => { acting(f.id); fixApply(f.id); };
  const dismiss = () => { acting(f.id); fixDismiss(f.id); };

  return (
    <article ref={register} {...common} className={`p-card sn-find${focused ? " sel" : ""}`}>
      <button type="button" className="sn-fhead" aria-expanded={!collapsed} aria-controls={collapsed ? undefined : body} onClick={toggle}>
        <span className={`p-chip sev-${f.severity}`}>{SEV_LABEL[f.severity]}</span>
        <span className="sn-ftitle">{f.title}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <div className="sn-chips">
        <span className="p-chip teal">→ {label}</span>
        <span className="p-chip rule">{f.rule}</span>
      </div>

      {!collapsed ? (
        <div className="sn-fbody" id={body}>
          <p className="sn-why"><span className="sn-k">Why</span>{" "}{f.why}</p>

          {fix?.kind === "text" ? (
            <>
              <blockquote className="sn-quote">{fix.text}</blockquote>
              <div className="sn-src"><span className="p-chip">From the chart · {fix.source}</span></div>
              {hasText ? <p className="sn-mode">{fix.mode === "append" ? "It goes after what is already in the box." : "It replaces what is in the box now."}</p> : null}
            </>
          ) : null}

          {fix?.kind === "ask" ? (
            <>
              <label className="p-lbl" htmlFor={`fa-${f.id}`}>{fix.prompt}</label>
              <textarea
                id={`fa-${f.id}`} className="p-input" data-testid="fix-answer" rows={3} placeholder={fix.placeholder ?? "In your words"}
                value={answer} onChange={(e) => { acting(f.id); fixAnswer(f.id, e.target.value); }}
              />
              {answer.trim() ? (
                <div className="sn-preview" data-testid="fix-preview"><b>Psyflo will type:</b> {fix.frame(answer.trim())}</div>
              ) : (
                <p className="sn-hint">Write it in your words. Psyflo shows exactly what it will type before it types.</p>
              )}
              {fix.source ? <p className="sn-hint">Source: {fix.source}</p> : null}
              {hasText ? <p className="sn-mode">{fix.mode === "append" ? "It goes after what is already in the box." : "It replaces what is in the box now."}</p> : null}
            </>
          ) : null}

          {fix?.kind === "choose" ? (
            <>
              <p className="sn-q" id={`fq-${f.id}`}>{fix.prompt}</p>
              <div className="sn-opts" role="group" aria-labelledby={`fq-${f.id}`}>
                {fix.options.map((o) => (
                  <button key={o} type="button" className="sn-opt" data-option={o} aria-pressed={answer === o} onClick={() => { acting(f.id); fixAnswer(f.id, o); }}>
                    <i aria-hidden="true" /><span>{o}</span>
                  </button>
                ))}
              </div>
              {fix.source ? <p className="sn-hint">Source: {fix.source}</p> : null}
            </>
          ) : null}

          {fix === null ? <p className="sn-own" data-testid="fix-none">This one is yours to decide. Psyflo can name it but not fix it.</p> : null}

          <div className="sn-acts">
            {fix ? <button type="button" className="p-btn pri sm" data-testid="fix-add" disabled={!ready} onClick={type}>+ Type into Lauris</button> : null}
            <button type="button" className="p-btn ghost sm dismiss" data-testid="fix-dismiss" onClick={dismiss}>Dismiss ×</button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

/* ------------------------------------------------------------ Checks run */

function ChecksRun({ checks, scan }: { checks: AuditCheck[]; scan: ScanState }) {
  const rows = checks.map((c) => {
    const mine = scan.findings.filter((f) => f.checkId === c.id);
    const openOnes = mine.filter((f) => scan.status[f.id] === "open");
    const top = openOnes.reduce<Severity>((m, f) => (SEV_RANK[f.severity] > SEV_RANK[m] ? f.severity : m), openOnes[0]?.severity ?? c.severity);
    const result = openOnes.length ? "flagged" : mine.some((f) => scan.status[f.id] === "added") ? "fixed" : mine.length ? "dismissed" : "passed";
    return { c, result, n: openOnes.length, top };
  });
  const modules = [...new Set(checks.map((c) => c.module))];
  const flagged = rows.filter((r) => r.result === "flagged").length;
  return (
    <details className="p-card sn-checks" data-testid="checks-run">
      <summary>
        <span>Checks run</span>
        <span className="p-note">{plural(checks.length, "check")} · {flagged ? `${flagged} flagged` : "none flagged"}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </summary>
      <div className="body">
        {modules.map((m) => (
          <div key={m}>
            <div className="sn-mod">{m}</div>
            <ul className="sn-log">
              {rows.filter((r) => r.c.module === m).map(({ c, result, n, top }) => (
                <li key={c.id} data-check={c.id} data-result={result}>
                  <span className="t">{c.title}</span>
                  <span className="r">
                    {result === "flagged" ? (
                      <span className={`p-chip sev-${top}`} title={`${plural(n, "finding")} still open`}><span className="sr-only">Flagged: </span>{n}</span>
                    ) : (
                      <>
                        {result === "fixed" ? "fixed" : result === "dismissed" ? "dismissed" : null}
                        <span className="sn-tick" title={result === "passed" ? "Passed" : result}><Check size={12} aria-hidden="true" /><span className="sr-only">{result === "passed" ? "Passed" : result}</span></span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
