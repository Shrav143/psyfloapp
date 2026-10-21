import { useState } from "react";
import { Info, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { Banner, Button, Card, CardBody, CardHeader, Dropdown } from "@/components/ui";
import { Labeled } from "./Labeled";
import type { DocItem } from "@/data/payerConfig";
import { CHART_GAPS } from "@/data/payerConfigSeed";
import { PROGRAM_LABEL, type Program } from "@/data/types";
import { sleep } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { checkChart, joinWords, type CheckResult } from "./lib/checker";
import { useAlive } from "./lib/useAlive";

/** "Try it on a case": Reader reads a chart against this payer's list (about two seconds). Read-only. Nothing is sent. */
export function ChartChecker({ payerId, name, lists, onProgram }: { payerId: string; name: string; lists: Record<Program, DocItem[]>; onProgram: (p: Program) => void }) {
  const alive = useAlive();
  const requests = useStore((s) => s.requests);
  const cases = requests.filter((r) => r.stage === "preparing");
  const [caseId, setCaseId] = useState(() => (cases.find((r) => r.payerId === payerId) ?? cases[0])?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ caseId: string; program: Program; result: CheckResult } | null>(null);
  const chosen = cases.find((r) => r.id === caseId);

  const run = async () => {
    if (!chosen) return;
    setBusy(true);
    setDone(null);
    await sleep(2000);
    if (!alive.current) return;
    onProgram(chosen.program);
    setDone({ caseId: chosen.id, program: chosen.program, result: checkChart(lists[chosen.program], CHART_GAPS[chosen.id] ?? []) });
    setBusy(false);
  };

  const r = done?.result;
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="Try it on a case" subtitle="Check a real chart against this list" />
        <CardBody className="flex flex-col gap-3.5">
          <Labeled label="Case">
            <Dropdown variant="field" ariaLabel="Case" value={caseId} onChange={(v) => { setCaseId(v); setDone(null); }} options={cases.map((c) => ({ value: c.id, label: `${c.id} · ${c.patient.initials}, ${c.patient.age}`, hint: PROGRAM_LABEL[c.program] }))} placeholder="No cases to check" menuWidth={300} />
          </Labeled>
          <Button variant="primary" icon={ListChecks} loading={busy} disabled={!chosen} onClick={run}>{busy ? "Reader is reading the chart" : "Check this chart"}</Button>
          {r && done ? (
            <Banner tone={r.needed.length ? "mid" : "good"} title={<span className="font-serif text-[18px]">{r.ready} of {r.total} ready</span>}>
              {r.needed.length ? `Still needed: ${joinWords(r.needed)}. ${name} usually asks for ${r.needed.length === 1 ? "it" : "them"}.` : "Nothing is missing. Reader found every document in the chart."}
              <span className="mt-1.5 block text-xs">Checked {done.caseId} against {name}'s {PROGRAM_LABEL[done.program]} list. <Link to={paths.dashboard({ request: done.caseId })} className="font-semibold underline">Open the request</Link></span>
            </Banner>
          ) : null}
        </CardBody>
      </Card>
      <Banner tone="neutral" icon={Info}><span className="text-sm">This is the same list Reader uses on the intake screen, so the warning there and the result here always match.</span></Banner>
    </div>
  );
}
