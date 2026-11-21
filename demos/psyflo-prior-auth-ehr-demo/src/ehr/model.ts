import { useMemo } from "react";
import type { AgentKey } from "@/data/types";
import { PROGRAM_LABEL } from "@/data/types";
import { detailForQueueItem, resolveCase, type CaseDetail, type Rec } from "@/data/caseDetail";
import { withFocus } from "@/data/caseDetailFocus";
import { EMPTY_WORK, canSend, currentChance, draftView, groupRecs, plainText, projectedChance, versionViews, type CaseWork, type RecGroups } from "@/data/caseModel";
import { QUEUE_ITEMS, type Phase, type QueueItem } from "@/data/queue";
import { payerById } from "@/data/seed";
import { siteName, siteOf } from "@/data/sites";
import { rowOf, type DenialRow } from "@/pages/denials/lib/dashboard";
import type { Finding } from "@/pages/denials/lib/analysis";
import { useDenialView, type DenialView } from "@/pages/denials/lib/useDenialView";
import { dueText } from "@/pages/authorizations/queueLogic";
import { isClosed } from "@/pages/denials/lib/format";
import { siteOfDenial } from "@/data/denials";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";
import type { ApplyArgs } from "@/store/queue";

/* The EHR round: the prior authorization is edited in the clinic's EHR (Lauris), so the recommendations are typed into Lauris's own form by the Psyflo extension.
   Everything here is shared by the two screens that show it: the mock Lauris (src/ehr/lauris) and the extension panel docked in it (src/ehr/panel).
   Nothing in this file invents clinical text. A recommendation types the sentence the case's own model already holds for it (`rec.add.text`), built from a stored
   record or from the words the person typed; a denial correction types the chart excerpt the denial's finding is backed by. */

/** What Lauris keeps for one case's authorization form, besides the text of the sections (those are read from the case, below). */
export interface EhrFormState {
  /** Ids typed into the form by the extension and not yet saved in Lauris. Recommendation ids, or `fix:<finding id>` for a denial correction. They show yellow. */
  unsaved: string[];
  /** Everything the extension ever typed into this form (same id forms). The platform marks these "Added in Lauris". */
  viaEhr: string[];
  /** A person saved the form in Lauris since the extension last typed into it. */
  saved: boolean;
  savedAt?: number;
  /** A section's text exactly as a person typed it in Lauris. It replaces the generated text for that section. */
  overrides: Record<string, string>;
}
export const EMPTY_EHR_FORM: EhrFormState = { unsaved: [], viaEhr: [], saved: false, overrides: {} };
export const fixKey = (findingId: string): string => `fix:${findingId}`;

/** The extra field a denied authorization has, where the corrections for the resubmission go. */
export const RESUBMIT_FIELD = "resubmit";
export const RESUBMIT_LABEL = "Corrections for resubmission";

/** The pages of the mock Lauris. The extension panel is told which one is open. */
export type LaurisPage = { kind: "consumers" } | { kind: "authorizations" } | { kind: "form"; caseId: string };

/** The Lauris consumer number for a case: four digits, the same every time. */
export function consumerNo(caseId: string): string {
  const n = parseInt(caseId.replace(/\D/g, ""), 10) || 0;
  return String(4000 + (n % 1000));
}

export interface ConsumerView {
  no: string;
  caseId: string;
  initials: string;
  age: number;
  payerName: string;
  payerShort: string;
  program: string;
  level: string;
  site: string;
}
export function consumerOf(detail: CaseDetail): ConsumerView {
  const payer = payerById(detail.payerId);
  return { no: consumerNo(detail.id), caseId: detail.id, initials: detail.initials, age: detail.age, payerName: payer.name, payerShort: payer.shortName, program: PROGRAM_LABEL[detail.program], level: detail.levelLabel, site: siteName(siteOf(detail.id)) };
}

/** green = already in Lauris, yellow = the extension typed it and a person should check it, empty = nothing there yet. */
export type FieldState = "empty" | "lauris" | "typed";
export interface FieldAddition { key: string; text: string; unsaved: boolean; agent?: AgentKey }
export interface FieldView {
  id: string;
  label: string;
  /** What the box holds now: the section's text, then each sentence the extension typed (or the text a person typed over it). */
  text: string;
  state: FieldState;
  /** The sentences the extension typed, in order. The page may highlight them inside the text. */
  additions: FieldAddition[];
  overridden: boolean;
  /** Only the denial correction field. */
  correction?: boolean;
}

