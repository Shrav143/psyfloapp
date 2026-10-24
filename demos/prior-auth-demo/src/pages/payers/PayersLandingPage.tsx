import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Dropdown, EmptyState, Page, PageHeader, SearchInput } from "@/components/ui";
import { PAYER_GROUPS } from "@/data/payerConfig";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AddPayerModal } from "./AddPayerModal";
import { savedWhere, useAllWorkflows } from "./lib/studio";
import { stateName } from "./lib/states";
import { ALL, filterRows, filtersActive, NO_FILTERS, payerRows, type PayerFilters, type WfFilter } from "./lib/payers";
import { PayersTable } from "./PayersTable";

const WF_OPTIONS: { value: WfFilter; label: string }[] = [
  { value: ALL, label: "Any workflow status" },
  { value: "published", label: "Has a published workflow" },
  { value: "drafts", label: "Only drafts" },
  { value: "none", label: "No workflow" },
];

/** Payers: a calm list of every payer with search, three filters and Add a payer. A row opens that payer's workspace (/payers/:id).
    The filters live in the address (?q, state, type, wf), so Back from a workspace returns to the same list. */
export function PayersLandingPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const custom = useStore((s) => s.customPayers);
  const config = useStore((s) => s.payerConfig);
  const edits = useStore((s) => s.payerEdits);
  const workflows = useAllWorkflows();
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => payerRows(custom, config, workflows, edits), [custom, config, workflows, edits]);
  const wf = params.get("wf");
  const filters: PayerFilters = {
    query: params.get("q") ?? "",
    state: params.get("state") ?? ALL,
    group: params.get("type") ?? ALL,
    wf: WF_OPTIONS.some((o) => o.value === wf) ? (wf as WfFilter) : ALL,
  };
  const set = (patch: Partial<PayerFilters>) => {
    const next = { ...filters, ...patch };
    const q = new URLSearchParams();
    if (next.query) q.set("q", next.query);
    if (next.state !== ALL) q.set("state", next.state);
    if (next.group !== ALL) q.set("type", next.group);
    if (next.wf !== ALL) q.set("wf", next.wf);
    setParams(q, { replace: true });
  };

  const shown = filterRows(rows, filters);
  const waiting = rows.filter((r) => r.waiting).length;
  const states = [...new Set(rows.map((r) => r.state))].sort((a, b) => stateName(a).localeCompare(stateName(b)));
  const active = filtersActive(filters);

  return (
    <Page>
      <PageHeader title={`${rows.length} payers. The agents know how each one works.`} sub="Workflows, rules and documents for every payer. Every edit is logged with your reason." actions={<Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Add a payer</Button>} />
      <Card className="@container overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-6 pt-5 pb-4">
          <SearchInput className="min-w-[200px] flex-1 @3xl:max-w-[320px]" value={filters.query} onChange={(query) => set({ query })} placeholder="Search payers" />
          <Dropdown ariaLabel="State" value={filters.state} defaultValue={ALL} options={[{ value: ALL, label: "All states" }, ...states.map((s) => ({ value: s, label: stateName(s) }))]} onChange={(state) => set({ state })} menuWidth={200} />
          <Dropdown ariaLabel="Insurance type" value={filters.group} defaultValue={ALL} options={[{ value: ALL, label: "All insurance types" }, ...PAYER_GROUPS.map((g) => ({ value: g as string, label: g }))]} onChange={(group) => set({ group })} menuWidth={230} />
          <Dropdown ariaLabel="Workflow status" value={filters.wf} defaultValue={ALL} options={WF_OPTIONS} onChange={(w) => set({ wf: w })} menuWidth={250} />
          {active ? <Button size="sm" variant="ghost" onClick={() => set(NO_FILTERS)}>Clear filters</Button> : null}
          <p className="ml-auto text-xs text-muted" aria-live="polite">
            {shown.length === rows.length ? `${rows.length} payers` : `${shown.length} of ${rows.length} payers`} · {waiting ? `${waiting} with a change waiting` : "No change waiting"}
          </p>
        </div>
        {shown.length ? (
          <PayersTable rows={shown} onOpen={(id) => nav(paths.payers(id))} />
        ) : (
          <div className="border-t border-line">
            <EmptyState title={filters.query.trim() ? `No payer matches “${filters.query.trim()}”.` : "No payer matches these filters."} action={<Button size="sm" onClick={() => set(NO_FILTERS)}>Clear filters</Button>}>
              Try a different word, or clear the filters to see every payer.
            </EmptyState>
          </div>
        )}
        <p className="border-t border-line px-6 py-3 text-xs text-muted">{savedWhere()} Reset demo data in the Demo menu restores the sample payers, workflows and rules. Sample rules are not verified against any payer's policy.</p>
      </Card>
      {adding ? <AddPayerModal onClose={() => setAdding(false)} onAdded={(pid) => nav(paths.payers(pid))} /> : null}
    </Page>
  );
}
