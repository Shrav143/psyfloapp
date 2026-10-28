import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FilePlus2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import { clinicallyReady, dualReadiness } from "@/data/assess/readiness";
import { purposeById } from "@/data/assess/purposes";
import type { IntakeRecord } from "@/data/intake/types";
import { authType } from "@/pages/newcase/authType";
import { kindOfIntake } from "@/pages/newcase/fromIntake";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { ReadinessTracks } from "../review/ReadinessTracks";
import { EpisodeLink } from "./EpisodeLink";

/** "Ready for Authorization Review": what is done and what is missing on both tracks, and Prepare Authorization. The button opens the linked authorization draft in New Authorization (it never submits anything).
    It opens once the clinical track is done; administrative items travel with the draft and are finished there. A purpose that leads to no authorization (a screening, a discharge) says so. */
export function GateCard({ record, now }: { record: IntakeRecord; now: number }) {
  const nav = useNavigate();
  const prepare = useStore((s) => s.prepareAuthorization);
  const draftId = useStore((s) => s.caseDrafts.find((d) => d.intakeId === record.id && !d.sent)?.id);
  const readiness = useMemo(() => dualReadiness(record, now), [record, now]);
  const kind = kindOfIntake(record);
  const ready = clinicallyReady(record, now);
  const purpose = record.config ? purposeById(record.config.purposeId).label : "No intake purpose yet";
  const existing = !!kind && authType(kind).existing;
  const needEpisode = existing && !record.episodeId;
  const open = readiness.clinical.items.filter((i) => i.state === "needs_attention" || i.state === "blocked");
  const why = !kind ? "" : open.length ? `Clinical readiness has ${open.length} ${open.length === 1 ? "item" : "items"} to finish.` : needEpisode ? "Link the treatment episode first." : "";

  const go = () => {
    const id = prepare(record.id);
    if (id) nav(paths.newCase({ draft: id, intake: record.id, ...(record.episodeId ? { episode: record.episodeId } : {}) }));
  };

  return (
    <Card data-card="gate" id="authorization-gate">
      <CardHeader title="Ready for Authorization Review" subtitle="What is done and what is missing. Readiness is not an approval." right={<Pill tone={ready ? "good" : "mid"} dot>{ready ? "Clinical readiness complete" : "Clinical readiness open"}</Pill>} />
      <CardBody className="space-y-4">
        <ReadinessTracks readiness={readiness} recordId={record.id} />
        <div className="space-y-2 border-t border-line pt-3">
          <p className="text-[13px]">
            <span className="text-muted">Request type: </span>
            {kind ? <b className="font-semibold">{authType(kind).label}</b> : <b className="font-semibold">None</b>}
            <span className="text-muted"> · from the intake purpose, {purpose}</span>
          </p>
          {!kind ? <p className="text-[13px] text-ink2">This purpose leads to care coordination, not an authorization. Create a referral above if the person needs one.</p> : null}
          {existing ? <EpisodeLink record={record} /> : null}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {draftId ? (
              <Button variant="primary" trailing={ArrowRight} onClick={() => nav(paths.newCase({ draft: draftId, intake: record.id, ...(record.episodeId ? { episode: record.episodeId } : {}) }))}>Open the authorization draft</Button>
            ) : (
              <Button variant="primary" icon={FilePlus2} disabled={!kind || !!why} onClick={go}>Prepare Authorization</Button>
            )}
            {draftId ? <span className="text-[13px] text-muted">Draft {draftId} is linked to this intake.</span> : why ? <span data-testid="prepare-why" className="min-w-0 flex-1 text-[13px] text-mid-ink">{why}</span> : null}
          </div>
          <p className="text-[12px] text-muted">Prepare Authorization opens a draft in New Authorization with the person, the selected service and the documents already on this record. A person reviews it and signs it there.</p>
        </div>
      </CardBody>
    </Card>
  );
}
