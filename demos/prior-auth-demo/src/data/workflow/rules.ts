import { LEGACY_RULE_GROUP, RULE_TITLE, type DocItem, type PayerConfig, type ReachLine, type Rule, type RuleId } from "../payerConfig";
import { seedPayerConfig } from "../payerConfigSeed";
import { payerProfileOf, type PayerProfile } from "../payerProfile";
import { PAYERS } from "../seed";
import { PROGRAM_LABEL, PROGRAMS, type PayerId, type Program } from "../types";
import type { NodeKind, PayerRule, RequestType, RuleChange, RuleGroup, RuleSource } from "./types";

/* The payer rules library.
   A rule is one record with provenance (source, verification, version, history). Where the payer's saved rules already hold the content (submission windows, backdating,
   no authorization needed, peer-to-peer and appeals, the document lists, the instructions for Caller and the reach lines), the rule is READ THROUGH from that saved
   configuration, never copied, so Eligibility and New case keep reading the same data. Saving a derived rule goes back through the existing Payers actions (see routeDerivedSave).
   What the saved configuration lacks (the review cadence, units and duration limits, clinical criteria, payer-wide agent instructions) lives in the library, in the workflow store.
   Every seeded rule is a demo sample: unverified, source "Demo sample", never a made-up date or address. */

export const RULES_EFFECTIVE_FROM = "2026-01-01";
export const RULES_OWNER = "Utilization review team";
export const DEMO_SAMPLE_VERSION = "2026.3";

/* ---------------------------------------------------------------- ids */
export const derivedId = (payerId: string, key: string): string => `pc:${payerId}:${key}`;
export const libraryId = (payerId: string, key: string): string => `lib:${payerId}:${key}`;
/** True for a rule read through from the payer's saved configuration. */
export const isDerivedRuleId = (id: string): boolean => id.startsWith("pc:");
export const isDerivedRule = (r: Pick<PayerRule, "id">): boolean => isDerivedRuleId(r.id);
/** The part after the payer id: "windows", "backdating", "noauth", "p2p", "docs:RES", "caller", "reach". */
export const derivedKeyOf = (id: string): string => id.split(":").slice(2).join(":");
/** The Required documents rule of one level of care. The Clinical documentation group already shows these lists, so the rules screen may hide them. */
export const isDocumentListRule = (r: Pick<PayerRule, "id">): boolean => derivedKeyOf(r.id).startsWith("docs:");

export const GROUP_ORDER: RuleGroup[] = ["auth_requirements", "submission_windows", "backdating", "clinical_documentation", "concurrent_reauth", "submission_methods", "appeals_p2p", "agent_instructions"];

/* ---------------------------------------------------------------- provenance */
export const demoSource = (rulesVersion: string): RuleSource =>
  rulesVersion === "benchmark" ? { kind: "demo_sample", label: "Psyflo benchmark, not a payer's policy" } : { kind: "demo_sample", label: `Demo sample rules, version ${rulesVersion}` };

/** What a person who types a rule is asked to give as its source when they mark it verified. */
export const SOURCE_KIND_LABEL: Record<RuleSource["kind"], string> = { demo_sample: "Demo sample", user_entered: "Entered by a person", url: "Web page", document: "Document" };

/* ---------------------------------------------------------------- reading lines */
type Values = PayerRule["values"];
interface Window { n: number; dayType: "business" | "calendar"; hours: boolean }

/** "within 72 hours" is 3 calendar days, "up to 3 days" is 3, "within 2 business days" is 2 business days. */
export function parseWindow(line: string): Window | null {
  const m = line.match(/(?:within|up to|every|in) (\d+) (hours?|business days?|days?)/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit.startsWith("hour")) return { n: Math.ceil(n / 24), dayType: "calendar", hours: true };
  return { n, dayType: unit.startsWith("business") ? "business" : "calendar", hours: false };
}

const noteOf = (line: string, re: RegExp): string => (line.match(re)?.[1] ?? "").trim().replace(/[.]$/, "");

export function valuesFromWindows(lines: string[]): Values {
  const notice = lines.find((l) => /notice/i.test(l));
  const w = notice ? parseWindow(notice) : null;
  if (!notice || !w) return { required: !!notice };
  return { required: true, windowDays: w.n, dayType: w.dayType, counted_from: "admission" };
}

