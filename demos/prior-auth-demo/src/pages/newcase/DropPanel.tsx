import { useEffect, useRef, useState } from "react";
import { CloudDownload, ShieldCheck } from "lucide-react";
import { Button, Dropdown, FileDrop } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { emrLabel, pullFromEmr } from "./intake";
import { EMR_CHARTS } from "./lookups";
import { sortFiles } from "./readFiles";

const PULL_MS = 1000;

/** A small picker for the one other way in: pull a chart from EMR Connect. */
function EmrPicker({ draftId, onClose }: { draftId: string; onClose: () => void }) {
  const [chartId, setChartId] = useState(EMR_CHARTS[0].id);
  const [pulling, setPulling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const pull = () => {
    const chart = EMR_CHARTS.find((c) => c.id === chartId);
    if (!chart) return;
    setPulling(true);
    timer.current = setTimeout(() => {
      pullFromEmr(draftId, chart);
      onClose();
    }, PULL_MS);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-tile px-4 py-3">
      <span className="text-[13px] font-medium text-ink2">Chart from EMR Connect</span>
      <div className="w-[380px] max-w-full">
        <Dropdown<string> variant="field" value={chartId} onChange={setChartId} options={EMR_CHARTS.map((c) => ({ value: c.id, label: emrLabel(c), hint: c.note }))} menuWidth={420} disabled={pulling} ariaLabel="Chart from EMR Connect" />
      </div>
      <Button variant="primary" icon={CloudDownload} loading={pulling} onClick={pull}>
        {pulling ? "Pulling" : "Pull"}
      </Button>
      <Button variant="ghost" onClick={onClose} disabled={pulling}>
        Cancel
      </Button>
    </div>
  );
}

/** Everything for this patient goes in one place: drop the files, Reader sorts them onto the list below. */
export function DropPanel({ draft }: { draft: CaseDraft }) {
  const [picking, setPicking] = useState(false);
  return (
    <section aria-label="Add the chart" className="flex flex-col gap-3">
      <FileDrop variant="panel" title="Drop everything you have for this patient" hint="The chart, the insurance card, the intake form, in any order. Reader sorts the files and ticks off the list below." onFiles={(files) => sortFiles(draft.id, files)} />
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-1">
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <ShieldCheck size={15} className="ico shrink-0" />
          Privacy mode is on. Names, dates and IDs are swapped for codes before any agent reads the chart.
        </p>
        <Button size="sm" variant="ghost" icon={CloudDownload} aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
          Pull a chart from EMR Connect
        </Button>
      </div>
      {picking ? <EmrPicker draftId={draft.id} onClose={() => setPicking(false)} /> : null}
    </section>
  );
}
