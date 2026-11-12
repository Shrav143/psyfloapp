import { Field, Segmented } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { SITES, siteName } from "@/data/sites";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";

/** Which site a new patient's case belongs to. With both sites in view the person chooses; with one site in view the case belongs to it, and an existing patient's case is at the patient's site.
    Once the case has its ID the site is fixed: the ID places the case, and the verification is filed under it. */
export function SitePicker({ draft }: { draft: CaseDraft }) {
  const scope = useScope();
  const setSite = useStore((s) => s.setCaseSite);
  const locked = !!draft.caseId || !!draft.patientId || draft.sent;
  const choices = SITES.filter((s) => scope.sites.includes(s.id));
  return (
    <Field label="Site">
      {choices.length > 1 && !locked ? (
        <Segmented items={choices.map((s) => ({ id: s.id, label: s.name }))} value={draft.site} onChange={(id) => setSite(draft.id, id)} />
      ) : (
        <div className="flex h-[38px] items-center text-[14px] font-medium">{siteName(draft.site)}</div>
      )}
    </Field>
  );
}
