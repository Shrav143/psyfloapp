import type { DocItem, DocLists } from "./payerConfig";
import { isCoreProgram, PROGRAM_LABEL, PROGRAMS, VA_PROGRAMS, type CoreProgram, type PayerId, type Program, type VaProgram } from "./types";
import { requirementsFor } from "./va/policy";
import { GROUP_LABEL, SERVICE_GROUPS, SERVICES, servicesIn, type VaService } from "./va/services";

/* The tables of figures, documents, criteria and wording are keyed by the four core levels of care, the ones the seed authorization data is built on.
   A Virginia service handed off from Intake (CPST, ACT, ABA and the rest) reads them through these helpers and gets a typed fallback: its own label,
   a generic document list marked as a demo sample, "Virginia criteria pending" for the level-of-care framework, and no approval chance until there are
   similar cases. Nothing here invents a clinical criterion, a threshold or a figure for a Virginia service. */

/** A core table read for any program: a Virginia service gets the fallback. */
export function forProgram<T>(table: Record<CoreProgram, T>, p: Program, fallback: T): T {
  return isCoreProgram(p) ? table[p] : fallback;
}

/** The Virginia service a program stands for (data/va/services.ts), for its label, group, status and dates. */
export const serviceOfProgram = (p: VaProgram): VaService | undefined => SERVICES.find((s) => s.program === p);

/** The level-of-care framework line for a Virginia community service. ASAM (ARTS) and LOCUS or CALOCUS-CASII (core mental health) apply only to the core levels of care. */
export const VA_CRITERIA_PENDING = "Virginia criteria pending (CANS Lifetime and Level of Need are not configured)";
/** What the approval chance says for a service with no similar decisions in the demo's data. */
export const NOT_ENOUGH_CASES = "Not enough similar cases yet";
/** The approval chance of a program: null for a Virginia service, so no screen shows an invented number. */
export const chanceFor = (p: Program | null, chance: number): number | null => (p && !isCoreProgram(p) ? null : chance);

const VA_DOCS = new Map<string, DocItem[]>();
const VA_DOC_LINES: [string, string][] = [
  ["Assessment that supports the service", "Demo sample list. The Virginia requirements for this service are not configured"],
  ["Individualized service plan", "Demo sample list. Goals and dates as the plan records them"],
  ["Insurance card and referral", "Front and back"],
];
/** The title of a document of that generic list from its id ("summit-act-2"), for a line that names a missing document. */
export const vaDocTitleOf = (id: string): string | undefined => {
  const m = id.match(/-([a-z_]+)-(\d)$/);
  return m && (VA_PROGRAMS as string[]).includes(m[1].toUpperCase()) ? VA_DOC_LINES[Number(m[2]) - 1]?.[0] : undefined;
};
/** A payer's document list for a Virginia service: no payer's list is configured, so a short generic list, marked as a demo sample.
    The same list object comes back for the same payer and service, so a store selector that reads it stays stable between renders. */
export function vaDocs(payerId: string, p: VaProgram): DocItem[] {
  const id = `${payerId}-${p.toLowerCase()}`;
  let list = VA_DOCS.get(id);
  if (!list) {
    list = VA_DOC_LINES.map(([title, requirement], i) => ({ id: `${id}-${i + 1}`, title, requirement }));
    VA_DOCS.set(id, list);
  }
  return list;
}

/** The documents a payer asks for, for any program: its saved list for a core level of care, the generic sample list for a Virginia service. */
const NO_DOCS: DocItem[] = [];
export const docsOf = (lists: DocLists | undefined, payerId: string, p: Program | null): DocItem[] => (!p ? NO_DOCS : isCoreProgram(p) ? (lists?.[p] ?? NO_DOCS) : vaDocs(payerId, p));

/** The words a payer's "No authorization needed" rule uses for a program: the core levels of care have their usual words; a Virginia service is named by its label. */
const CORE_WORDS: Record<CoreProgram, string[]> = { RES: ["residential"], IOP: ["iop", "intensive outpatient"], PHP: ["php", "partial hosp"], WM: ["detox", "withdrawal management"] };
export const noAuthWords = (p: Program): string[] => {
  if (isCoreProgram(p)) return CORE_WORDS[p];
  const s = serviceOfProgram(p);
  const names = [PROGRAM_LABEL[p], s?.short, s?.label.replace(/\s*\(.*\)\s*$/, "")].filter((w): w is string => !!w).map((w) => w.toLowerCase());
  return [...new Set(names)];
};
const escapeRe = (w: string): string => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** True when a line of a payer's rule names the program. A core level of care matches its usual words anywhere; a Virginia service matches its name
    as whole words, so "ACT" does not match "contact". */
