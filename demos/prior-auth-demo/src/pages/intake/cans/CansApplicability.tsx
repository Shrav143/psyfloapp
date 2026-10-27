import { Card, CardBody, CardHeader, Pill } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { cansFor, POLICY_VERSIONS, requirementsFor, vaDate, type CansApplies, type PolicyRule } from "@/data/va/policy";
import { serviceById } from "@/data/va/services";
import { longDate } from "@/lib/time";
import { APPLIES_LABEL, APPLIES_TONE } from "./cansModel";
import { Facts, PolicyStatusPill, RuleNote, SourceCite } from "./ui";

const LEAD: Record<CansApplies, (short: string) => string> = {
  required: () => "Published redesign materials associate the CANS Lifetime with this service from July 1, 2027. The rule is a draft, not final policy.",
  upcoming: (s) => `${s} starts July 1, 2027. Until then the CANS Lifetime is preparation only: staff may gather evidence, and nobody rates.`,
  unresolved: (s) => `The CANS Lifetime is not confirmed for ${s}. Psyflo does not apply it until DMAS confirms.`,
  not_applicable: (s) => `The CANS Lifetime does not apply to ${s}. Psyflo applies it only where the policy layer lists it (CPST and CSC, from July 1, 2027).`,
};

/** Whether the CANS Lifetime applies to this record's service, why, and under which policy version and source. */
export function CansApplicability({ record, applies, rule }: { record: IntakeRecord; applies: CansApplies; rule?: PolicyRule }) {
  const svc = serviceById(record.serviceId);
  const version = rule ? POLICY_VERSIONS[rule.version] : null;
  return (
    <Card data-cans-applies={applies}>
      <CardHeader title="CANS Lifetime" subtitle={svc.label} right={<Pill tone={APPLIES_TONE[applies]}>{APPLIES_LABEL[applies]}</Pill>} />
      <CardBody className="space-y-3">
        <p className="text-[14px] text-ink">{LEAD[applies](svc.short)}</p>
        {rule ? <RuleNote rule={rule} /> : null}
        <Facts
          items={[
            ["Applicable service", svc.label],
            ["Planned start", longDate(record.serviceDate)],
            ["Policy version", version ? <span className="inline-flex flex-wrap items-center gap-1.5">{version.label} <PolicyStatusPill status={version.status} /></span> : "No CANS rule for this service"],
            ["Effective", rule?.from ? longDate(vaDate(rule.from)) : "Not applicable"],
          ]}
        />
        {applies === "not_applicable" || applies === "unresolved" ? <AppliesInstead record={record} /> : null}
      </CardBody>
    </Card>
  );
}

/** What does apply to the service instead, straight from the policy layer. */
export function AppliesInstead({ record }: { record: IntakeRecord }) {
  const svc = serviceById(record.serviceId);
  /* The CANS and Level of Need rules have their own cards; this lists the service's other requirements. */
  const rules = requirementsFor({ serviceId: record.serviceId, payerId: record.payerId, age: record.age, serviceDate: record.serviceDate }).filter((r) => r.kind !== "assessment" && r.kind !== "level_of_need");
  const asam = svc.track === "sud";
  const asamLevel = /\((ASAM[^)]*)\)/.exec(svc.label)?.[1];
  return (
    <div data-applies-instead>
      <h4 className="text-[13px] font-semibold text-ink2">{asam || !cansFor(record.serviceId, record.serviceDate).rule ? `What applies to ${svc.short} instead` : `What does apply to ${svc.short}`}</h4>
      <ul className="mt-1.5 space-y-2">
        {asam ? (
          <li className="text-[13px] text-ink">
            {svc.short} is an ARTS service: its levels of care follow the ASAM Criteria{asamLevel ? ` (${asamLevel})` : ""}. Use ASAM for it, not the CANS Lifetime.
          </li>
        ) : null}
        {rules.map((r) => (
          <li key={r.id} className="text-[13px]">
            <span className="inline-flex flex-wrap items-center gap-1.5 font-medium text-ink">
              {r.label} <PolicyStatusPill status={r.status} />
            </span>
            <span className="block text-ink2">{r.detail}</span>
            <SourceCite id={r.source} />
          </li>
        ))}
        {!rules.length && !asam ? <li className="text-[13px] text-muted">No other assessment rule is loaded for this service.</li> : null}
      </ul>
    </div>
  );
}
