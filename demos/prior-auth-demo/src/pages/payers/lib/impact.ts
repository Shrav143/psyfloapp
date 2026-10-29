import { useMemo } from "react";
import type { PayerConfig, PendingChange } from "@/data/payerConfig";
import { impactOfRuleChange, ruleInState, type ImpactedCase, type ImpactedWorkflow } from "@/data/workflow/impact";
import { derivedId, sourceText } from "@/data/workflow/rules";
import { PROGRAMS } from "@/data/types";
import { useStore } from "@/store";
import { useOpenDrafts } from "./drafts";

/** What a payer change touches: the rule that changed with its source, the workflows that apply it, the open cases, who owns them, and the drafts applying would redraft. */
export interface ChangeImpact {
  /** "Required documents: Residential 3.5, IOP and PHP" */
  ruleLine: string;
  /** "Demo sample rules, version 2026.3, not verified." */
  sourceLine: string;
  workflows: ImpactedWorkflow[];
  /** Cases that follow one of the workflows, with the version each keeps, then the unsent drafts that are not already among them. */
  cases: (ImpactedCase & { redrafted: boolean })[];
  owners: string[];
  /** The bell already carries a notice for this change. */
  noticeInBell: boolean;
}

/** The rules a pending change is about: the document lists it adds to, or for a change with no documents the payer's submission methods. */
const changedRuleIds = (payerId: string, pending: PendingChange): string[] => {
  const programs = PROGRAMS.filter((p) => pending.docAdds.some((a) => a.program === p));
  return programs.length ? programs.map((p) => derivedId(payerId, `docs:${p}`)) : [derivedId(payerId, "reach")];
};

export function useChangeImpact(payerId: string, cfg: PayerConfig, pending: PendingChange): ChangeImpact {
  const drafts = useOpenDrafts(payerId);
  const workflows = useStore((s) => s.workflows);
  const workflowDrafts = useStore((s) => s.workflowDrafts);
  const payerConfig = useStore((s) => s.payerConfig);
  const payerRulesExtra = useStore((s) => s.payerRulesExtra);
  const ruleMeta = useStore((s) => s.ruleMeta);
  const ruleHistory = useStore((s) => s.ruleHistory);
  const customPayers = useStore((s) => s.customPayers);
  const caseDrafts = useStore((s) => s.caseDrafts);
  const requests = useStore((s) => s.requests);
  const viewerId = useStore((s) => s.viewerId);
  const siteScope = useStore((s) => s.siteScope);
  const notifications = useStore((s) => s.notifications);
  return useMemo(() => {
    const state = { workflows, workflowDrafts, payerConfig, payerRulesExtra, ruleMeta, ruleHistory, customPayers, caseDrafts, requests, viewerId, siteScope };
    const ids = changedRuleIds(payerId, pending);
    const impacts = ids.map((id) => impactOfRuleChange(state, id));
    const rules = ids.map((id) => ruleInState(state, id)).filter((r) => !!r);
    const wf = new Map<string, ImpactedWorkflow>();
    const cs = new Map<string, ImpactedCase>();
    for (const i of impacts) {
      for (const w of i.workflows) if (!wf.has(w.id)) wf.set(w.id, w);
      for (const c of i.cases) if (!cs.has(c.id)) cs.set(c.id, c);
    }
    const draftIds = new Set(drafts.map((d) => d.id));
    const cases = [...cs.values()].map((c) => ({ ...c, redrafted: draftIds.has(c.id) }));
    for (const d of drafts) if (!cs.has(d.id)) cases.push({ id: d.id, kind: "draft", patient: d.patient, workflowId: "", workflowName: "", version: 0, redrafted: true });
    const kind = rules.length > 1 ? "Required documents" : (rules[0]?.title ?? "Rule");
    return {
      ruleLine: rules.length > 1 ? `${kind}: ${rules.map((r) => r.title.replace(/^Required documents: /, "")).join(", ")}` : kind,
      sourceLine: rules[0] ? `${sourceText(rules[0])}.` : cfg.rulesVersion === "benchmark" ? "Psyflo benchmark, not a payer's policy." : `Demo sample rules, version ${cfg.rulesVersion}, not verified.`,
      workflows: [...wf.values()],
      cases,
      owners: [...new Set([...wf.values()].map((w) => w.owner))],
      noticeInBell: notifications.some((n) => n.agent === "sentinel" && !!n.to?.includes(`/payers/${payerId}`)),
    };
  }, [workflows, workflowDrafts, payerConfig, payerRulesExtra, ruleMeta, ruleHistory, customPayers, caseDrafts, requests, viewerId, siteScope, notifications, payerId, pending, cfg.rulesVersion, drafts]);
}
