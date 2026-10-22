import type { CaseDraft } from "@/data/cases";
import { intakeRowIds } from "./recordsModel";
import { RecordsChecklist } from "./RecordsChecklist";
import { SitePicker } from "./SitePicker";

/** The case's details as rows you can edit: patient, insurance and the request. A referral, a chart or a patient fills them; every one stays editable. */
export function CaseDetails({ draft, showSite = true }: { draft: CaseDraft; showSite?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {showSite ? <SitePicker draft={draft} /> : null}
      <RecordsChecklist draft={draft} groups={["patient", "insurance", "request"]} rows={intakeRowIds(draft.kind)} />
    </div>
  );
}