export function valuesFromBackdating(lines: string[]): Values {
  const none = lines.find((l) => /does not backdate|no backdating/i.test(l));
  const allowedLine = lines.find((l) => /backdat/i.test(l) && !/does not backdate|no backdating/i.test(l));
  const retro = lines.find((l) => /retro/i.test(l));
  const aw = allowedLine ? parseWindow(allowedLine) : null;
  const rw = retro ? parseWindow(retro) : null;
  const out: Values = { allowed: !none && !!allowedLine, maxDaysBack: aw ? aw.n : 0, dayType: aw?.dayType ?? "calendar" };
  if (retro) out.historicalDates = retro.replace(/[.]$/, "");
  const proof = retro ? noteOf(retro, /\bneeds? ([^,]+)/i) || noteOf(retro, /\bwhen (.+)$/i) : allowedLine ? noteOf(allowedLine, /\bwhen (.+)$/i) : "";
  if (proof) out.proof = proof;
  if (rw) out.retroWindowDays = rw.n;
  return out;
}

export function valuesFromNoAuth(lines: string[]): Values {
  return { required: true, exceptions: lines.join("\n") };
}

export function valuesFromP2p(lines: string[]): Values {
  const p2p = lines.find((l) => /peer-to-peer/i.test(l));
  const appeal = lines.find((l) => /(appeal|reconsideration)/i.test(l) && !/expedited/i.test(l) && /within \d+/i.test(l));
  const expedited = lines.find((l) => /expedited/i.test(l));
  const then = [...lines].reverse().find((l) => /^then /i.test(l));
  const out: Values = {};
  const pw = p2p ? parseWindow(p2p) : null;
  const aw = appeal ? parseWindow(appeal) : null;
  const ew = expedited?.match(/(\d+) hours/i);
  if (pw) out.p2pWindowDays = pw.n;
  if (aw) out.appealWindowDays = aw.n;
  if (ew) out.expeditedAppealHours = Number(ew[1]);
  if (then) out.escalation = then.replace(/^then /i, "").replace(/[.]$/, "").replace(/^./, (c) => c.toUpperCase());
  return out;
}

const routesOf = (reachedBy: string): string[] => reachedBy.toLowerCase().split(/,| and /).map((s) => s.trim()).filter(Boolean);
export function valuesFromReach(cfg: Pick<PayerConfig, "reach" | "reachedBy" | "facts">): Values {
  const line = (id: ReachLine["id"]) => cfg.reach.find((r) => r.id === id)?.text ?? "";
  const used = (t: string) => !!t && !/^not used/i.test(t);
  const routes = routesOf(cfg.reachedBy);
  const backup = cfg.facts.backup.toLowerCase();
  const fallback = /phone/.test(backup) ? "phone" : /fax/.test(backup) ? "fax" : routes[1] ?? "";
  const out: Values = { portal: line("portal"), phone: line("phone"), fax: line("fax") };
  const preferred = routes[0] ?? [["portal", line("portal")], ["phone", line("phone")], ["fax", line("fax")]].find(([, t]) => used(t))?.[0] ?? "";
  if (preferred) out.preferred = preferred;
  if (fallback && fallback !== preferred) out.fallback = fallback;
  return out;
}

export const docLine = (d: Pick<DocItem, "title" | "requirement">): string => `${d.title}: ${d.requirement}`;
export function valuesFromDocs(items: DocItem[]): Values {
  return { prerequisites: items.map(docLine).join("\n"), count: items.length };
}

/* ---------------------------------------------------------------- writing lines back */
/** Replace the first number-and-unit in a line: "Notice within 24 hours of admission" with 3 calendar days is "within 72 hours" (the line keeps its own unit). */
export function withWindow(line: string, n: number, dayType: "business" | "calendar" = "calendar"): string {
  const re = /(\d+) (hours?|business days?|days?)/i;
  const m = line.match(re);
  if (!m) return line;
  const hours = m[2].toLowerCase().startsWith("hour");
  const text = hours && dayType === "calendar" ? `${n * 24} hours` : dayType === "business" ? `${n} business ${n === 1 ? "day" : "days"}` : `${n} ${n === 1 ? "day" : "days"}`;
  return line.replace(re, text);
}

