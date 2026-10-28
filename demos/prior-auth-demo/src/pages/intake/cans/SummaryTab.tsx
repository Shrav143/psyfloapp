import { Card, CardBody, CardHeader, Chip, Meter, Pill } from "@/components/ui";
import type { CansAssessment, IntakeRecord } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { actorName } from "../shared/provenance";
import { CansRecordCard } from "./CansRecordCard";
import { CANS_STATUS_LABEL } from "./cansModel";
import { cansCompletion } from "./cansState";
import { NarrativeCard } from "./NarrativeCard";
import { SignCard } from "./SignCard";
import { domainOfItem } from "./template";
import { Facts } from "./ui";

/** Assessment Summary: completion, what is missing, the ratings a person confirmed with their evidence, the assessment record, the narrative and the sign-off. */
export function SummaryTab({ record, cans, onGo }: { record: IntakeRecord; cans: CansAssessment; onGo: (tab: "items" | "evidence" | "summary") => void }) {
  const comp = cansCompletion(cans);
  const rated = cans.items.filter((i) => i.response?.trim());
  const evidenceOf = (itemId: string) => cans.evidence.filter((e) => e.itemId === itemId).length;
  const loaded = !!cans.template && cans.items.length > 0;
  return (
    <div className="space-y-5" data-cans-tab="summary">
      <Card data-cans-completion>
        <CardHeader title="Assessment summary" subtitle={loaded ? "Demo placeholder template: not an official CANS Lifetime assessment" : "No item template is loaded"} right={<Pill tone={cans.status === "signed" ? "good" : "neutral"}>{CANS_STATUS_LABEL[cans.status]}</Pill>} />
        <CardBody className="space-y-4">
          {loaded ? (
            <div>
              <p className="text-[13px] font-semibold text-ink">{comp.addressed} of {comp.total} items addressed · {comp.rated} with a rating label</p>
              <Meter value={comp.total ? (comp.addressed / comp.total) * 100 : 0} color="#217A78" className="mt-1.5" />
            </div>
          ) : (
            <p className="text-[14px] text-ink2">There are no items to complete until a template is loaded. Load the demo placeholder in Assessment Items.</p>
          )}
          <Facts
            items={[
              ["Assessment version", `Version ${cans.version ?? 1} · ${cans.templateVersion}`],
              ["Assessor", cans.assessor ? actorName(cans.assessor) : "Not assigned"],
              ["Reviewer", cans.signedBy ? actorName(cans.signedBy) : "Not reviewed"],
              ["Sign-off", cans.signedBy ? `Signed${cans.signedAt !== undefined ? ` · ${stamp(cans.signedAt)}` : ""}${cans.rolePlay ? " (demo role-play)" : ""}` : "Not signed"],
              ["Supporting evidence", `${cans.evidence.length} statement${cans.evidence.length === 1 ? "" : "s"} kept`],
            ]}
          />
          {loaded && comp.missing.length ? (
            <div data-cans-missing>
              <p className="text-[13px] font-semibold text-ink2">Missing items ({comp.missing.length})</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {comp.missing.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => { onGo("items"); window.setTimeout(() => document.getElementById(`cans-item-${m.id}`)?.scrollIntoView({ block: "center" }), 60); }} className="rounded-full bg-neutral-bg px-2.5 py-[3px] text-[12px] font-semibold text-neutral-ink hover:bg-tile">
                      {m.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {loaded ? (
            <div data-cans-confirmed>
              <p className="text-[13px] font-semibold text-ink2">Ratings a person entered ({rated.length})</p>
              {rated.length ? (
                <ul className="mt-1.5 divide-y divide-line">
                  {rated.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]">
                      <span className="min-w-0 flex-1"><span className="font-medium text-ink">{i.name}</span> <span className="text-muted">· {domainOfItem(i.id)?.label}</span></span>
                      <span className="flex flex-wrap items-center gap-2">
                        <Chip>{i.response}</Chip>
                        <span className="text-[12px] text-muted">{evidenceOf(i.id)} evidence · {i.reviewer ? actorName(i.reviewer) : "no reviewer"}{i.reviewedAt !== undefined ? `, ${stamp(i.reviewedAt)}` : ""}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-1 text-[13px] text-muted">No rating labels yet. A note alone also counts as addressed.</p>}
            </div>
          ) : null}
        </CardBody>
      </Card>
      <CansRecordCard record={record} cans={cans} />
      <SignCard record={record} cans={cans} onGo={onGo} />
      <NarrativeCard record={record} cans={cans} />
    </div>
  );
}
