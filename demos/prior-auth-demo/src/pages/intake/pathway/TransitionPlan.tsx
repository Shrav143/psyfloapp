import { Card, CardBody, CardHeader } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { LEGACY_LAST_DAY, REDESIGN_START } from "@/data/va/policy";
import { serviceById } from "@/data/va/services";
import { cn } from "@/lib/cn";
import { longDate } from "@/lib/time";
import { useStore } from "@/store";
import { SourceCite } from "../cans/ui";
import { pathwayName, PW_STATUS_LABEL } from "./pathwayModel";

/* The transition timeline for a person whose care crosses June 30, 2027: what continues until then, what can start on July 1, 2027, and the
   options under clinical review. There is never a one-to-one mapping from a retiring service to a new one. */

/** Shown for a person on a retiring service, or when the options mix a retiring bridge with a redesigned service. */
export const needsTransition = (r: IntakeRecord): boolean => {
  const kinds = new Set(liveOptions(r).map((o) => o.svc.status));
  return !!r.legacy || (kinds.has("retiring") && kinds.has("redesign"));
};
/** Options still in play that are Medicaid services, with their service. */
const liveOptions = (r: IntakeRecord) => r.pathways.flatMap((pw) => (pw.serviceId === "external" || pw.status === "not_selected" ? [] : [{ pw, svc: serviceById(pw.serviceId) }]));

export function TransitionPlan({ record, now }: { record: IntakeRecord; now: number }) {
  const clock = useStore((s) => s.clock);
  const live = liveOptions(record);
  const next = live.filter((o) => o.svc.status !== "retiring").map((o) => o.pw);
  const legacy = record.legacy ? serviceById(record.legacy.serviceId) : live.find((o) => o.svc.status === "retiring")?.svc ?? null;
  const ended = now > LEGACY_LAST_DAY;
  const steps: { when: string; text: string; done?: boolean; tone?: "mid" }[] = [];
  if (record.legacy && legacy) {
    steps.push({ when: `Now, ${longDate(clock)}`, text: `${legacy.label}${legacy.code ? ` (${legacy.code})` : ""}, authorization ${record.legacy.authorizationId} through ${longDate(record.legacy.authEnds)}.`, done: true });
    if (record.legacy.authEnds < LEGACY_LAST_DAY) steps.push({ when: `By ${longDate(record.legacy.authEnds)}`, text: `Renew the authorization to continue ${legacy.short} through June 30, 2027.`, tone: "mid" });
  } else if (legacy) {
    steps.push({ when: `Now, ${longDate(clock)}`, text: `${legacy.short} is in effect and could bridge care until it retires.`, done: true });
  }
  if (legacy) steps.push({ when: "June 30, 2027", text: ended ? `${legacy.short} ended. It is no longer an option.` : `Last day of ${legacy.short}. It is not extended past this date.`, done: ended });
  steps.push({
    when: "From July 1, 2027",
    text: next.length ? `Options under review: ${next.map((p) => `${pathwayName(p)} (${PW_STATUS_LABEL[p.status].toLowerCase()})`).join("; ")}.` : "No option for after June 30, 2027 yet. Add one or refresh the options.",
    done: now >= REDESIGN_START,
  });
  steps.push({ when: `Planned start ${longDate(record.serviceDate)}`, text: `Requested: ${serviceById(record.serviceId).label}.` });
  return (
    <Card data-transition-plan>
      <CardHeader title="Transition timeline" subtitle={legacy ? `${legacy.short} continues until June 30, 2027. New services start July 1, 2027.` : "New services start July 1, 2027."} />
      <CardBody className="space-y-3">
        <ol className="relative space-y-3 pl-6">
          <span className="absolute top-1.5 bottom-1.5 left-[5px] w-0.5 bg-line" aria-hidden="true" />
          {steps.map((s) => (
            <li key={s.when + s.text} className="relative">
              <span className={cn("absolute top-1 -left-6 h-3 w-3 rounded-full", s.done ? "bg-good" : s.tone === "mid" ? "bg-mid" : "border-2 border-faint bg-white")} aria-hidden="true" />
              <p className="text-[12px] font-semibold text-muted">{s.when}</p>
              <p className="text-[13px] text-ink">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="text-[13px] text-ink2">A retiring service does not map to one replacement. Each person needs a clinical review of what fits next. Nothing here is a mapping.</p>
        <SourceCite id="implDates" />
      </CardBody>
    </Card>
  );
}