export function linesFromWindows(old: string[], v: Values): string[] {
  const i = old.findIndex((l) => /notice/i.test(l));
  const n = typeof v.windowDays === "number" ? v.windowDays : null;
  const dayType = v.dayType === "business" ? "business" : "calendar";
  if (n === null) return old;
  if (i < 0) return [`Notice within ${n} ${dayType === "business" ? "business " : ""}${n === 1 ? "day" : "days"} of admission`, ...old];
  return old.map((l, k) => (k === i ? withWindow(l, n, dayType) : l));
}

export function linesFromBackdating(old: string[], v: Values, short: string): string[] {
  const allowed = v.allowed === true;
  const max = typeof v.maxDaysBack === "number" ? v.maxDaysBack : 0;
  const bus = v.dayType === "business";
  const out: string[] = [];
  out.push(!allowed ? `${short} does not backdate an authorization` : max > 0 ? `${short} backdates up to ${max} ${bus ? "business " : ""}${max === 1 ? "day" : "days"}` : `${short} backdates to the date it receives the request`);
  let hist = typeof v.historicalDates === "string" ? v.historicalDates.trim() : "";
  const proof = typeof v.proof === "string" ? v.proof.trim() : "";
  const rw = typeof v.retroWindowDays === "number" ? v.retroWindowDays : null;
  if (hist) {
    /* The retro line is the person's own words. Only the number and the proof in it follow the structured values. */
    const w = parseWindow(hist);
    if (rw !== null && w && w.n !== rw) hist = withWindow(hist, rw, "calendar");
    const was = noteOf(hist, /\bneeds? ([^,]+)/i) || noteOf(hist, /\bwhen (.+)$/i);
    if (proof && was && was !== proof) hist = hist.replace(was, proof);
    out.push(hist);
  } else if (rw !== null || proof) out.push(`A retro request ${rw !== null ? `is accepted within ${rw * 24} hours of admission` : "needs"}${proof ? `${rw !== null ? " when " : " "}${proof}` : ""}`.trim());
  const keep = old.filter((l, i) => i > 0 && !/retro|backdat/i.test(l));
  return [...out, ...keep];
}

export function linesFromP2p(old: string[], v: Values): string[] {
  return old.map((l) => {
    if (/peer-to-peer/i.test(l) && typeof v.p2pWindowDays === "number") return withWindow(l, v.p2pWindowDays, "business");
    if (/(appeal|reconsideration)/i.test(l) && !/expedited/i.test(l) && typeof v.appealWindowDays === "number" && /within \d+/i.test(l)) return withWindow(l, v.appealWindowDays, "calendar");
    if (/expedited/i.test(l) && typeof v.expeditedAppealHours === "number") return l.replace(/(\d+) hours/i, `${v.expeditedAppealHours} hours`);
    if (/^then /i.test(l) && typeof v.escalation === "string" && v.escalation.trim()) return `Then ${v.escalation.trim().replace(/^./, (c) => c.toLowerCase())}`;
    return l;
  });
}

/** "Individual therapy: ..." lines back to document items, keeping the id of an item whose title is unchanged. */
export function docItemsFromText(text: string, old: DocItem[], payerId: string, program: Program): DocItem[] {
  const taken = new Set(old.map((d) => d.id));
  let n = 1;
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const cut = l.indexOf(":");
    const title = (cut > 0 ? l.slice(0, cut) : l).trim();
    const requirement = cut > 0 ? l.slice(cut + 1).trim() : "";
    const same = old.find((d) => d.title.toLowerCase() === title.toLowerCase());
    if (same) return { ...same, requirement: requirement || same.requirement };
    let id = `${payerId}-${program.toLowerCase()}-n${n}`;
    while (taken.has(id)) id = `${payerId}-${program.toLowerCase()}-n${++n}`;
    taken.add(id);
    return { id, title, requirement };
  });
}

/* ---------------------------------------------------------------- derived rules */
/** The fields of a rule that are about where and when it applies, not what it says. A rule that is read through can still have these changed (a rule archived with an end date, say); the library keeps them. */
export const RULE_SCOPE_FIELDS = ["title", "description", "state", "product", "services", "providerType", "requestTypes", "effectiveFrom", "effectiveTo", "owner"] as const;
export type RuleScopeField = (typeof RULE_SCOPE_FIELDS)[number];
export interface RuleOverlayLike { verification?: PayerRule["verification"]; lastVerified?: string; source?: RuleSource; version?: number; values?: Values; fields?: Partial<Pick<PayerRule, RuleScopeField>> }

