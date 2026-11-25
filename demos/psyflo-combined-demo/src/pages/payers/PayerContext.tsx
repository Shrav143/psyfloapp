import { useState } from "react";
import { ChevronDown, Send, Sparkles, Trash2 } from "lucide-react";
import { AgentBadge, Button, Card, Switch } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import type { AgentKey } from "@/data/types";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/time";
import { useStore } from "@/store";

/* Context for the agents: one box, written like a message to a new colleague. This is where a clinic tells Psyflo what it does not already know about a payer
   (a process, a habit, a quirk). The agents read the active notes with the payer's rules, so the next request follows them. No workflow to build. */

/** The agents that act on a payer's behalf and so read what a clinic knows about it. */
const READERS: AgentKey[] = ["caller", "navigator", "packet", "scribe", "advocate", "verify"];

const IDEAS = [
  "They lose faxes. Call the next day to confirm they have it.",
  "Attach the drug screen result from the assessment day.",
  "Answer information requests the same day.",
  "Peer-to-peer must be booked as soon as the letter arrives.",
];

export function PayerContext({ payerId, name }: { payerId: string; name: string }) {
  const notes = useStore((s) => s.payerNotes).filter((n) => n.payerId === payerId);
  const add = useStore((s) => s.addPayerNote);
  const toggle = useStore((s) => s.togglePayerNote);
  const remove = useStore((s) => s.removePayerNote);
  const [text, setText] = useState("");
  const [who, setWho] = useState<AgentKey[]>([]);
  const [seen, setSeen] = useState(false);
  const active = notes.filter((n) => n.active);

  const submit = () => {
    if (!text.trim()) return;
    add(payerId, text, who.length ? who : "all");
    setText("");
    setWho([]);
  };
  const flip = (a: AgentKey) => setWho((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));

  return (
    <Card className="flex flex-col gap-4 px-6 py-5" data-testid="payer-context">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sage-bg text-forest"><Sparkles size={20} className="ico" aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 className="font-serif text-[18px] leading-tight font-semibold tracking-tight">Tell the agents about {name}</h2>
          <p className="mt-0.5 text-[13px] text-muted">Anything Psyflo does not know yet: a process, a habit, a rule of thumb. Write it the way you would tell a new colleague.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <textarea
          id="payer-context-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} data-testid="payer-context-input"
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
          placeholder={`e.g. ${name} wants the discharge plan named in the first request.`}
          aria-label={`Context for the agents about ${name}`}
          className="w-full resize-y rounded-xl border border-field bg-white px-3.5 py-3 text-[14px] leading-snug placeholder:text-faint focus-visible:border-forest"
        />
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Ideas">
          {IDEAS.map((i) => (
            <button key={i} type="button" onClick={() => setText((t) => (t.trim() ? `${t.trim()} ${i}` : i))} className="rounded-full border border-edge bg-tile px-3 py-1 text-[12px] text-ink2 hover:border-field hover:bg-white">{i}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Who reads it">
            <button type="button" aria-pressed={who.length === 0} onClick={() => setWho([])} className={cn("h-8 rounded-full border px-3 text-[12px] font-semibold", who.length === 0 ? "border-forest bg-sage-bg text-forest" : "border-edge bg-white text-ink2")}>All agents</button>
            {READERS.map((a) => {
              const on = who.includes(a);
              const I = AGENTS[a].icon;
              return (
                <button key={a} type="button" aria-pressed={on} onClick={() => flip(a)} title={`${AGENTS[a].name}: ${AGENTS[a].role}`} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium", on ? "border-forest bg-sage-bg text-forest" : "border-edge bg-white text-ink2 hover:bg-tile")}>
                  <I size={14} className="ico" aria-hidden="true" />{AGENTS[a].name}
                </button>
              );
            })}
          </div>
          <Button variant="primary" icon={Send} disabled={!text.trim()} onClick={submit} data-testid="payer-context-add">Add</Button>
        </div>
      </div>

      {notes.length ? (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-edge" aria-label={`What the agents know about ${name} from you`} data-testid="payer-notes">
          {notes.map((n) => (
            <li key={n.id} data-note={n.id} className={cn("flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3", !n.active && "bg-tile")}>
              <div className="min-w-0 flex-1 basis-[260px]">
                <p className={cn("text-[14px] leading-snug", !n.active && "text-muted line-through")}>{n.text}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                  {n.agents === "all" ? <span>All agents</span> : n.agents.map((a) => <span key={a} className="inline-flex items-center gap-1"><AgentBadge agent={a} size={16} />{AGENTS[a].name}</span>)}
                  <span aria-hidden="true">·</span><span>{n.by}, {shortDate(n.at)}</span>
                  {n.sample ? <span className="rounded-full border border-edge px-2 text-[11px]">Sample</span> : null}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={n.active} onChange={() => toggle(n.id)} label={<span className="sr-only">{n.active ? "Pause this note" : "Use this note"}</span>} />
                <button type="button" onClick={() => remove(n.id)} aria-label="Remove this note" title="Remove" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-tile hover:text-risk-ink"><Trash2 size={16} className="ico" /></button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted">Nothing added yet.</p>
      )}

      {active.length ? (
        <div>
          <button type="button" aria-expanded={seen} onClick={() => setSeen((v) => !v)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest hover:underline">
            What the agents will read<ChevronDown size={15} className={cn("ico transition-transform", seen && "rotate-180")} aria-hidden="true" />
          </button>
          {seen ? (
            <pre className="mt-2 overflow-x-auto rounded-xl bg-tile px-4 py-3 text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink2" data-testid="payer-prompt">{`When you work a ${name} request, also keep in mind what the clinic told you:\n${active.map((n) => `- ${n.text}${n.agents === "all" ? "" : ` (${n.agents.map((a) => AGENTS[a].name).join(", ")})`}`).join("\n")}`}</pre>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
