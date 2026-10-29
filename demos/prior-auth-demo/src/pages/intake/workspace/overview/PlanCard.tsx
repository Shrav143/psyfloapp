import { Settings2 } from "lucide-react";
import { Banner, Button, Card, CardHeader, Chip, Disclosure, InfoTip, Pill } from "@/components/ui";
import { VERIFICATION_LABEL, type AssessmentPlan, type Verification } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { vaPlanOf } from "@/data/va/plans";
import type { Tone } from "@/data/types";
import type { NavItem } from "../nav";
import { ModuleTable } from "./ModuleTable";

const VERIFY_TONE: Record<Verification, Tone> = { verified: "good", draft: "mid", unverified: "mid", demo: "neutral" };

/** The assessment plan: what this intake is configured for, the framework and rule version behind it, and where each section and module stands. */
export function PlanCard({ record, plan, items, onConfigure }: { record: IntakeRecord; plan: AssessmentPlan | null; items: NavItem[]; onConfigure: () => void }) {
  if (!record.config || !plan) {
    return (
      <Banner tone="mid" title="This intake is not configured yet" action={<Button size="sm" variant="primary" icon={Settings2} onClick={onConfigure}>Configure intake</Button>}>
        Choose the purpose, program, population and setting to load the assessments this person needs.
      </Banner>
    );
  }
  const payer = record.payerId ? vaPlanOf(record.payerId)?.name : undefined;
  const facts: [string, string][] = [
    ["Framework", plan.framework ? `${plan.framework.label}${plan.framework.edition ? `, ${plan.framework.edition}` : ""}` : "None configured"],
    ["Rule version", `${plan.version} (effective ${plan.effective})`],
    ["Who completes it", plan.credentials],
    ["Sign-off", plan.signoff],
  ];
  return (
    <Card data-card="plan">
      <CardHeader
        title="Assessment plan"
        subtitle={`Configured for Virginia Medicaid, ${payer ?? "no plan selected"}`}
        right={<><Pill tone={VERIFY_TONE[plan.status]}>{VERIFICATION_LABEL[plan.status]}</Pill><Button size="sm" icon={Settings2} onClick={onConfigure}>Change</Button></>}
      />
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 px-5 py-3 text-[13px] @xl:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="inline text-muted">{k}: </dt>
            <dd className="inline font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
        <Chip>{plan.modules.filter((m) => m.level === "required").length} required modules</Chip>
        {plan.warnings.length ? <span className="inline-flex items-center gap-1 text-[12px] text-muted">{plan.warnings.length} {plan.warnings.length === 1 ? "note" : "notes"} on this plan<InfoTip label="Notes on this plan"><ul className="list-disc space-y-1 pl-4">{plan.warnings.map((w) => <li key={w}>{w}</li>)}</ul></InfoTip></span> : null}
      </div>
      <Disclosure variant="plain" title={<span className="text-[14px]">Sections and modules</span>} summary={`${items.filter((i) => i.child).length} assessment instruments in this plan`} defaultOpen>
        <ModuleTable record={record} items={items} />
      </Disclosure>
    </Card>
  );
}