/** The scope fields that differ between two versions of a rule. */
export function changedScopeFields(a: PayerRule, b: PayerRule): Partial<Pick<PayerRule, RuleScopeField>> {
  const out: Record<string, unknown> = {};
  for (const k of RULE_SCOPE_FIELDS) if (JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null)) out[k] = b[k];
  return out as Partial<Pick<PayerRule, RuleScopeField>>;
}

const stamp = (r: Rule | undefined): { source: RuleSource | null; saved: string } => ({ source: r?.source ? { kind: "user_entered", label: r.source } : null, saved: r?.confirmed ?? "" });

interface DeriveCtx { payerId: string; profile: PayerProfile; source: RuleSource; short: string }
function base(ctx: DeriveCtx, key: string, group: RuleGroup, title: string, description: string, values: Values, over: Partial<PayerRule> = {}): PayerRule {
  return {
    id: derivedId(ctx.payerId, key),
    payerId: ctx.payerId,
    group,
    title,
    description,
    values,
    state: ctx.profile.state,
    product: ctx.profile.product,
    services: [],
    requestTypes: [],
    effectiveFrom: RULES_EFFECTIVE_FROM,
    source: ctx.source,
    verification: "unverified",
    owner: RULES_OWNER,
    version: 1,
    history: [],
    origin: "payer_config",
    ...over,
  };
}

/** The rules that the payer's saved configuration holds, as PayerRule records. Reading only: nothing is copied, so an edit on Payers shows here at once. */
export function derivedRulesFor(payerId: string, cfg: PayerConfig, profile: PayerProfile = payerProfileOf(payerId), short = PAYERS.find((p) => p.id === payerId)?.shortName ?? "The payer"): PayerRule[] {
  const ctx: DeriveCtx = { payerId, profile, source: demoSource(cfg.rulesVersion), short };
  const out: PayerRule[] = [];
  const four: Record<RuleId, (lines: string[]) => Values> = { windows: valuesFromWindows, backdating: valuesFromBackdating, noauth: valuesFromNoAuth, p2p: valuesFromP2p };
  const about: Record<RuleId, string> = {
    windows: "When notice and requests are due, counted from the date the payer says. Read from the payer's saved submission windows.",
    backdating: "How far back a start date may reach, and what the payer asks for when it does. Read from the payer's saved backdating rule.",
    noauth: "Services the payer says need no authorization. Read from the payer's saved rule; Eligibility and New case use the same lines.",
    p2p: "How long a peer-to-peer call and a written appeal stay open after a denial, and what comes next. Read from the payer's saved rule.",
  };
  for (const r of cfg.rules) {
    const s = stamp(r);
    out.push(base({ ...ctx, source: s.source ?? ctx.source }, r.id, LEGACY_RULE_GROUP[r.id], RULE_TITLE[r.id], `${about[r.id]}${s.saved ? ` Last saved in Psyflo ${s.saved}.` : ""}`, four[r.id](r.lines), { instructions: r.lines.join("\n") }));
  }
  for (const p of PROGRAMS) {
    const items = cfg.docs[p] ?? [];
    if (!items.length) continue;
    out.push(base(ctx, `docs:${p}`, "clinical_documentation", `Required documents: ${PROGRAM_LABEL[p]}`, "What the payer asks for before a request goes out. Read from the payer's saved document list.", valuesFromDocs(items), { services: [p] }));
  }
  out.push(base(ctx, "caller", "agent_instructions", "Instructions for Caller", "What Caller says on every phone step. Read from the payer's saved script.", { agent: "caller" }, { instructions: cfg.caller.text }));
  out.push(base(ctx, "reach", "submission_methods", `How to reach ${short}`, "The portal, phone and fax routes and which one comes first. Read from the payer's saved details.", valuesFromReach(cfg)));
  return out;
}

