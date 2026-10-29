import { Dropdown, InfoTip } from "@/components/ui";
import { Button } from "@/components/ui";
import type { PeriodId } from "@/data/analytics";
import { Building2, X } from "lucide-react";
import { DX_OPTIONS, PAYER_OPTIONS, PERIOD_OPTIONS, PROGRAM_OPTIONS, TRACK_LABEL, isNarrowed, type Filters } from "./filters";

/** Period, payer, program and diagnosis group. The site view is the switch in the top bar, so it appears here as a plain label. */
export function FilterBar({ filters, onChange, siteLabel, restricted }: { filters: Filters; onChange: (f: Filters) => void; siteLabel: string; restricted: boolean }) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filters">
      <Dropdown ariaLabel="Period" value={filters.period} options={PERIOD_OPTIONS} onChange={(v: PeriodId) => set("period", v)} />
      <Dropdown ariaLabel="Payer" value={filters.payer} defaultValue="all" options={PAYER_OPTIONS} onChange={(v) => set("payer", v)} menuWidth={250} />
      <Dropdown ariaLabel="Program" value={filters.program} defaultValue="all" options={PROGRAM_OPTIONS} onChange={(v) => set("program", v)} menuWidth={240} />
      <Dropdown ariaLabel="Diagnosis group" value={filters.dx} defaultValue="all" options={DX_OPTIONS} onChange={(v) => set("dx", v)} menuWidth={280} />
      {filters.track !== "all" ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-forest bg-[#EEF7F6] py-1 pr-1.5 pl-3.5 text-[13px] font-semibold text-forest" data-testid="track-chip">
          {TRACK_LABEL[filters.track]}
          <button type="button" aria-label={`Remove the ${TRACK_LABEL[filters.track].toLowerCase()} filter`} onClick={() => set("track", "all")} className="grid h-5 w-5 place-items-center rounded-full hover:bg-forest/10">
            <X size={13} className="ico" />
          </button>
        </span>
      ) : null}
      {isNarrowed(filters) ? (
        <Button variant="ghost" size="sm" onClick={() => onChange({ ...filters, payer: "all", program: "all", dx: "all", track: "all" })}>
          Clear filters
        </Button>
      ) : null}
      <span className="ml-auto inline-flex items-center gap-1.5 text-[13px] text-ink2" data-testid="site-view">
        <Building2 size={15} className="ico text-muted" aria-hidden="true" />
        Site view: <b>{siteLabel}</b>
        <InfoTip label="About the site view" align="end">
          {restricted ? "Your role sees one site, so every figure, chart, table and list on this page counts that site only." : "Follows the Both sites, Site A and Site B switch in the top bar. Every figure, chart, table and list on this page counts the sites in view."}
        </InfoTip>
      </span>
    </div>
  );
}
