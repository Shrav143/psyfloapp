/* The payer's rules, read from the lines saved on Payers › Rules, as far as New Case can act on them:
   how far back a start date may reach, and whether the payer says a level of care needs no authorization. */
import type { CaseDraft } from "@/data/cases";
import type { Rule } from "@/data/payerConfig";
import type { Program, RequestType } from "@/data/types";
import { plural } from "@/lib/format";
import { toDate } from "@/lib/time";
import { docEntries } from "./documents";
import type { PayerContext } from "./payerContext";

export interface Backdating {
  days: number;
  /** The rule line the number came from, in the payer's words. */
  line: string;
}

/** "within 72 hours" is 3 days, "up to 3 days" and "within 2 business days" are as written. */
function windowDays(line: string): number | null {
  const hours = line.match(/within (\d+) hours/i);
  if (hours) return Math.ceil(Number(hours[1]) / 24);
  const days = line.match(/(?:up to|within) (\d+) (?:business )?days?/i);
  return days ? Number(days[1]) : null;
}

/** How many days before today a request may start. A retro-authorization uses the payer's retro line when it has a number. Null when the payer has no backdating rule. */
export function backdating(rules: Rule[], type: RequestType | null): Backdating | null {
  const lines = rules.find((r) => r.id === "backdating")?.lines ?? [];
  if (!lines.length) return null;
  if (type === "Retro-authorization") {
    const retro = lines.find((l) => /retro/i.test(l) && windowDays(l) !== null);
    if (retro) return { days: windowDays(retro) ?? 0, line: retro };
  }
  const allowed = lines.find((l) => /backdat/i.test(l) && !/does not backdate|no backdating/i.test(l) && windowDays(l) !== null);
  return allowed ? { days: windowDays(allowed) ?? 0, line: allowed } : { days: 0, line: lines[0] };
}

const WORDS: Record<Program, string[]> = { RES: ["residential"], IOP: ["iop", "intensive outpatient"], PHP: ["php", "partial hosp"], WM: ["detox", "withdrawal management"] };
/** The line of "No authorization needed" that names this level of care, if the payer has written one. */
export function noAuthLine(rules: Rule[], program: Program | null): string | null {
  if (!program) return null;
  const lines = rules.find((r) => r.id === "noauth")?.lines ?? [];
  return lines.find((l) => WORDS[program].some((w) => l.toLowerCase().includes(w))) ?? null;
}

const midnight = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const isoDate = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const mdy = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};

export interface StartDateIssue {
  kind: "missing" | "early";
  text: string;
}
/** A missing start date, or one earlier than the payer's backdating rule allows. Null when the date is fine. */
export function startDateIssue(d: Pick<CaseDraft, "startDate" | "type">, rules: Rule[], clock: number, payer: string): StartDateIssue | null {
  if (!d.startDate) return { kind: "missing", text: `No start date. ${payer} will count from the day it receives the request.` };
  const rule = backdating(rules, d.type);
  if (!rule) return null;
  const back = Math.round((midnight(toDate(clock)) - midnight(isoDate(d.startDate))) / 86_400_000);
  if (back <= rule.days) return null;
  return { kind: "early", text: `The start date ${mdy(d.startDate)} is ${plural(back, "day")} back. ${rule.line.replace(/\.$/, "")}.` };
}

/** What the payer asks for that the case does not meet: required documents that are not in it (missing or marked not available) and a start date that reaches too far back. */
export function unmetCount(d: CaseDraft, ctx: PayerContext, clock: number): number {
  const lacking = docEntries(d.payerId, d.program, ctx.items).filter((r) => r.required && !d.documents.some((x) => x.slot === r.slot)).length;
  return lacking + (startDateIssue(d, ctx.rules, clock, "The payer")?.kind === "early" ? 1 : 0);
}

/** What New Case can say about a retroactive request for this payer. "No rule on file" is said as it is: the demo does not guess a payer's rule.
    A payer added on Payers has only Psyflo's benchmark, which is not a payer's rule either. */
export function retroRule(ctx: PayerContext, payer: string): { onFile: boolean; text: string } {
  const lines = ctx.rules.find((r) => r.id === "backdating")?.lines ?? [];
  if (!lines.length || ctx.benchmark) return { onFile: false, text: `No rule on file for ${payer}. Check with the payer.` };
  return { onFile: true, text: `${payer}'s Backdating rule: ${lines[0].replace(/\.$/, "")}.` };
}
