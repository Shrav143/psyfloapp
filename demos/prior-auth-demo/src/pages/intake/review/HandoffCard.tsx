import { useNavigate } from "react-router-dom";
import { ArrowRight, FilePlus2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import { clinicallyReady } from "@/data/assess/readiness";
import type { IntakeRecord } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { stamp } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { actorName } from "../shared/provenance";
import { GoTo } from "./ChecklistCard";
import { type Packet } from "./packet";
import { CheckPill, RuleStatusPill } from "./pills";

const STATUS: Record<IntakeRecord["handoff"]["status"], { label: string; tone: Tone }> = {
  not_started: { label: "Not started", tone: "neutral" }, draft: { label: "Packet drafted", tone: "mid" }, ready: { label: "Packet ready", tone: "mid" }, in_new_case: { label: "Draft in New Authorization", tone: "good" },
};

/** The authorization packet: a summary built from the record every time it is shown, so it never goes stale. Prepare Authorization (a clinician's approved care plan is the approval) opens the linked draft in New Authorization,
    where a person reviews it and signs it. Nothing is submitted to a payer from Intake. */
export function HandoffCard({ record, packet, now }: { record: IntakeRecord; packet: Packet; now: number }) {
  const nav = useNavigate();
  const prepare = useStore((s) => s.prepareAuthorization);
  const draftExists = useStore((s) => !!record.handoff.draftId && s.caseDrafts.some((d) => d.id === record.handoff.draftId));
  const h = record.handoff;
  const st = STATUS[h.status];
  const approved = record.carePlan?.status === "approved";
  const ready = clinicallyReady(record, now);
  const why = !approved ? "The care plan needs a clinician's approval first." : !ready ? "Clinical readiness has items to finish." : "";

  const open = () => {
    const id = prepare(record.id);
    if (id) nav(paths.newCase({ draft: id, intake: record.id, ...(record.episodeId ? { episode: record.episodeId } : {}) }));
  };

  return (
    <Card data-card="handoff">
      <CardHeader title="Authorization packet" right={<Pill tone={st.tone}>{st.label}</Pill>} />
      <CardBody className="space-y-4">
        <p className="text-[12px] text-muted">
          {h.preparedBy ? `Packet drafted by ${actorName(h.preparedBy)}${h.createdAt !== undefined ? ` · ${stamp(h.createdAt)}` : ""}` : "Built from this record each time it is shown"}
          {h.openedBy ? ` · Opened in New Authorization by ${actorName(h.openedBy)}${h.openedAt !== undefined ? ` · ${stamp(h.openedAt)}` : ""}` : ""}
        </p>
        <dl data-testid="packet" className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
          {packet.lines.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
          <dt className="text-muted">Requirements</dt>
          <dd>
            <ul className="space-y-1">
              {packet.requirements.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-1.5"><span>{r.label}</span><RuleStatusPill rule={r} /></li>
              ))}
            </ul>
          </dd>
          <dt className="text-muted">Documents</dt>
          <dd>{packet.documents.length ? packet.documents.join("; ") : "None on file"}</dd>
          <dt className="text-muted">Open items</dt>
          <dd>{packet.open.length ? `${packet.open.length} (listed below)` : "None"}</dd>
        </dl>
        {packet.open.length ? (
          <ul className="space-y-1.5 rounded-xl bg-tile px-3 py-2.5">
            {packet.open.slice(0, 8).map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                <CheckPill status={i.status} />
                <span className="min-w-0 flex-1">{i.label}</span>
                <GoTo recordId={record.id} item={i} />
              </li>
            ))}
            {packet.open.length > 8 ? <li className="text-[12px] text-muted">and {packet.open.length - 8} more in the checklist</li> : null}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {h.status === "in_new_case" && draftExists ? (
            <Button variant="primary" trailing={ArrowRight} onClick={() => nav(paths.newCase({ draft: h.draftId, intake: record.id, ...(record.episodeId ? { episode: record.episodeId } : {}) }))}>Open the draft in New Authorization</Button>
          ) : (
            <>
              <Button variant="primary" icon={FilePlus2} disabled={!!why} onClick={open}>Prepare Authorization</Button>
              {why ? <span data-testid="prepare-why" className="text-[13px] text-mid-ink">{why}</span> : null}
            </>
          )}
          {h.status === "in_new_case" && !draftExists ? <span className="text-[13px] text-muted">The draft {h.draftId} is no longer in the demo (it may have been reset).</span> : null}
          <span className="basis-full text-[12px] text-muted">Nothing is submitted to a payer from Intake.</span>
        </div>
      </CardBody>
    </Card>
  );
}
