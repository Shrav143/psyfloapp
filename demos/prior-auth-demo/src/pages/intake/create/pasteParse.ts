import type { DocBlock } from "@/components/ui/DocumentSheet";
import type { SampleExtract } from "@/data/intake/samples";
import type { BuiltInPayerId, Urgency } from "@/data/types";
import { VA_PLANS } from "@/data/va/plans";
import type { VaServiceId } from "@/data/va/services";
import type { ServiceBasis } from "./buildDraft";

/* A small pattern reader for pasted text. It finds labeled values (date of birth, phone, member ID), plan names, ICD-10 codes and the words that name a
   program. It only ever copies what the text says, and it points to the line it came from. It is a simulation of Reader, not a language model. */

export interface ParsedPaste {
  blocks: DocBlock[];
  extract: SampleExtract[];
  initials: string;
  age: number | null;
  serviceId: VaServiceId;
  serviceBasis: ServiceBasis;
  urgency: Urgency;
  payerId: BuiltInPayerId | null;
  sourceOrg: string;
  /** Lines that were read, for the "found" count. */
  lines: number;
}

const SUD_WORDS = /\b(alcohol|opioid|fentanyl|heroin|substance|drinking|drug|cannabis|methamphetamine|stimulant|withdrawal|detox)\b/i;
const PLAN_WORDS: { re: RegExp; payerId: BuiltInPayerId }[] = VA_PLANS.flatMap((p) => [
  { re: new RegExp(p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), payerId: p.payerId },
  { re: new RegExp(`\\b${p.short === "Medicaid FFS" ? "fee-for-service" : p.short}\\b`, "i"), payerId: p.payerId },
]);

