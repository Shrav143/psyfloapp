import { X } from "lucide-react";
import { Button, Dropdown, SearchInput, type Option } from "@/components/ui";
import { REQUEST_KINDS, REQUEST_KIND_LABEL, STATUS_LABEL, type Band, type RequestKind, type StatusFilter } from "@/data/queue";
import { PAYERS } from "@/data/seed";
import type { PayerId } from "@/data/types";
import type { QueueFilters } from "@/store/queue";
import { InfoTip } from "@/components/ui/InfoTip";
import { filtersActive } from "./queueLogic";
import { StatusHelp } from "./StatusHelp";

const payerOptions = (): Option<PayerId | "all">[] => [{ value: "all", label: "All payers" }, ...PAYERS.map((p) => ({ value: p.id, label: p.name }))];
const STATUS_OPTIONS: Option<StatusFilter>[] = (Object.keys(STATUS_LABEL) as StatusFilter[]).map((v) => ({ value: v, label: STATUS_LABEL[v] }));
const TYPE_OPTIONS: Option<RequestKind | "all">[] = [{ value: "all", label: "All request types" }, ...REQUEST_KINDS.map((k) => ({ value: k, label: REQUEST_KIND_LABEL[k] }))];
const URGENCY_OPTIONS: Option<Band | "all">[] = [
  { value: "all", label: "All urgency" }, { value: "now", label: "Act now" }, { value: "day", label: "Due within 24 hours" }, { value: "week", label: "Due this week" },
];

export function QueueFilterBar({ filters, set, clear, affected }: { filters: QueueFilters; set: <K extends keyof QueueFilters>(k: K, v: QueueFilters[K]) => void; clear: () => void; affected: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={filters.q} onChange={(v) => set("q", v)} placeholder="Search by case ID or initials" className="w-[280px]" />
        <Dropdown value={filters.payer} options={payerOptions()} onChange={(v) => set("payer", v)} defaultValue="all" ariaLabel="Payer" />
        <Dropdown value={filters.type} options={TYPE_OPTIONS} onChange={(v) => set("type", v)} defaultValue="all" ariaLabel="Request type" menuWidth={240} />
        <span className="inline-flex items-center gap-1">
          <Dropdown value={filters.status} options={STATUS_OPTIONS} onChange={(v) => set("status", v)} defaultValue="all" ariaLabel="Status" />
          <StatusHelp />
        </span>
        <Dropdown value={filters.urgency} options={URGENCY_OPTIONS} onChange={(v) => set("urgency", v)} defaultValue="all" ariaLabel="Urgency" />
        {filtersActive(filters) ? <Button variant="ghost" size="sm" onClick={clear}>Clear filters</Button> : null}
        <span className="ml-auto inline-flex items-center">
          <InfoTip label="How the list is ordered" align="end">
            By band (how soon it is due), then waiting on you first, then soonest due, then lower approval chance.
          </InfoTip>
        </span>
      </div>
      {filters.signalOnly ? (
        <div className="flex">
          <span className="inline-flex items-center gap-2 rounded-full border border-forest bg-[#F3F7F4] py-1 pr-1.5 pl-3.5 text-[13px] font-semibold text-forest">
            {affected === 1 ? "Showing the request affected by the Cardinal signal" : `Showing the ${affected} affected by the Cardinal signal`}
            <button type="button" aria-label="Remove the Cardinal signal filter" onClick={() => set("signalOnly", false)} className="grid h-5 w-5 place-items-center rounded-full hover:bg-forest/10">
              <X size={13} className="ico" />
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}