/* ---------------------------------------------------------------- library rules (what the saved configuration lacks) */
const lib = (payerId: string, key: string, group: RuleGroup, title: string, description: string, values: Values, over: Partial<PayerRule> = {}): PayerRule => ({
  id: libraryId(payerId, key),
  payerId,
  group,
  title,
  description,
  values,
  state: "OH",
  services: [],
  requestTypes: [],
  effectiveFrom: RULES_EFFECTIVE_FROM,
  source: demoSource(DEMO_SAMPLE_VERSION),
  verification: "unverified",
  owner: RULES_OWNER,
  version: 1,
  history: [],
  origin: "library",
  ...over,
});

/** Demo limits per level of care, in the units the Eligibility sample uses: Residential 14 days, IOP 48 units, PHP 15 days, Detox 5 days (Summit has no day limit on Residential, so its sample allows a longer request). */
const LIMITS: Record<Program, { units: number; unit: "days" | "units"; days: number }> = { RES: { units: 14, unit: "days", days: 14 }, IOP: { units: 48, unit: "units", days: 112 }, PHP: { units: 15, unit: "days", days: 15 }, WM: { units: 5, unit: "days", days: 5 } };

function libraryRulesFor(payerId: string, cfg: PayerConfig, profile: PayerProfile): PayerRule[] {
  const w = cfg.rules.find((r) => r.id === "windows")?.lines ?? [];
  const lead = w.find((l) => /recertification filed/i.test(l));
  const every = w.find((l) => /continued-stay review every/i.test(l));
  const leadHours = Number(lead?.match(/(\d+) hours/i)?.[1] ?? 72);
  const leadDays = Math.max(1, Math.ceil(leadHours / 24));
  const everyDays = every ? Number(every.match(/every (\d+) days/i)?.[1] ?? 7) : 7;
  const short = PAYERS.find((p) => p.id === payerId)?.shortName ?? "the payer";
  const out: PayerRule[] = [
    lib(payerId, "cadence", "concurrent_reauth", "Continued-stay review cadence", "How often an ongoing stay is reviewed and how early the next request is filed. Seeded to match the cadence lines of this payer's submission windows.",
      { cadenceDays: everyDays, dayType: "calendar", fileBeforeDays: leadDays, firstReviewDays: everyDays }, { product: profile.product, requestTypes: ["concurrent", "reauth"], instructions: `First review after ${everyDays} days, then every ${everyDays} days. File the recertification ${leadDays} days before the unit limit.` }),
  ];
  for (const p of PROGRAMS) {
    const l = LIMITS[p];
    const units = payerId === "summit" && p === "RES" ? 21 : l.units;
    out.push(lib(payerId, `units:${p}`, "concurrent_reauth", `Units and duration: ${PROGRAM_LABEL[p]}`, `The most ${l.unit} one request may ask for at ${PROGRAM_LABEL[p]}. A sample limit for the demo, not ${short}'s policy.`,
      { units, unit: l.unit, maxDurationDays: l.days }, { product: profile.product, services: [p], instructions: `Ask for no more than ${units} ${l.unit} in one request. A longer stay is requested again at the next review.` }));
  }
  const reviewDocs = (p: Program[]) => (p.includes("RES") ? "ASAM dimensions scored and dated within 7 days\nA treatment plan with measurable goals and dates\nA note that says why a lower level of care is not enough" : "ASAM dimensions scored and dated within 14 days\nA treatment plan with measurable goals and dates\nAttendance for the last 14 days");
  for (const [key, services, title] of [["criteria:res", ["RES", "WM"], "Clinical criteria: residential and detox"], ["criteria:op", ["IOP", "PHP"], "Clinical criteria: IOP and PHP"]] as [string, Program[], string][]) {
    out.push(lib(payerId, key, "clinical_documentation", title, `The evidence a reviewer looks for before a request goes out. A demo sample, not ${short}'s clinical policy; Criteria compares the chart to it and only recommends.`,
      { prerequisites: reviewDocs(services), datedWithinDays: services.includes("RES") ? 7 : 14 }, { product: profile.product, services, instructions: "Criteria compares the chart with these points. The result is a recommendation for a person to review, never a payer decision." }));
  }
  out.push(lib(payerId, "agents", "agent_instructions", `Payer-wide instructions for the agents: ${short}`, "Instructions every agent reads before its own prompt for this payer.", { agent: "all" },
    { instructions: `Write for ${short}'s reviewers in plain words. Use only what the chart says. When a rule is unverified, say so. Never state an approval chance as a promise of payment.` }));
  return out;
}

