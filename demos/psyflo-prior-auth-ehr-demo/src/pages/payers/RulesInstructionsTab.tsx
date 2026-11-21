import { useState } from "react";
import { Card } from "@/components/ui";
import { InfoTip } from "@/components/ui/InfoTip";
import type { PayerConfig } from "@/data/payerConfig";
import { PROGRAMS, type Program } from "@/data/types";
import { derivedKeyOf, isDocumentListRule } from "@/data/workflow/rules";
import { RULE_GROUP_LABEL, type PayerRule, type RuleGroup } from "@/data/workflow/types";
import { useRulesApi } from "./lib/rulesApi";
import { savedWhere } from "./lib/studio";
import { DocumentsGroup } from "./rules/DocumentsGroup";
import { PromptPreview } from "./rules/PromptPreview";
import { groupSummary, RuleGroupSection, type RuleActions } from "./rules/RuleGroup";
import { RuleDrawer } from "./rules/RuleDrawer";
import { GROUP_NOUN } from "./rules/ruleText";
import { VerifyModal } from "./rules/VerifyModal";
import { ReasonModal } from "./ReasonModal";

const GROUPS = Object.keys(RULE_GROUP_LABEL) as RuleGroup[];

/** Rules & Instructions: eight groups on one calm page, each closed on a one-line summary and a count. Rules are stored once, with where they come from and whether a person verified them;
    workflows point at them. Everything is a demo sample and says Unverified until a person marks it verified with a source. */
export function RulesInstructionsTab({ payerId, name, cfg, openGroup, openRule }: { payerId: string; name: string; cfg: PayerConfig; openGroup: RuleGroup | null; openRule: string | null }) {
  const api = useRulesApi(payerId);
  const [editing, setEditing] = useState<{ rule: PayerRule; group: RuleGroup } | null>(null);
  const [verifying, setVerifying] = useState<PayerRule | null>(null);
  const [archiving, setArchiving] = useState<PayerRule | null>(null);

  const actions: RuleActions = {
    usedBy: api.usedBy,
    onEdit: (rule) => setEditing({ rule, group: rule.group }),
    onVerify: setVerifying,
    onArchive: setArchiving,
    onAdd: (group) => setEditing({ rule: api.blank(group), group }),
  };
  // The document lists of each level of care are shown as lists (with the chart checker), so their rule records stay out of the rows.
  const shown = api.rules.filter((r) => !isDocumentListRule(r));
  const inGroup = (g: RuleGroup) => shown.filter((r) => r.group === g);
  // A link can name one rule (the builder's rule steps do): its group opens and the rule is open and in view. A document list has no row of its own, so that opens its level of care in the list.
  const asked = openRule ? api.rules.find((r) => r.id === openRule) : undefined;
  const startGroup = openGroup ?? asked?.group ?? null;
  const listed = asked && !isDocumentListRule(asked) ? asked.id : null;
  const startProgram = asked && isDocumentListRule(asked) ? (derivedKeyOf(asked.id).slice(5) as Program) : undefined;
  const live = shown.filter((r) => r.verification !== "superseded");
  const unverified = live.filter((r) => r.verification === "unverified").length;
  const docCount = PROGRAMS.reduce((n, p) => n + cfg.docs[p].length, 0);
  const wide = inGroup("agent_instructions").filter((r) => r.verification !== "superseded" && r.instructions);

  const summary = (g: RuleGroup): string => {
    if (g === "clinical_documentation") return `${docCount} documents across ${PROGRAMS.filter((p) => cfg.docs[p].length).length} levels of care, and the chart checker. ${groupSummary(inGroup(g), "rule")}`;
    if (g === "submission_methods") return `Reached by ${cfg.reachedBy.toLowerCase()}, ${cfg.facts.backup}. ${groupSummary(inGroup(g), "rule")}`;
    if (g === "agent_instructions") return `Caller script saved ${cfg.caller.confirmed}. ${groupSummary(inGroup(g), GROUP_NOUN[g])}`;
    return groupSummary(inGroup(g), GROUP_NOUN[g]);
  };
  const count = (g: RuleGroup): number => {
    const n = inGroup(g).filter((r) => r.verification !== "superseded").length;
    return g === "clinical_documentation" ? n + PROGRAMS.filter((p) => cfg.docs[p].length).length : n;
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="px-6 py-4">
        <h2 className="font-serif text-[18px] leading-tight font-semibold tracking-tight">
          Rules the agents and workflows follow{" "}
          <InfoTip label="About these rules">
            Each rule is stored once, with its source and whether a person verified it, and workflows point at it. All of {name}'s seeded rules are demo samples, so they say Unverified. Edit saves a new version with your reason in the edit log. New drafts use a saved edit at once; sent requests keep what they were sent with.
          </InfoTip>
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          {live.length} {live.length === 1 ? "rule" : "rules"}{unverified ? `, ${unverified} unverified` : ""}. {savedWhere()} These are demo rules, not verified against {name}'s current policy.
        </p>
      </Card>
      {GROUPS.map((g) => (
        <RuleGroupSection
          key={g}
          group={g}
          open={startGroup === g}
          openRule={listed}
          summary={summary(g)}
          count={count(g)}
          rules={inGroup(g)}
          actions={actions}
         
          before={g === "clinical_documentation" ? <DocumentsGroup id={payerId} name={name} cfg={cfg} startProgram={startProgram} /> : undefined}
          after={g === "agent_instructions" ? <PromptPreview name={name} instructions={wide.map((r) => ({ label: r.title, text: r.instructions ?? "" }))} /> : undefined}
        />
      ))}
      {editing ? (
        <RuleDrawer
          rule={editing.rule}
          group={editing.group}
          onClose={() => setEditing(null)}
          onSave={(next, reason) => {
            if (editing.rule.version === 0) api.add(next, reason);
            else api.save(next, reason);
            setEditing(null);
          }}
        />
      ) : null}
      {verifying ? <VerifyModal rule={verifying} today={api.today} onClose={() => setVerifying(null)} onVerify={(v) => { api.verify(verifying, v); setVerifying(null); }} /> : null}
      {archiving ? (
        <ReasonModal title={`Archive ${archiving.title}?`} subtitle="It is marked Superseded and stops applying. Workflows that point at it will show a warning until you pick another rule. It stays in the edit audit." saveLabel="Archive and log the edit" onClose={() => setArchiving(null)} onSave={(reason) => { api.archive(archiving, reason); setArchiving(null); }} />
      ) : null}
    </div>
  );
}
