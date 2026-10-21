import { useState } from "react";
import { ArrowRight, BadgeCheck, CalendarClock, Check, History, Info, Scale, type LucideIcon } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Field, IconBubble, TextArea } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { RULE_TITLE, type PayerConfig, type Rule, type RuleId } from "@/data/payerConfig";
import { useStore } from "@/store";
import { joinWords } from "./lib/checker";
import { ReasonModal } from "./ReasonModal";
import { Unapplied } from "./Unapplied";

const ICON: Record<RuleId, LucideIcon> = { windows: CalendarClock, backdating: History, noauth: BadgeCheck, p2p: Scale };

function RuleCard({ rule, onEdit }: { rule: Rule; onEdit: () => void }) {
  const ok = rule.id === "noauth";
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2.5"><IconBubble icon={ICON[rule.id]} size={34} /><span className="text-[19px]">{RULE_TITLE[rule.id]}</span></span>} right={<Button size="sm" variant="ghost" onClick={onEdit} aria-label={`Edit ${RULE_TITLE[rule.id]}`}>Edit</Button>} />
      <CardBody className="flex flex-col gap-2.5">
        {rule.lines.map((l) => (
          <div key={l} className="flex items-start gap-2.5">
            {ok ? <Check size={15} className="ico mt-1 text-good" /> : <ArrowRight size={15} className="ico mt-1 text-sage" />}
            <span className="text-sm">{l}</span>
          </div>
        ))}
        <div className="mt-1 text-xs text-muted">Used by {joinWords(rule.used.map((a) => AGENTS[a].name))} · confirmed {rule.confirmed}</div>
      </CardBody>
    </Card>
  );
}

/** Four rule cards. Edit opens the rule as text, asks for a reason, and logs the old and new lines. */
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
      <div className="grid grid-cols-2 items-start gap-4">
        {cfg.rules.map((r) => <RuleCard key={r.id} rule={r} onEdit={() => open(r)} />)}
      </div>
      <Banner tone="neutral" icon={Info}>Rules are learned from past decisions and confirmed against {name}'s published policy. New drafts use a saved edit at once. Sent requests keep what they were sent with. Click Update drafts to redraft open ones.</Banner>
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