/** The seeded rules of a payer that are the library's own. */
export function seedLibraryRulesFor(payerId: string, cfg: PayerConfig): PayerRule[] {
  return libraryRulesFor(payerId, cfg, payerProfileOf(payerId));
}

const SEEDED = PAYERS.slice(0, 6).map((p) => p.id);
/** The library's own seeded rules for the six demo payers. These start the slice's `payerRulesExtra`. */
export function buildSeedLibraryRules(): PayerRule[] {
  const cfgs = seedPayerConfig();
  return SEEDED.flatMap((id) => (cfgs[id] ? seedLibraryRulesFor(id, cfgs[id]) : []));
}
export const SEED_LIBRARY_RULES: PayerRule[] = buildSeedLibraryRules();

/** Where a payer sends someone who is stuck, seeded on the reach rule so "Submission methods" reads complete. Kept in the library (the saved details hold no such line). */
export const SEED_ESCALATION: Record<string, string> = {
  summit: "Ask the provider line for a supervisor",
  cardinal: "Ask the provider line for a supervisor, then the plan's provider relations",
  beacon: "Ask the provider line for a supervisor",
  evergreen: "Ask for a supervisor on the next morning call",
  harborview: "Phone the provider line and ask for the utilization management lead",
  lakeshore: "Phone the provider line to confirm the fax, then ask for a supervisor",
};
export const SEED_RULE_META = (): Record<string, RuleOverlayLike> => Object.fromEntries(SEEDED.map((id) => [derivedId(id, "reach"), { values: { escalation: SEED_ESCALATION[id] } }]));

/** Every seeded rule: the derived ones from the payers' saved configuration, then the library's own. */
export function buildSeedRules(): PayerRule[] {
  const cfgs = seedPayerConfig();
  const meta = SEED_RULE_META();
  return [
    ...SEEDED.flatMap((id) => applyOverlay(derivedRulesFor(id, cfgs[id]), meta, {})),
    ...SEED_LIBRARY_RULES,
  ];
}
export const SEED_RULES: PayerRule[] = buildSeedRules();

/* ---------------------------------------------------------------- the read-through selector's pure part */
/** The overlay is what the library keeps on top of a rule that is read through: its verification, its source and date, a version count, and any value the saved configuration cannot hold. */
export function applyOverlay(rules: PayerRule[], meta: Record<string, RuleOverlayLike>, history: Record<string, RuleChange[]>): PayerRule[] {
  return rules.map((r) => {
    const o = meta[r.id];
    const h = history[r.id];
    if (!o && !h) return r;
    return {
      ...r,
      ...(o?.fields ?? {}),
      ...(o?.verification ? { verification: o.verification } : {}),
      ...(o?.lastVerified ? { lastVerified: o.lastVerified } : {}),
      ...(o?.source ? { source: o.source } : {}),
      ...(o?.version ? { version: o.version } : {}),
      ...(o?.values ? { values: { ...r.values, ...o.values } } : {}),
      ...(h ? { history: h } : {}),
    };
  });
}

/** Every rule of a payer: those read through from its saved configuration (with the library's overlay) and the library's own. */
export function payerRulesFrom(payerId: string, cfg: PayerConfig | undefined, library: PayerRule[], meta: Record<string, RuleOverlayLike>, history: Record<string, RuleChange[]>, profile: PayerProfile = payerProfileOf(payerId), short?: string): PayerRule[] {
  const derived = cfg ? applyOverlay(derivedRulesFor(payerId, cfg, profile, short), meta, history) : [];
  const own = applyOverlay(library.filter((r) => r.payerId === payerId), meta, history);
  return [...derived, ...own].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
}

/* ---------------------------------------------------------------- saving a derived rule */
/** What a save of a derived rule asks the existing Payers actions to do. The store runs these; nothing here touches state. */
export type DerivedSaveAction =
  | { kind: "saveRule"; rule: RuleId; lines: string[] }
  | { kind: "saveDocs"; program: Program; items: DocItem[]; changes: { what: string; before: string; after: string }[] }
  | { kind: "saveCaller"; text: string }
  | { kind: "editReach"; reach: ReachLine[]; changes: { what: string; before: string; after: string }[] }
  | { kind: "overlay"; values: Values };

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const diffKeys = (a: Values, b: Values): string[] => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !same(a[k], b[k]));

