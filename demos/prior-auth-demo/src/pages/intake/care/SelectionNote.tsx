import { History } from "lucide-react";
import { Disclosure } from "@/components/ui";
import { externalLabelOf, requestedServiceOf, selectedServiceOf, serviceName } from "@/data/assess/carePlan";
import type { IntakeRecord } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { actorName } from "../shared/provenance";

/** "Requested by the referral: X. Selected by Dr. Rivera: Y. Reason: ...". The original request stays visible after the clinician chooses another service, and every change of selection is kept. */
export function SelectionNote({ record }: { record: IntakeRecord }) {
  const requested = requestedServiceOf(record);
  const selected = selectedServiceOf(record);
  const cp = record.carePlan;
  const differs = selected !== null && selected !== requested;
  const history = cp?.selections ?? [];
  return (
    <div data-testid="requested-vs-selected" className="rounded-xl border border-line bg-tile/50 px-4 py-3 text-[14px]">
      <p>
        <span className="text-muted">Requested by the referral: </span>
        <b className="font-semibold">{serviceName(requested)}</b>
      </p>
      {selected ? (
        <p className="mt-1">
          <span className="text-muted">Selected by {actorName(cp?.selectedBy ?? "")}{cp?.selectedAt !== undefined ? ` · ${stamp(cp.selectedAt)}` : ""}: </span>
          <b className="font-semibold">{serviceName(selected, externalLabelOf(record))}</b>
          {!differs ? <span className="text-muted"> (as requested)</span> : null}
        </p>
      ) : (
        <p className="mt-1 text-muted">No service is selected yet. A clinician selects it; Psyflo does not.</p>
      )}
      {differs && cp?.changeReason ? <p className="mt-1"><span className="text-muted">Reason: </span>{cp.changeReason}</p> : null}
      {history.length > 1 || (history.length === 1 && history[0].from) ? (
        <Disclosure variant="plain" title={<span className="inline-flex items-center gap-1.5 font-sans text-[13px] font-semibold"><History size={14} className="ico" aria-hidden="true" />Selection history ({history.length})</span>} className="mt-2">
          <ul className="space-y-1 px-1 py-2 text-[13px]">
            {history.map((h, i) => (
              <li key={i}>{stamp(h.at)} · {actorName(h.who)}{h.rolePlay ? " (demo role-play)" : ""}: {h.from ? `${serviceName(h.from)} to ` : ""}{serviceName(h.to)}. {h.reason}</li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
    </div>
  );
}