const iso = (s: string): string | null => {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

/** "T W" or "Tavion Wright" becomes "T.W."; already-initialed text is kept. Names never go further than initials (privacy mode). */
export function initialsOf(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ");
  if (/^([A-Za-z]\.){1,3}$/.test(t)) return t.toUpperCase();
  const words = t.split(/[\s.]+/).filter(Boolean);
  const letters = words.length > 1 ? words.map((w) => w[0]) : t.replace(/[^A-Za-z]/g, "").split("");
  return letters.slice(0, 3).map((c) => c.toUpperCase()).join(".") + (letters.length ? "." : "");
}

const SERVICE_WORDS: { re: RegExp; pick: (t: string, age: number | null) => VaServiceId }[] = [
  { re: /withdrawal management|detox/i, pick: () => "arts-wm" },
  { re: /\bresidential\b/i, pick: (t) => (SUD_WORDS.test(t) ? "arts-res" : "mh-res") },
  { re: /intensive outpatient|\bIOP\b/i, pick: (t) => (SUD_WORDS.test(t) ? "arts-iop" : "mh-iop") },
  { re: /partial hospitali[sz]ation|\bPHP\b/i, pick: (t) => (SUD_WORDS.test(t) ? "arts-php" : "mh-php") },
  { re: /applied behavior analysis|\bABA\b/i, pick: () => "aba" },
  { re: /\bCPST\b|community psychiatric support/i, pick: (_t, age) => (age !== null && age < 18 ? "cpst-youth" : "cpst-adult") },
  { re: /case management/i, pick: () => "mhcm" },
  { re: /assertive community|\bACT\b team/i, pick: () => "act" },
  { re: /outpatient (?:therapy|counseling)|\btherapy\b|\bcounseling\b/i, pick: (t) => (SUD_WORDS.test(t) ? "arts-op" : "opt") },
];

export function parsePastedText(text: string, fallbackOrg = "Pasted referral text"): ParsedPaste {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const blocks: DocBlock[] = lines.map((l, i) => ({ kind: "p", id: `t${i + 1}`, text: l }));
  const extract: SampleExtract[] = [];
  const seen = new Set<string>();
  const add = (e: SampleExtract) => {
    const k = `${e.section}.${e.field}`;
    if (seen.has(k) && !e.conflict) return;
    seen.add(k);
    extract.push(e);
  };
  const all = lines.join("\n");

  let initials = "";
  let age: number | null = null;
  let payerId: BuiltInPayerId | null = null;
  let sourceOrg = fallbackOrg;
  let urgency: Urgency = "routine";
  const plansFound: { name: string; payerId: BuiltInPayerId; block: string; quote: string }[] = [];

  lines.forEach((line, i) => {
    const block = `t${i + 1}`;
    const body = (re: RegExp) => line.match(re)?.[1]?.trim().replace(/[.;]$/, "");

    if (!initials) {
      const ini = line.match(/\b((?:[A-Z]\.){2,3})(?:,?\s*(?:age\s*)?(\d{1,3}))?/);
      const named = line.match(/\b(?:patient|client|student|member|for)\s*[:\-]\s*([A-Za-z][A-Za-z.\s]{1,40}?)(?:,\s*(?:age\s*)?(\d{1,3}))?\s*$/i);
      if (ini) {
        initials = ini[1];
        if (ini[2]) age = Number(ini[2]);
      } else if (named) {
        initials = initialsOf(named[1]);
        if (named[2]) age = Number(named[2]);
      }
    }
    const ageM = body(/\bage\s*[:\-]?\s*(\d{1,3})\b/i) ?? body(/\b(\d{1,3})[- ]year[- ]old\b/i);
    if (ageM && age === null) age = Number(ageM);

    const dob = body(/(?:dob|date of birth|born)\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (dob && iso(dob)) add({ section: "profile", field: "dob", value: iso(dob) as string, block, quote: line, confidence: "high" });

    const phone = line.match(/\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/)?.[0];
    if (phone) {
      const referrer = /\b(callback|call back|reply|office|fax|extension|officer|counselor|coordinator|referr\w*)\b/i.test(line);
      const field = /guardian|mother|father|parent/i.test(line) ? "guardianPhone" : "phone";
      add(referrer ? { section: "referral", field: "referrerContact", value: phone, block, quote: line, confidence: "high" } : { section: "profile", field, value: phone, block, quote: line, confidence: "high" });
    }

    const member = line.match(/member id[^0-9]{0,24}(\d{4,})/i)?.[1] ?? line.match(/member id[^0-9]{0,12}(?:ending|ends)\s*(\d{4})/i)?.[1];
    if (member) add({ section: "coverage", field: "medicaidId", value: `•••• ${member.slice(-4)}`, block, quote: line.replace(/\d{5,}/g, (d) => `ending ${d.slice(-4)}`), confidence: "high" });

    for (const p of PLAN_WORDS) {
      const m = line.match(p.re);
      if (m && !plansFound.some((x) => x.payerId === p.payerId)) plansFound.push({ name: VA_PLANS.find((v) => v.payerId === p.payerId)?.name ?? m[0], payerId: p.payerId, block, quote: line });
    }

    const labeled = body(/\breason(?: for referral)?\s*[:\-]\s*(.{10,})/i);
    const prose = /\b(?:referring [^:]{0,40}? for|requesting|requests|asks? for|referral for)\b/i.test(line) && line.length >= 40;
    if (labeled || prose) add({ section: "referral", field: "reason", value: (labeled ?? line).slice(0, 320), block, quote: line.slice(0, 200), confidence: "medium" });

    const clin = body(/(?:referred by|sent by|referring (?:clinician|provider)|from)\s*[:\-]\s*(.{3,80})/i);
    if (clin) add({ section: "referral", field: "referringClinician", value: clin, block, quote: line, confidence: "medium" });
    const org = body(/(?:organization|agency|clinic|school|hospital|practice)\s*[:\-]\s*(.{3,80})/i);
    if (org) sourceOrg = org.includes("(fictional)") ? org : `${org} (fictional)`;

    const dx = line.match(/\b[A-TV-Z]\d{2}(?:\.\d{1,4})?\b/g);
    if (dx && /diagnos/i.test(line)) add({ section: "referral", field: "dxDocumented", value: body(/diagnos\w*\s*[:\-]\s*(.+)/i) ?? dx.join(", "), block, quote: line, confidence: "medium" });
    const meds = body(/medications?\s*[:\-]\s*(.+)/i);
    if (meds) add({ section: "profile", field: "medications", value: meds, block, quote: line, confidence: "medium" });
    const guardian = body(/(?:guardian|parent|caregiver)\s*[:\-]\s*(.{3,80})/i);
    if (guardian) add({ section: "profile", field: "guardianName", value: guardian, block, quote: line, confidence: "medium" });
    const lang = line.match(/(?:language|speaks|prefers)\D{0,16}(English|Spanish|Arabic|Vietnamese|Korean|Amharic)/i)?.[1];
    if (lang) add({ section: "profile", field: "language", value: lang[0].toUpperCase() + lang.slice(1).toLowerCase(), block, quote: line, confidence: "medium" });
    if (/\b(emergent|emergency|in crisis)\b/i.test(line)) urgency = "emergent";
    else if (/\b(urgent|asap|today|within 24 hours|as soon as possible)\b/i.test(line) && urgency === "routine") urgency = "urgent";
  });

  if (plansFound[0]) {
    const [first, ...rest] = plansFound;
    payerId = first.payerId;
    add({
      section: "coverage", field: "plan", value: first.name, block: first.block, quote: first.quote.slice(0, 200), confidence: rest.length ? "medium" : "high",
      ...(rest.length ? { conflict: `The text names more than one plan: ${plansFound.map((p) => p.name).join(" and ")}. Confirm the current plan before eligibility is checked.` } : {}),
    });
  }

  const reasonLine = extract.find((e) => e.field === "reason")?.value ?? all;
  let serviceId: VaServiceId = "other-bh";
  let serviceBasis: ServiceBasis = "unstated";
  for (const w of SERVICE_WORDS) {
    if (w.re.test(reasonLine) || w.re.test(all)) {
      serviceId = w.pick(all, age);
      serviceBasis = "inferred";
      break;
    }
  }
  if (!extract.some((e) => e.field === "reason") && lines.length) {
    const prose = lines.map((l, i) => ({ l, i })).filter(({ l }) => !/^[A-Za-z ]{2,24}:\s/.test(l) && l.length >= 50).sort((a, b) => b.l.length - a.l.length)[0];
    if (prose) add({ section: "referral", field: "reason", value: prose.l.slice(0, 320), block: `t${prose.i + 1}`, quote: prose.l.slice(0, 200), confidence: "low" });
  }
  return { blocks, extract, initials, age, serviceId, serviceBasis, urgency, payerId, sourceOrg, lines: lines.length };
}

/** The text of a sample document, one line per block, for the "Use sample text" buttons. */
export function blocksToText(blocks: DocBlock[]): string {
  return blocks
    .flatMap((b) => {
      switch (b.kind) {
        case "letterhead": return [b.org];
        case "title": return [b.text];
        case "meta": return b.items.map(([k, v]) => `${k}: ${v}`);
        case "h": return [];
        case "p": return [b.text];
        case "list": return b.items;
        case "table": return b.rows.map((r) => `${r[0]}: ${r.slice(1).join(", ")}`);
        case "sig": return [b.text];
      }
    })
    .join("\n");
}
