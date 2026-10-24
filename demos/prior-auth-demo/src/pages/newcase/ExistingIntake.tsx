import { UserRound } from "lucide-react";
import { Button, Card, CardBody, ChoiceCard, Label, Pill } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { authorizationsOf, episodesOf, windowText, payerNameOf, AUTH_STATUS_LABEL, AUTH_STATUS_TONE } from "@/data/patients";
import { siteName } from "@/data/sites";
import { useStore } from "@/store";
import { AuthorizationCard } from "./AuthorizationCard";
import type { CaseEnv } from "./caseEnv";
import { DatesFields } from "./DatesFields";
import { DuplicateWarning } from "./DuplicateWarning";
import { ModificationCard } from "./ModificationCard";
import { PatientSearch } from "./PatientSearch";

/** Intake for a concurrent review, a renewal or a modification: find the patient, pick the treatment episode and the authorization, say what is asked.
    No new patient is ever created. Only patients at the sites in view are searched. */
export function ExistingIntake({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const choose = useStore((s) => s.chooseCasePatient);
  const clear = useStore((s) => s.clearCasePatient);
  const patient = env.patient;

  if (!patient) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-3">
          <h2 className="font-serif text-[18px] font-semibold tracking-tight">Find the patient</h2>
          <PatientSearch book={env.book} label="Patient" onPick={(p) => choose(draft.id, { patientId: p.id })} />
        </CardBody>
      </Card>
    );
  }

  const episodes = episodesOf(env.book, patient.id);
  const episode = episodes.find((e) => e.id === draft.episodeId);
  const auths = episode ? authorizationsOf(env.book, episode.id) : [];
  const auth = env.authorization;

  return (
    <div className="flex flex-col gap-4">
      <Card className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-bg text-neutral-ink"><UserRound size={18} className="ico" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{patient.initials}, {patient.age} <span className="ml-1 text-xs font-normal text-muted">{patient.id}</span></div>
            <div className="text-[13px] text-muted">{payerNameOf(patient.payerId)} · member ID {patient.memberMasked} · {siteName(patient.site)}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => clear(draft.id)}>Change patient</Button>
        </div>
      </Card>

      {episodes.length > 1 ? (
        <div role="radiogroup" aria-label="Treatment episode" className="flex flex-col gap-2.5">
          <Label>Which treatment episode?</Label>
          {episodes.map((e) => (
            <ChoiceCard key={e.id} selected={e.id === draft.episodeId} onClick={() => choose(draft.id, { patientId: patient.id, episodeId: e.id })} title={`${e.levelLabel} · ${e.label}`}>
              {payerNameOf(e.payerId)} · {authorizationsOf(env.book, e.id).map((a) => `${AUTH_STATUS_LABEL[a.status]}${windowText(a) ? `, ${windowText(a)}` : ""}`).join("; ")}
            </ChoiceCard>
          ))}
        </div>
      ) : null}

      {episode && auths.length > 1 ? (
        <div role="radiogroup" aria-label="Authorization" className="flex flex-col gap-2.5">
          <Label>Which authorization?</Label>
          {auths.map((a) => (
            <ChoiceCard key={a.id} selected={a.id === draft.authorizationId} onClick={() => choose(draft.id, { patientId: patient.id, episodeId: episode.id, authorizationId: a.id })} title={`${a.label} · ${a.id}`} right={<Pill tone={AUTH_STATUS_TONE[a.status]}>{AUTH_STATUS_LABEL[a.status]}</Pill>}>
              {windowText(a) ?? "Not approved yet"}
            </ChoiceCard>
          ))}
        </div>
      ) : null}

      {episode && auth ? (
        <AuthorizationCard patient={patient} episode={episode} auth={auth} />
      ) : !episode && episodes.length > 1 ? null : (
        <p className="px-1 text-[13px] text-muted">This patient has no authorization on file.</p>
      )}

      {episode ? (
        <>
          <DuplicateWarning env={env} />
          {draft.kind === "modify" ? <ModificationCard draft={draft} /> : null}
          <Card>
            <CardBody className="flex flex-col gap-3">
              <h3 className="font-serif text-[18px] font-semibold tracking-tight">{draft.kind === "modify" ? "Dates the change covers" : draft.kind === "reauth" ? "Dates to renew" : "Dates to review"}</h3>
              <DatesFields draft={draft} from={draft.kind === "modify" ? "Change starts" : "Requested start date"} to={draft.kind === "modify" ? "Change ends" : "Requested end date"} />
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}
