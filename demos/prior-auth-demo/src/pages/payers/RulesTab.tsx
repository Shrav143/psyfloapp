import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button, Card, Disclosure, Field, TextArea } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { RULE_TITLE, type PayerConfig, type Rule } from "@/data/payerConfig";
import { useStore } from "@/store";
import { InfoTip } from "@/components/ui/InfoTip";
import { joinWords } from "./lib/checker";
import { ReasonModal } from "./ReasonModal";
import { Unapplied } from "./Unapplied";

/** One line to read when the rule is closed: its first line, and how many more follow. */
const summaryOf = (r: Rule): string => (r.lines.length > 1 ? `${r.lines[0]}, and ${r.lines.length - 1} more` : (r.lines[0] ?? "No lines yet"));

function RuleBody({ rule, onEdit }: { rule: Rule; onEdit: () => void }) {
  const ok = rule.id === "noauth";
  return (
    <div className="flex flex-col gap-2.5 px-6 py-5">
      {rule.lines.map((l) => (
        <div key={l} className="flex items-start gap-2.5">
          {ok ? <Check size={15} className="ico mt-1 text-good" /> : <ArrowRight size={15} className="ico mt-1 text-sage" />}
          <span className="text-sm">{l}</span>
        </div>
      ))}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="text-xs text-muted">
          Used by {joinWords(rule.used.map((a) => AGENTS[a].name))} · saved {rule.confirmed}
          {rule.source ? ` · Source: ${rule.source}` : ""}
        </div>
        <Button size="sm" variant="ghost" onClick={onEdit} aria-label={`Edit ${RULE_TITLE[rule.id]}`}>Edit</Button>
      </div>
    </div>
  );
}

/** Four rules, each closed on its first line. Edit opens the rule as text, asks for a reason, and logs the old and new lines. */
export function RulesTab({ id, name, cfg }: { id: string; name: string; cfg: PayerConfig }) {
  const [editing, setEditing] = useState<Rule | null>(null);
  const [text, setText] = useState("");
  const open = (r: Rule) => {
    setText(r.lines.join("\n"));
    setEditing(r);
  };
  return (
    <div className="flex flex-col gap-4">
      <Unapplied id={id} name={name} cfg={cfg} />
      <Card className="overflow-hidden">
        <div className="px-6 pt-5 pb-[18px]">
          <h3 className="font-serif text-[21px] leading-tight font-semibold tracking-tight">
            Rules the agents follow{" "}
            <InfoTip label="About these rules">
              Open a rule to read it or edit it. New drafts use a saved edit at once. Sent requests keep what they were sent with. Click Update drafts to redraft open ones. These are demo rules, not verified against {name}'s current policy.
            </InfoTip>
          </h3>
          <p className="mt-[3px] text-[13.5px] text-muted">Four rules. Each shows its first line.</p>
        </div>
        {cfg.rules.map((r) => (
          <Disclosure key={r.id} variant="plain" title={RULE_TITLE[r.id]} summary={summaryOf(r)} right={<span className="text-xs text-muted">{r.lines.length} {r.lines.length === 1 ? "line" : "lines"}</span>}>
            <RuleBody rule={r} onEdit={() => open(r)} />
          </Disclosure>
        ))}
      </Card>
      {editing ? (
        <ReasonModal title={`Edit ${RULE_TITLE[editing.id].toLowerCase()}`} subtitle="One rule per line. New drafts use this at once. Sent requests keep what they were sent with. Click Update drafts to redraft open ones." onClose={() => setEditing(null)} onSave={(reason) => {
          const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
          if (!lines.length || lines.join("\n") === editing.lines.join("\n")) useStore.getState().toast({ title: "Nothing changed", body: "Edit at least one line, and keep at least one rule.", tone: "neutral" });
          else useStore.getState().saveRule(id, editing.id, lines, reason);
          setEditing(null);
        }}>
          <Field label="Rules"><TextArea aria-label="Rules, one per line" value={text} onChange={(e) => setText(e.target.value)} className="min-h-[150px]" /></Field>
        </ReasonModal>
      ) : null}
    </div>
  );
}