/** The keys of a derived rule that are written back to the payer's saved lines. The others are kept by the library. */
export const WRITE_BACK_KEYS: Record<string, string[]> = {
  windows: ["required", "windowDays", "dayType"],
  backdating: ["allowed", "maxDaysBack", "dayType", "historicalDates", "proof", "retroWindowDays"],
  noauth: ["exceptions"],
  p2p: ["p2pWindowDays", "appealWindowDays", "expeditedAppealHours", "escalation"],
  caller: [],
  reach: ["portal", "phone", "fax"],
  docs: ["prerequisites", "count"],
};

/** Work out what saving `next` over `original` changes. Text edits (`instructions`) win over the structured values when both changed, because the text is what the payer's saved rule is made of. */
export function routeDerivedSave(original: PayerRule, next: PayerRule, cfg: PayerConfig, short: string): DerivedSaveAction[] {
  const key = derivedKeyOf(original.id);
  const actions: DerivedSaveAction[] = [];
  const changed = diffKeys(original.values, next.values);
  const textChanged = (next.instructions ?? "") !== (original.instructions ?? "");
  const writeKeys = WRITE_BACK_KEYS[key.startsWith("docs:") ? "docs" : key] ?? [];
  const lib = changed.filter((k) => !writeKeys.includes(k));
  const wrote = changed.filter((k) => writeKeys.includes(k));

  if (key === "caller") {
    if (textChanged) actions.push({ kind: "saveCaller", text: (next.instructions ?? "").trim() });
  } else if (key === "windows" || key === "backdating" || key === "p2p" || key === "noauth") {
    const rule = key as RuleId;
    const old = cfg.rules.find((r) => r.id === rule)?.lines ?? [];
    let lines: string[] | null = null;
    if (textChanged) lines = (next.instructions ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    else if (wrote.length) {
      const v = next.values;
      lines = rule === "windows" ? linesFromWindows(old, v) : rule === "backdating" ? linesFromBackdating(old, v, short) : rule === "p2p" ? linesFromP2p(old, v) : String(v.exceptions ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    }
    if (lines && !same(lines, old)) actions.push({ kind: "saveRule", rule, lines });
  } else if (key.startsWith("docs:")) {
    const program = key.slice(5) as Program;
    const old = cfg.docs[program] ?? [];
    const text = typeof next.values.prerequisites === "string" ? next.values.prerequisites : "";
    if (changed.includes("prerequisites")) {
      const items = docItemsFromText(text, old, original.payerId, program);
      if (!same(items, old)) actions.push({ kind: "saveDocs", program, items, changes: [{ what: `${PROGRAM_LABEL[program]} document list`, before: old.map((d) => d.title).join("; "), after: items.map((d) => d.title).join("; ") }] });
    }
  } else if (key === "reach") {
    if (wrote.length) {
      const reach: ReachLine[] = cfg.reach.map((l) => (typeof next.values[l.id] === "string" && next.values[l.id] !== l.text ? { ...l, text: String(next.values[l.id]) } : l));
      const changes = reach.filter((l, i) => l.text !== cfg.reach[i].text).map((l, i) => ({ what: `${l.title} route`, before: cfg.reach.find((x) => x.id === l.id)?.text ?? "", after: l.text }));
      if (changes.length) actions.push({ kind: "editReach", reach, changes });
    }
  }
  if (lib.length) {
    const vals: Values = {};
    for (const k of lib) if (next.values[k] !== undefined) vals[k] = next.values[k];
    actions.push({ kind: "overlay", values: vals });
  }
  return actions;
}

/* ---------------------------------------------------------------- finding the rule a node uses */
export type RuleKind = "submission_window" | "backdating" | "no_auth" | "continued_stay" | "units_duration" | "clinical_criteria" | "submission_method" | "appeals" | "document_list" | "caller_script" | "agent_instructions" | "other";

export const RULE_KIND_OF_NODE: Partial<Record<NodeKind, RuleKind>> = {
  rule_submission_window: "submission_window",
  rule_backdating: "backdating",
  rule_no_auth: "no_auth",
  rule_continued_stay: "continued_stay",
  rule_units_duration: "units_duration",
  rule_clinical_criteria: "clinical_criteria",
  rule_submission_method: "submission_method",
  rule_appeal_deadline: "appeals",
  rule_p2p: "appeals",
};

const hasNum = (r: PayerRule, k: string): boolean => typeof r.values[k] === "number";
const hasAny = (r: PayerRule, ...ks: string[]): boolean => ks.some((k) => r.values[k] !== undefined && r.values[k] !== "");

/** True when a rule can answer a node of this kind: the right group, and the values that node reads. */
export function ruleServes(rule: PayerRule, kind: RuleKind): boolean {
  switch (kind) {
    case "submission_window": return rule.group === "submission_windows";
    case "backdating": return rule.group === "backdating";
    case "no_auth": return rule.group === "auth_requirements";
    case "appeals": return rule.group === "appeals_p2p";
    case "continued_stay": return rule.group === "concurrent_reauth" && hasNum(rule, "cadenceDays");
    case "units_duration": return rule.group === "concurrent_reauth" && hasNum(rule, "units");
    case "clinical_criteria": return rule.group === "clinical_documentation" && !isDocumentListRule(rule);
    case "document_list": return rule.group === "clinical_documentation" && isDocumentListRule(rule);
    case "submission_method": return rule.group === "submission_methods" && hasAny(rule, "preferred", "fallback", "portal", "phone", "fax");
    case "caller_script": return rule.group === "agent_instructions" && rule.id.endsWith(":caller");
    case "agent_instructions": return rule.group === "agent_instructions";
    default: return false;
  }
}

/** The facts a rule is judged against, and no more. */
export interface RuleScope { payerId: PayerId; state?: string; product?: string; service?: Program; requestType?: RequestType; today: string }

/** A rule is in force when the payer, the state, the level of care, the request type and the date all fit. A rule that fits only by being general scores lower than one named for the case. */
export function ruleScopeScore(rule: PayerRule, s: RuleScope): number {
  if (rule.payerId !== s.payerId) return -1;
  if (s.state && rule.state && rule.state !== s.state) return -1;
  if (rule.services.length && s.service && !rule.services.includes(s.service)) return -1;
  if (rule.requestTypes.length && s.requestType && !rule.requestTypes.includes(s.requestType)) return -1;
  if (rule.effectiveFrom > s.today) return -1;
  if (rule.effectiveTo && rule.effectiveTo < s.today) return -1;
  return (rule.services.length ? 2 : 0) + (rule.requestTypes.length ? 2 : 0) + (rule.product && s.product && rule.product === s.product ? 1 : 0);
}

/** The best rule for a kind of node: the superseded are skipped, the most specific wins, a tie goes to the library's own and then to the lower id so the choice never changes between runs. */
export function bestRule(rules: PayerRule[], kind: RuleKind, s: RuleScope): PayerRule | undefined {
  return rules
    .filter((r) => r.verification !== "superseded" && ruleServes(r, kind))
    .map((r) => ({ r, score: ruleScopeScore(r, s) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score || Number(a.r.origin === "library") - Number(b.r.origin === "library") || a.r.id.localeCompare(b.r.id))[0]?.r;
}

/** A new rule for the library, unverified, with a source that says a person entered it. */
export function newLibraryRule(payerId: string, group: RuleGroup, title: string, owner: string, slug: string, over: Partial<PayerRule> = {}): PayerRule {
  const profile = payerProfileOf(payerId);
  return {
    id: libraryId(payerId, slug),
    payerId,
    group,
    title,
    description: "",
    values: {},
    state: profile.state,
    product: profile.product,
    services: [],
    requestTypes: [],
    effectiveFrom: RULES_EFFECTIVE_FROM,
    source: { kind: "user_entered", label: `Entered by ${owner}` },
    verification: "unverified",
    owner,
    version: 1,
    history: [],
    origin: "library",
    ...over,
  };
}

/** A short plain sentence naming a rule's source, for traces and warnings. */
export const sourceText = (r: Pick<PayerRule, "source" | "lastVerified" | "verification">): string =>
  r.verification === "verified" ? `${r.source.label}${r.lastVerified ? `, verified ${r.lastVerified}` : ""}` : `${r.source.label}, not verified`;
