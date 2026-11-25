import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CloudDownload } from "lucide-react";
import { Button, Dropdown } from "@/components/ui";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectConnectedEmr, selectUnmappedForConnected } from "@/store/emr";
import { EMR_CHARTS } from "./emrCharts";
import { chartLabel, readChart } from "./emrRead";
import type { Found } from "./ReviewList";
import type { ImportTarget } from "./types";

const PULL_MS = 1000;

/** Pull a chart from a clinical record system connected at the sites in view. Each chart names its system; a field that still needs a mapping there is left out. */
export function EmrPull({ target, preferred, onFound }: { target: ImportTarget; preferred?: string; onFound: (found: Found, label: string) => void }) {
  const systems = useStore((s) => s.emrSystems);
  const viewerId = useStore((s) => s.viewerId);
  const siteScope = useStore((s) => s.siteScope);
  const connected = useMemo(() => selectConnectedEmr(useStore.getState()), [systems, viewerId, siteScope]);
  const charts = useMemo(() => EMR_CHARTS.filter((c) => connected.some((x) => x.id === c.systemId)), [connected]);
  const [chartId, setChartId] = useState(() => charts.find((c) => c.id === preferred)?.id ?? charts[0]?.id ?? "");
  const [pulling, setPulling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const chart = charts.find((c) => c.id === chartId) ?? charts[0];
  const named = (id: string): string => connected.find((x) => x.id === id)?.name ?? "the EMR";

  if (!connected.length || !chart) {
    return (
      <p className="text-[13px] text-muted">
        {connected.length ? `No charts are waiting in ${connected.map((x) => x.name).join(" or ")}.` : "No clinical record system is connected for this site."}{" "}
        <Link to={paths.emr()} className="font-medium text-forest underline underline-offset-2">
          EMR Connect
        </Link>
      </p>
    );
  }

  const pull = () => {
    setPulling(true);
    timer.current = setTimeout(() => {
      setPulling(false);
      onFound(readChart(chart, target, selectUnmappedForConnected(useStore.getState())), `Pulled from ${named(chart.systemId)}`);
    }, PULL_MS);
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="w-[400px] max-w-full">
        <Dropdown<string>
          variant="field"
          ariaLabel="Chart to pull"
          value={chart.id}
          onChange={setChartId}
          disabled={pulling}
          menuWidth={440}
          options={charts.map((c) => ({ value: c.id, label: chartLabel(c), hint: `${named(c.systemId)} · ${c.note}` }))}
        />
      </div>
      <Button size="sm" variant="primary" icon={CloudDownload} loading={pulling} onClick={pull}>
        {pulling ? "Pulling" : "Pull"}
      </Button>
    </div>
  );
}
