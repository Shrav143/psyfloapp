import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { respond, type ChatAnswer, type ChatContext } from "./respond";

interface Msg { id: number; q: string; a: ChatAnswer }
const SUGGESTED = ["What's missing?", "Why is this required?", "What changes if I switch program?", "Show sources"];

/** Ask the assistant. It answers only from this record and the policy data, in the same words every time, and says when it cannot or must not do something. */
export function Chat({ ctx, recordId }: { ctx: ChatContext; recordId: string }) {
  const [log, setLog] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const n = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => setLog([]), [recordId]);
  useEffect(() => { if (log.length) end.current?.scrollIntoView?.({ block: "nearest" }); }, [log.length]);
  const ask = (text: string) => {
    if (!text.trim()) return;
    setLog((l) => [...l, { id: ++n.current, q: text.trim(), a: respond(text, ctx) }]);
    setQ("");
  };
  return (
    <div data-chat className="px-4 pb-3">
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED.map((s) => <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-field bg-white px-2.5 py-1 text-[12px] font-medium text-forest hover:bg-tile">{s}</button>)}
      </div>
      {log.length ? (
        <ol className="mt-2.5 space-y-2.5" aria-live="polite">
          {log.map((m) => (
            <li key={m.id} data-chat-answer={m.a.kind}>
              <p className="ml-6 rounded-xl bg-sage-bg px-3 py-1.5 text-[13px]">{m.q}</p>
              <div className={cn("mt-1 rounded-xl border px-3 py-2", m.a.kind === "answer" ? "border-edge bg-white" : "border-mid-edge bg-mid-bg/40")}>
                <p className="text-[13px]">{m.a.text}</p>
                {m.a.sources.length ? <p className="mt-1 text-[11px] text-muted">Sources: {m.a.sources.join("; ")}</p> : null}
                <p className="mt-1.5"><Pill tone="neutral">AI suggested · simulated</Pill></p>
              </div>
            </li>
          ))}
          <div ref={end} />
        </ol>
      ) : null}
      <form className="mt-2.5 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input aria-label="Ask the assistant" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this intake" className="h-9 min-w-0 flex-1 rounded-xl border border-field bg-white px-3 text-[13px]" />
        <Button size="sm" type="submit" icon={Send} disabled={!q.trim()} aria-label="Send the question">Ask</Button>
      </form>
      <p className="mt-1.5 text-[11px] text-muted">Answers come from this record and the configured rules. No diagnoses, safety decisions or level-of-care choices.</p>
    </div>
  );
}
