import type { DocItem } from "@/data/payerConfig";
import type { ChartGap } from "@/data/payerConfigSeed";

export interface CheckResult {
  ready: number;
  total: number;
  /** What is still needed, in plain words. */
  needed: string[];
}

/** Read a chart against a payer's list. `gaps` say what the sample chart lacks; a gap only counts when the list asks for it. */
export function checkChart(items: DocItem[], gaps: ChartGap[]): CheckResult {
  const needed: string[] = [];
  for (const g of gaps) if (items.some((d) => d.title.toLowerCase().includes(g.match.toLowerCase()))) needed.push(g.say);
  return { ready: items.length - needed.length, total: items.length, needed };
}

export const joinWords = (list: string[]): string => (list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`);
