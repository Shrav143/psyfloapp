import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardBody, CardHeader, Meter, Pill } from "@/components/ui";
import { READINESS_NOTE, trackSummary, type DualReadinessX, type ReadinessTrackX } from "@/data/assess/readiness";
import type { ReadinessStatus } from "@/data/assess/types";
import type { Tone } from "@/data/types";
import { paths } from "@/routes";
import { workspaceHref } from "../nav";
import { trackCounts } from "../progress";
import { targetOf } from "../useWorkspaceTarget";

const WORD: Record<ReadinessStatus, { word: string; tone: Tone }> = {
  complete: { word: "Complete", tone: "good" }, missing: { word: "Missing", tone: "mid" }, verify: { word: "To verify", tone: "mid" },
  pending: { word: "Pending approval", tone: "mid" }, blocked: { word: "Blocked", tone: "risk" }, na: { word: "Not applicable", tone: "neutral" },
};
const TRACK_TONE: Record<ReadinessTrackX["state"], Tone> = { complete: "good", in_progress: "mid", not_started: "neutral", blocked: "risk" };
const BAR: Record<Tone, string> = { good: "#2E7D52", mid: "#A87A26", risk: "#B5553A", neutral: "#217A78" };

function Panel({ recordId, title, track, kind }: { recordId: string; title: string; track: ReadinessTrackX; kind: "clinical" | "administrative" }) {
  const [all, setAll] = useState(false);
  const { done, total } = trackCounts(track);
  const rows = track.items.filter((i) => i.status !== "na");
  const open = rows.filter((i) => i.status !== "complete");
  const shown = all ? rows : open;
  const tone = TRACK_TONE[track.state];
  return (
    <Card data-readiness={kind} className="min-w-0">
      <CardHeader title={title} right={<Pill tone={tone}>{trackSummary(track)}</Pill>} />
      <CardBody className="flex flex-col gap-3">
        <div>
          <Meter value={total ? (done / total) * 100 : 0} color={BAR[tone]} height={5} />
          <p className="mt-1 text-[12px] text-muted">{done} of {total} items complete</p>
        </div>
        {shown.length ? (
          <ul className="divide-y divide-line">
            {shown.map((i) => {
              const w = WORD[i.status];
              const to = i.go?.section === "configure" ? paths.configure(recordId) : workspaceHref(recordId, targetOf(i.go));
              return (
                <li key={i.id} data-item={i.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{i.label}</p>
                    <p className="text-[12px] text-muted">{i.detail}</p>
                    <p className="text-[12px] text-muted">Owner: {i.owner}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Pill tone={w.tone}>{w.word}</Pill>
                    {i.go ? <Link to={to} className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline">Open<ArrowRight size={13} className="ico" /></Link> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-good-ink">Every item is complete.</p>
        )}
        {rows.length > open.length ? <button type="button" onClick={() => setAll((v) => !v)} className="self-start text-[12px] font-semibold text-forest hover:underline">{all ? "Show only open items" : `Show all ${rows.length} items`}</button> : null}
      </CardBody>
    </Card>
  );
}

/** Clinical readiness and administrative readiness, as two separate panels: there is no blended percentage, and neither says medical necessity is established. */
export function ReadinessPanels({ recordId, readiness }: { recordId: string; readiness: DualReadinessX }) {
  return (
    <section aria-label="Readiness" className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        <Panel recordId={recordId} title="Clinical readiness" track={readiness.clinical} kind="clinical" />
        <Panel recordId={recordId} title="Administrative readiness" track={readiness.administrative} kind="administrative" />
      </div>
      <p className="px-1 text-[12px] text-muted" data-readiness-note>{READINESS_NOTE}</p>
    </section>
  );
}