export const textNamesProgram = (text: string, p: Program): boolean => {
  const t = text.toLowerCase();
  if (isCoreProgram(p)) return CORE_WORDS[p].some((w) => t.includes(w));
  return noAuthWords(p).some((w) => new RegExp(`(^|[^a-z0-9])${escapeRe(w)}([^a-z0-9]|$)`).test(t));
};

/** Whether a Virginia service needs an authorization on a date, read only from the policy rows (data/va/policy.ts): a final authorization row says
    required, a final "no authorization" row says not required, and anything else (a registration, rules that vary by plan, redesign rules that are not
    final, a service that has not started) is unknown. Nothing is assumed. */
export function vaAuthNeed(p: VaProgram, payerId: PayerId | null, serviceDate: number): "required" | "not_required" | "unknown" {
  const s = serviceOfProgram(p);
  if (!s) return "unknown";
  const rows = requirementsFor({ serviceId: s.id, payerId, serviceDate }).filter((r) => r.status === "final");
  if (rows.some((r) => r.kind === "authorization")) return "required";
  if (rows.some((r) => r.kind === "none")) return "not_required";
  return "unknown";
}

/** The billing codes of a program: the core levels of care have theirs (the codes the Eligibility checks have always shown); a Virginia service has the
    code data/va/services.ts records, when it records one. */
const CORE_CODES: Record<CoreProgram, string> = { RES: "H0018 and H0019", IOP: "H0015", PHP: "H0035", WM: "H0010 and H0011" };
export const codesOf = (p: Program): string | null => (isCoreProgram(p) ? CORE_CODES[p] : (serviceOfProgram(p)?.code ?? null));
/** "H0015", or a plain note when no code is configured, for a line that shows the codes. */
export const codesText = (p: Program): string => codesOf(p) ?? "billing code not configured";
/** "under codes H0015", or "(billing code not configured)". */
export const underCodes = (p: Program): string => {
  const c = codesOf(p);
  return c ? `under codes ${c}` : "(billing code not configured)";
};

/** Every program a request can be for, for a picker: the four core levels of care first (the ARTS and mental health IOP and PHP services map to them),
    then the other Virginia services in the groups of data/va/services.ts. */
export const PROGRAM_CHOICES: { value: Program; label: string; group: string }[] = [
  ...PROGRAMS.map((p) => ({ value: p as Program, label: PROGRAM_LABEL[p], group: "Levels of care" })),
  ...SERVICE_GROUPS.flatMap((g) => servicesIn(g).filter((s) => !isCoreProgram(s.program)).map((s) => ({ value: s.program, label: s.label, group: GROUP_LABEL[g] }))),
];

const longDate = (iso: string): string => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
/** The one line about a Virginia service's dates (data/va/services.ts and the policy rows): a redesigned service that has not started, or a retiring one. */
export function serviceWindowNote(p: Program | null, startIso: string): string | null {
  if (!p || isCoreProgram(p)) return null;
  const s = serviceOfProgram(p);
  if (!s) return null;
  if (s.startsOn && (!startIso || startIso < s.startsOn)) return `${s.short} starts ${longDate(s.startsOn)}. It cannot be delivered or authorized before then.`;
  if (s.endsOn && startIso && startIso > s.endsOn) return `${s.short} ended ${longDate(s.endsOn)}.`;
  if (s.endsOn) return `${s.short} ends ${longDate(s.endsOn)}.`;
  return null;
}
/** The same line when the dates asked fall outside the service's window, so the review can warn: not started yet, or already ended. */
export function serviceWindowIssue(p: Program | null, startIso: string): string | null {
  if (!p || isCoreProgram(p)) return null;
  const s = serviceOfProgram(p);
  const outside = !!s && ((!!s.startsOn && (!startIso || startIso < s.startsOn)) || (!!s.endsOn && !!startIso && startIso > s.endsOn));
  return outside ? serviceWindowNote(p, startIso) : null;
}

/** The program in a few words for a sentence ("residential care", "CPST School"). */
const CORE_TEXT: Record<CoreProgram, string> = { RES: "residential care", IOP: "intensive outpatient care", PHP: "partial hospitalization", WM: "withdrawal management" };
export const programText = (p: Program): string => forProgram(CORE_TEXT, p, PROGRAM_LABEL[p]);