export interface FixView {
  finding: Finding;
  /** The line the extension types for it: the source and what the chart says there. */
  line: string;
  /** Typed into the Lauris form (by the extension). */
  typed: boolean;
  unsaved: boolean;
  /** Already added to the appeal letter's evidence in Psyflo. */
  inEvidence: boolean;
}
export const fixLine = (f: Finding): string => `${f.source}: ${f.excerpt}`;

/** The text boxes of a case's Lauris authorization form: the case's draft sections (the same four on every case), plus the corrections box on a denied case. */
export function formFields(detail: CaseDetail, work: CaseWork, form: EhrFormState, fixes: FixView[] = []): FieldView[] {
  const fields: FieldView[] = draftView(detail, work).map((s) => {
    const additions: FieldAddition[] = s.added.map((a) => ({ key: a.recId, text: a.text, unsaved: form.unsaved.includes(a.recId), agent: detail.recs.find((r) => r.id === a.recId)?.agent }));
    const generated = [s.text, ...s.added.map((a) => a.text)].filter(Boolean).join(" ");
    const over = form.overrides[s.id];
    const text = over ?? generated;
    return { id: s.id, label: s.title, text, additions, overridden: over !== undefined, state: additions.some((a) => a.unsaved) ? "typed" : text.trim() ? "lauris" : "empty" };
  });
  const typedFixes = fixes.filter((f) => f.typed);
  if (fixes.length) {
    const additions: FieldAddition[] = typedFixes.map((f) => ({ key: fixKey(f.finding.id), text: f.line, unsaved: f.unsaved }));
    const over = form.overrides[RESUBMIT_FIELD];
    const text = over ?? additions.map((a) => a.text).join("\n");
    fields.push({ id: RESUBMIT_FIELD, label: RESUBMIT_LABEL, text, additions, overridden: over !== undefined, correction: true, state: additions.some((a) => a.unsaved) ? "typed" : text.trim() ? "lauris" : "empty" });
  }
  return fields;
}

export interface EhrCase {
  detail: CaseDetail;
  work: CaseWork;
  /** Where this case's work and Lauris form are kept in the store (the request id, as on the case page). */
  key: string;
  form: EhrFormState;
  consumer: ConsumerView;
  fields: FieldView[];
  groups: RecGroups;
  /** Approval chance now, and with every open recommendation. */
  chance: number;
  projected: number;
  /** "Notice due in 5 h", or null when the request has no clock. */
  due: string | null;
  /** Set when the case has a denial: its analysis, and the corrections its findings suggest. */
  denial: DenialView | null;
  fixes: FixView[];
  /** Recommendations still open, and the form's yellow (unsaved) entries. */
  openCount: number;
  unsavedCount: number;
}

/** Everything the Lauris form page and the extension panel need about one case, derived the same way the case page derives it. Null when there is no such case. */
export function useEhrCase(id: string | undefined): EhrCase | null {
  const requests = useStore((s) => s.requests);
  const queueCases = useStore((s) => s.queueCases);
  const forms = useStore((s) => s.ehr.forms);
  const clock = useStore((s) => s.clock);
  const base = useMemo(() => (id ? resolveCase(id, requests) : null), [id, requests]);
  const stored = base ? queueCases[base.requestId] : undefined;
  const work = stored ?? EMPTY_WORK;
  const detail = useMemo(() => (base ? withFocus(base, work) : null), [base, work]);
  const denial = useDenialView(detail?.denialId) ?? null;
  const form = (base && forms[base.requestId]) || EMPTY_EHR_FORM;
  return useMemo(() => {
    if (!detail) return null;
    const fixes: FixView[] = denial
      ? denial.analysis.findings.map((f) => ({ finding: f, line: fixLine(f), typed: form.viaEhr.includes(fixKey(f.id)), unsaved: form.unsaved.includes(fixKey(f.id)), inEvidence: denial.work.fixes.includes(f.id) }))
      : [];
    const groups = groupRecs(detail, work);
    return {
      detail, work, key: detail.requestId, form, consumer: consumerOf(detail), fields: formFields(detail, work, form, fixes), groups,
      chance: currentChance(detail, work), projected: projectedChance(detail, work),
      due: detail.dueAt === undefined || detail.chip ? null : dueText(detail.dueVerb, detail.dueAt, clock),
      denial, fixes, openCount: groups.open.length, unsavedCount: form.unsaved.length,
    };
  }, [detail, work, form, denial, clock]);
}

