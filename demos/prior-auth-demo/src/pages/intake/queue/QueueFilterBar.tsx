import { Dropdown, SearchInput } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { FACET_IDS, FACET_LABEL, facetOptions, type FacetId, type QueueQuery } from "./filters";

const ALL_LABEL: Record<FacetId, string> = {
  service: "All services", plan: "All plans", method: "All referral sources", staff: "All staff", age: "All ages", urgency: "Any urgency", period: "Any policy period", status: "Any status",
};

/** Search and the eight filters. Each choice shows how many rows it would leave. */
export function QueueFilterBar({ records, query, now, clock, setParam }: {
  records: IntakeRecord[];
  query: QueueQuery;
  now: number;
  clock: number;
  setParam: (key: string, value: string | null, replace?: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <SearchInput value={query.q} onChange={(v) => setParam("q", v || null, true)} placeholder="Search by ID, initials, source or service" className="w-full max-w-[420px]" />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
        {FACET_IDS.map((f) => {
          const opts = facetOptions(f, records, query, now, clock);
          return (
            <Dropdown<string>
              key={f}
              ariaLabel={FACET_LABEL[f]}
              value={query.facets[f] ?? "all"}
              defaultValue="all"
              onChange={(v) => setParam(f, v === "all" ? null : v)}
              options={[{ value: "all", label: ALL_LABEL[f] }, ...opts.map((o) => ({ value: o.value, label: o.label, hint: String(o.count) }))]}
              menuWidth={f === "plan" || f === "method" ? 300 : 240}
              className="max-w-[220px]"
            />
          );
        })}
      </div>
    </div>
  );
}
