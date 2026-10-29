import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FilePlus2, XCircle } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import { selectedServiceOf } from "@/data/assess/carePlan";
import { clinicallyReady, dualReadiness } from "@/data/assess/readiness";
import { purposeById } from "@/data/assess/purposes";
import type { IntakeRecord } from "@/data/intake/types";
import { authType } from "@/pages/newcase/authType";
import { kindOfIntake } from "@/pages/newcase/fromIntake";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { ReadinessTracks } from "../review/ReadinessTracks";
import { CloseDialog } from "../workspace/HeaderDialogs";
import { EpisodeLink } from "./EpisodeLink";

/** "Ready for Authorization Review": what is done and what is missing on both tracks, and Prepare Authorization. The button opens the linked authorization draft in New Authorization (it never submits anything).
    It opens once the clinical track is done; administrative items travel with the draft and are finished there. A purpose that leads to no authorization (a screening, a discharge) says so. */
export function GateCard({ record, now }: { record: IntakeRecord; now: number }) {
  const nav = useNavigate();
  const prepare = useStore((s) => s.prepareAuthorization);
  const draftId = useStore((s) => s.caseDrafts.find((d) => d.intakeId === record.id && !d.sent)?.id);
  /* A request already signed and sent from this intake: the gate points at it instead of offering a second Prepare Authorization. */
  const sentId = record.handoff.status === "sent" ? record.handoff.requestId : undefined;
  const readiness = useMemo(() => dualReadiness(record, now), [record, now]);
  const kind = kindOfIntake(record);
  const ready = clinicallyReady(record, now);
  const purpose = record.config ? purposeById(record.config.purposeId).label : "No intake purpose yet";
  const existing = !!kind && authType(kind).existing;
  const needEpisode = existing && !record.episodeId;
  const open = readiness.clinical.items.filter((i) => i.state === "needs_attention" || i.state === "blocked");
  /* An intake does not have to end in an authorization: it can end in referral coordination (an external program), or a person can end it here with a reason. */
  const external = selectedServiceOf(record) === "external";
  const closed = record.triage === "closed";
  const [ending, setEnding] = useState(false);
  const why = !kind || closed || external ? "" : open.length ? `Clinical readiness has ${open.length} ${open.length === 1 ? "item" : "items"} to finish.` : needEpisode ? "Link the treatment episode first." : "";

  const go = () => {
    const id = prepare(record.id);
    if (id) nav(paths.newCase({ draft: id, intake: record.id, ...(record.episodeId ? { episode: record.episodeId } : {}) }));
  };

  return (
    <Card data-card="gate" id="authorization-gate">
      <CardHeader title="Ready for Authorization Review" subtitle="What is done and what is missing. Readiness is not an approval." right={<Pill tone={ready ? "good" : "mid"} dot>{ready ? "Clinical readiness complete" : "Clinical readiness open"}</Pill>} />
      <CardBody className="space-y-4">
        <ReadinessTracks readiness={readiness} recordId={record.id} here="care" />
        <div className="space-y-2 border-t border-line pt-3">
          <p className="text-[13px]">
            <span className="text-muted">Request type: </span>
            {kind ? <b className="font-semibold">{authType(kind).label}</b> : <b className="font-semibold">None</b>}
            <span className="text-muted"> · from the intake purpose, {purpose}</span>
          </p>
          {!kind ? <p className="text-[13px] text-ink2">This purpose leads to care coordination, not an authorization. Create a referral above if the person needs one.</p> : null}
          {external && !closed ? <p data-testid="coordination-note" className="text-[13px] text-ink2">The selected program is outside the Medicaid service list, so this intake ends in referral coordination, not an authorization. Create the referral under Referral coordination above; nothing goes to a payer.</p> : null}
          {closed ? <p data-testid="ended-note" className="text-[13px] text-ink2">This intake ended without an authorization{record.triageNote ? `: ${record.triageNote}` : ""}. Nothing was sent to a payer. Reopen it from Actions if that changes.</p> : null}
          {existing ? <EpisodeLink record={record} /> : null}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {sentId && !draftId ? (
              <Button variant="primary" trailing={ArrowRight} onClick={() => nav(paths.case(sentId))} data-open-request>Open the request {sentId}</Button>
            ) : draftId ? (
              <Button variant="primary" trailing={ArrowRight} onClick={() => nav(paths.newCase({ draft: draftId, intake: record.id, ...(record.episodeId ? { episode: record.episodeId } : {}) }))}>Open the authorization draft</Button>
            ) : (
              <Button variant="primary" icon={FilePlus2} disabled={!kind || closed || external || !!why} onClick={go}>Prepare Authorization</Button>
            )}
            {!closed && !draftId && !sentId ? <Button icon={XCircle} onClick={() => setEnding(true)} data-end-without-auth>End without an authorization</Button> : null}
            {sentId && !draftId ? <span className="text-[13px] text-muted">Signed and sent as {sentId} (simulated). A continued stay or a change starts from Ongoing care on the Overview.</span> : draftId ? <span className="text-[13px] text-muted">Draft {draftId} is linked to this intake.</span> : why ? <span data-testid="prepare-why" className="basis-full text-[13px] text-mid-ink">{why}</span> : null}
          </div>
          <p className="text-[12px] text-muted">Prepare Authorization opens a draft in New Authorization with the person, the selected service and the documents already on this record. A person reviews it and signs it there.</p>
        </div>
      </CardBody>
      {ending ? <CloseDialog record={record} onClose={() => setEnding(false)} initialReason={external || !kind ? "Care continues in another program (referral coordination)" : "No authorization is needed"} /> : null}
    </Card>
  );
}
