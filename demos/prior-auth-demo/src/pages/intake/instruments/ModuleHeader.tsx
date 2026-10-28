import { useState } from "react";
import { ChevronDown, History, Sparkles } from "lucide-react";
import { Banner, Button, Card, CardBody, Chip, InfoTip, Meter, Pill } from "@/components/ui";
import type { Completion } from "@/data/assess/completion";
import { moduleById, schemaOf } from "@/data/assess/modules";
import { INSTRUMENT_STATUS_LABEL, LEVEL_LABEL, SOURCE_LABEL, VERIFICATION_LABEL, type AssessmentPlan, type InstrumentInstance, type InstrumentStatus, type Level, type ModuleId } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { longDate } from "@/lib/time";
import { actorName } from "../shared/provenance";
import { fmtIso, type ModuleContext } from "./model";

const STATUS_TONE: Record<InstrumentStatus, Tone> = { not_started: "neutral", in_progress: "mid", awaiting_review: "mid", signed: "good", superseded: "neutral" };
const VERB: Record<Level, string> = { required: "Required by", recommended: "Recommended by", optional: "Optional, from" };

/** "v2, signed by Dr. Rivera on 10/20/2026", or what the version is while it is being worked on. */
export function versionLine(inst: InstrumentInstance | undefined): string {
  if (!inst) return "Version 1, not started";
  const prior = inst.history[inst.history.length - 1];
  if (inst.status === "signed") return `v${inst.version}, signed by ${actorName(inst.signedBy ?? "")}${inst.signedAt !== undefined ? ` on ${longDate(inst.signedAt)}` : ""}${inst.rolePlay ? " (demo role-play)" : ""}`;
  const now = inst.status === "awaiting_review" ? "awaiting review" : inst.status === "not_started" ? "not started" : "in progress";
  return prior ? `v${inst.version}, ${now}; v${prior.version} signed by ${actorName(prior.signedBy ?? "")} is kept` : `v${inst.version}, ${now}`;
}

/** What a module is, why it is in this plan, how far along it is, and what can be done with it as a whole. */
export function ModuleHeader({ record, moduleId, ctx, plan, inst, completion, finding, onFindEvidence, onHistory }: {
  record: IntakeRecord; moduleId: ModuleId; ctx: ModuleContext; plan: AssessmentPlan | null; inst: InstrumentInstance | undefined; completion: Completion;
  finding: boolean; onFindEvidence: () => void; onHistory: () => void;
}) {
  const [why, setWhy] = useState(false);
  const status: InstrumentStatus = inst?.status ?? "not_started";
  const def = moduleById(moduleId);
  const choice = record.config?.modules.find((c) => c.id === moduleId);
  const strongest = ctx.sources.filter((s) => s.level === ctx.level);
  const seen = new Set<string>();
  const chips = strongest.filter((s) => (seen.has(`${s.source}|${s.status}`) ? false : !!seen.add(`${s.source}|${s.status}`)));
  const decided = (inst?.evidence ?? []).filter((e) => e.status !== "pending").length;
  const canEdit = status !== "signed";

  return (
    <Card data-module-header={moduleId}>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-semibold leading-tight">{ctx.label}</h2>
              <Pill tone={STATUS_TONE[status]} dot>{INSTRUMENT_STATUS_LABEL[status]}</Pill>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {def.licensed ? <Chip>Licensed content not reproduced</Chip> : null}
              {chips.length ? chips.slice(0, 2).map((s) => <Chip key={`${s.source}${s.status}`}>{VERB[ctx.level]} {SOURCE_LABEL[s.source]} ({VERIFICATION_LABEL[s.status]})</Chip>) : <Chip>{LEVEL_LABEL[ctx.level]}{choice?.by === "clinician" ? ", added by a person" : ""}</Chip>}
              {chips.length > 2 ? <Chip>+{chips.length - 2} more sources</Chip> : null}
              {plan?.framework && (moduleId === "asam" || moduleId === "loc-review") ? <Chip>{plan.framework.label}{plan.framework.edition ? `, ${plan.framework.edition}` : ""}</Chip> : null}
            </div>
            <p className="mt-2 text-[13px] text-muted">{versionLine(inst)}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {canEdit && schemaHasEvidence(moduleId) ? <Button icon={Sparkles} loading={finding} onClick={onFindEvidence}>Find evidence</Button> : null}
            <Button icon={History} onClick={onHistory}>Version history</Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="min-w-[200px] flex-1">
            <div role="progressbar" aria-label={`${ctx.label} completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion.percent}>
              <Meter value={completion.percent} color="#217A78" height={6} />
            </div>
          </div>
          <p className="text-[13px] text-ink2" data-completion>
            {completion.total ? `${completion.done} of ${completion.total} required complete` : "No required fields"}
            {completion.pending ? <span className="text-mid-ink"> · {completion.pending} evidence pending</span> : decided ? <span className="text-muted"> · {decided} evidence decided</span> : null}
          </p>
        </div>

        {ctx.preparation ? (
          <Banner tone="neutral" className="mt-4" title={ctx.effectiveFrom ? `Takes effect ${fmtIso(ctx.effectiveFrom)}` : "Takes effect after the policy date"}>
            Shown for preparation. It does not hold up readiness before then.
          </Banner>
        ) : null}

        <button type="button" onClick={() => setWhy((w) => !w)} aria-expanded={why} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-forest hover:underline">
          Why this module
          <ChevronDown size={15} className={`ico transition-transform ${why ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {why ? (
          <div className="mt-2 space-y-3 border-t border-line pt-3 text-[13px]" data-why>
            <p className="text-ink2">{def.description}</p>
            {ctx.sources.length ? (
              <ul className="space-y-2">
                {ctx.sources.map((s) => (
                  <li key={`${s.ruleId}-${s.level}-${s.reason}`}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold">{s.ruleLabel}</span>
                      <Chip>{LEVEL_LABEL[s.level]}</Chip>
                      <Chip>{SOURCE_LABEL[s.source]}</Chip>
                      <Chip>{VERIFICATION_LABEL[s.status]}</Chip>
                      <span className="text-muted">version {s.version}</span>
                    </div>
                    <p className="mt-0.5 text-ink2">{s.reason}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink2">{choice?.by === "clinician" ? `Added by ${actorName(choice.who ?? "")}. No rule asks for it in this plan.` : "No rule asks for this module in the current plan."}</p>
            )}
            {plan ? (
              <p className="text-muted">
                Who completes and signs: {plan.credentials} <InfoTip label="About sign-off">{plan.signoff}</InfoTip>
              </p>
            ) : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

const schemaHasEvidence = (id: ModuleId): boolean => schemaOf(id).sections.some((s) => s.fields.some((f) => f.evidence?.length));
