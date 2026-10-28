import { moduleById } from "@/data/assess/modules";
import { buildAssessmentPlan } from "@/data/assess/plan";
import { defaultsFor, PROGRAMS_V2, programById } from "@/data/assess/programs";
import { purposeById } from "@/data/assess/purposes";
import type { WorkspaceTarget } from "@/data/assess/nav";
import { effectiveStatus } from "@/data/assess/status";
import { LEVEL_LABEL, SOURCE_LABEL, VERIFICATION_LABEL, type AssessmentPlan, type ModuleId, type Population, type ProgramDef } from "@/data/assess/types";
import { TRIAGE_LABEL, type IntakeRecord } from "@/data/intake/types";
import type { ContextLine } from "./context";

/* The assistant's chat. It answers only from this record and the configured policy data: what is missing, why a module is required, what would change
   under another program, where something came from, a plain summary of the referral. It is deterministic (keyword intents, no model), every answer is
   labeled AI suggested and simulated, and it says so when it is asked for something it must not do: it never diagnoses, never decides safety, never makes a
   medical necessity statement, never selects a program or a level of care, and never signs, sends or submits. */

export interface ChatContext {
  record: IntakeRecord;
  plan: AssessmentPlan | null;
  target: WorkspaceTarget;
  /** The section's own needs (contextOf), so "what's missing" matches what the panel shows. */
  lines: ContextLine[];
  title: string;
}
export interface ChatAnswer {
  text: string;
  /** What the answer was read from. */
  sources: string[];
  kind: "answer" | "refusal" | "unsupported";
}

const norm = (q: string): string => q.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim();
const list = (xs: string[], max = 4): string => (xs.length <= max ? xs.join(", ") : `${xs.slice(0, max).join(", ")} and ${xs.length - max} more`);

const REFUSE: { re: RegExp; text: string }[] = [
  { re: /\b(diagnos\w*|what (condition|illness|disorder)\b|does (he|she|they|the (patient|person|client)) have)/, text: "I can't diagnose or suggest a diagnosis. A clinician documents diagnoses in their own words. I can show what the record says and where it comes from." },
  { re: /\b(is (he|she|they|the (patient|person|client|it)) (safe|unsafe|at risk|dangerous)|safe to\b|at risk of|suicid\w*|self[- ]harm|risk level|how risky)/, text: "I can't decide whether someone is safe or at risk. A clinician reviews every safety statement. I can point to what was said and where it was recorded." },
  { re: /\bmedical(ly)? necess\w*/, text: "I can't make a medical necessity statement. A clinician writes it and the payer decides. I can show what is documented and what is still missing for a review." },
  { re: /\b(level of care|which level|what level|placement|which program should|best (program|service|fit)|which service|recommend\w*|should (he|she|they|we|i) (be )?(admit\w*|place\w*|enroll\w*|start|go|get|receive|use))/, text: "I can't select a program or a level of care. A clinician does, in Care planning. I can show what would change in the assessment under a different program: ask what changes if you switch to it." },
  { re: /\b(sign|attest|approve|deny|submit|send|finali[sz]e|accept all|rate|score|calculate|compute)\b/, text: "I can't sign, send, approve, score or submit anything. A person does. I can draft or organize, and the draft waits for a person." },
];

const STOP = new Set(["the", "a", "an", "of", "and", "for", "to", "program", "programs", "service", "services", "treatment", "if", "we", "i", "switch", "change", "move", "what", "changes", "use", "pick", "choose", "select", "go", "with", "instead", "then", "this", "that", "intake", "it", "is", "are", "would", "did", "do", "me", "my", "show", "tell", "about", "how", "in", "on", "as", "be", "will", "happen", "happens", "different", "differ"]);
const SYN: Record<string, string[]> = {
  "mh-op": ["outpatient", "therapy"], "mh-iop": ["iop", "intensive", "mental", "mh"], "mh-php": ["php", "partial", "mental", "mh"], "mh-res": ["residential", "mental", "mh", "psychiatric"], "mh-inpt": ["inpatient", "mental", "mh", "psychiatric"],
  psr: ["psr", "rehabilitation"], act: ["act", "assertive"], csc: ["csc", "coordinated", "specialty", "psychosis"],
  "sud-op": ["sud", "substance", "outpatient"], "sud-iop": ["sud", "substance", "iop", "intensive"], "sud-php": ["sud", "substance", "php", "partial"], "sud-res": ["sud", "substance", "residential"], "sud-wm": ["sud", "substance", "withdrawal", "detox", "wm"], "sud-inpt": ["sud", "substance", "inpatient"],
  otp: ["otp", "opioid"], obot: ["obot", "office-based", "office"],
  "cpst-adult": ["cpst", "adult"], "cpst-youth": ["cpst", "youth"], "cpst-school": ["cpst", "school"], clubhouse: ["clubhouse"], mhcm: ["case", "management", "mhcm"], cbbh: ["community-based", "cbbh"],
  "youth-iop": ["youth", "iop", "intensive"], "youth-php": ["youth", "php", "partial"], "school-bh": ["school-based", "school"], "children-intensive": ["children's", "children", "intensive"], aba: ["aba", "applied", "behavior", "analysis"], prtf: ["prtf", "facility"], "family-based": ["family-based", "family"],
  general: ["general"], custom: ["custom"],
};
const tokensOf = (p: ProgramDef): Set<string> => new Set([...norm(`${p.label} ${p.id.replace(/-/g, " ")}`).split(" "), ...(SYN[p.id] ?? [])].filter((t) => t && !STOP.has(t)));

