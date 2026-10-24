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

/** What a document is usually called in a chart. It counts as found when any one of these words appears. The first key found in the document's title wins. */
const ALIASES: [string, string[]][] = [
  ["asam", ["asam", "multidimensional"]],
  ["psychiatric evaluation", ["psychiatric evaluation", "psychiatric eval", "psych eval", "h&p", "history and physical"]],
  ["history and physical", ["history and physical", "h&p", "h & p"]],
  ["diagnostic assessment", ["diagnostic assessment", "diagnostic evaluation"]],
  ["nursing admission", ["nursing admission", "nursing note", "ciwa", "cows"]],
  ["withdrawal scores", ["ciwa", "cows", "withdrawal score"]],
  ["urine drug", ["urine drug", "drug screen", "uds", "toxicology"]],
  ["medication", ["medication", "med list"]],
  ["treatment plan", ["treatment plan", "plan of care"]],
  ["insurance card", ["insurance", "member id", "referral"]],
  ["psychosocial", ["psychosocial"]],
  ["therapy note", ["therapy note", "therapy session", "group therapy", "individual therapy", "session note"]],
  ["attendance", ["attendance", "sessions attended"]],
  ["physician order", ["physician order", "order for detox", "detox order"]],
  ["remaining treatment goals", ["remaining treatment goals", "remaining goals"]],
  ["medicare eligibility", ["medicare eligibility", "eligibility check"]],
  ["fax cover", ["fax cover", "cover sheet"]],
  ["call log", ["call log", "call reference", "reference number"]],
  ["call reference", ["call reference", "reference number"]],
];
/** Words in a title that say nothing about which document it is. */
const FILLER = new Set(["with", "from", "that", "last", "days", "within", "dated", "current", "signed", "every", "when", "plan"]);

/** The words to look for when a title is not in ALIASES, for example a document someone added to the list: all of its own words. */
function ownWords(title: string): string[] {
  const words = title.toLowerCase().split(/[^a-z0-9&]+/).filter((w) => w.length > 3 && !FILLER.has(w));
  return words.length ? words : [title.toLowerCase()];
}

/** Is this document in the text? Keyword level and deterministic: the same text gives the same answer every time. */
function found(title: string, text: string): boolean {
  const t = title.toLowerCase();
  const alias = ALIASES.find(([key]) => t.includes(key));
  return alias ? alias[1].some((w) => text.includes(w)) : ownWords(title).every((w) => text.includes(w));
}

const say = (title: string): string => `the ${/^[A-Z]{2}/.test(title) ? title : title.charAt(0).toLowerCase() + title.slice(1)}`;

/** Read pasted chart text against a payer's list. Each document counts as found when the text uses its name or one of the words a chart usually uses for it. */
export function checkText(items: DocItem[], text: string): CheckResult {
  const t = text.toLowerCase();
  const needed = items.filter((d) => !found(d.title, t)).map((d) => say(d.title));
  return { ready: items.length - needed.length, total: items.length, needed };
}

export const joinWords = (list: string[]): string => (list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`);

/** "a, b, c and d", or the first four and a count when the list is long. */
export const stillNeeded = (list: string[]): string => (list.length > 4 ? `${list.slice(0, 4).join(", ")} and ${list.length - 4} more` : joinWords(list));
