import { customToSummary, PAYER_GROUPS, type CustomPayer, type PayerConfig } from "@/data/payerConfig";
import { needsCue, planInfo, programsCovered, requestNeeds, type PlanInfo } from "@/data/payerConfigPlan";
import { builtInPayers } from "@/data/seed";
import type { Program } from "@/data/types";

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
}

export function payerRows(custom: CustomPayer[], config: Record<string, PayerConfig>): PayerRow[] {
  const summaries = [...builtInPayers(), ...custom.map(customToSummary)];
  return summaries.map((p) => {
    const cfg = config[p.id];
    return {
      id: p.id as string,
      name: p.name,
      shortName: p.shortName,
      type: p.type,
      group: p.group as string,
      plan: planInfo(p),
      programs: programsCovered(p.id, cfg, custom),
      needs: cfg ? needsCue(requestNeeds(cfg)) : "None on file",
      waiting: !!cfg?.pending,
    };
  });
}

/** The rows in the order of the groups (Ohio Medicaid, Commercial, Medicare Advantage, carve-out), narrowed by a search over name, plan type and group. */
export function filterRows(rows: PayerRow[], query: string): PayerRow[] {
  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => `${r.name} ${r.type} ${r.group} ${r.plan?.label ?? ""}`.toLowerCase().includes(q)) : rows;
  return PAYER_GROUPS.flatMap((g) => shown.filter((r) => r.group === g));
}

/** Tabs show an ochre count for anything waiting: the change itself and any proposals from Historian. */
export const waitingCount = (c: PayerConfig): number => (c.pending ? 1 : 0) + c.proposals.length;

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen"];
export const numberWord = (n: number): string => WORDS[n] ?? String(n);
