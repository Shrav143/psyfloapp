/* The contracts of the extension demo. Everything the demo shows comes from a ClinicConfig; the screens never mention a clinic by name.
   Rule for every string in a config: it is either (a) text that was in a stored record, (b) the clinic's own rule or wording, (c) a label the EHR itself shows,
   or (d) a sentence Psyflo composes from the clinician's own words (`Fix.kind === "ask"`). Psyflo never writes clinical judgement. Sample data is labelled Simulated. */

export type ClinicId = "harvest" | "cccsn";

/** The five document types the extension works on. A clinic may name them differently (`FormSpec.title`) and may have none of a kind. */
export type DocKind = "dpn" | "admission" | "intake" | "assessment" | "sra";

export type Severity = "low" | "medium" | "severe";

/** How a field looks and behaves in the EHR. Psyflo reads all of them and can type into all of them. */
export type FieldKind = "text" | "textarea" | "date" | "select" | "checks" | "yesno";

/** text, textarea, date, select, yesno hold a string. checks holds the ticked options. */
export type Val = string | string[];

export interface FieldSpec {
  key: string;
  /** The label Lauris shows. */
  label: string;
  kind: FieldKind;
  /** select and checks: the options in the order Lauris shows them. yesno needs none (Yes, No). */
  options?: string[];
  /** The small helper line Lauris prints under the label. */
  hint?: string;
  /** textarea height in rows. */
  rows?: number;
  /** true: clinical judgement or a signature. Psyflo reads it and may flag it, but never drafts or types it. Shown with a lock. */
  lock?: boolean;
}

export interface SectionSpec {
  id: string;
  title: string;
  fields: FieldSpec[];
}

export interface FormSpec {
  kind: DocKind;
  /** Title in Lauris, e.g. "Daily Progress Note – TDT". */
  title: string;
  /** Short name the extension uses in its own screens, e.g. "Daily progress note". */
  short: string;
  /** Name of the item in Lauris's session list, e.g. "Daily Progress Note – TDT". */
  laurisName: string;
  sections: SectionSpec[];
}

/** A stored record in the chart. A fix of kind "text" quotes one of these; nothing else may be typed that the clinician did not write. */
export interface ChartRecord {
  id: string;
  /** "ISP 2.0 · Goal 1", "Daily note Oct 27". */
  label: string;
  /** ISO date. */
  date: string;
  kind: "plan" | "note" | "assessment" | "call" | "school" | "auth" | "referral";
  /** The words of the record. */
  text: string;
}

export interface Consumer {
  /** The Lauris consumer number. */
  id: string;
  /** Initials only. */
  ini: string;
  age: number;
  /** Program or group name as Lauris lists it. */
  program: string;
  /** School, site or location. */
  site: string;
  /** PayerProfile.id */
  payer: string;
  clinician: string;
  /** One line in the roster. */
  note?: string;
  /** Units left on the current authorization; null = none on file. */
  units: { left: number; ends: string } | null;
  /** Diagnosis as the chart has it, shown in the Lauris header. */
  dx?: string;
  chart: ChartRecord[];
  /** Ids of the DocSeeds this consumer has in the demo, in the order Lauris lists them. The rest of the roster has none. */
  docs: string[];
}

/** One document as Lauris has it when the demo opens. */
export interface DocSeed {
  id: string;
  kind: DocKind;
  consumerId: string;
  /** ISO date of service or of the form. */
  date: string;
  /** Shown in the consumer's document list, e.g. "Daily Progress Note – TDT · 10/29/2026". Defaults to FormSpec.title + date. */
  title?: string;
  /** What is already in Lauris. Keys not listed are empty. */
  values: Record<string, Val>;
  /** Keys Lauris filled from the record itself. Shown with the same green as saved text. */
  prefilled?: string[];
  /** "saved" documents show a Saved tag. A new document is "draft". */
  status: "draft" | "saved";
  /** Who wrote what is there, when it is not empty (shown under the title). */
  author?: string;
}

/* ------------------------------ Scribe ------------------------------ */

export interface SessionLine {
  /** Clock in the recording, "0:18". */
  t: string;
  /** Who is speaking: "Clinician", "Guardian", "Staff", "Patient"… */
  who: string;
  text: string;
}

export interface DraftField {
  /** What Psyflo proposes. It restates only what was said or what the chart already says. */
  value: Val;
  /** "session": said in the recording. "chart": quoted from a stored record. "none": nothing was said; the card is empty and the clinician decides. */
  from: "session" | "chart" | "none";
  /** Indexes into ScribeScenario.lines that back the value (from "session"). */
  lines?: number[];
  /** ChartRecord.id (from "chart"). */
  chart?: string;
  /** A short note on the card, e.g. "Nothing was said about continuing needs." */
  note?: string;
}

