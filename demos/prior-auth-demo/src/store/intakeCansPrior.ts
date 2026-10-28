import type { StateCreator } from "zustand";
import type { InstrumentInstance } from "@/data/assess/types";
import { moduleById } from "@/data/assess/modules";
import { priorContentOf } from "@/data/intake/ext/cans";
import type { FieldValue, IntakeRecord, PriorDecision } from "@/data/intake/types";
import { longDate } from "@/lib/time";
import { mirrorCans } from "@/pages/intake/cans/cansState";
import { domainForTheme, relevantItem } from "@/pages/intake/cans/template";
import type { AppState } from "./index";
import { meOf } from "./intake";
import { newCans, templateOf } from "./intakeCansWork";

/* Assessments found for a person (Existing assessment found): a person reviews one, carries it forward as a draft, starts a new one, says it cannot be
   reused (with a reason) or asks the source for an update. Reuse depends on policy, consent and clinical appropriateness, which the screen asks for;
   it never signs anything, and every carried-forward entry says it needs review. A signed assessment is never overwritten: reuse starts a new version. */

export interface IntakeCansPriorSlice {
  /** A person opened it read-only. Never replaces a stronger decision. */
  reviewPrior: (id: string, priorId: string) => void;
  /** Carries the prior's content forward into a new draft version, labeled "Carried forward from <date>, needs review". Returns false when reuse is not permitted. */
  reusePrior: (id: string, priorId: string) => boolean;
  /** Starts a blank assessment of the module; the prior stays for reference. */
  startNewFromPrior: (id: string, priorId: string) => void;
  /** The prior cannot be reused, and why. */
  markPriorNotReusable: (id: string, priorId: string, reason: string) => void;
  /** Adds a task for a person to ask the source for an updated assessment. Nothing is sent. */
  requestPriorUpdate: (id: string, priorId: string) => void;
}

