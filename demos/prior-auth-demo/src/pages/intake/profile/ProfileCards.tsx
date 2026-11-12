import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, CardHeader, Disclosure, Pill } from "@/components/ui";
import { isRequired, type FieldSpec } from "@/data/intake/fields";
import type { IntakeRecord } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { paths } from "@/routes";
import { IntakeField } from "../shared/provenance";
import { RequiredPill } from "./bits";
import { applies, consentView, ctxOf, foldable, groupSpecs, HISTORY_GROUP, isDone, requiredProgress, valueAt } from "./model";
import { ageOn } from "@/store/intakeProfile";
import { useStore } from "@/store";

/** A field whose required-ness depends on the person: shown as not applicable (with a way to add it anyway) when it does not apply. */
function ConditionalField({ record, spec }: { record: IntakeRecord; spec: FieldSpec }) {
  const [open, setOpen] = useState(false);
  const fit = applies(spec, record);
  const fv = valueAt(record, spec);
  const required = isRequired(spec, ctxOf(record));
  if (fit === "no" && !fv && !open) {
    const why = spec.required === "minor" ? `Not applicable: ${record.initials || "the person"} is ${record.age}, an adult.` : `Not applicable: ${serviceById(record.serviceId).short} is not a school-based service.`;
    return (
      <div data-field={`${spec.section}.${spec.key}`} data-na="true" className="flex flex-wrap items-start justify-between gap-2 border-b border-line py-3 last:border-b-0">
        <div>
          <div className="text-[13px] font-semibold text-ink2">{spec.label}</div>
          <p className="mt-1 text-[13px] text-muted">{why}</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="text-[12px] font-semibold text-forest hover:underline">
          {spec.required === "minor" ? "Add a legal representative" : "Add anyway"}
        </button>
      </div>
    );
  }
  const hint = fit === "unknown" ? "Required when the person is under 18. Add a date of birth so Psyflo knows." : spec.hint;
  return <IntakeField record={record} section={spec.section} field={spec.key} label={spec.label} kind={spec.kind} options={spec.options} required={required} hint={hint} sensitive={spec.sensitive} />;
}

/** Age is not typed: it follows the date of birth (or the referral, until a date of birth is entered). */
function AgeRow({ record }: { record: IntakeRecord }) {
  const clock = useStore((s) => s.clock);
  const dob = record.profile.dob?.value;
  const fromDob = dob ? ageOn(dob, clock) : null;
  return (
    <div data-field="profile.age" className="border-b border-line py-3 last:border-b-0">
      <div className="text-[13px] font-semibold text-ink2">Age</div>
      <p className="mt-1 text-[14px]">{record.age ?? "Not known"}</p>
      <p className="mt-1 text-[12px] text-muted">{fromDob !== null ? "Follows the date of birth" : record.age !== null ? "From the referral. Add a date of birth to confirm it." : "Add a date of birth."}</p>
    </div>
  );
}

/** Signed, verbal, missing or declined, at a glance. Who recorded each one shows under its field. */
function ConsentSummary({ record }: { record: IntakeRecord }) {
  return (
    <ul aria-label="Consent status" className="mt-1 mb-1 flex flex-wrap gap-x-5 gap-y-2 rounded-xl bg-tile px-3 py-2.5">
      {consentView(record).map((c) => (
        <li key={c.key} data-consent={c.key} className="flex items-center gap-2 text-[13px] text-ink2">
          {c.label}
          <Pill tone={c.tone}>{c.word}</Pill>
        </li>
      ))}
    </ul>
  );
}

/** Optional fields nobody has filled stay folded, so the card shows what is needed first. */
export function OptionalFields({ record, specs }: { record: IntakeRecord; specs: FieldSpec[] }) {
  const [open, setOpen] = useState(false);
  if (!specs.length) return null;
  if (open) return <>{specs.map((s) => <ConditionalField key={s.key} record={record} spec={s} />)}</>;
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 py-3">
      <p className="min-w-0 flex-1 text-[13px] text-muted">
        {specs.length} optional, not collected: {specs.map((s) => s.label).join(", ")}
      </p>
      <button type="button" onClick={() => setOpen(true)} className="text-[12px] font-semibold text-forest hover:underline">Show optional fields</button>
    </div>
  );
}

/** One card per profile group, with "x of y required" in the header. */
export function ProfileGroupCard({ record, group }: { record: IntakeRecord; group: string }) {
  const specs = groupSpecs("profile", group);
  const p = requiredProgress(record, specs);
  const shown = specs.filter((s) => !foldable(record, s));
  return (
    <Card data-group={group}>
      <CardHeader title={group} right={<RequiredPill {...p} />} />
      <CardBody className="py-2">
        {group === "Guardian and consent" ? <ConsentSummary record={record} /> : null}
        {shown.map((s) => (
          <div key={s.key} className="contents">
            <ConditionalField record={record} spec={s} />
            {s.key === "dob" ? <AgeRow record={record} /> : null}
          </div>
        ))}
        <OptionalFields record={record} specs={specs.filter((s) => foldable(record, s))} />
      </CardBody>
    </Card>
  );
}

/** Clinical and psychosocial history: none of it is required, and it opens only when someone needs it. */
export function HistoryDisclosure({ record }: { record: IntakeRecord }) {
  const specs = groupSpecs("profile", HISTORY_GROUP);
  const collected = specs.filter((s) => isDone(s.key, valueAt(record, s))).length;
  const waiting = record.suggestions.filter((x) => x.status === "pending" && x.section === "profile" && specs.some((s) => s.key === x.field)).length;
  return (
    <Disclosure
      title="Collect as appropriate"
      summary={`${HISTORY_GROUP} · ${collected} of ${specs.length} collected · none required${waiting ? ` · ${waiting} suggestion${waiting === 1 ? "" : "s"} to review` : ""}`}
      right={waiting ? <Pill tone="mid">{waiting} to review</Pill> : undefined}
    >
      <div className="px-5 pt-3 pb-2">
        <p className="rounded-xl bg-neutral-bg px-3 py-2 text-[13px] text-neutral-ink">
          Minimum necessary: collect only what this intake needs. Nothing here is required, and sensitive items are marked. Presenting problem, symptoms, safety, goals and strengths are in the{" "}
          <Link to={paths.intakeRecord(record.id, "assessment")} className="font-semibold text-forest hover:underline">Clinical assessment</Link>.
        </p>
        {specs.map((s) => (
          <IntakeField key={s.key} record={record} section="profile" field={s.key} label={s.label} kind={s.kind} options={s.options} hint={s.hint} sensitive={s.sensitive} />
        ))}
      </div>
    </Disclosure>
  );
}
