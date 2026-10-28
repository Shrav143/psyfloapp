import { Link } from "react-router-dom";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Banner, Button } from "@/components/ui";
import { selectedServiceOf, serviceName } from "@/data/assess/carePlan";
import type { CaseDraft } from "@/data/cases";
import { stamp } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { actorName } from "@/pages/intake/shared/provenance";
import { namesRange } from "../fromIntake";

/** The service came from the care plan. The note keeps what the referral asked for beside what the clinician selected, with the reason, whenever they differ. */
export function ServiceNote({ draft }: { draft: CaseDraft }) {
  const intake = useStore((s) => s.intakes.find((r) => r.id === draft.intakeId));
  const link = useStore((s) => s.linkCaseToIntake);
  const note = draft.serviceNote;
  if (!note || !intake) return null;
  const differs = note.selected !== null && note.selected !== note.requested;
  const current = intake.carePlan?.version;
  const range = note.selected !== null && namesRange(note.selected);
  const stale = note.selected !== (selectedServiceOf(intake) === "external" ? null : selectedServiceOf(intake)) || (current !== undefined && note.carePlanVersion !== undefined && note.carePlanVersion !== current);
  return (
    <div className="flex flex-col gap-2.5" data-testid="service-note">
      {note.selected === null ? (
        <Banner tone="mid" icon={TriangleAlert} title="No service has been selected" action={<Link to={paths.intakeRecord(intake.id, "care")}><Button size="sm">Open Care planning</Button></Link>}>
          No clinician has selected a service. The referral asked for {serviceName(note.requested)}. Choose the service this authorization names below, or have a clinician select it in Care planning.
        </Banner>
      ) : (
        <div className="flex flex-col gap-2.5">
          {range ? (
            <Banner tone="mid" icon={TriangleAlert} title="The care plan names a range">
              {serviceName(note.selected)} is a range of levels. An authorization names one level of care: choose the specific service below.
            </Banner>
          ) : null}
          <div className="rounded-xl border border-line bg-tile/50 px-4 py-3 text-[14px]">
            <p><span className="text-muted">Requested by the referral: </span><b className="font-semibold">{serviceName(note.requested)}</b></p>
            <p className="mt-1"><span className="text-muted">Selected by {actorName(note.by ?? "")}{note.at !== undefined ? ` · ${stamp(note.at)}` : ""}{note.rolePlay ? " · demo role-play" : ""}: </span><b className="font-semibold">{serviceName(note.selected)}</b>{!differs ? <span className="text-muted"> (as requested)</span> : null}</p>
            {differs && note.reason ? <p className="mt-1"><span className="text-muted">Reason: </span>{note.reason}</p> : null}
          </div>
        </div>
      )}
      {stale ? (
        <Banner tone="mid" title="The care plan changed after this draft was prepared" action={<Button size="sm" icon={RefreshCw} onClick={() => link(draft.id, intake.id)}>Refresh from the record</Button>}>
          Refresh to read the current service and documents.
        </Banner>
      ) : null}
    </div>
  );
}
