import { useState } from "react";
import { ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { Banner, Button, Card, CardBody, CardHeader, Dropdown, Field, TextArea } from "@/components/ui";
import type { DocItem } from "@/data/payerConfig";
import { CHART_GAPS } from "@/data/payerConfigSeed";
import { PROGRAM_LABEL, type Program } from "@/data/types";
import { sleep } from "@/lib/format";
import { useScope } from "@/lib/scope";
import { InfoTip } from "@/components/ui/InfoTip";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { checkChart, checkText, stillNeeded, type CheckResult } from "./lib/checker";
import { useAlive } from "./lib/useAlive";
import { Labeled } from "./Labeled";

interface Done { caseId: string | null; program: Program; result: CheckResult }

/** "Try it on a case": Reader reads a chart against this payer's list (about two seconds). Read-only. Nothing is sent.
    The chart is either a case still in Preparing or text pasted in. Pasted text is checked against the level of care shown on the left. */
export function ChartChecker({ payerId, name, lists, program, onProgram }: { payerId: string; name: string; lists: Record<Program, DocItem[]>; program: Program; onProgram: (p: Program) => void }) {
  const alive = useAlive();
  const requests = useStore((s) => s.requests);
  const { has, filter } = useScope();
  // Only the drafts at the sites in view can be picked: a case at a site the viewer cannot see is not listed.
  const cases = filter(requests.filter((r) => r.stage === "preparing"), (r) => r.caseId);
  const [picked, setCaseId] = useState(() => (cases.find((r) => r.payerId === payerId) ?? cases[0])?.id ?? "");
  const caseId = cases.some((r) => r.id === picked) ? picked : (cases.find((r) => r.payerId === payerId) ?? cases[0])?.id ?? "";
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [shown, setDone] = useState<Done | null>(null);
  const done = shown?.caseId && !has(shown.caseId) ? null : shown;
  const chosen = cases.find((r) => r.id === caseId);
  const pasted = text.trim().length > 0;

  const run = async () => {
    if (!pasted && !chosen) return;
    setBusy(true);
    setDone(null);
    await sleep(2000);
    if (!alive.current) return;
    if (pasted) {
      setDone({ caseId: null, program, result: checkText(lists[program], text) });
    } else if (chosen) {
      onProgram(chosen.program);
      setDone({ caseId: chosen.id, program: chosen.program, result: checkChart(lists[chosen.program], CHART_GAPS[chosen.id] ?? []) });
    }
    setBusy(false);
  };

  const r = done?.result;
  return (
    <>
      <Card>
        <CardHeader
          title={
            <>
              Try it on a case{" "}
              <InfoTip label="About the chart check">
                New case checks documents against this same list. Pasted text is matched by keyword, so a document that is named differently can be missed.
              </InfoTip>
            </>
          }
          subtitle="Check a chart against this list"
        />
        <CardBody className="flex flex-col gap-3.5">
          <Labeled label="Case">
            <Dropdown variant="field" ariaLabel="Case" value={caseId} onChange={(v) => { setCaseId(v); setDone(null); }} options={cases.map((c) => ({ value: c.id, label: `${c.id} · ${c.patient.initials}, ${c.patient.age}`, hint: PROGRAM_LABEL[c.program] }))} placeholder="No cases to check" menuWidth={300} />
          </Labeled>
          <Field label="Paste chart text" hint={`Optional. With text here, Reader checks it against the ${PROGRAM_LABEL[program]} list above instead of the case's chart.`}>
            <TextArea value={text} onChange={(e) => { setText(e.target.value); setDone(null); }} placeholder="Paste notes from the chart. Nothing is saved or sent." className="min-h-[96px]" />
          </Field>
          <Button variant="primary" icon={ListChecks} loading={busy} disabled={!pasted && !chosen} onClick={run}>{busy ? "Reader is reading the chart" : "Check this chart"}</Button>
          {r && done ? (
            <Banner tone={r.total === 0 || r.needed.length ? "mid" : "good"} title={<span className="font-serif text-[18px]">{r.ready} of {r.total} ready</span>}>
              {r.total === 0 ? `This list is empty. Add the documents ${name} asks for.` : r.needed.length ? `Still needed: ${stillNeeded(r.needed)}. ${name} usually asks for ${r.needed.length === 1 ? "it" : "them"}.` : `Nothing is missing. Reader found every document ${done.caseId ? "in the chart" : "in the text"}.`}
              <span className="mt-1.5 block text-xs">
                {done.caseId ? <>Checked {done.caseId} against {name}'s {PROGRAM_LABEL[done.program]} list. <Link to={paths.dashboard({ request: done.caseId })} className="font-semibold underline">Open the request</Link></> : `Checked the pasted text against ${name}'s ${PROGRAM_LABEL[done.program]} list, by keyword.`}
              </span>
            </Banner>
          ) : null}
        </CardBody>
      </Card>
    </>
  );
}
