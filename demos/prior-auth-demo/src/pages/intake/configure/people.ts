import { signedAssessmentsOf } from "@/data/assess/carry";
import { PURPOSES } from "@/data/assess/purposes";
import { programById } from "@/data/assess/programs";
import { authorizationsOf, episodesOf, isoOf, leftText, patientById, payerNameOf, windowText, AUTH_STATUS_LABEL, AUTH_STATUS_TONE, type Patient, type PatientBook } from "@/data/patients";
import { STATUS_TONE, effectiveStatus } from "@/data/assess/status";
import { TRIAGE_LABEL, type EpisodeRef, type IntakeRecord } from "@/data/intake/types";
import type { SiteId } from "@/data/sites";
import type { Tone } from "@/data/types";
import { vaPlanOf } from "@/data/va/plans";
import { serviceById } from "@/data/va/services";
import { isISO, shortDay } from "@/lib/dates";
import { shortDate, toDate } from "@/lib/time";

/* Who a person is across the patient book and the intake records, and which treatment episodes they have. Initials and a date of birth (or an age,
   where only an age is known) say two records are the same person; nothing here is a legal match, so a person always confirms. */

export interface PersonRef {
  initials: string;
  age: number | null;
  /** yyyy-mm-dd, when it is on file. */
  dob: string | null;
  /** The id in the patient book (data/patients.ts), when the person is in it. */
  patientId: string | null;
  payerId: string | null;
  memberLast4: string | null;
  legacy?: IntakeRecord["legacy"];
}

export const normInitials = (s: string): string => s.toUpperCase().replace(/[^A-Z]/g, "");
const last4 = (v: string | undefined | null): string | null => {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : null;
};

/** "tw", "T W" or "Tavion Wright" become "T.W." (privacy mode keeps initials only). */
export function initialsFrom(raw: string): string {
  const t = raw.trim();
  const words = t.split(/[\s.]+/).filter(Boolean);
  const letters = words.length > 1 && words.every((w) => /^[A-Za-z]/.test(w)) ? words.map((w) => w[0]) : t.replace(/[^A-Za-z]/g, "").split("");
  return letters.slice(0, 3).map((c) => c.toUpperCase()).join(".") + (letters.length ? "." : "");
}

/** The age on a demo date, from a date of birth. Null when the date is not a date or is after it. */
export function ageOn(dob: string, now: number): number | null {
  if (!isISO(dob)) return null;
  const [y, m, d] = dob.split("-").map(Number);
  const t = toDate(now);
  const age = t.getFullYear() - y - (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d) ? 1 : 0);
  return age < 0 || age > 120 ? null : age;
}

export function personOfRecord(r: IntakeRecord): PersonRef {
  const dob = r.profile.dob?.value;
  return { initials: r.initials, age: r.age, dob: dob && isISO(dob) ? dob : null, patientId: r.patientId ?? null, payerId: r.payerId, memberLast4: last4(r.coverage.medicaidId?.value), legacy: r.legacy };
}
export const personOfPatient = (p: Patient): PersonRef => ({ initials: p.initials, age: p.age, dob: null, patientId: p.id, payerId: p.payerId, memberLast4: last4(p.memberMasked) });

/** Whether two records are the same person: the same patient id, or the same initials and the same date of birth (the same age where a date is missing). */
export function samePerson(a: PersonRef, b: PersonRef): boolean {
  if (a.patientId && b.patientId) return a.patientId === b.patientId;
  const ia = normInitials(a.initials);
  if (ia.length < 2 || ia !== normInitials(b.initials)) return false;
  if (a.dob && b.dob) return a.dob === b.dob;
  return a.age !== null && a.age === b.age;
}

export function bookPatientOf(p: PersonRef, book: PatientBook): Patient | undefined {
  if (p.patientId) return patientById(book, p.patientId);
  return book.patients.find((x) => samePerson(p, personOfPatient(x)));
}

/** The other intake records of the same person. */
export const intakesOf = (p: PersonRef, intakes: IntakeRecord[], excludeId?: string | null): IntakeRecord[] => intakes.filter((r) => r.id !== excludeId && samePerson(p, personOfRecord(r)));