export const createIntakeCansPriorSlice: StateCreator<AppState, [], [], IntakeCansPriorSlice> = (_set, get) => {
  const rec = (id: string) => get().intakes.find((r) => r.id === id);
  const me = () => meOf(get());
  const now = () => get().clock;
  const find = (id: string, priorId: string) => rec(id)?.priorAssessments?.find((p) => p.id === priorId);
  const section = (moduleId: string) => (moduleId === "cans" ? ("cans" as const) : ("assessment" as const));
  const audit = (id: string, moduleId: string, action: string, detail?: string) => get().addIntakeAudit(id, { actor: me(), action, detail, section: section(moduleId), ai: false });
  const decide = (id: string, priorId: string, action: PriorDecision["action"], reason?: string) =>
    get().patchIntake(id, (r) => ({
      ...r,
      priorDecisions: { ...(r.priorDecisions ?? {}), [priorId]: { action, by: me(), at: now(), ...(reason ? { reason } : {}) } },
      priorAssessments: (r.priorAssessments ?? []).map((p) => {
        if (p.id !== priorId) return p;
        if (action === "cannot_reuse") return { ...p, reuse: "not_permitted" as const };
        return { ...p, decision: { action, by: me(), at: now() } };
      }),
    }));

  return {
    reviewPrior: (id, priorId) => {
      const p = find(id, priorId);
      if (!p) return;
      audit(id, p.moduleId, `Reviewed the ${p.label.toLowerCase()} from ${p.provider}`, "Read-only");
      if (!rec(id)?.priorDecisions?.[priorId]) decide(id, priorId, "reviewed");
    },

    reusePrior: (id, priorId) => {
      const p = find(id, priorId);
      if (!p || p.reuse === "not_permitted") return false;
      const content = priorContentOf(p.id);
      const label = `Carried forward from ${longDate(p.date)}, needs review`;
      const at = now();
      const who = me();
      const ref = `${p.label}, ${p.provider}, ${longDate(p.date)} (carried forward)`;
      if (p.moduleId === "cans") {
        get().patchIntake(id, (r) => {
          const tpl = templateOf(get());
          let c = r.cans ?? newCans(who, at, tpl);
          if (c.status === "signed") {
            const v = c.version ?? 1;
            c = { ...c, version: v + 1, status: "in_progress", signedBy: undefined, signedAt: undefined, rolePlay: undefined, history: [...(c.history ?? []), { version: v, status: "signed", items: c.items, narrative: c.narrative, signedBy: c.signedBy, signedAt: c.signedAt, rolePlay: c.rolePlay, supersededAt: at, note: label }] };
          }
          const have = new Set(c.evidence.map((e) => e.text.toLowerCase()));
          const added = (content?.evidence ?? []).filter((e) => !have.has(e.text.toLowerCase())).map((e, i) => ({ id: `evd-prior-${priorId}-${i}`, text: e.text, theme: e.theme, source: { kind: "form" as const, ref }, itemId: c.template ? relevantItem(domainForTheme(e.theme, e.text).id, e.text)?.id : undefined }));
          const meta = Object.fromEntries(added.map((e) => [e.id, { by: who, at, from: "prior" as const }]));
          const summary = content?.summary.length ? `${label}.\n${content.summary.join("\n")}` : `${label}.`;
          return mirrorCans({
            ...r, cans: { ...c, status: "in_progress", evidence: [...c.evidence, ...added], evidenceMeta: { ...c.evidenceMeta, ...meta }, narrative: c.narrative.trim() ? c.narrative : summary, carriedFrom: { priorId, date: p.date, provider: p.provider, at, by: who } },
          }, at);
        });
      } else {
        const moduleId = p.moduleId;
        get().patchIntake(id, (r) => {
          const cur: InstrumentInstance = r.instruments?.[moduleId] ?? { moduleId, version: 1, status: "not_started", fields: {}, notes: "", evidence: [], history: [], updatedAt: at };
          const base: InstrumentInstance = cur.status === "signed"
            ? { ...cur, version: cur.version + 1, status: "in_progress", signedBy: undefined, signedAt: undefined, reviewedBy: undefined, rolePlay: undefined, history: [...cur.history, { version: cur.version, status: "superseded", fields: cur.fields, signedBy: cur.signedBy, signedAt: cur.signedAt, supersededAt: at, note: label }] }
            : cur;
          const fields = { ...base.fields };
          for (const [key, value] of Object.entries(content?.fields ?? {})) {
            if (fields[key]?.value.trim()) continue;
            const fv: FieldValue = { value, state: "needs_confirmation", source: { kind: "form", ref }, at, by: who };
            fields[key] = fv;
          }
          const inst: InstrumentInstance = { ...base, fields, notes: base.notes.trim() ? base.notes : `${label}.`, status: base.status === "not_started" ? "in_progress" : base.status, startedAt: base.startedAt ?? at, updatedAt: at };
          return { ...r, instruments: { ...(r.instruments ?? {}), [moduleId]: inst } };
        });
      }
      decide(id, priorId, "reused");
      audit(id, p.moduleId, `${label}: ${moduleById(p.moduleId).label}`, "A new draft version. Nothing was signed, and every carried-forward entry needs review.");
      return true;
    },

    startNewFromPrior: (id, priorId) => {
      const p = find(id, priorId);
      if (!p) return;
      if (p.moduleId === "cans") get().startCans(id);
      else get().startInstrument(id, p.moduleId);
      decide(id, priorId, "new_started");
      audit(id, p.moduleId, `Started a new ${moduleById(p.moduleId).label} assessment`, `The ${p.label.toLowerCase()} from ${p.provider} stays for reference.`);
    },

    markPriorNotReusable: (id, priorId, reason) => {
      const p = find(id, priorId);
      if (!p || !reason.trim()) return;
      decide(id, priorId, "cannot_reuse", reason.trim());
      audit(id, p.moduleId, `Marked the ${p.label.toLowerCase()} from ${p.provider} as not reusable`, reason.trim());
    },

    requestPriorUpdate: (id, priorId) => {
      const p = find(id, priorId);
      if (!p) return;
      get().addIntakeTask(id, {
        role: "coordination", action: `Ask ${p.provider} for an updated ${moduleById(p.moduleId).label} assessment`, status: "needs_you", section: section(p.moduleId), approval: "none",
        result: "A person sends the request (simulated). Nothing was sent.",
      });
      decide(id, priorId, "update_requested");
      audit(id, p.moduleId, `Asked for an updated assessment from ${p.provider}`, "A task waits for a person to send the request (simulated).");
      get().toast({ title: "Task added", body: `Ask ${p.provider} for an update. Nothing was sent.`, tone: "neutral" });
    },
  };
};
