import { useMemo } from "react";
import { isoOf } from "@/data/patients";
import { viewerById } from "@/data/viewers";
import { impactOfRuleChange } from "@/data/workflow/impact";
import { newLibraryRule } from "@/data/workflow/rules";
import type { PayerRule, RuleGroup, RuleSource } from "@/data/workflow/types";
import { uid } from "@/lib/format";
import { useStore } from "@/store";
import { selectPayerRules as selectLibraryRules } from "@/store/workflows";
import type { VerifyInput } from "../rules/VerifyModal";

/** What Rules & Instructions needs from the rules library. The workflows store provides it; this file is the one place that knows how. */
export interface RulesApi {
  /** Every rule of the payer, archived ones included. */
  rules: PayerRule[];
  /** How many workflows use a rule. */
  usedBy: (ruleId: string) => number;
  /** The demo date, ISO. */
  today: string;
  /** A rule to start from in a group: unverified, version 0 until it is saved. */
  blank: (group: RuleGroup) => PayerRule;
  save: (next: PayerRule, reason: string) => void;
  add: (next: PayerRule, reason: string) => void;
  verify: (rule: PayerRule, v: VerifyInput) => void;
  archive: (rule: PayerRule, reason: string) => void;
}

export function useRulesApi(payerId: string): RulesApi {
  const rules = useStore((s) => selectLibraryRules(s, payerId));
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
  const clock = useStore((s) => s.clock);
  const today = isoOf(clock);
  const owner = viewerById(viewerId).name;

  // A rule counts as used by a workflow when a step names it or the step reads the payer's rule of its kind (the engine decides which); a workflow and its draft of a next version count once.
  const used = useMemo(() => {
    const state = { workflows, workflowDrafts, payerConfig, payerRulesExtra, ruleMeta, ruleHistory, customPayers, caseDrafts, requests, viewerId, siteScope };
    return new Map(rules.map((r) => [r.id, new Set(impactOfRuleChange(state, r.id).workflows.map((w) => w.id)).size]));
  }, [rules, workflows, workflowDrafts, payerConfig, payerRulesExtra, ruleMeta, ruleHistory, customPayers, caseDrafts, requests, viewerId, siteScope]);

  return {
    rules,
    usedBy: (ruleId) => used.get(ruleId) ?? 0,
    today,
    blank: (group) => newLibraryRule(payerId, group, "", owner, uid("rule"), { version: 0, effectiveFrom: today }),
    save: (next, reason) => useStore.getState().savePayerRule(next, reason),
    add: (next, reason) => useStore.getState().savePayerRule(next, reason),
    verify: (rule, v) => {
      const source: RuleSource = { kind: v.sourceUrl ? "url" : "document", label: v.sourceLabel, ...(v.sourceUrl ? { url: v.sourceUrl } : {}), ...(v.publishedOn ? { publishedOn: v.publishedOn } : {}) };
      useStore.getState().markRuleVerified(rule.id, source, v.verifiedOn);
    },
    archive: (rule, reason) => useStore.getState().savePayerRule({ ...rule, verification: "superseded", effectiveTo: today }, reason),
  };
}