/** The program a question names: the one that shares the most words with it, when one does so clearly. A program that serves the person's population wins a tie with one that does not
    ("mental health PHP" means the adult program for an adult, not the youth one). */
export function programIn(question: string, population?: Population): { program?: ProgramDef; candidates: ProgramDef[] } {
  const words = new Set(norm(question).split(" ").filter((w) => w && !STOP.has(w)));
  const scored = PROGRAMS_V2.map((p) => {
    const toks = [...tokensOf(p)];
    const n = toks.filter((t) => words.has(t)).length;
    const fit = !population || !p.populations.length || p.populations.includes(population);
    return { p, n, extra: toks.length - n, fit, score: n * 10 - (toks.length - n) + (fit ? 6 : 0) };
  }).filter((x) => x.n > 0).sort((a, b) => b.score - a.score);
  if (!scored.length) return { candidates: [] };
  const top = scored[0];
  const rival = scored[1];
  const clear = !rival || top.score - rival.score >= 3 || top.n > rival.n;
  return clear && top.n >= 1 && (top.n >= 2 || !rival || rival.n < top.n) ? { program: top.p, candidates: [top.p] } : { candidates: scored.slice(0, 3).map((x) => x.p) };
}

/** The module a question names, by its label, id or a common short name; the module open on the screen when it names none. */
export function moduleIn(question: string, plan: AssessmentPlan | null, target: WorkspaceTarget): ModuleId | null {
  const q = ` ${norm(question)} `;
  const names: [ModuleId, string[]][] = (plan?.modules ?? []).map((m) => [m.id, [m.label.toLowerCase(), moduleById(m.id).label.toLowerCase(), m.id.replace(/-/g, " ")]]);
  const hit = names.find(([, ns]) => ns.some((n) => q.includes(` ${n} `) || (n.length > 4 && q.includes(n))));
  if (hit) return hit[0];
  const short: [RegExp, ModuleId][] = [[/\basam\b/, "asam"], [/\bcans\b/, "cans"], [/\blevel of need\b|\blon\b/, "lon"], [/\bwithdrawal\b/, "withdrawal"], [/\bresidential admission\b/, "residential-admission"], [/\bphq/, "phq9"], [/\bgad/, "gad7"], [/\bc-?ssrs\b/, "cssrs"], [/\bsafety\b/, "safety"]];
  const s = short.find(([re]) => re.test(q));
  if (s && (!plan || plan.modules.some((m) => m.id === s[1]))) return s[1];
  return target.section === "instrument" && target.module ? target.module : null;
}

function why(ctx: ChatContext, id: ModuleId): ChatAnswer {
  const { plan, record } = ctx;
  const def = moduleById(id);
  if (!plan || !record.config) return { kind: "answer", text: "This intake is not configured yet, so there is no plan to explain. Configure the intake to see which modules it needs and why.", sources: ["Intake configuration"] };
  const m = plan.modules.find((x) => x.id === id);
  const program = programById(plan.context.programId).label;
  if (!m) return { kind: "answer", text: `${def.label} is not part of the plan for ${program}. A person can add it as an optional module in the configuration. I can't add it for you.`, sources: [`Assessment plan version ${plan.version}`] };
  const lines = m.sources.map((s) => `${SOURCE_LABEL[s.source]} (${VERIFICATION_LABEL[s.status]}), ${s.ruleLabel}, version ${s.version}: ${s.reason}`);
  const head = `${m.label} is ${LEVEL_LABEL[m.level].toLowerCase()} for ${program} (${purposeById(plan.context.purposeId).label.toLowerCase()}).`;
  const tail = m.preparation ? " Its rule takes effect after the policy date, so it is shown for preparation and does not hold up readiness yet." : m.removable ? " It is not required, so a person can turn it off." : " It is required: only an authorized override with a reason removes it.";
  return { kind: "answer", text: `${head} ${lines.join(" ")}${tail}`, sources: m.sources.map((s) => `${s.ruleLabel} (${SOURCE_LABEL[s.source]}, ${VERIFICATION_LABEL[s.status]}, ${s.version})`) };
}

