import { Banner, Chip, Drawer, Label, Pill } from "@/components/ui";
import { schemaOf } from "@/data/assess/modules";
import type { PriorAssessment } from "@/data/assess/types";
import { priorContentOf } from "@/data/intake/ext/cans";
import { longDate } from "@/lib/time";
import { ageLabel, REUSE_LABEL, STATUS_LABEL } from "./priorModel";
import { Facts } from "./ui";

/** The read-only view of an assessment found for the person. Opening it changes nothing. */
export function PriorDrawer({ prior, now, open, onClose }: { prior: PriorAssessment; now: number; open: boolean; onClose: () => void }) {
  const content = priorContentOf(prior.id);
  const labels = new Map(schemaOf(prior.moduleId).sections.flatMap((s) => s.fields).map((f) => [f.key, f.label]));
  const fields = Object.entries(content?.fields ?? {});
  return (
    <Drawer open={open} onClose={onClose} title={prior.label} subtitle={`Read-only · from ${prior.provider}`} width={620}>
      <div className="space-y-5" data-prior-drawer={prior.id}>
        <Banner tone="neutral" title="Read-only">Opening this assessment changes nothing on the record. Synthetic content for the demo.</Banner>
        <Facts
          items={[
            ["Assessment date", longDate(prior.date)],
            ["Age", ageLabel(prior, now)],
            ["Assessor", prior.clinician],
            ["Source provider", prior.provider],
            ["Version", prior.version],
            ["Status", <Pill key="s" tone={prior.status === "current" ? "good" : "mid"}>{STATUS_LABEL[prior.status]}</Pill>],
            ["Reuse", REUSE_LABEL[prior.reuse]],
          ]}
        />
        <p className="text-[14px] text-ink">{prior.note}</p>
        {content?.summary.length ? (
          <div>
            <Label>What it says</Label>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-ink">{content.summary.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        ) : null}
        {content?.evidence.length ? (
          <div>
            <Label>Statements that would carry forward as evidence</Label>
            <ul className="mt-2 space-y-1.5">
              {content.evidence.map((e) => (
                <li key={e.text} className="flex flex-wrap items-start gap-2 text-[14px] text-ink"><Chip>{e.theme}</Chip><span className="min-w-0 flex-1">{e.text}</span></li>
              ))}
            </ul>
          </div>
        ) : null}
        {fields.length ? (
          <div>
            <Label>Fields that would carry forward</Label>
            <dl className="mt-2 space-y-2.5">
              {fields.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12px] text-muted">{labels.get(k) ?? k}</dt>
                  <dd className="text-[14px] text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
        <p className="text-[13px] text-muted">{content?.excluded ?? "Nothing else was sent with this assessment."}</p>
      </div>
    </Drawer>
  );
}
