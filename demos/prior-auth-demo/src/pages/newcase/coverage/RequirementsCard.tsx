import { Card, CardBody, CardHeader, Chip, Pill } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { minutesOf } from "@/data/patients";
import { requirementsFor } from "@/data/va/policy";
import { serviceById } from "@/data/va/services";
import { shortDate } from "@/lib/time";
import { useStore } from "@/store";
import { KIND_LABEL, ORG_RULE_LABEL, orgRulesFor } from "@/pages/intake/policy/match";
import { ruleStatusLabel } from "@/pages/intake/review/packet";
import { SourceAnchor } from "@/pages/intake/review/pills";
import type { CaseEnv } from "../caseEnv";
import { serviceIdOfDraft } from "./serviceOf";

const TONE = { final: "good", draft: "mid", unresolved: "neutral" } as const;
export const NOT_VERIFIED = "Payer requirement not yet verified.";

/** What the policy layer says this service needs for this payer and date, row by row, each with its status and source. A row that is a draft or unresolved is shown as that: Psyflo never assumes a payer's rule.
    Where no row applies the card says so in those words. */
export function RequirementsCard({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const orgRules = useStore((s) => s.orgRules);
  const serviceId = serviceIdOfDraft(draft);
  if (!serviceId) {
    return (
      <Card><CardHeader title="Requirements" /><CardBody><p className="text-[14px] text-ink2">Choose the service in Patient &amp; Service to see what applies. {NOT_VERIFIED}</p></CardBody></Card>
    );
  }
  const svc = serviceById(serviceId);
  const date = draft.startDate ? minutesOf(draft.startDate) : 0;
  const rows = requirementsFor({ serviceId, payerId: draft.payerId, age: draft.patient.age, setting: svc.setting, serviceDate: date });
  const org = orgRulesFor(orgRules, serviceId, draft.payerId);
  const firm = rows.filter((r) => r.status === "final" && r.kind !== "pending").length;
  return (
    <Card data-card="requirements">
      <CardHeader
        title="Requirements"
        subtitle={`${svc.short}${draft.payerId ? "" : ", no plan yet"} · ${draft.type ?? "request"} starting ${draft.startDate ? shortDate(date) : "(no date)"}`}
        right={<Pill tone={firm ? "good" : "mid"}>{firm ? `${firm} from a final policy row` : NOT_VERIFIED.replace(/\.$/, "")}</Pill>}
      />
      <CardBody className="space-y-3">
        {rows.length || org.length ? (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} data-req={r.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold">{r.label}</span>
                  <Pill tone={TONE[r.status]}>{ruleStatusLabel(r)}</Pill>
                  <Chip>{KIND_LABEL[r.kind]}</Chip>
                </div>
                <p className="mt-0.5 text-[13px] text-ink2">{r.detail}{r.status !== "final" ? ` ${NOT_VERIFIED}` : ""}</p>
                <SourceAnchor rule={r} />
              </li>
            ))}
            {org.map((r) => (
              <li key={r.id} data-org-rule={r.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-semibold">{r.label}</span><Pill tone="mid">{ORG_RULE_LABEL}</Pill></div>
                <p className="mt-0.5 text-[13px] text-ink2">{r.detail} It does not change what DMAS or the plan requires.</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-ink2">{NOT_VERIFIED} No policy row applies to {svc.short} for this plan and date.</p>
        )}
        <p className="text-[12px] text-muted">
          {env.ctx.rules.length ? `${env.ctx.rules.length} rules are saved for this payer in Payers${env.ctx.benchmark ? ", and they are Psyflo's benchmark rules, not rules anyone confirmed for this payer" : ""}.` : "No payer rules are saved for this plan in Payers."} The payer workflow above uses them; it never overrides the rows here.
        </p>
      </CardBody>
    </Card>
  );
}
