import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserRound } from "lucide-react";
import { Button, Chip, TextInput } from "@/components/ui";
import { effectiveStatus } from "@/data/assess/status";
import { searchPatients } from "@/data/patients";
import { TRIAGE_LABEL } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectPatientBookInView } from "@/store/patients";
import type { CaseDraft } from "@/data/cases";

const squash = (s: string): string => s.toLowerCase().replace(/[.\s-]/g, "");

/** Choose the person this authorization is for. It searches the intakes (the shared record, with the clinical work already done) and the patient book. Picking one reads everything it knows; nothing is retyped.
    If nobody matches, the way out is a referral or a clinical intake, not a second form here. */
export function PersonPicker({ draft }: { draft: CaseDraft }) {
  const nav = useNavigate();
  const scope = useScope();
  const intakes = useStore((s) => s.intakes);
  const book = useStore(selectPatientBookInView);
  const [q, setQ] = useState("");
  const needle = squash(q);
  const intakeHits = useMemo(
    () => (needle ? intakes.filter((r) => scope.sites.includes(r.site) && [r.initials, r.id, r.legacyReferralId ?? "", r.title].some((t) => squash(t).includes(needle))).slice(0, 6) : []),
    [intakes, needle, scope.sites],
  );
  const patientHits = useMemo(() => searchPatients(q, scope.sites, book).filter((p) => !intakeHits.some((r) => r.patientId === p.id)).slice(0, 5), [q, scope.sites, book, intakeHits]);
  const none = !!needle && !intakeHits.length && !patientHits.length;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="person-search" className="mb-1.5 block text-[13px] font-medium text-ink2">Find the person</label>
        <TextInput id="person-search" icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Initials, intake or case ID, for example J.B., IN-3110 or R-1042" autoComplete="off" />
      </div>
      {intakeHits.length ? (
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Intakes</p>
          <ul aria-label="Intakes found" className="overflow-hidden rounded-2xl border border-edge bg-white">
            {intakeHits.map((r) => (
              <li key={r.id} className="border-b border-line last:border-b-0">
                <button type="button" aria-label={`Pick intake ${r.id}, ${r.initials}`} onClick={() => useStore.getState().linkCaseToIntake(draft.id, r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#FAF9F6]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-bg text-neutral-ink"><UserRound size={16} className="ico" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{r.initials || "No patient yet"}{r.age !== null ? `, ${r.age}` : ""} <span className="ml-1 text-xs font-normal text-muted">{r.id}</span></span>
                    <span className="block truncate text-[13px] text-muted">{serviceById(r.serviceId).short} · {r.title}</span>
                  </span>
                  <Chip>{TRIAGE_LABEL[effectiveStatus(r)]}</Chip>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {patientHits.length ? (
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Patients with a treatment episode</p>
          <ul aria-label="Patients found" className="overflow-hidden rounded-2xl border border-edge bg-white">
            {patientHits.map((p) => (
              <li key={p.id} className="border-b border-line last:border-b-0">
                <button type="button" aria-label={`Pick ${p.initials}, ${p.age}, ${p.id}`} onClick={() => useStore.getState().chooseCasePatient(draft.id, { patientId: p.id })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#FAF9F6]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-bg text-neutral-ink"><UserRound size={16} className="ico" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{p.initials}, {p.age} <span className="ml-1 text-xs font-normal text-muted">{p.id}</span></span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {none ? <p role="status" className="rounded-xl bg-tile px-4 py-3 text-[13px] text-ink2">Nobody at {scope.label} matches “{q.trim()}”.</p> : null}
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <span>Not in Psyflo yet?</span>
        <Button size="sm" onClick={() => nav(paths.createReferral())}>Create a referral</Button>
        <Button size="sm" onClick={() => nav(paths.newIntake())}>New Clinical Intake</Button>
      </div>
    </div>
  );
}