function whatIf(ctx: ChatContext, alt: ProgramDef): ChatAnswer {
  const { plan, record } = ctx;
  if (!plan || !record.config) return { kind: "answer", text: "This intake is not configured yet. Configure it first; then I can compare programs.", sources: ["Intake configuration"] };
  if (alt.id === plan.context.programId) return { kind: "answer", text: `This intake is already configured for ${alt.label}.`, sources: [`Assessment plan version ${plan.version}`] };
  const ctxAlt = { ...plan.context, programId: alt.id, population: alt.populations.includes(plan.context.population) ? plan.context.population : defaultsFor(alt.id, record.age).population, setting: alt.settings.includes(plan.context.setting) ? plan.context.setting : alt.defaultSetting };
  const next = buildAssessmentPlan(ctxAlt);
  const had = new Map(plan.modules.map((m) => [m.id, m]));
  const has = new Map(next.modules.map((m) => [m.id, m]));
  const added = next.modules.filter((m) => !had.has(m.id) && m.level !== "optional");
  const dropped = plan.modules.filter((m) => !has.has(m.id) && m.level !== "optional");
  const changed = next.modules.filter((m) => had.has(m.id) && had.get(m.id)?.level !== m.level);
  const bits: string[] = [];
  bits.push(added.length ? `It would add ${list(added.map((m) => `${m.label} (${LEVEL_LABEL[m.level].toLowerCase()})`))}.` : "It would add no required or recommended module.");
  bits.push(dropped.length ? `It would drop ${list(dropped.map((m) => m.label))}; work already done in a dropped module is kept and archived.` : "It would drop none.");
  if (changed.length) bits.push(`${list(changed.map((m) => `${m.label}: ${LEVEL_LABEL[had.get(m.id)?.level ?? "optional"].toLowerCase()} to ${LEVEL_LABEL[m.level].toLowerCase()}`))}.`);
  const note = next.warnings[0] ? ` Note: ${next.warnings[0]}` : "";
  return { kind: "answer", text: `If this intake were configured for ${alt.label}: ${bits.join(" ")}${note} Nothing changes until a person changes the configuration, and a clinician selects the program in Care planning.`, sources: [`Assessment plan for ${alt.label}, version ${next.version}`, `Current plan version ${plan.version}`] };
}

function sourcesOf(ctx: ChatContext): ChatAnswer {
  const { record, plan, target } = ctx;
  const out: string[] = [];
  if (target.section === "instrument" && target.module && plan) {
    const m = plan.modules.find((x) => x.id === target.module);
    for (const s of m?.sources ?? []) out.push(`Rule: ${s.ruleLabel} (${SOURCE_LABEL[s.source]}, ${VERIFICATION_LABEL[s.status]}, version ${s.version})`);
    const ev = record.instruments?.[target.module]?.evidence ?? [];
    for (const e of ev.slice(0, 5)) out.push(`Evidence for ${e.fieldKey}: ${e.source.ref}${e.source.at !== undefined ? ` at ${Math.floor(e.source.at / 60)}:${String(e.source.at % 60).padStart(2, "0")}` : ""} (${e.status})`);
  }
  for (const d of record.documents.slice(0, 5)) out.push(`Document: ${d.name}${d.simulated ? " (simulated import)" : ""}`);
  if (record.scribe?.turns.length) out.push(`Record Intake transcript: ${record.scribe.turns.length} turns (simulated audio)`);
  if (record.voice?.turns.length) out.push(`Voice intake call transcript: ${record.voice.turns.length} turns (simulated call)`);
  if (!out.length) return { kind: "answer", text: "Nothing on this screen has a source yet: no document, transcript or evidence is on file for it.", sources: [] };
  return { kind: "answer", text: `Sources for what is on this screen: ${out.join("; ")}.`, sources: out };
}

