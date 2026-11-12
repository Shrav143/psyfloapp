import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { Banner, Button, Chip, EmptyState, Pill, SearchInput } from "@/components/ui";
import { CATEGORY_LABEL, PROGRAM_CATEGORIES, PROGRAMS_V2, programById, programsIn } from "@/data/assess/programs";
import type { ProgramId } from "@/data/assess/types";
import { availabilityView } from "./model";
import { OptionCard, OptionGroup } from "./OptionCard";

const squash = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Step 2: the program, by category, with a search. Each program says whether it is available in the policy period; one that starts later or is not
    verified can still be chosen for preparation, a retired one cannot. The program the referral asked for is marked and chosen first. */
export function StepProgram({ programId, onProgram, now, requestedId }: { programId: ProgramId; onProgram: (id: ProgramId) => void; now: number; requestedId: ProgramId | null }) {
  const [query, setQuery] = useState("");
  const q = squash(query);
  const shown = useMemo(() => PROGRAM_CATEGORIES.map((c) => ({ category: c, programs: programsIn(c).filter((p) => !q || squash(`${p.label} ${p.summary}`).includes(q)) })).filter((g) => g.programs.length), [q]);
  const count = shown.reduce((n, g) => n + g.programs.length, 0);
  const chosen = availabilityView(programId, now);
  const requested = requestedId ? programById(requestedId) : null;

  return (
    <div>
      <h2 className="font-serif text-[18px] font-semibold">What program is the patient being evaluated for?</h2>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search programs" className="w-full max-w-[360px]" />
        <span className="text-[13px] text-muted" aria-live="polite">{count} of {PROGRAMS_V2.length} programs</span>
      </div>
      {chosen.warning ? <Banner tone="mid" className="mt-4" title={`${programById(programId).label}: ${chosen.label.toLowerCase()}`}>{chosen.warning}</Banner> : null}
      {requested && programId !== requested.id ? (
        <Banner className="mt-4">The referral requested {requested.label}. Your choice is saved as the program being evaluated; the request stays on the record.</Banner>
      ) : null}
      {count === 0 ? (
        <EmptyState icon={SearchX} title={`No programs match "${query}"`} action={<Button onClick={() => setQuery("")}>Clear search</Button>}>
          Search by program name or what it offers.
        </EmptyState>
      ) : (
        <OptionGroup label="Program" className="mt-2">
          {shown.map((g) => (
            <section key={g.category} className="mt-5">
              <h3 className="font-serif text-[16px] font-semibold">
                {CATEGORY_LABEL[g.category]} <span className="ml-1 text-[13px] font-normal text-muted">{g.programs.length}</span>
              </h3>
              <div className="mt-2.5 grid grid-cols-1 gap-3 @min-[700px]:grid-cols-2">
                {g.programs.map((p) => {
                  const a = availabilityView(p.id, now);
                  return (
                    <OptionCard key={p.id} selected={p.id === programId} onSelect={() => onProgram(p.id)} disabled={!a.selectable} title={p.label} badge={p.id === requestedId ? <Chip>Requested by the referral</Chip> : undefined}>
                      <div>{p.summary}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Pill tone={a.tone}>{a.label}</Pill>
                      </div>
                      {a.note ? <div className="mt-1.5 text-xs">{a.note}</div> : null}
                    </OptionCard>
                  );
                })}
              </div>
            </section>
          ))}
        </OptionGroup>
      )}
    </div>
  );
}
