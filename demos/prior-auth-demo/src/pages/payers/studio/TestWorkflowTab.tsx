import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Pill } from "@/components/ui";
import { docsOf as programDocs } from "@/data/programTables";
import { PROGRAM_LABEL, type Program } from "@/data/types";
import { REQUEST_TYPE_LABEL, type RunResult, type Workflow } from "@/data/workflow/types";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { cn } from "@/lib/cn";
import { coreOf, focusScope } from "@/lib/programFocus";
import { payerRows } from "../lib/payers";
import { TestForm } from "./TestForm";
import { TestResults } from "./TestResults";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { SelectField } from "./fields/controls";
import { StudioProvider } from "./StudioContext";
import { match, run as runEngine } from "./lib/engine";
import { prefersReducedMotion, useElementWidth } from "./lib/hooks";
import { runStateOf } from "./lib/model";
import { usePayerRules, usePayerWorkflows } from "./lib/store";
import { factsOf, PRESETS, type TestCase } from "./lib/testCases";
import { STATUS_WORD } from "./lib/ui";

/* Test Workflow: a fictional case goes through the same engine New Case uses, and the path it took lights up on the canvas. */

const STEP_MS = 350;

export function TestWorkflowTab({ payerId }: { payerId: string }) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const custom = useStore((s) => s.customPayers);
  const config = useStore((s) => s.payerConfig);
  const workflows = usePayerWorkflows(payerId);
  const rules = usePayerRules(payerId);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const width = useElementWidth(root);
  const row = useMemo(() => payerRows(custom, config).find((r) => r.id === payerId), [custom, config, payerId]);

  const asked = params.get("workflow");
  const [manual, setManual] = useState(!!asked);
  const [wfId, setWfId] = useState<string | undefined>(asked ?? undefined);
  const payerCtx = { payerId, name: row?.name ?? payerId };
  const docsOf = useCallback((service: Program) => programDocs(config[payerId]?.docs, payerId, service), [config, payerId]);

  const [preset, setPreset] = useState("clean");
  // The fictional case starts on the level of care of the top bar's Program menu, when it has one.
  const [test, setTest] = useState<TestCase>(() => {
    const service = coreOf(focusScope(useStore.getState().programFocus)) ?? "RES";
    return PRESETS[0].make({ ...payerCtx, service, docs: docsOf(service) });
  });
  const [ran, setRan] = useState<{ wf: Workflow; res: RunResult; type: string } | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  /* The workflow that would run for this case, unless the person picked one. Published ones first, as New Case would. */
  const published = useMemo(() => workflows.filter((w) => w.status === "published"), [workflows]);
  const auto = useMemo(() => {
    const f = factsOf(test, { nodes: [] });
    const m = match(f, published, rules);
    return m.workflow ?? published[0] ?? workflows.find((w) => w.status !== "archived") ?? workflows[0];
  }, [test, published, workflows, rules]);
  const chosen = (manual ? workflows.find((w) => w.id === wfId) : undefined) ?? auto;

  const ctx = useMemo(() => ({ payerId, payerName: payerCtx.name, services: chosen?.services ?? [], requestType: chosen?.requestType ?? ("any" as const), docs: [], rules, openRules: () => undefined }), [payerId, payerCtx.name, chosen, rules]);

  const stop = () => {
    if (timer.current !== undefined) window.clearInterval(timer.current);
    timer.current = undefined;
  };
  useEffect(() => stop, []);

  const start = () => {
    if (!chosen) return;
    stop();
    setProblem(null);
    try {
      const res = runEngine(chosen, factsOf(test, chosen), rules);
      setRan({ wf: chosen, res, type: test.facts.requestType });
      stage.current?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      const total = res.steps.length;
      if (prefersReducedMotion() || total === 0) return setRevealed(total);
      setRevealed(0);
      let n = 0;
      timer.current = window.setInterval(() => {
        n += 1;
        setRevealed(n);
        if (n >= total) stop();
      }, STEP_MS);
    } catch (e) {
      setRan(null);
      setProblem(e instanceof Error ? e.message : "The test could not run.");
    }
  };

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    stop();
    setPreset(id);
    setTest(p.make({ ...payerCtx, service: test.facts.service, docs: docsOf(test.facts.service) }));
    setRan(null);
  };
  const changeService = (service: Program) => {
    stop();
    setTest({ ...test, facts: { ...test.facts, service, documents: Object.fromEntries(docsOf(service).map((d) => [d.id, true])) } });
    setRan(null);
  };
  const pickWorkflow = (id: string) => {
    stop();
    setManual(true);
    setWfId(id);
    setRan(null);
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set("workflow", id);
      return n;
    }, { replace: true });
  };
  const fix = () => {
    if (!ran) return;
    nav(`${paths.payers(payerId, "builder")}&workflow=${ran.wf.id}${ran.res.stoppedAt ? `&node=${ran.res.stoppedAt}` : ""}`);
  };

  const wide = width >= 1000;
  const shown = ran ? ran.wf : chosen;
  const runState = useMemo(() => (ran && shown ? runStateOf({ nodes: shown.nodes, edges: shown.edges }, ran.res, revealed) : undefined), [ran, shown, revealed]);

  if (!workflows.length) {
    return (
      <Card className="px-7 py-10 text-center">
        <h2 className="m-0 font-serif text-[18px] font-semibold">There is nothing to test yet</h2>
        <p className="mx-auto mt-2 mb-5 max-w-[460px] text-[14px] text-muted">{payerCtx.name} has no workflow. Build one in Workflow Builder, then come back and try it on a made-up case.</p>
        <Button variant="primary" onClick={() => nav(paths.payers(payerId, "builder"))}>Open Workflow Builder</Button>
      </Card>
    );
  }

  return (
    <StudioProvider value={ctx}>
      <div ref={root} className="flex min-w-0 flex-col gap-4">
        <Card className="flex flex-wrap items-end gap-x-4 gap-y-3 px-5 py-4">
          <div className="min-w-[260px] flex-1">
            <SelectField
              label="Workflow to test"
              value={chosen?.id ?? ""}
              onChange={pickWorkflow}
              options={workflows.map((w) => ({ value: w.id, label: `${w.name} · version ${w.version} · ${STATUS_WORD[w.status]}` }))}
              hint={manual ? "You chose this workflow." : chosen?.status === "published" ? `The published workflow that matches ${PROGRAM_LABEL[test.facts.service]}, ${REQUEST_TYPE_LABEL[test.facts.requestType].toLowerCase()}.` : "No published workflow matches, so the closest one is shown."}
            />
          </div>
          <Button variant="primary" icon={Play} onClick={start} disabled={!chosen}>Run the test</Button>
          <Button icon={RotateCcw} onClick={() => applyPreset(preset)}>Reset the case</Button>
        </Card>

        <Card className="px-5 py-4">
          <h3 className="m-0 font-serif text-[18px] font-semibold">Start from a made-up case</h3>
          <p className="mt-0.5 mb-3 text-[13px] text-muted">Fictional facts only. Pick one, change anything, and run it.</p>
          <div role="radiogroup" aria-label="Test cases" className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={preset === p.id} title={p.hint} onClick={() => applyPreset(p.id)} className={cn("rounded-full border px-3.5 py-1.5 text-[13px] font-medium", preset === p.id ? "border-forest bg-forest text-white" : "border-field bg-white text-ink2 hover:bg-tile")}>
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-2.5 mb-0 text-[13px] text-muted">{PRESETS.find((p) => p.id === preset)?.hint}</p>
        </Card>

        {problem ? <p role="alert" className="m-0 rounded-xl bg-risk-bg px-4 py-3 text-sm text-risk-ink">{problem}</p> : null}

        <div className={cn("grid items-start gap-4", wide ? "grid-cols-[340px_minmax(0,1fr)]" : "grid-cols-1")}>
          <TestForm value={test} onChange={(t) => { setTest(t); setRan(null); stop(); }} docs={docsOf(test.facts.service)} workflow={chosen} onService={changeService} />
          <div ref={stage} className="flex min-w-0 scroll-mt-20 flex-col gap-4">
            <Card className="p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 px-1.5">
                <h3 className="m-0 font-serif text-[18px] font-semibold">{shown?.name}</h3>
                {shown ? <Pill tone={shown.status === "published" ? "good" : "neutral"} dot>{STATUS_WORD[shown.status]} · version {shown.version}</Pill> : null}
                {ran ? null : <span className="text-[13px] text-muted">Run the test to light up the path.</span>}
              </div>
              <div style={{ height: 440 }}>
                {shown ? <WorkflowCanvas key={`${shown.id}-${shown.version}`} nodes={shown.nodes} edges={shown.edges} readOnly runState={runState} ariaLabel={`${shown.name}, read only${ran ? ", showing the test run" : ""}`} /> : null}
              </div>
            </Card>
            {ran ? <TestResults workflow={ran.wf} result={ran.res} revealed={revealed} onFix={fix} onAgain={start} onSkip={() => { stop(); setRevealed(ran.res.steps.length); }} /> : null}
          </div>
        </div>
      </div>
    </StudioProvider>
  );
}
