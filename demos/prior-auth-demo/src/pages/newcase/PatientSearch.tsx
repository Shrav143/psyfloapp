import { useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";
import { Chip, Pill, TextInput } from "@/components/ui";
import { searchPatients, episodesOf, authorizationsOf, AUTH_STATUS_LABEL, AUTH_STATUS_TONE, payerNameOf, type Patient, type PatientBook } from "@/data/patients";
import { PROGRAM_LABEL } from "@/data/types";
import { siteName } from "@/data/sites";
import { useScope } from "@/lib/scope";

const SHOWN = 6;

/** Find an existing patient by initials or case ID, among the sites in view only. Picking one never creates a second patient: the case is linked to the one that exists. */
export function PatientSearch({ book, onPick, label = "Find a patient", hint }: { book: PatientBook; onPick: (p: Patient) => void; label?: string; hint?: string }) {
  const scope = useScope();
  const [q, setQ] = useState("");
  const hits = useMemo(() => searchPatients(q, scope.sites, book), [q, scope.sites, book]);
  const shown = hits.slice(0, SHOWN);

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <label htmlFor="patient-search" className="mb-1.5 block text-[13px] font-medium text-ink2">{label}</label>
        <TextInput id="patient-search" icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Initials or case ID, for example J.M. or R-1042" autoComplete="off" />
        {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
      </div>
      {q.trim() && hits.length === 0 ? (
        <p role="status" className="rounded-xl bg-tile px-4 py-3 text-[13px] text-ink2">No patient at {scope.label} matches “{q.trim()}”</p>
      ) : null}
      {shown.length ? (
        <ul aria-label="Patients found" className="overflow-hidden rounded-2xl border border-edge bg-white">
          {shown.map((p) => {
            const eps = episodesOf(book, p.id);
            const latest = eps.length ? authorizationsOf(book, eps[eps.length - 1].id)[0] : undefined;
            return (
              <li key={p.id} className="border-b border-line last:border-b-0">
                <button type="button" onClick={() => onPick(p)} aria-label={`Pick ${p.initials}, ${p.age}, ${p.id}`} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#FBF8F3]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-bg text-neutral-ink"><UserRound size={16} className="ico" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{p.initials}, {p.age} <span className="ml-1 text-xs font-normal text-muted">{p.id}</span></span>
                    <span className="block text-[13px] text-muted">{payerNameOf(p.payerId)} · {eps.map((e) => PROGRAM_LABEL[e.program]).join(", ")}{scope.sites.length > 1 ? ` · ${siteName(p.site)}` : ""}</span>
                  </span>
                  {latest ? <Pill tone={AUTH_STATUS_TONE[latest.status]}>{AUTH_STATUS_LABEL[latest.status]}</Pill> : <Chip>No authorization</Chip>}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {hits.length > SHOWN ? <p className="text-xs text-muted">{hits.length - SHOWN} more</p> : null}
    </div>
  );
}
