import { Segmented } from "@/components/ui";
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
  if (choices.length > 1 && !locked) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
        <span id="site-label" className="text-[13px] font-medium text-ink2">Site</span>
        <Segmented items={choices.map((s) => ({ id: s.id, label: s.name }))} value={draft.site} onChange={(id) => setSite(draft.id, id)} />
        <span className="text-[13px] text-muted">A new patient belongs to one site. Staff at the other site will not see this case.</span>
      </div>
    );
  }
  const why = draft.patientId ? "the patient's site" : draft.caseId ? "set when the case got its ID" : "the site you are working at";
  return (
    <p className="px-1 text-[13px] text-muted">
      <span className="font-medium text-ink2">{siteName(draft.site)}</span> · this case is at {why}.
    </p>
  );
}
