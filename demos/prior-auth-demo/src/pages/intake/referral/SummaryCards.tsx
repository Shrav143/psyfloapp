import { useState } from "react";
import { Banner, Card, CardBody, CardHeader, Chip } from "@/components/ui";
import { POPULATION_LABEL } from "@/data/assess/types";
import { METHOD_LABEL, type IntakeRecord } from "@/data/intake/types";
import { partTwoApplies, populationOfAge } from "@/data/intake/referralFacts";
import { serviceById } from "@/data/va/services";
import { fieldOf, type Section } from "./attributes";
import { ServiceNotes } from "./ServiceNotes";
import { FieldRow, type DocSpot } from "./FieldRow";

type Def = [Section, string];
interface Shared { record: IntakeRecord; active?: DocSpot | null; onSpot?: (s: DocSpot | null, pin?: boolean) => void }

const hasValue = (r: IntakeRecord, [section, key]: Def): boolean => {
  const fv = fieldOf(r, section, key);
  return !!fv && !!fv.value.trim() && fv.state !== "not_collected";
};

/** A card of referral values. Values the referral has show; the ones it lacks wait behind one button, so a card is as long as what is known. */
function FieldCard({ title, subtitle, right, defs, always = [], record, active, onSpot, children, id }: Shared & {
  title: string; subtitle?: string; right?: React.ReactNode; defs: Def[]; always?: string[]; children?: React.ReactNode; id?: string;
}) {
  const [more, setMore] = useState(false);
  const shown = defs.filter((d) => always.includes(d[1]) || hasValue(record, d));
  const hidden = defs.filter((d) => !shown.includes(d));
  const rows = more ? defs : shown;
  return (
    <Card id={id} data-card={title}>
      <CardHeader title={title} subtitle={subtitle} right={right} />
      <CardBody className="py-1">
        {rows.map(([section, key]) => <FieldRow key={`${section}.${key}`} record={record} section={section} field={key} active={active} onSpot={onSpot} always={more || always.includes(key)} />)}
        {children}
        {hidden.length ? (
          <button type="button" aria-expanded={more} onClick={() => setMore((m) => !m)} className="my-2 text-[13px] font-semibold text-forest hover:underline">
            {more ? "Hide fields not in the referral" : `Show ${hidden.length} field${hidden.length === 1 ? "" : "s"} not in the referral`}
          </button>
        ) : null}
      </CardBody>
    </Card>
  );
}

export function PatientCard(p: Shared) {
  const pop = populationOfAge(p.record.age);
  const minor = p.record.age !== null && p.record.age < 18;
  return (
    <FieldCard
      {...p} title="Patient" right={pop ? <Chip>{POPULATION_LABEL[pop]}</Chip> : null}
      defs={[["referral", "person"], ["profile", "dob"], ["profile", "phone"], ["profile", "language"], ["profile", "guardianName"], ["profile", "guardianPhone"], ["profile", "emergencyContact"], ["profile", "preferredName"]]}
      always={["person", "dob", ...(minor ? ["guardianName", "guardianPhone"] : ["phone"])]}
    />
  );
}

export function ReferralCard(p: Shared & { now: number }) {
  const r = p.record;
  const simulated = r.documents.some((d) => d.simulated);
  return (
    <FieldCard
      {...p} title="Referral" subtitle={`${METHOD_LABEL[r.method]}${simulated ? " · simulated extraction" : ""}`}
      defs={[["referral", "sourceOrg"], ["referral", "referringClinician"], ["referral", "referrerContact"], ["referral", "referralDate"], ["referral", "reason"], ["referral", "requestedService"], ["referral", "urgency"]]}
      always={["sourceOrg", "referrerContact", "reason", "requestedService", "urgency"]}
    >
      <ServiceNotes record={r} now={p.now} />
    </FieldCard>
  );
}

export function ClinicalCard(p: Shared) {
  return (
    <FieldCard
      {...p} title="Clinical information" subtitle="As the referral states it. A clinician assesses; Psyflo does not diagnose."
      defs={[["referral", "concerns"], ["referral", "symptoms"], ["referral", "dxDocumented"], ["profile", "psychHistory"], ["profile", "substanceUse"], ["profile", "medical"], ["profile", "medications"], ["referral", "functional"], ["referral", "safetyConcerns"], ["referral", "previousServices"], ["referral", "existingAssessments"], ["referral", "hospitalization"]]}
    />
  );
}

export function CoverageCard(p: Shared) {
  return (
    <FieldCard
      {...p} title="Payer and coverage" subtitle="As the referral gives it. Not verified: the eligibility check comes later and is simulated."
      defs={[["coverage", "plan"], ["coverage", "medicaidId"], ["coverage", "coverageType"], ["coverage", "effective"], ["coverage", "secondary"], ["coverage", "otherCoverage"]]}
      always={["plan", "medicaidId"]}
    />
  );
}

export function ConsentCard(p: Shared) {
  const r = p.record;
  const school = serviceById(r.serviceId).setting === "school" || hasValue(r, ["profile", "schoolConsent"]);
  const part2 = partTwoApplies(r);
  const defs: Def[] = [["profile", "consentTreatment"], ["profile", "roi"], ...(school ? [["profile", "schoolConsent"] as Def] : [])];
  return (
    <FieldCard {...p} title="Consents" subtitle={part2 ? "Substance use program" : undefined} defs={defs} always={defs.map(([, k]) => k)}>
      {part2 ? (
        <Banner tone="neutral" title="42 CFR Part 2" className="my-2">
          This program treats substance use, so the person's consent is needed before records are disclosed. Organization protocol, not legal advice.
        </Banner>
      ) : null}
    </FieldCard>
  );
}