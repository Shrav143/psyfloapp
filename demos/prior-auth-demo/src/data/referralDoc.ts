import type { DocBlock } from "@/components/ui/DocumentSheet";
import { longDate } from "@/lib/time";
import { CHANNEL_LABEL, DOC_TITLE, PROGRAM_LONG, URGENCY_LABEL } from "./referralLabels";
import type { Channel, DocId, Referral } from "./referralTypes";
import { payerById } from "./seed";

export interface ReferralDoc {
  id: DocId;
  title: string;
  pages: DocBlock[][];
}

export interface Evidence {
  doc: DocId;
  docTitle: string;
  page: number;
  section: string;
  quote: string;
}

type DocSource = Pick<Referral, "receivedAt" | "channel" | "source" | "plan">;

const FORM_TITLE: Record<Channel, string> = {
  fax: "Referral for behavioral health services",
  eReferral: "Electronic referral: behavioral health services",
  portal: "Referral entered through the portal",
  phone: "Telephone referral note, taken by Admissions",
  email: "Referral received by email",
};

const NOT_FILLED = "Not completed on this form.";

/** The source documents as pages of blocks. Blocks with an id are the evidence Reader points at. */
export function buildDocs(r: DocSource): ReferralDoc[] {
  const p = r.plan;
  const c = p.clinician;
  const payer = p.payerId ? payerById(p.payerId) : null;
  const letterhead: DocBlock = { kind: "letterhead", org: p.org, sub: `${p.orgSub}${r.source.fax ? ` · Fax ${r.source.fax}` : ""}` };

  const formHead: DocBlock[] = [
    letterhead,
    { kind: "title", text: FORM_TITLE[r.channel] },
    { kind: "meta", items: [["Referral date", longDate(r.receivedAt)], ["Priority", URGENCY_LABEL[p.urgency]], ["Sent by", CHANNEL_LABEL[r.channel]], ["To", "Admissions office"]] },
  ];
  const page1: DocBlock[] = [
    { kind: "h", text: "Patient" },
    { kind: "p", id: "patient", text: `Patient: ${p.initials}, ${p.sex === "F" ? "female" : "male"}. Privacy mode: name and date of birth replaced by codes.` },
    { kind: "h", text: "Reason for referral" },
    { kind: "p", id: "reason", text: p.reason || NOT_FILLED },
    { kind: "h", text: "Diagnoses (ICD-10)" },
    p.dx.length ? { kind: "list", id: "diagnoses", items: p.dx.map((d) => `${d.code}  ${d.label}`) } : { kind: "p", id: "diagnoses", text: "No diagnosis listed on this form." },
    { kind: "h", text: "Substance use history" },
    { kind: "p", id: "substances", text: p.substances || NOT_FILLED },
  ];
  const page2: DocBlock[] = [
    { kind: "h", text: "Current medications" },
    p.meds.length ? { kind: "list", id: "meds", items: p.meds } : { kind: "p", id: "meds", text: NOT_FILLED },
    { kind: "h", text: "Risk screening" },
    { kind: "p", id: "risk", text: p.risk || NOT_FILLED },
    { kind: "h", text: "Level of care requested" },
    { kind: "p", id: "service", text: `${PROGRAM_LONG[p.program]}, ASAM level ${p.asam}.` },
    { kind: "p", id: "urgency", text: `Priority: ${URGENCY_LABEL[p.urgency]}.` },
    { kind: "h", text: "Referring clinician" },
    { kind: "p", id: "clinician", text: `Name: ${c.name}` },
    { kind: "p", id: "credentials", text: `Credentials: ${c.credentials}` },
    { kind: "p", id: "npi", text: `NPI: ${c.npi}` },
    { kind: "p", id: "orderDate", text: `Order date: ${longDate(p.orderAt)}. Valid until: ${longDate(p.expiresAt)}.` },
    { kind: "sig", id: "signature", text: `${c.name}, ${c.credentials}. Signed ${longDate(p.orderAt)}`, missing: !p.signed },
  ];

  const face: DocBlock[] = [
    letterhead,
    { kind: "title", text: "Face sheet" },
    { kind: "meta", items: [["Patient", p.initials], ["Received", longDate(r.receivedAt)]] },
    { kind: "h", text: "Demographics" },
    { kind: "p", id: "age", text: `Age: ${p.age} years. Date of birth code: ${p.dobCode}.` },
    { kind: "p", id: "contact", text: p.phone ? `Patient phone: ${p.phone}. Other contact: ${p.altContact}.` : "Patient phone: not provided." },
    { kind: "h", text: "Insurance" },
    { kind: "p", id: "insurance", text: payer ? `Primary insurance: ${payer.name}.` : "Primary insurance: none listed." },
    { kind: "p", id: "memberId", text: p.memberIdMasked.startsWith("…") ? `Member ID: ${p.memberIdMasked} (masked in privacy mode).` : "Member ID: not provided." },
  ];

  return [
    { id: "form", title: DOC_TITLE.form, pages: p.pages === 2 ? [[...formHead, ...page1], page2] : [[...formHead, ...page1, ...page2]] },
    { id: "face", title: DOC_TITLE.face, pages: [face] },
  ];
}

function quoteOf(b: DocBlock): string {
  switch (b.kind) {
    case "p":
      return b.text;
    case "list":
      return b.items.join("; ");
    case "table":
      return b.rows.map((row) => row.join(" ")).join("; ");
    case "sig":
      return b.missing ? "Signature line is empty" : b.text;
    default:
      return "";
  }
}

/** Where in the documents a block id lives: which document, which page, under which heading, and what it says. */
export function locate(docs: ReferralDoc[], blockId: string): Evidence | null {
  for (const d of docs) {
    for (let pi = 0; pi < d.pages.length; pi++) {
      let section = "";
      for (const b of d.pages[pi]) {
        if (b.kind === "h") section = b.text;
        if ("id" in b && b.id === blockId) return { doc: d.id, docTitle: d.title, page: pi + 1, section, quote: quoteOf(b) };
      }
    }
  }
  return null;
}
