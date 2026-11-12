import { Link } from "react-router-dom";
import { RefreshCw, UserRound } from "lucide-react";
import { Button, Card, Chip, Disclosure, Pill } from "@/components/ui";
import { effectiveStatus } from "@/data/assess/status";
import { payerNameOf } from "@/data/patients";
import { TRIAGE_LABEL } from "@/data/intake/types";
import { siteName } from "@/data/sites";
import { paths } from "@/routes";
import { useStore } from "@/store";
import type { CaseEnv } from "../caseEnv";
import { DuplicateWarning } from "../DuplicateWarning";
import { IntakeForm } from "../IntakeForm";
import { PersonPicker } from "./PersonPicker";

function Frame({ title, sub, children, right }: { title: string; sub: string; children?: React.ReactNode; right: React.ReactNode }) {
  return (
    <Card className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-bg text-neutral-ink"><UserRound size={18} className="ico" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{title}</div>
          <div className="text-[13px] text-muted">{sub}</div>
        </div>
        {right}
      </div>
      {children}
    </Card>
  );
}

/** Who the authorization is for, read from the shared record. An intake gives the person, the plan and the service; a patient from the patient book gives the same without an intake; a verification gives what it checked.
    Nothing is asked again. A person who is in none of these starts in Referrals & Intake. */
export function PersonSection({ draft, env }: { draft: CaseEnv["draft"]; env: CaseEnv }) {
  const intake = useStore((s) => s.intakes.find((r) => r.id === draft.intakeId));
  const link = useStore((s) => s.linkCaseToIntake);
  const unlink = useStore((s) => s.unlinkCaseIntake);
  const clear = useStore((s) => s.clearCasePatient);
  const sub = [draft.payerId ? payerNameOf(draft.payerId) : "No plan yet", draft.memberId ? `member ID ${draft.memberId}` : null, siteName(draft.site)].filter(Boolean).join(" · ");

  if (intake) {
    return (
      <Frame
        title={`${intake.initials || "No patient yet"}${intake.age !== null ? `, ${intake.age}` : ""}`}
        sub={sub}
        right={<div className="flex flex-wrap items-center gap-2"><Chip>{intake.id}</Chip><Pill tone="neutral">{TRIAGE_LABEL[effectiveStatus(intake)]}</Pill></div>}
      >
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-[13px]">
          <span className="text-muted">Read from the intake record. Nothing is asked again.</span>
          <Link to={paths.intakeRecord(intake.id, "patient")} className="font-semibold text-forest hover:underline">Patient &amp; coverage</Link>
          <Link to={paths.intakeRecord(intake.id)} className="font-semibold text-forest hover:underline">Open the intake</Link>
          <span className="flex-1" />
          <Button size="sm" icon={RefreshCw} onClick={() => link(draft.id, intake.id)}>Refresh from the record</Button>
          <Button size="sm" variant="ghost" onClick={() => { unlink(draft.id); clear(draft.id); }}>Use a different person</Button>
        </div>
      </Frame>
    );
  }
  if (env.patient) {
    const p = env.patient;
    return (
      <Frame title={`${p.initials}, ${p.age}`} sub={`${payerNameOf(p.payerId)} · member ID ${p.memberMasked} · ${siteName(p.site)}`} right={<div className="flex items-center gap-2"><Chip>{p.id}</Chip><Button size="sm" variant="ghost" onClick={() => clear(draft.id)}>Change patient</Button></div>}>
        <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted">From the patient book. This person has no intake in Referrals &amp; Intake.</p>
      </Frame>
    );
  }
  const typed = !!draft.patient.initials.trim() || draft.patient.age !== null;
  return (
    <div className="flex flex-col gap-4">
      {typed ? (
        <Frame title={`${draft.patient.initials || "No initials"}${draft.patient.age !== null ? `, ${draft.patient.age}` : ""}`} sub={sub} right={<Button size="sm" variant="ghost" onClick={() => clear(draft.id)}>Choose a different person</Button>}>
          <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted">From what was entered when the coverage was checked. No patient record is linked.</p>
        </Frame>
      ) : (
        <Card className="px-5 py-4"><PersonPicker draft={draft} /></Card>
      )}
      <DuplicateWarning env={env} />
      <Disclosure title={<span className="font-sans text-[14px] font-semibold">Enter the details by hand</span>} summary="For a person who has no record yet. No intake is created." variant="card">
        <div className="p-0"><IntakeForm draft={draft} /></div>
      </Disclosure>
    </div>
  );
}