export interface ScribeScenario {
  /** The document this scenario fills. */
  docId: string;
  /** Live session (a conversation) or dictation (the clinician speaks the note). */
  mode: "live" | "dictation";
  /** The sentence the clinician reads to ask for consent. Ignored for dictation. */
  consentScript?: string;
  /** Whom Psyflo is listening to, shown on the start screen. */
  who: string;
  lines: SessionLine[];
  /** "9:42" shown as the length of the finished recording. */
  length: string;
  /** Keyed by FieldSpec.key. A key with no entry is treated as { from: "none" }. Locked fields are never drafted. */
  draft: Record<string, DraftField>;
  /** The chart records Psyflo reads before writing (the "Chart summary"). ChartRecord.ids. */
  context: string[];
}

/* --------------------------- Scan & Enhance --------------------------- */

/** How Psyflo proposes to fix a finding. Psyflo types it into the EHR field; the clinician checks it and saves in the EHR. */
export type Fix =
  /** A sentence already in a stored record. `text` must be a quotation of `source` (or a count taken from it). */
  | { kind: "text"; text: string; source: string; mode: "replace" | "append" }
  /** The clinician's own words go in a box; `frame` puts them into a fixed sentence. */
  | { kind: "ask"; prompt: string; placeholder?: string; frame: (answer: string) => string; mode: "replace" | "append"; source?: string }
  /** The clinician picks one option and Psyflo sets the field to it (a dropdown, Yes/No or checkboxes). Psyflo never preselects. */
  | { kind: "choose"; prompt: string; options: string[]; source?: string };

export interface RawFinding {
  severity: Severity;
  fieldKey: string;
  /** One line: what is wrong. */
  title: string;
  /** Why it matters and which rule says so, in plain words. */
  why: string;
  /** Whose rule: "Harvest standard · DPN", "Anthem criteria · continued stay". */
  rule: string;
  /** null = Psyflo can name the gap but cannot fix it (nothing in the chart, nothing to ask). */
  fix: Fix | null;
}

export interface Finding extends RawFinding {
  /** `${docId}:${checkId}:${n}` */
  id: string;
  docId: string;
  checkId: string;
}

export interface ScanCtx {
  consumer: Consumer;
  clinic: ClinicConfig;
  spec: FormSpec;
  doc: { id: string; kind: DocKind; values: Record<string, Val> };
  chart: (id: string) => ChartRecord | undefined;
}

/** One audit check. `run` returns nothing when the document passes. */
export interface Check {
  id: string;
  /** "Goal is linked to the plan". */
  title: string;
  /** The audit module it belongs to, as the Clinic profile lists it: "Golden thread", "Medical necessity", "Wording"… */
  module: string;
  docs: DocKind[];
  severity: Severity;
  run: (ctx: ScanCtx) => RawFinding[];
}

/* ------------------------------ Profile ------------------------------ */

export interface PayerProfile {
  id: string;
  name: string;
  channel: string;
  /** What this payer asks for, in one or two sentences, as the clinic wrote it down. */
  criteria: string;
}

export interface ClinicProfile {
  name: string;
  /** "Therapeutic day treatment in schools · Virginia". */
  sub: string;
  /** Short name used in tabs and chips, "Harvest". */
  short: string;
  programs: { name: string; code: string; sites: string[]; note?: string }[];
  payers: PayerProfile[];
  accreditations: string[];
  /** The clinic's wording rules, with an example each where it helps. */
  verbiage: { rule: string; example?: string }[];
  /** What a good document looks like here, per kind. */
  documentRules: { doc: DocKind; rule: string }[];
  retention: { transcripts: string; documents: string };
  /** The defaults of Check before save. */
  checks: { pauseAt: Severity | "never"; onSave: boolean };
}

/* ------------------------------ History ------------------------------ */

export interface HistoryItem {
  id: string;
  type: "session" | "document";
  doc: DocKind;
  consumerId: string;
  /** ISO date. */
  date: string;
  by: string;
  /** "Typed into Lauris and saved", "Scanned: 3 open", … */
  status: string;
  /** Present when the item can be opened in Lauris. */
  docId?: string;
  /** Sessions: clock time of the recording ("1:42 PM"), its length ("12m") and whether it was a live session or a dictation. An empty consumerId means no patient was assigned. */
  time?: string;
  length?: string;
  mode?: "live" | "dictation";
}

/* ------------------------------- Config ------------------------------- */

export interface ClinicConfig {
  id: ClinicId;
  profile: ClinicProfile;
  /** Today in the demo, ISO. */
  today: string;
  /** The signed-in clinician. */
  user: { name: string; short: string; role: string };
  /** One form per kind the clinic uses. */
  forms: Partial<Record<DocKind, FormSpec>>;
  consumers: Consumer[];
  docs: DocSeed[];
  scribe: ScribeScenario[];
  checks: Check[];
  history: HistoryItem[];
}

/* ---------------------------- Runtime state ---------------------------- */

export type FindingStatus = "open" | "added" | "dismissed";

export interface DocState {
  values: Record<string, Val>;
  /** Keys Psyflo typed into and nobody has saved yet (yellow). */
  typed: Record<string, true>;
  /** The sentences Psyflo appended to a text box and nobody has saved (marked inside the box). */
  appended: Record<string, string[]>;
  /** Keys that came from the record or were saved (green). */
  green: Record<string, true>;
  status: "draft" | "saved";
  savedAt?: string;
}
