import { useMemo, useState } from "react";
import { SearchX, UserPlus } from "lucide-react";
import { Banner, Button, Checkbox, Chip, Dropdown, EmptyState, Field, SearchInput, TextInput } from "@/components/ui";
import { SITES, type SiteId } from "@/data/sites";
import type { BuiltInPayerId } from "@/data/types";
import { VA_PLANS, vaPlanOf } from "@/data/va/plans";
import { OptionCard, OptionGroup } from "./OptionCard";
import { searchCandidates, type Candidate, type DuplicateHit } from "./people";

/** What the person typed to add someone new. Only initials, an age worked out from the date of birth, the plan and the last four digits of the member ID are kept. */
export interface NewPerson {
  name: string;
  dob: string;
  payerId: BuiltInPayerId | null;
  memberLast4: string;
  site: SiteId;
}
export const EMPTY_PERSON = (site: SiteId): NewPerson => ({ name: "", dob: "", payerId: null, memberLast4: "", site });

const ageText = (c: Candidate): string => (c.person.age !== null ? `, ${c.person.age}` : "");

/** Step 1 of New Clinical Intake: find the person in the patient book and the intake records, or add a new one. Adding someone who may already be on file
    shows the possible match first; the person says whether it is the same. */
export function PersonStep({ all, picked, onPick, adding, onAdding, form, onForm, age, sites, dupes, sameConfirmed, onSameConfirmed }: {
  all: Candidate[];
  picked: Candidate | null;
  onPick: (c: Candidate | null) => void;
  adding: boolean;
  onAdding: (on: boolean) => void;
  form: NewPerson;
  onForm: (f: NewPerson) => void;
  age: number | null;
  sites: SiteId[];
  dupes: DuplicateHit[];
  sameConfirmed: boolean;
  onSameConfirmed: (v: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const found = useMemo(() => searchCandidates(all, query), [all, query]);
  /* The person chosen stays on screen, first, even when a search or the first eight would not show them. */
  const first = found.slice(0, 8);
  const shown = picked && !first.some((c) => c.key === picked.key) ? [picked, ...first.slice(0, 7)] : first;
  const set = (p: Partial<NewPerson>) => onForm({ ...form, ...p });

  return (
    <div>
      <h2 className="font-serif text-[18px] font-semibold">Who is the intake for?</h2>
      {!adding ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SearchInput value={query} onChange={setQuery} placeholder="Search by initials, age, member ID ending or intake number" className="w-full max-w-[440px]" />
            <Button icon={UserPlus} onClick={() => { onAdding(true); onPick(null); }}>Add a new person</Button>
          </div>
          <p className="mt-2 text-[13px] text-muted" aria-live="polite">{query ? `${found.length} found` : `${all.length} people in the patient book and intake records`}{found.length > shown.length ? `. Showing ${shown.length}; search to narrow.` : ""}</p>
          {found.length === 0 ? (
            <EmptyState icon={SearchX} title={`No one matches "${query}"`} action={<Button variant="primary" icon={UserPlus} onClick={() => onAdding(true)}>Add a new person</Button>}>
              Check the initials, or add the person.
            </EmptyState>
          ) : (
            <OptionGroup label="People" className="mt-3 grid grid-cols-1 gap-3 @min-[700px]:grid-cols-2">
              {shown.map((c) => (
                <OptionCard
                  key={c.key} selected={picked?.key === c.key} onSelect={() => onPick(c)} title={`${c.person.initials}${ageText(c)}`}
                  badge={c.person.payerId ? <Chip>{vaPlanOf(c.person.payerId)?.short ?? "Plan on file"}</Chip> : undefined}
                >
                  {c.from.join(" · ") || "On file"}
                </OptionCard>
              ))}
            </OptionGroup>
          )}
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-edge bg-tile px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif text-[16px] font-semibold">Add a new person</h3>
            <Button size="sm" onClick={() => onAdding(false)}>Back to search</Button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 @min-[700px]:grid-cols-2">
            <Field label="Name or initials" required hint="Shown as initials. Use synthetic names only."><TextInput value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="For example, A.B." /></Field>
            <Field label="Date of birth" required hint={age !== null ? `Age ${age}` : "Used to find a person already on file"}><TextInput type="date" value={form.dob} onChange={(e) => set({ dob: e.target.value })} /></Field>
            <Field label="Payer" hint="Plan-specific assessment rules need it">
              <Dropdown<string> variant="field" ariaLabel="Payer" value={form.payerId ?? "none"} placeholder="Not selected" menuWidth={300} onChange={(v) => set({ payerId: v === "none" ? null : (v as BuiltInPayerId) })} options={[{ value: "none", label: "Not selected" }, ...VA_PLANS.map((p) => ({ value: p.payerId, label: p.name }))]} />
            </Field>
            <Field label="Member ID, last four digits" hint="Only the last four are kept, masked"><TextInput inputMode="numeric" maxLength={4} value={form.memberLast4} onChange={(e) => set({ memberLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="0000" /></Field>
            {sites.length > 1 ? (
              <Field label="Site"><Dropdown<SiteId> variant="field" ariaLabel="Site" value={form.site} onChange={(v) => set({ site: v })} options={SITES.filter((s) => sites.includes(s.id)).map((s) => ({ value: s.id, label: `${s.name}, ${s.sub.toLowerCase()}` }))} /></Field>
            ) : null}
          </div>
          {dupes.length ? (
            <Banner tone="mid" className="mt-4" title="This person may already be on file">
              <ul className="mt-1 flex flex-col gap-2">
                {dupes.map(({ candidate: c, why }) => (
                  <li key={c.key} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{c.person.initials}{ageText(c)}: {why}. {c.from.join(" · ")}</span>
                    <Button size="sm" onClick={() => { onAdding(false); onPick(c); }}>Use this person</Button>
                  </li>
                ))}
              </ul>
              <Checkbox className="mt-3" checked={sameConfirmed} onChange={onSameConfirmed} label="This is a different person. Add them anyway." />
            </Banner>
          ) : null}
        </div>
      )}
    </div>
  );
}
