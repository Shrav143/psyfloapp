import { customToSummary, PAYER_GROUPS, type CustomPayer, type EditLogEntry, type PayerConfig } from "@/data/payerConfig";
import { needsCue, planInfo, programsCovered, requestNeeds, type PlanInfo } from "@/data/payerConfigPlan";
import { payerProfileOf } from "@/data/payerProfile";
import { builtInPayers } from "@/data/seed";
import type { Program } from "@/data/types";
import type { Workflow } from "@/data/workflow/types";
import { BASE } from "@/lib/time";
import { stateName } from "./states";

/** One row of the payer list: the six core payers, then any the user added. The plan type, the programs and the cue all come from the payer's saved configuration. */
export interface PayerRow {
  id: string;
  name: string;
  shortName: string;
  type: string;
  group: string;
  plan: PlanInfo | null;
  programs: Program[];
  /** What the payer asks for: "Initial + review", "Initial only", "Review only". */
  needs: string;
  /** A change is waiting for a person. */
  waiting: boolean;
  /** The payer organization, the state (two-letter code) and the plan or product, from payerProfileOf. Added payers carry what Add payer asked for; the six core payers are Virginia Medicaid, one product each. */
  org: string;
  state: string;
  product: string;
  /** Configured workflows of this payer that are published, and drafts. Archived ones are not counted as configured. */
  published: number;
  drafts: number;
  /** Demo minutes of the newest edit (workflow, rule, document list or payer detail) or logged change for this payer, or null when there is none. */
  lastUpdate: number | null;
}

export type WfStatus = "published" | "drafts" | "none";
export const WF_STATUS_LABEL: Record<WfStatus, string> = { published: "Published", drafts: "Drafts only", none: "No workflow" };
export const statusOf = (r: Pick<PayerRow, "published" | "drafts">): WfStatus => (r.published ? "published" : r.drafts ? "drafts" : "none");

/** "10/12" as demo minutes (2026), so a change entry can be compared with a save. */
const minutesOfShortDate = (d: string): number => {
  const [m, day] = d.split("/").map(Number);
  return Math.round((new Date(2026, m - 1, day).getTime() - BASE.getTime()) / 60_000);
};

export function payerRows(custom: CustomPayer[], config: Record<string, PayerConfig>, workflows: Workflow[] = [], edits: EditLogEntry[] = []): PayerRow[] {
  const summaries = [...builtInPayers(), ...custom.map(customToSummary)];
  return summaries.map((p) => {
    const cfg = config[p.id];
    const plan = planInfo(p);
    const mine = workflows.filter((w) => w.payerId === p.id);
    // Every save, publish, rule edit and payer edit is in the edit audit, so the audit and the change history give the last update; a seeded workflow is not an update.
    const stamps = [...edits.filter((e) => e.payerId === p.id).map((e) => e.at), ...(cfg?.changes ?? []).map((c) => minutesOfShortDate(c.date))];
    return {
      id: p.id as string,
      name: p.name,
      shortName: p.shortName,
      type: p.type,
      group: p.group as string,
      plan,
      programs: programsCovered(p.id, cfg, custom),
      needs: cfg ? needsCue(requestNeeds(cfg)) : "None on file",
      waiting: !!cfg?.pending,
      ...payerProfileOf(p.id, custom),
      published: mine.filter((w) => w.status === "published").length,
      drafts: mine.filter((w) => w.status === "draft").length,
      lastUpdate: stamps.length ? Math.max(...stamps) : null,
    };
  });
}

export const ALL = "all";
export type WfFilter = typeof ALL | WfStatus;
export interface PayerFilters { query: string; state: string; group: string; wf: WfFilter }
export const NO_FILTERS: PayerFilters = { query: "", state: ALL, group: ALL, wf: ALL };
export const filtersActive = (f: PayerFilters): boolean => !!f.query.trim() || f.state !== ALL || f.group !== ALL || f.wf !== ALL;

/** The rows in the order of the groups (Medicaid MCO, then Medicaid fee-for-service), narrowed by a search over name, organization, product, state and group, and by the three filters. */
export function filterRows(rows: PayerRow[], f: PayerFilters): PayerRow[] {
  const q = f.query.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (!q || `${r.name} ${r.org} ${r.product} ${r.state} ${stateName(r.state)} ${r.type} ${r.group} ${r.plan?.label ?? ""}`.toLowerCase().includes(q)) &&
      (f.state === ALL || r.state === f.state) &&
      (f.group === ALL || r.group === f.group) &&
      (f.wf === ALL || statusOf(r) === f.wf),
  );
  return PAYER_GROUPS.flatMap((g) => shown.filter((r) => r.group === g));
}

/** Tabs show an ochre count for anything waiting: the change itself and any proposals from Historian. */
export const waitingCount = (c: PayerConfig): number => (c.pending ? 1 : 0) + c.proposals.length;

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen"];
export const numberWord = (n: number): string => WORDS[n] ?? String(n);
