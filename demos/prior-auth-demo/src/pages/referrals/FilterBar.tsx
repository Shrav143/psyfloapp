import { X } from "lucide-react";
import { Button, Dropdown, type Option } from "@/components/ui";
import { SOURCE_KINDS, SOURCE_KIND_LABEL, URGENCY_LABEL } from "@/data/referrals";
import { PAYERS } from "@/data/seed";
import { PROGRAMS, PROGRAM_LABEL, type Urgency } from "@/data/types";
import { useStore } from "@/store";
import { DEFAULT_REFERRAL_FILTERS, type ReferralFilters } from "@/store/referrals";

const SOURCE_OPTIONS: Option<ReferralFilters["source"]>[] = [{ value: "all", label: "All sources" }, ...SOURCE_KINDS.map((k) => ({ value: k, label: SOURCE_KIND_LABEL[k] }))];
const PAYER_OPTIONS: Option<ReferralFilters["payer"]>[] = [{ value: "all", label: "All payers" }, ...PAYERS.map((p) => ({ value: p.id, label: p.name })), { value: "none", label: "No payer listed" }];
const PROGRAM_OPTIONS: Option<ReferralFilters["program"]>[] = [{ value: "all", label: "All programs" }, ...PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))];
const URGENCY_OPTIONS: Option<ReferralFilters["urgency"]>[] = [{ value: "all", label: "All urgency" }, ...(["routine", "urgent", "emergent"] as Urgency[]).map((u) => ({ value: u, label: URGENCY_LABEL[u] }))];
const DOC_OPTIONS: Option<ReferralFilters["docCheck"]>[] = [{ value: "all", label: "Any document check" }, { value: "issues", label: "Has issues" }, { value: "clear", label: "All clear" }];
const PERIOD_OPTIONS: Option<ReferralFilters["period"]>[] = [{ value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "quarter", label: "This quarter", hint: "90 days" }];

/** Every filter narrows the tiles, the charts and the table together. Active ones turn green. */
export function FilterBar() {
  const f = useStore((s) => s.referralFilters);
  const set = useStore((s) => s.setReferralFilter);
  const clear = useStore((s) => s.clearReferralFilters);
  const active = (Object.keys(DEFAULT_REFERRAL_FILTERS) as (keyof ReferralFilters)[]).some((k) => k !== "period" && k !== "view" && f[k] !== DEFAULT_REFERRAL_FILTERS[k]);
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filters">
      <Dropdown ariaLabel="Source" value={f.source} defaultValue="all" options={SOURCE_OPTIONS} onChange={(v) => set("source", v)} />
      <Dropdown ariaLabel="Payer" value={f.payer} defaultValue="all" options={PAYER_OPTIONS} onChange={(v) => set("payer", v)} />
      <Dropdown ariaLabel="Program" value={f.program} defaultValue="all" options={PROGRAM_OPTIONS} onChange={(v) => set("program", v)} />
      <Dropdown ariaLabel="Urgency" value={f.urgency} defaultValue="all" options={URGENCY_OPTIONS} onChange={(v) => set("urgency", v)} />
      <Dropdown ariaLabel="Document check" value={f.docCheck} defaultValue="all" options={DOC_OPTIONS} onChange={(v) => set("docCheck", v)} />
      <Dropdown ariaLabel="Period" value={f.period} options={PERIOD_OPTIONS} onChange={(v) => set("period", v)} />
      {f.late ? (
        <button type="button" onClick={() => set("late", false)} className="flex h-[38px] items-center gap-2 rounded-xl border border-forest bg-[#F3F7F4] px-3 text-sm font-semibold">
          Past response target
          <X size={14} className="ico" aria-label="Remove this filter" />
        </button>
      ) : null}
      {active ? (
        <Button variant="ghost" icon={X} onClick={clear}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
