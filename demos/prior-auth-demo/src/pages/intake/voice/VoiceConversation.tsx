import { useEffect, useRef, useState } from "react";
import { Bot, Send, UserRound } from "lucide-react";
import { Button, Card, CardHeader, Switch, TextInput } from "@/components/ui";
import type { IntakeRecord, VoiceSession } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { optionsFor, scriptedReply, scriptOf } from "./engine";

const clock = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** The call as it happens: the assistant's turns and the caller's, one question at a time. The caller's scripted reply plays by itself;
    the coordinator can pick a quick reply or type what the caller said instead. */
export function VoiceConversation({ record, v, auto, setAuto }: { record: IntakeRecord; v: VoiceSession; auto: boolean; setAuto: (a: boolean) => void }) {
  const reply = useStore((s) => s.voiceReply);
  const script = scriptOf(record);
  const [text, setText] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const waiting = v.phase === "caller";
  const options = waiting ? optionsFor(record, v) : [];
  const scripted = waiting ? scriptedReply(record, v) : "";

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [v.turns.length, v.phase]);

  const send = () => {
    if (!text.trim()) return;
    reply(record.id, text);
    setText("");
  };

  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader title="Conversation" right={<span className="text-[12px] text-muted">{v.turns.length} turns</span>} />
      <div ref={box} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
        {!v.turns.length ? <p className="py-10 text-center text-[13px] text-muted">Start the call to begin. The assistant asks one question at a time.</p> : null}
        {v.turns.map((t) => {
          const bot = t.speaker === "assistant";
          return (
            <div key={t.id} id={`vturn-${t.id}`} className={cn("flex items-end gap-2", bot ? "" : "flex-row-reverse")}>
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", bot ? "bg-sage-bg text-forest" : "bg-neutral-bg text-ink2")} aria-hidden="true">
                {bot ? <Bot size={15} className="ico" /> : <UserRound size={15} className="ico" />}
              </span>
              <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2.5", bot ? "rounded-bl-md bg-white ring-1 ring-edge" : "rounded-br-md bg-forest text-white")}>
                <p className={cn("text-[12px] font-semibold", bot ? "text-muted" : "text-white/80")}>
                  {bot ? "Psyflo intake assistant (automated)" : t.speaker === "coordinator" ? "Coordinator" : script.callerLabel} · <span className="tabular-nums">{clock(t.at)}</span>
                </p>
                <p className="mt-0.5 text-[14px] leading-snug">{t.text}</p>
              </div>
            </div>
          );
        })}
        {v.phase === "assistant" ? <p className="flex items-center gap-2 text-[12px] text-muted"><span className="psy-pulse inline-block h-2 w-2 rounded-full bg-forest" aria-hidden="true" />The assistant is speaking (simulated)</p> : null}
        {waiting && auto ? <p className="flex items-center gap-2 text-[12px] text-muted"><span className="psy-pulse inline-block h-2 w-2 rounded-full bg-ink2" aria-hidden="true" />The caller is answering (scripted)</p> : null}
      </div>
      {waiting ? (
        <div className="border-t border-line px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-ink2">What the caller says</span>
            <Switch checked={auto} onChange={setAuto} label={<span className="text-[12px]">Play the caller's replies</span>} />
          </div>
          {!auto ? <p className="mt-1 text-[12px] text-muted">Scripted replies are off while you answer for the caller.</p> : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => reply(record.id, scripted, { scripted: true })} className="rounded-full border border-forest/40 bg-sage-bg px-3 py-1 text-left text-[12px] font-medium text-forest hover:bg-sage-bg/70">
              Scripted: “{scripted.length > 60 ? `${scripted.slice(0, 57)}...` : scripted}”
            </button>
            {options.filter((o) => o.text !== scripted).map((o) => (
              <button key={o.label} type="button" onClick={() => reply(record.id, o.text, { option: o })} className={cn("rounded-full border px-3 py-1 text-[12px] font-medium", o.escalate ? "border-risk-edge bg-risk-bg text-risk-ink" : "border-field bg-white text-ink2 hover:bg-tile")}>
                {o.label}
              </button>
            ))}
          </div>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <TextInput value={text} onChange={(e) => setText(e.target.value)} onFocus={() => auto && setAuto(false)} placeholder="Type what the caller said" aria-label="Type what the caller said" className="flex-1" />
            <Button type="submit" icon={Send} disabled={!text.trim()}>Send</Button>
          </form>
        </div>
      ) : null}
    </Card>
  );
}
