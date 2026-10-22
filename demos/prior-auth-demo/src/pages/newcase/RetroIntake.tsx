import { PencilLine } from "lucide-react";
import { Button, Card, CardBody, Chip, Disclosure, Field, FileDrop, TextArea } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { useStore } from "@/store";
import { useScope } from "@/lib/scope";
import { RETRO_REASONS } from "./authType";
import type { CaseEnv } from "./caseEnv";
import { CaseDetails } from "./CaseDetails";
import { DatesFields } from "./DatesFields";
import { DuplicateWarning } from "./DuplicateWarning";
import { PatientSearch } from "./PatientSearch";
import { retroRule } from "./payerRules";
import { sortFiles } from "./readFiles";

/** Intake for a retroactive authorization: the patient (known, or entered), the payer, the service, the dates of service, why no authorization was in place, and the supporting documents.
    The warning that this depends on the payer sits under the heading, with the payer's own Backdating rule when one is on file. */
export function RetroIntake({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const choose = useStore((s) => s.chooseCasePatient);
  const scope = useScope();
  const rule = draft.payerId ? retroRule(env.ctx, payerById(draft.payerId).shortName) : null;

  const head = (
    <div>
      <h2 className="font-serif text-[22px] font-semibold tracking-tight">Retroactive authorization</h2>
      <p className="mt-0.5 text-[13.5px] text-muted">
        Retroactive authorization depends on the payer and may not be available.{rule ? ` ${rule.text}` : " Pick the payer to see its Backdating rule."}
      </p>
    </div>
  );

  if (!draft.started) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-4">
          {head}
          <Disclosure variant="plain" defaultOpen title="Find a patient who is already known" summary={`Search ${scope.label.toLowerCase()} by initials or case ID.`}>
            <div className="px-0 py-4">
              <PatientSearch book={env.book} label="Patient" onPick={(p) => choose(draft.id, { patientId: p.id })} />
            </div>
          </Disclosure>
          <div>
            <Button icon={PencilLine} onClick={() => patch(draft.id, { started: true })}>Enter the patient by hand</Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[20px] border border-edge bg-white px-6 py-5">{head}</div>
      <DuplicateWarning env={env} />
      <CaseDetails draft={draft} />
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div>
            <h3 className="font-serif text-[19px] font-semibold tracking-tight">Dates of service</h3>
            <p className="mt-0.5 text-[13.5px] text-muted">The first and the last day care was given without an authorization. Verify checks coverage for these dates.</p>
          </div>
          <DatesFields draft={draft} from="First date of service" to="Last date of service" required />
        </CardBody>
      </Card>
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div>
            <h3 className="font-serif text-[19px] font-semibold tracking-tight">Why it was not obtained ahead of time</h3>
            <p className="mt-0.5 text-[13.5px] text-muted">The payer will ask. Use one of these or write your own. Only what happened goes in the request.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RETRO_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => patch(draft.id, { retroReason: r })} className="rounded-full bg-neutral-bg px-3 py-1 text-[13px] font-medium text-neutral-ink hover:bg-[#EADFD0]">
                {r.replace(/\.$/, "")}
              </button>
            ))}
          </div>
          <Field label="Reason">
            <TextArea value={draft.retroReason ?? ""} onChange={(e) => patch(draft.id, { retroReason: e.target.value })} placeholder="What happened, in a sentence or two" />
          </Field>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div>
            <h3 className="font-serif text-[19px] font-semibold tracking-tight">Supporting documents</h3>
            <p className="mt-0.5 text-[13.5px] text-muted">The admission order, the eligibility check from the admission date, attendance for the dates of service. Reader sorts them; you can add more on Clinical documentation.</p>
          </div>
          <FileDrop hint="Drop supporting documents here, or click to choose files" onFiles={(files) => sortFiles(draft.id, files)} />
          {draft.documents.length ? <div className="flex flex-wrap gap-2">{draft.documents.map((d) => <Chip key={d.slot}>{d.file.name}</Chip>)}</div> : null}
        </CardBody>
      </Card>
    </div>
  );
}