/* ------------------------------------------------------------------ episodes */
export interface EpisodeOption {
  ref: EpisodeRef;
  title: string;
  detail: string;
  tags: { text: string; tone: Tone }[];
}
export interface CarryInfo {
  /** The intake whose signed assessments would be carried forward: the one signed most recently. */
  source: IntakeRecord | null;
  signed: number;
  lastSigned: number | null;
}
const dayText = (m: number): string => shortDay(isoOf(m), true);

export function carryInfoOf(intakes: IntakeRecord[]): CarryInfo {
  let best: CarryInfo = { source: null, signed: 0, lastSigned: null };
  for (const r of intakes) {
    const items = signedAssessmentsOf(r);
    if (!items.length) continue;
    const last = items[items.length - 1].signed.signedAt;
    if (best.lastSigned === null || last > best.lastSigned) best = { source: r, signed: items.length, lastSigned: last };
  }
  return best;
}
export const carrySentence = (c: CarryInfo): string =>
  c.source && c.lastSigned !== null
    ? `${c.signed} signed assessment${c.signed === 1 ? "" : "s"} from ${c.source.id}, last signed ${dayText(c.lastSigned)}, will be carried forward as a new version. Each value is marked for confirmation. The earlier version is kept.`
    : "A previous assessment is carried forward as a new version once it is signed. None was found for this person, so you start from a blank assessment.";

export const NO_EPISODE: EpisodeRef = { key: "none", patientId: null, episodeId: null, fromIntakeId: null, label: "No episode on file" };

/** The person's treatment episodes and earlier intakes to choose from, and what choosing one carries forward. */
export function episodeOptions(person: PersonRef, book: PatientBook, intakes: IntakeRecord[], excludeId: string | null): { options: EpisodeOption[]; carry: CarryInfo; none: EpisodeOption } {
  const patient = bookPatientOf(person, book);
  const earlier = intakesOf(person, intakes, excludeId);
  const carry = carryInfoOf(earlier);
  const patientId = patient?.id ?? person.patientId ?? earlier.find((r) => r.patientId)?.patientId ?? null;
  const options: EpisodeOption[] = [];
  if (patient) {
    for (const ep of episodesOf(book, patient.id)) {
      const a = authorizationsOf(book, ep.id)[0];
      const tags: EpisodeOption["tags"] = a ? [{ text: AUTH_STATUS_LABEL[a.status], tone: AUTH_STATUS_TONE[a.status] }] : [];
      const extra = a ? [leftText(a), windowText(a)].filter(Boolean).join(" · ") : "";
      options.push({
        ref: { key: `book:${ep.id}`, patientId: patient.id, episodeId: ep.id, fromIntakeId: carry.source?.id ?? null, label: `${ep.levelLabel}, ${ep.label.toLowerCase()}` },
        title: ep.levelLabel, detail: [ep.label, payerNameOf(ep.payerId), extra].filter(Boolean).join(" · "), tags,
      });
    }
  }
  if (person.legacy) {
    const l = person.legacy;
    options.push({
      ref: { key: `legacy:${l.authorizationId}`, patientId, episodeId: null, fromIntakeId: carry.source?.id ?? null, label: `${serviceById(l.serviceId).short} authorization ${l.authorizationId}` },
      title: `${serviceById(l.serviceId).label} authorization ${l.authorizationId}`, detail: `Ends ${shortDate(l.authEnds)}. A retiring service: the next service is chosen by clinical review.`, tags: [{ text: "Retiring service", tone: "mid" }],
    });
  }
  for (const r of earlier) {
    const signed = signedAssessmentsOf(r).length;
    const st = effectiveStatus(r);
    const purpose = r.config ? PURPOSES.find((p) => p.id === r.config?.purposeId)?.label : undefined;
    options.push({
      ref: { key: `intake:${r.id}`, patientId: r.patientId ?? patientId, episodeId: r.episodeId ?? null, fromIntakeId: r.id, label: `Intake ${r.id}` },
      title: `Intake ${r.id}${purpose ? `, ${purpose.toLowerCase()}` : ""}`,
      detail: [r.config ? programById(r.config.programId).label : serviceById(r.serviceId).short, vaPlanOf(r.payerId ?? "")?.short].filter(Boolean).join(" · "),
      tags: [{ text: TRIAGE_LABEL[st], tone: STATUS_TONE[st] }, ...(signed ? [{ text: `${signed} signed`, tone: "good" as Tone }] : [])],
    });
  }
  const none: EpisodeOption = { ref: { ...NO_EPISODE, patientId }, title: "No episode on file", detail: "Nothing is carried forward. Start from a blank assessment.", tags: [] };
  return { options, carry, none };
}

