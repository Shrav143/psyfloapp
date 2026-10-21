import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CloudDownload, ShieldCheck } from "lucide-react";
import { Button, Dropdown, FileDrop } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectConnectedEmr } from "@/store/emr";
import { emrLabel, pullFromEmr, unmappedFor } from "./intake";
import { EMR_CHARTS } from "./lookups";
import { sortFiles } from "./readFiles";

const PULL_MS = 1000;
const LINK = "font-medium text-forest underline underline-offset-2";

/** What "Pull a chart" says when no records system is connected: why, and where to connect one. */
function NoSystem({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-tile px-4 py-3">
      <span className="text-[13px] text-ink2">
        No records system is connected. Connect one in{" "}
        <Link to={paths.emr()} className={LINK}>
          EMR Connect
        </Link>{" "}
        to pull a chart, or drop the files above.
      </span>
      <Button variant="ghost" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}

/** A small picker for the one other way in: pull a chart from a connected records system. Each chart names the system it lives in. */
function EmrPicker({ draftId, onClose }: { draftId: string; onClose: () => void }) {
  const systems = useStore((s) => s.emrSystems);
  const unmapped = useStore((s) => s.emrUnmapped);
  const connected = useMemo(() => selectConnectedEmr(useStore.getState()), [systems]);
  const charts = useMemo(() => EMR_CHARTS.filter((c) => connected.some((x) => x.id === c.systemId)), [connected]);
  const [chartId, setChartId] = useState(charts[0]?.id ?? "");
  const [pulling, setPulling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const chart = charts.find((c) => c.id === chartId) ?? charts[0];
  const gaps = useMemo(() => (chart ? unmappedFor(useStore.getState(), chart) : []), [chart, unmapped, systems]);

  if (!connected.length) return <NoSystem onClose={onClose} />;
  const named = (systemId: string): string => connected.find((x) => x.id === systemId)?.name ?? "";

  const pull = () => {
    if (!chart) return;
    setPulling(true);
    timer.current = setTimeout(() => {
      pullFromEmr(draftId, chart);
      onClose();
    }, PULL_MS);
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-tile px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-medium text-ink2">Chart from EMR Connect</span>
        {chart ? (
          <div className="w-[420px] max-w-full">
            <Dropdown<string> variant="field" value={chart.id} onChange={setChartId} options={charts.map((c) => ({ value: c.id, label: emrLabel(c), hint: `${named(c.systemId)}. ${c.note}` }))} menuWidth={460} disabled={pulling} ariaLabel="Chart from EMR Connect" />
          </div>
        ) : (
          <span className="text-[13px] text-muted">No charts are waiting in {connected.map((x) => x.name).join(" or ")}.</span>
        )}
        <Button variant="primary" icon={CloudDownload} loading={pulling} disabled={!chart} onClick={pull}>
          {pulling ? "Pulling" : "Pull"}
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={pulling}>
          Cancel
        </Button>
      </div>
      {chart ? (
        <p className="text-[13px] text-muted">
          From {named(chart.systemId)}.
          {gaps.length ? (
            <>
              {" "}
              {gaps.map((g) => `“${g.field}”`).join(" and ")} still needs a mapping there, so {gaps.length === 1 ? "that field is" : "those fields are"} left blank.{" "}
              <Link to={paths.emr()} className={LINK}>
                Open EMR Connect
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
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