/** The arguments for typing these recommendations into the form: the same numbers "Apply selected" computes on the case page. */
export function applyArgsFor(detail: CaseDetail, work: CaseWork, key: string, recs: Rec[]): ApplyArgs {
  const next: CaseWork = { ...work, applied: [...work.applied, ...recs.map((r) => r.id)] };
  const after = currentChance(detail, next);
  return {
    caseId: key, requestId: detail.requestId, syncChance: detail.fromQueue, recs: recs.map((r) => ({ id: r.id, title: r.title, agent: r.agent })), chance: after,
    liftLeft: projectedChance(detail, next) - after, ready: canSend(detail, next), versionN: versionViews(detail, work).length + 1, snapshot: plainText(draftView(detail, next)),
  };
}
/** The recommendations that need the person's own words first and have none yet. Psyflo never writes those for them. */
export const missingInputs = (recs: Rec[], work: CaseWork): Rec[] => recs.filter((r) => r.input && !(work.inputs[r.id] ?? "").trim());
/** The sentence a recommendation types into its section, from the stored model and the person's answer. */
export const sentenceOf = (rec: Rec, work: CaseWork): string => rec.add?.text(work.inputs[rec.id] ?? "") ?? "";
/** Where it goes: the section's name in the case's draft. */
export const targetOf = (detail: CaseDetail, rec: Rec): string => detail.draft.find((s) => s.id === rec.add?.section)?.title ?? "Authorization form";

/** A row of the extension's home: one open authorization with suggestions waiting, soonest first. */
export interface EditRow { item: QueueItem; caseId: string; no: string; open: number; points: number; due: string; phase: Phase; needsInput: boolean }
/** The authorizations at the sites in view that are still being prepared and have recommendations open, in the order the queue orders them (soonest due first). */
export function useEditQueue(): EditRow[] {
  const queueCases = useStore((s) => s.queueCases);
  const clock = useStore((s) => s.clock);
  const scope = useScope();
  return useMemo(() => {
    const rows: EditRow[] = [];
    for (const item of scope.filter(QUEUE_ITEMS, (i) => i.id)) {
      if (item.phase !== "preparing") continue;
      const detail = detailForQueueItem(item);
      const work = queueCases[detail.requestId] ?? EMPTY_WORK;
      const g = groupRecs(detail, work);
      if (!g.open.length) continue;
      rows.push({ item, caseId: item.id, no: consumerNo(item.id), open: g.open.length, points: projectedChance(detail, work) - currentChance(detail, work), due: dueText(item.dueVerb, item.dueAt, clock), phase: item.phase, needsInput: g.open.some((r) => !!r.input && !(work.inputs[r.id] ?? "").trim()) });
    }
    return rows.sort((a, b) => a.item.dueAt - b.item.dueAt);
  }, [queueCases, clock, scope]);
}

/** A row of the extension's home: one open denial whose authorization can be corrected in Lauris. */
export interface DenialEditRow { row: DenialRow; caseId: string; no: string; /** Corrections already typed into the Lauris form. */ typed: number }
export function useDenialEdits(): DenialEditRow[] {
  const requests = useStore((s) => s.requests);
  const meta = useStore((s) => s.denialMeta);
  const work = useStore((s) => s.denialWork);
  const forms = useStore((s) => s.ehr.forms);
  const clock = useStore((s) => s.clock);
  const scope = useScope();
  return useMemo(
    () =>
      requests
        .filter((r) => r.track === "denial" && r.stage === "appeal" && !isClosed(work[r.id]) && scope.sites.includes(siteOfDenial(meta[r.id], r.caseId)))
        .map((r) => {
          const row = rowOf(r, meta[r.id], work[r.id], clock);
          return { row, caseId: r.caseId, no: consumerNo(r.caseId), typed: forms[r.id]?.viaEhr.filter((k) => k.startsWith("fix:")).length ?? 0 };
        })
        .sort((a, b) => (a.row.deadline?.left ?? Infinity) - (b.row.deadline?.left ?? Infinity)),
    [requests, meta, work, forms, clock, scope],
  );
}