/** What the picker starts on: the only episode when there is one, "no episode" when there are none, nothing when the person must choose. */
export const defaultEpisode = (o: { options: EpisodeOption[]; none: EpisodeOption }): EpisodeRef | null => (o.options.length === 1 ? o.options[0].ref : o.options.length === 0 ? o.none.ref : null);

/* ------------------------------------------------------------------ the people New Clinical Intake offers */
export interface Candidate {
  key: string;
  person: PersonRef;
  site: SiteId;
  intakes: IntakeRecord[];
  /** Where Psyflo knows the person from, in words. */
  from: string[];
}

const squash = (s: string): string => s.toLowerCase().replace(/[.\s-]/g, "");

/** Everyone in the patient book and the intake records the viewer may see, one row per person. */
export function candidatesOf(book: PatientBook, intakes: IntakeRecord[]): Candidate[] {
  const out: Candidate[] = [];
  for (const r of intakes) {
    const p = personOfRecord(r);
    const hit = out.find((c) => samePerson(c.person, p));
    if (hit) {
      hit.intakes.push(r);
      if (!hit.person.dob && p.dob) hit.person = { ...hit.person, dob: p.dob };
      if (!hit.person.patientId && p.patientId) hit.person = { ...hit.person, patientId: p.patientId };
    } else out.push({ key: `intake:${r.id}`, person: p, site: r.site, intakes: [r], from: [] });
  }
  for (const pt of book.patients) {
    const p = personOfPatient(pt);
    const hit = out.find((c) => samePerson(c.person, p));
    if (hit) hit.person = { ...hit.person, patientId: pt.id, memberLast4: hit.person.memberLast4 ?? p.memberLast4 };
    else out.push({ key: `book:${pt.id}`, person: p, site: pt.site, intakes: [], from: [] });
  }
  for (const c of out) {
    const open = c.intakes.length;
    c.from = [c.person.patientId ? "Patient book" : "", open ? `${open} intake${open === 1 ? "" : "s"}: ${c.intakes.slice(0, 2).map((r) => r.id).join(", ")}${open > 2 ? ` and ${open - 2} more` : ""}` : ""].filter(Boolean);
  }
  return out.sort((a, b) => b.intakes.length - a.intakes.length || a.person.initials.localeCompare(b.person.initials));
}

export function searchCandidates(all: Candidate[], query: string): Candidate[] {
  const q = squash(query);
  if (!q) return all;
  return all.filter((c) => {
    const p = c.person;
    const hay = [p.initials, p.patientId ?? "", p.memberLast4 ?? "", String(p.age ?? ""), vaPlanOf(p.payerId ?? "")?.short ?? "", ...c.intakes.map((r) => r.id)].map(squash);
    return hay.some((h) => h.includes(q));
  });
}

export interface DuplicateHit {
  candidate: Candidate;
  why: string;
}
/** People already on file with the same initials and date of birth (the same age where only an age is on file). */
export function duplicatesOf(all: Candidate[], who: { initials: string; dob: string; age: number | null }): DuplicateHit[] {
  if (normInitials(who.initials).length < 2 || !isISO(who.dob)) return [];
  const probe: PersonRef = { initials: who.initials, age: who.age, dob: who.dob, patientId: null, payerId: null, memberLast4: null };
  return all.filter((c) => samePerson(probe, c.person)).map((c) => ({ candidate: c, why: c.person.dob ? "same initials and date of birth" : "same initials and age" }));
}
