import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button, Dropdown, SearchInput, type Option } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { REQUEST_KINDS, REQUEST_KIND_LABEL, type RequestKind } from "@/data/queue";
import { PAYERS } from "@/data/seed";
import { PROGRAMS, PROGRAM_LABEL, type AgentKey, type PayerId, type Program } from "@/data/types";
import { cn } from "@/lib/cn";
import { SHOW_LABEL } from "@/pages/manager/helpers";
import { StatusHelp } from "../StatusHelp";
import { DEADLINE_LABEL, STATUS_DETAIL, anyFilterOn, moreFiltersOn, type Deadline, type StatusDetail, type WorkFilters } from "./model";

const PAYER_OPTIONS: Option<PayerId | "all">[] = [{ value: "all", label: "All payers" }, ...PAYERS.map((p) => ({ value: p.id, label: p.name }))];
const PROGRAM_OPTIONS: Option<Program | "all">[] = [{ value: "all", label: "All services" }, ...PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))];
const KIND_OPTIONS: Option<RequestKind | "all">[] = [{ value: "all", label: "All request types" }, ...REQUEST_KINDS.map((k) => ({ value: k, label: REQUEST_KIND_LABEL[k] }))];
const STATUS_OPTIONS: Option<StatusDetail>[] = [{ value: "all", label: "Any status" }, ...STATUS_DETAIL.map((s) => ({ value: s, label: s }))];

/** Search, the four filters people use most, and More (owner, status detail, the payer signal). The Dashboard's Active and Renewal due links show as a chip. */
export function WorkFilterBar({ filters, set, clear, deadlineCounts, owners, signalCount }: {
  filters: WorkFilters;
  set: <K extends keyof WorkFilters>(k: K, v: WorkFilters[K]) => void;
  clear: () => void;
  deadlineCounts: Record<Deadline, number>;
  owners: AgentKey[];
  signalCount: number;
}) {
  const [more, setMore] = useState(moreFiltersOn(filters));
  const deadlineOptions: Option<Deadline>[] = (["all", "now", "day", "week"] as Deadline[]).map((d) => ({ value: d, label: d === "all" ? DEADLINE_LABEL.all : `${DEADLINE_LABEL[d]} · ${deadlineCounts[d]}` }));
  const ownerOptions: Option<AgentKey | "all">[] = [{ value: "all", label: "Any owner" }, ...owners.map((a) => ({ value: a, label: AGENTS[a].name }))];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={filters.q} onChange={(v) => set("q", v)} placeholder="Search by patient, request ID or payer" className="w-[300px]" />
        <Dropdown value={filters.payer} options={PAYER_OPTIONS} onChange={(v) => set("payer", v)} defaultValue="all" ariaLabel="Payer" menuWidth={250} />
        <Dropdown value={filters.program} options={PROGRAM_OPTIONS} onChange={(v) => set("program", v)} defaultValue="all" ariaLabel="Service" />
        <Dropdown value={filters.kind} options={KIND_OPTIONS} onChange={(v) => set("kind", v)} defaultValue="all" ariaLabel="Request type" menuWidth={240} />
        <Dropdown value={filters.deadline} options={deadlineOptions} onChange={(v) => set("deadline", v)} defaultValue="all" ariaLabel="Deadline" menuWidth={220} />
        <Button variant="ghost" size="sm" icon={SlidersHorizontal} aria-expanded={more} onClick={() => setMore((m) => !m)} className={cn(moreFiltersOn(filters) && "text-forest")}>
          More{moreFiltersOn(filters) ? " ·  on" : ""}
        </Button>
        {anyFilterOn(filters) ? <Button variant="ghost" size="sm" onClick={clear}>Clear filters</Button> : null}
      </div>
      {more ? (
        <div className="flex flex-wrap items-center gap-3">
          <Dropdown value={filters.owner} options={ownerOptions} onChange={(v) => set("owner", v)} defaultValue="all" ariaLabel="Owner" menuWidth={220} />
          <span className="inline-flex items-center gap-1">
            <Dropdown value={filters.status} options={STATUS_OPTIONS} onChange={(v) => set("status", v)} defaultValue="all" ariaLabel="Status" menuWidth={220} />
            <StatusHelp />
          </span>
          {signalCount ? (
            <Button variant={filters.signalOnly ? "outline" : "ghost"} size="sm" aria-pressed={filters.signalOnly} onClick={() => set("signalOnly", !filters.signalOnly)}>
              Cardinal payer signal · {signalCount}
            </Button>
          ) : null}
        </div>
      ) : null}
      {filters.show !== "all" || filters.signalOnly ? (
        <div className="flex flex-wrap gap-2">
          {filters.show !== "all" ? <Chip text={`Showing ${SHOW_LABEL[filters.show]}`} onRemove={() => set("show", "all")} label="Remove this filter" /> : null}
          {filters.signalOnly ? <Chip text={signalCount === 1 ? "Showing the request affected by the Cardinal signal" : `Showing the ${signalCount} affected by the Cardinal signal`} onRemove={() => set("signalOnly", false)} label="Remove the Cardinal signal filter" /> : null}
        </div>
      ) : null}
    </div>
  );
}

function Chip({ text, onRemove, label }: { text: string; onRemove: () => void; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-forest bg-[#F3F7F4] py-1 pr-1.5 pl-3.5 text-[13px] font-semibold text-forest">
      {text}
      <button type="button" aria-label={label} onClick={onRemove} className="grid h-5 w-5 place-items-center rounded-full hover:bg-forest/10">
        <X size={13} className="ico" />
      </button>
    </span>
  );
}
