import { PAYER_GROUPS, type CustomPayer, type PayerConfig } from "@/data/payerConfig";
import { PAYERS } from "@/data/seed";

/** One row of the payer list: the six core payers, then any the user added. */
export interface PayerRow {
  id: string;
  name: string;
  shortName: string;
  type: string;
  group: string;
  approved: number | null;
  typicalDays: number | null;
}

export function payerRows(custom: CustomPayer[]): PayerRow[] {
  return [
    ...PAYERS.map((p) => ({ id: p.id as string, name: p.name, shortName: p.shortName, type: p.type, group: p.group as string, approved: p.approvedAsAsked as number | null, typicalDays: p.typicalDecisionDays as number | null })),
    ...custom.map((c) => ({ id: c.id, name: c.name, shortName: c.shortName, type: c.type, group: c.group as string, approved: null, typicalDays: null })),
  ];
}

export function groupRows(rows: PayerRow[], query: string): { group: string; rows: PayerRow[] }[] {
  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => `${r.name} ${r.type} ${r.group}`.toLowerCase().includes(q)) : rows;
  return PAYER_GROUPS.map((g) => ({ group: g as string, rows: shown.filter((r) => r.group === g) })).filter((g) => g.rows.length);
}

/** The line under the payer's name: the plan, the rules version, and whether a change is waiting. */
export const planLineOf = (c: PayerConfig): string => `${c.planLine} · rules version ${c.rulesVersion}, ${c.pending ? "change waiting" : `checked ${c.checkedOn}`}`;

/** Tabs show an ochre count for anything waiting: the change itself and any proposals from Historian. */
export const waitingCount = (c: PayerConfig): number => (c.pending ? 1 : 0) + c.proposals.length;

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen"];
export const numberWord = (n: number): string => WORDS[n] ?? String(n);