function summary(ctx: ChatContext): ChatAnswer {
  const r = ctx.record;
  const reason = r.referral.reason?.value;
  const program = ctx.plan ? programById(ctx.plan.context.programId).label : null;
  const open = ctx.lines.length;
  const text = `${r.initials || "The person"}${r.age !== null ? `, ${r.age}` : ""}: referred by ${r.sourceOrg}. ${reason ? `Reason on file: ${reason}` : "No reason for referral is documented yet."} ${program ? `Configured for ${program}.` : "Not configured yet."} Status: ${TRIAGE_LABEL[effectiveStatus(r)].toLowerCase()}. ${open ? `${open} ${open === 1 ? "item needs" : "items need"} attention on this screen.` : "Nothing needs attention on this screen."} This is a draft summary of what is documented, not a clinical conclusion.`;
  return { kind: "answer", text, sources: ["Referral fields on this record", ...(program ? [`Intake configuration: ${program}`] : [])] };
}

/** An answer to one question, from the record and the policy data only. */
export function respond(question: string, ctx: ChatContext): ChatAnswer {
  const q = norm(question);
  if (!q) return { kind: "unsupported", text: "Ask me what is missing, why a module is required, what changes if you switch program, or where something came from.", sources: [] };
  const asksSwitch = /\b(switch|change|move|instead|what if|what changes|if (we|i) (use|pick|choose|select|go with))\b/.test(q) && /\b(program|iop|php|cpst|csc|aba|act|otp|residential|outpatient|sud|mental|youth|school|detox|withdrawal|clubhouse|case management|to)\b/.test(q);
  if (asksSwitch) {
    const { program, candidates } = programIn(q, ctx.plan?.context.population);
    if (program) return whatIf(ctx, program);
    return { kind: "answer", text: candidates.length ? `Which program do you mean: ${list(candidates.map((p) => p.label), 3)}?` : "Which program would you switch to? For example: SUD IOP, Mental health PHP, CPST adult or ABA.", sources: [] };
  }
  for (const r of REFUSE) if (r.re.test(q)) return { kind: "refusal", text: r.text, sources: [] };
  if (/\b(missing|what do i (still )?need|what('?s| is| are) (left|needed|outstanding|open|next)|to do|todo|still need|gaps?)\b/.test(q)) {
    const top = ctx.lines.slice(0, 5);
    if (!top.length) return { kind: "answer", text: `Nothing is missing on this screen (${ctx.title.toLowerCase()}). Open the Overview to see the whole intake.`, sources: ["Intake checklist", "Assessment plan"] };
    return { kind: "answer", text: `${ctx.title}: ${top.map((l, i) => `${i + 1}. ${l.text}${l.detail ? ` (${l.detail.replace(/\.$/, "")})` : ""}`).join(" ")}${ctx.lines.length > top.length ? ` And ${ctx.lines.length - top.length} more.` : ""}`, sources: ["Intake checklist", "Assessment plan", "Evidence and suggestions on this record"] };
  }
  if (/\bwhy\b/.test(q) || /\brequired\b/.test(q) || /\b(is|are) .* (needed|asked)\b/.test(q)) {
    const id = moduleIn(q, ctx.plan, ctx.target);
    if (id) return why(ctx, id);
    const req = ctx.plan?.modules.filter((m) => m.level === "required").length;
    return { kind: "answer", text: req ? `This plan requires ${req} modules. Name one to see why, for example "Why is ${(ctx.plan?.modules.find((m) => m.level === "required" && m.group !== "core") ?? ctx.plan?.modules[0])?.label ?? "a module"} required?"` : "Name a module and I will show the rule behind it. This intake may not be configured yet.", sources: ctx.plan ? [`Assessment plan version ${ctx.plan.version}`] : [] };
  }
  if (/\b(source|sources|where (did|does|do)|cite|citation|reference|came from|provenance)\b/.test(q)) return sourcesOf(ctx);
  if (/\bsummar\w*/.test(q)) return summary(ctx);
  if (/\b(help|what can you do|how do you work|capabilities)\b/.test(q)) return { kind: "answer", text: "I answer from this record and the configured policy rows only. Ask what's missing, why a module is required, what changes if you switch program, where something came from, or for a summary of the referral. I never diagnose, decide safety, make medical necessity statements, select a level of care, sign or submit.", sources: [] };
  return { kind: "unsupported", text: "I can't do that in the demo. I can answer what's missing, why a module is required, what changes if you switch program, show the sources, or summarize the referral.", sources: [] };
}
