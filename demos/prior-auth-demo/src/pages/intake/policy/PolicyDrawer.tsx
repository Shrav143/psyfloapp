import { useMemo, useState } from "react";
import { FilterX } from "lucide-react";
import { Button, Chip, Drawer, Dropdown, EmptyState, Label, Pill, Segmented } from "@/components/ui";
import { reviewLine } from "@/data/assess/reviewLine";
import { RULES_UPDATED } from "@/data/assess/rules";
import type { PayerId } from "@/data/types";
import { POLICY_VERSIONS, REDESIGN_START, SOURCES, UNRESOLVED, type PolicyRule, type PolicyVersionId } from "@/data/va/policy";
import { VA_PLANS, vaPlanOf } from "@/data/va/plans";
import { SERVICES, serviceById, type VaServiceId } from "@/data/va/services";
import { longDate, toDate } from "@/lib/time";
import { useStore } from "@/store";
import { useIntakeNow } from "../lib/policyNow";
import { RuleStatusPill, SourceAnchor } from "../review/pills";
import { AssessmentRules } from "./AssessmentRules";
import { KIND_LABEL, matchAssessmentRules, matchRules, ORG_RULE_LABEL, orgRulesFor, type PolicyFilter, type Setting } from "./match";
import { OrgRuleForm } from "./OrgRuleForm";

