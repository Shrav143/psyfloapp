import { AGENTS } from "@/data/agents";
import { REQUEST_KINDS, type RequestKind } from "@/data/queue";
import { PAYERS } from "@/data/seed";
import { PROGRAMS, type AgentKey, type PayerId, type Program } from "@/data/types";
import { showOf } from "@/pages/manager/helpers";
import { NO_WORK_FILTERS, STATUS_DETAIL, VIEWS, type Deadline, type StatusDetail, type View, type WorkFilters } from "./model";

/* The view and the filters live in the address, so a link opens the worklist already narrowed and Back returns to the same view.
   The queue's older parameters still work: ?status=ready, ?urgency=now, ?type=retro, ?payer=cardinal, ?signal=1, and Case Manager's ?show=active and ?tab=reviews. */

const pick = <T extends string>(v: string | null, allowed: readonly T[]): T | null => (v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : null);

/** The queue's ?status= values, as a view and a status detail. */
const LEGACY_STATUS: Record<string, { view: View; status?: StatusDetail }> = {
  you: { view: "attention" },
  input: { view: "attention", status: "Needs your input" },
  preparing: { view: "progress", status: "Preparing" },
  ready: { view: "progress", status: "Ready to sign" },
  payer: { view: "payer" },
  denial: { view: "denied" },
};

export function readParams(sp: URLSearchParams): { view: View; filters: WorkFilters } {
  const legacy = LEGACY_STATUS[sp.get("status") ?? ""];
  const status = pick<StatusDetail>(sp.get("state"), STATUS_DETAIL) ?? legacy?.status ?? "all";
  const filters: WorkFilters = {
    ...NO_WORK_FILTERS,
    q: sp.get("q") ?? "",
    payer: pick<PayerId>(sp.get("payer"), PAYERS.map((p) => p.id)) ?? "all",
    program: pick<Program>(sp.get("program"), PROGRAMS) ?? "all",
    kind: pick<RequestKind>(sp.get("type"), REQUEST_KINDS) ?? "all",
    deadline: pick<Deadline>(sp.get("urgency"), ["now", "day", "week"]) ?? "all",
    owner: pick<AgentKey>(sp.get("owner"), Object.keys(AGENTS) as AgentKey[]) ?? "all",
    status,
    signalOnly: sp.get("signal") === "1",
    show: showOf(sp.get("show")),
  };
  const view = pick<View>(sp.get("view"), VIEWS) ?? legacy?.view ?? (sp.get("tab") === "reviews" ? "reviews" : "all");
  return { view, filters };
}

/** The address for a view and its filters. Only what is set appears, so the plain worklist has a plain address. Other parameters (?quick=, ?review=) are kept. */
export function writeParams(view: View, f: WorkFilters, base: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams(base);
  for (const k of ["view", "status", "state", "q", "payer", "program", "type", "urgency", "owner", "signal", "show", "tab"]) out.delete(k);
  if (view !== "all") out.set("view", view);
  if (f.q) out.set("q", f.q);
  if (f.payer !== "all") out.set("payer", f.payer);
  if (f.program !== "all") out.set("program", f.program);
  if (f.kind !== "all") out.set("type", f.kind);
  if (f.deadline !== "all") out.set("urgency", f.deadline);
  if (f.owner !== "all") out.set("owner", f.owner);
  if (f.status !== "all") out.set("state", f.status);
  if (f.signalOnly) out.set("signal", "1");
  if (f.show !== "all") out.set("show", f.show);
  return out;
}