const iso = (m: number) => {
  const d = toDate(m);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fromIso = (s: string, fallback: number) => {
  const t = new Date(`${s}T00:00:00`).getTime();
  return Number.isNaN(t) ? fallback : Math.round((t - toDate(0).getTime()) / 60_000);
};
const REVIEWER: Record<NonNullable<PolicyRule["reviewer"]>, string> = { plan: "The member's plan", plan_or_acentra: "The plan (MCO) or Acentra Health (fee-for-service)", acentra: "Acentra Health" };
const servicesLabel = (r: PolicyRule) => (r.services === "all" ? "All services" : r.services.map((s) => serviceById(s).short).join(", "));
const windowLabel = (r: Pick<PolicyRule, "from" | "to">) => (r.from && r.to ? `${r.from} to ${r.to}` : r.from ? `From ${r.from}` : r.to ? `Through ${r.to}` : "No end date");

/** The policy engine, as data: versions, filters on every dimension a requirement depends on, the matching rules with status and source,
    and what is still unresolved. Organization rules (an administrator's local notes) show beside the DMAS rows, labeled unverified. */
export function PolicyDrawer({ onClose, initial }: { onClose: () => void; initial: { serviceId?: VaServiceId; payerId?: PayerId | null; age?: number | null } }) {
  const now = useIntakeNow();
  const clock = useStore((s) => s.clock);
  const orgRules = useStore((s) => s.orgRules);
  const removeOrg = useStore((s) => s.removeOrgRule);
  const viewer = useStore((s) => s.viewerId);
  const admin = viewer === "jordan" || viewer === "morgan";
  const start: PolicyFilter = {
    service: initial.serviceId ?? "all", payer: initial.payerId ?? "all", age: initial.age == null ? "all" : initial.age < 18 ? "youth" : "adult",
    coverage: "all", date: now, version: "all", setting: "all",
  };
  const [f, setF] = useState<PolicyFilter>(start);
  const [moreSources, setMoreSources] = useState<PolicyVersionId[]>([]);
  const set = <K extends keyof PolicyFilter>(k: K, v: PolicyFilter[K]) => setF((x) => ({ ...x, [k]: v }));
  const rules = useMemo(() => matchRules(f), [f]);
  const assessRules = useMemo(() => matchAssessmentRules(f), [f]);
  const org = orgRulesFor(orgRules, f.service, f.payer);
  const blank: PolicyFilter = { service: "all", payer: "all", age: "all", coverage: "all", date: clock, version: "all", setting: "all" };
  const filtered = JSON.stringify(f) !== JSON.stringify(blank);
  const plan = f.payer !== "all" ? vaPlanOf(f.payer) : undefined;

  return (
    <Drawer open onClose={onClose} title="Policy" subtitle="Virginia Medicaid behavioral health. Rules are data: a policy change is a new rule version, not a code change." width={760}>
      <section aria-label="Policy versions">
        <Label>Versions</Label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {Object.values(POLICY_VERSIONS).map((v) => (
            <div key={v.id} data-version={v.id} className="rounded-2xl border border-edge bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold">{v.label}</span>
                <RuleStatusPill rule={{ status: v.status }} />
              </div>
              <p className="mt-1 text-[12px] text-muted">{v.effectiveFrom ? `Effective ${longDate(fromIso(v.effectiveFrom, REDESIGN_START))}` : "In effect now"} · {v.id}</p>
              <p className="mt-1.5 text-[13px] text-ink2">{v.statusNote}</p>
              <ul className="mt-1.5 space-y-0.5">
                {(moreSources.includes(v.id) ? v.sources : v.sources.slice(0, 3)).map((s) => <li key={s}><SourceAnchor rule={{ source: s }} /></li>)}
                {v.sources.length > 3 ? (
                  <li>
                    <button type="button" className="text-[12px] font-semibold text-forest hover:underline" onClick={() => setMoreSources((m) => (m.includes(v.id) ? m.filter((x) => x !== v.id) : [...m, v.id]))}>
                      {moreSources.includes(v.id) ? "Show fewer sources" : `Show ${v.sources.length - 3} more sources`}
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Filters" className="mt-6 rounded-2xl border border-edge bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Filters</Label>
          {filtered ? <Button size="sm" variant="ghost" icon={FilterX} onClick={() => setF(blank)}>Clear filters</Button> : null}
        </div>
        <div className="mt-2 grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-[12px] font-medium text-ink2">State</span>
            <Chip>Virginia (the only state configured)</Chip>
          </div>
          <div>
            <span className="mb-1 block text-[12px] font-medium text-ink2">Service</span>
            <Dropdown<VaServiceId | "all"> ariaLabel="Service" value={f.service} defaultValue="all" onChange={(v) => set("service", v)} options={[{ value: "all", label: "All services" }, ...SERVICES.map((s) => ({ value: s.id, label: s.label }))]} menuWidth={340} />
          </div>
          <div>
            <span className="mb-1 block text-[12px] font-medium text-ink2">Age group</span>
            <Segmented<"all" | "adult" | "youth"> items={[{ id: "all", label: "All" }, { id: "adult", label: "Adult" }, { id: "youth", label: "Youth" }]} value={f.age} onChange={(v) => set("age", v)} />
          </div>
          <div>
            <span className="mb-1 block text-[12px] font-medium text-ink2">Plan</span>
            <Dropdown<PayerId | "all"> ariaLabel="Plan" value={f.payer} defaultValue="all" onChange={(v) => set("payer", v)} options={[{ value: "all", label: "All plans" }, ...VA_PLANS.map((p) => ({ value: p.payerId, label: p.name }))]} menuWidth={320} />
          </div>
          <div>
            <span className="mb-1 block text-[12px] font-medium text-ink2">Coverage type</span>
            {plan ? (
              <Chip>{plan.coverage === "ffs" ? "Fee-for-service" : "Cardinal Care managed care (MCO)"}, from the plan</Chip>
            ) : (
              <Dropdown<"all" | "mco" | "ffs"> ariaLabel="Coverage type" value={f.coverage === "unknown" ? "all" : f.coverage} defaultValue="all" onChange={(v) => set("coverage", v)} options={[{ value: "all", label: "All coverage types" }, { value: "mco", label: "Cardinal Care managed care (MCO)" }, { value: "ffs", label: "Fee-for-service" }]} />
            )}
          </div>
          <div>
            <span className="mb-1 block text-[12px] font-medium text-ink2">Setting</span>
            <Dropdown<Setting | "all"> ariaLabel="Setting" value={f.setting} defaultValue="all" onChange={(v) => set("setting", v)} options={[{ value: "all", label: "All settings" }, { value: "community", label: "Community" }, { value: "school", label: "School" }, { value: "facility", label: "Facility" }, { value: "clinic", label: "Clinic" }]} />
          </div>
          <div>
            <label htmlFor="policy-date" className="mb-1 block text-[12px] font-medium text-ink2">Effective date</label>
            <div className="flex flex-wrap items-center gap-1.5">
              <input id="policy-date" type="date" value={iso(f.date)} onChange={(e) => set("date", fromIso(e.target.value, f.date))} className="h-8 rounded-lg border border-field bg-white px-2 text-[13px]" />
              <Button size="sm" onClick={() => set("date", clock)} aria-pressed={iso(f.date) === iso(clock)}>Today</Button>
              <Button size="sm" onClick={() => set("date", REDESIGN_START)} aria-pressed={iso(f.date) === iso(REDESIGN_START)}>July 1, 2027</Button>
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[12px] font-medium text-ink2">Policy version</span>
            <Dropdown<PolicyVersionId | "all"> ariaLabel="Policy version" value={f.version} defaultValue="all" onChange={(v) => set("version", v)} options={[{ value: "all", label: "All versions" }, ...Object.values(POLICY_VERSIONS).map((v) => ({ value: v.id, label: v.label }))]} menuWidth={320} />
          </div>
        </div>
      </section>

      <section aria-label="Matching rules" className="mt-6">
        <div className="flex items-baseline justify-between gap-2">
          <Label>Matching rules</Label>
          <span data-testid="rule-count" className="text-[12px] text-muted">{rules.length} DMAS {rules.length === 1 ? "rule" : "rules"}{org.length ? ` · ${org.length} organization` : ""} for {longDate(f.date)}</span>
        </div>
        {rules.length || org.length ? (
          <ul className="mt-2 space-y-2.5">
            {rules.map((r) => (
              <li key={r.id} data-rule={r.id} className="rounded-2xl border border-edge bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold">{r.label}</span>
                  <RuleStatusPill rule={r} />
                  <Chip>{KIND_LABEL[r.kind]}</Chip>
                </div>
                <p className="mt-1 text-[13px] text-ink2">{r.detail}</p>
                <p className="mt-1 text-[12px] text-muted">{[servicesLabel(r), r.coverage ? (r.coverage.includes("ffs") && r.coverage.length === 1 ? "Fee-for-service" : "Managed care") : null, windowLabel(r), r.timing, r.reviewer ? REVIEWER[r.reviewer] : null, POLICY_VERSIONS[r.version].label].filter(Boolean).join(" · ")}</p>
                {/* A DMAS row is a summary the demo keeps with the rule set: it has the rule set's date and no responsible reviewer yet. */}
                <p className="mt-0.5 text-[12px] text-muted" data-review-line>{reviewLine({ reviewer: "Pending assignment", updated: RULES_UPDATED })}</p>
                <SourceAnchor rule={r} className="mt-1 inline-block" />
              </li>
            ))}
            {org.map((r) => (
              <li key={r.id} data-org-rule={r.id} className="rounded-2xl border border-dashed border-field bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold">{r.label}</span>
                  <Pill tone="mid">{ORG_RULE_LABEL}</Pill>
                  <Chip>{KIND_LABEL[r.kind]}</Chip>
                </div>
                <p className="mt-1 text-[13px] text-ink2">{r.detail}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-muted">
                  <span>{r.services === "all" ? "All services" : r.services.map((s) => serviceById(s).short).join(", ")}{r.payers ? ` · ${r.payers.map((p) => vaPlanOf(p)?.short ?? p).join(", ")}` : ""}</span>
                  {admin ? <button type="button" className="font-semibold text-risk-ink hover:underline" onClick={() => removeOrg(r.id)}>Remove</button> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={FilterX} title="No rules match" action={<Button onClick={() => setF(blank)}>Clear filters</Button>}>Try another service, plan or date.</EmptyState>
        )}
      </section>

      <AssessmentRules rules={assessRules} />

      <section aria-label="Open questions" className="mt-6">
        <Label>Open questions only DMAS can settle</Label>
        <ul className="mt-2 space-y-2">
          {UNRESOLVED.map((u) => (
            <li key={u.id} className="rounded-2xl border border-edge bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-2"><Pill tone="neutral">Unresolved</Pill></div>
              <p className="mt-1 text-[13px] text-ink2">{u.text}</p>
              <SourceAnchor rule={{ source: u.source }} className="mt-1 inline-block" />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12px] text-muted">Sources open the official page in a new tab. {SOURCES.onePager.title}.</p>
      </section>

      <section aria-label="Organization rules" className="mt-6">
        <Label>Organization rules</Label>
        {admin ? <OrgRuleForm /> : <p className="mt-2 text-[13px] text-muted">Only an administrator adds organization rules. In this demo: Jordan Perez or Alex Morgan.</p>}
      </section>
    </Drawer>
  );
}
