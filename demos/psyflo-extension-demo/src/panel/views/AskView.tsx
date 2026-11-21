import { BookOpen, Building2, ChevronDown, ChevronRight, ClipboardList, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usDate } from "@/engine";
import { useCurrent } from "@/hooks";
import { useStore, type AskMsg } from "@/store";
import type { AskSource, Consumer } from "@/types";
import "../panel-more.css";

/** Which consumer each message was about, fixed the first time the message is seen. The conversation stays with its subject if the person opens another consumer. */
const SUBJECT = new Map<number, string | null>();

const KIND: Record<AskSource["kind"], { label: string; Icon: typeof BookOpen }> = {
  chart: { label: "Chart", Icon: ClipboardList },
  clinic: { label: "Clinic", Icon: Building2 },
  reference: { label: "Reference", Icon: BookOpen },
};

/** Ask Psyflo: pre-written answers with the sources shown. Decision support, never a clinical decision. */
export default function AskView() {
  const { clinic, seed, consumer } = useCurrent();
  const asks = useStore((s) => s.asks);
  const asking = useStore((s) => s.asking);
  const askSend = useStore((s) => s.askSend);
  const askTopic = useStore((s) => s.askTopic);
  const askClear = useStore((s) => s.askClear);
  const [draft, setDraft] = useState("");
  const body = useRef<HTMLDivElement>(null);
  const kind = seed?.kind;

  const consumerById = (id: string | null | undefined): Consumer | undefined => (id ? clinic.consumers.find((c) => c.id === id) : undefined);
  const fill = (text: string, c: Consumer | undefined) => text.replaceAll("{ini}", c?.ini ?? "the consumer");

  // each message keeps the consumer it was asked about
  let last: string | null = consumer?.id ?? null;
  const rows = asks.map((m) => {
    if (!SUBJECT.has(m.id)) {
      const v = m.who === "you" ? consumer?.id ?? null : m.docId ? clinic.docs.find((d) => d.id === m.docId)?.consumerId ?? null : last;
      SUBJECT.set(m.id, v);
    }
    const subject = SUBJECT.get(m.id) ?? null;
    if (m.who === "you") last = subject;
    return { m, subject: consumerById(subject) };
  });

  const topics = clinic.ask.filter((t) => !t.docs || !kind || t.docs.includes(kind));

  // new question or the typing dots: show the bottom. A new answer: show its top, so a long answer is read from its first line.
  const latest = asks[asks.length - 1];
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    if (latest?.who === "psyflo" && !asking) {
      const node = el.querySelector<HTMLElement>(`[data-msg="${latest.id}"]`);
      el.scrollTop = node ? Math.max(0, node.offsetTop - 10) : el.scrollHeight;
    } else el.scrollTop = el.scrollHeight;
  }, [latest?.id, asking]);

  const send = () => {
    const q = draft.trim();
    if (!q || asking) return;
    askSend(q);
    setDraft("");
  };

  return (
    <>
      <div className="psy-body ask-body" ref={body}>
        <div className="p-row sp" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
          <div className="p-grow">
            <h2 className="p-big">Ask Psyflo</h2>
            <p className="p-sub" style={{ marginBottom: 6 }}>Answers come from this consumer&apos;s chart and your clinic&apos;s own documents, with the sources shown.</p>
          </div>
          {asks.length > 0 ? (
            <button type="button" className="p-btn ghost sm" data-testid="ask-clear" onClick={askClear}><Trash2 size={14} aria-hidden="true" />Clear</button>
          ) : null}
        </div>
        <p className="ask-disc" data-testid="ask-disclaimer">Pre-written for the demo (Simulated) · decision support, not a clinical decision</p>
        {!consumer ? <p className="p-note ask-nocons">No consumer is open. Open a consumer to ask about their chart. Questions about your clinic&apos;s documents still work.</p> : null}

        <div className="ask-convo" role="log" aria-live="polite" aria-label="Conversation with Psyflo">
          {rows.map(({ m, subject }) => (m.who === "you" ? (
            <div key={m.id} className="p-bubble you" data-msg={m.id}>{fill(m.text, subject)}</div>
          ) : (
            <Answer key={m.id} m={m} subject={subject} fill={(t) => fill(t, subject)} suggestions={m.suggest ?? []} onPick={(t) => askTopic(t)} />
          )))}
          {asking ? (
            <div className="p-bubble ai ask-typing" role="status" aria-label="Psyflo is looking at the sources" data-testid="ask-typing"><i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" /></div>
          ) : null}
        </div>

        <h3 className="p-h">{asks.length ? "Ask something else" : "Suggested questions"}</h3>
        {topics.length === 0 ? <p className="p-note">No suggested questions for this document. Type your own below.</p> : (
          <ul className="ask-chips">
            {topics.map((t) => (
              <li key={t.id}>
                <button type="button" className="ask-q" data-topic={t.id} disabled={asking} onClick={() => askTopic(t)}>{fill(t.q, consumer)}</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="psy-foot">
        <label className="p-lbl" htmlFor="ask-in" style={{ margin: 0 }}>Your question</label>
        <div className="ask-form">
          <textarea
            id="ask-in"
            className="p-input"
            rows={2}
            data-testid="ask-input"
            value={draft}
            placeholder="Type a question"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
          />
          <button type="button" className="p-btn pri" data-testid="ask-send" disabled={asking || !draft.trim()} onClick={send}><Send size={15} aria-hidden="true" />Send</button>
        </div>
        <p className="p-note" style={{ margin: 0 }}>Enter sends. Shift and Enter makes a new line.</p>
      </div>
    </>
  );
}

/** One Psyflo message: an answer with its sources, or the honest "no source" reply with questions it can answer. */
function Answer({ m, subject, fill, suggestions, onPick }: { m: AskMsg; subject: Consumer | undefined; fill: (t: string) => string; suggestions: NonNullable<AskMsg["suggest"]>; onPick: (t: NonNullable<AskMsg["topic"]>) => void }) {
  const t = m.topic;
  return (
    <div className="p-bubble ai ask-ans" data-testid="ask-answer" data-msg={m.id} data-kind={t ? "answer" : "none"} data-answer-topic={t?.id}>
      {t ? (
        <>
          {subject ? <div className="p-note ask-about">About {subject.ini}</div> : null}
          {t.answer.map((p, i) => <p key={i}>{fill(p)}</p>)}
          {t.sources.length ? (
            <div className="ask-srcs">
              <h3 className="p-h">Sources</h3>
              <ul>{t.sources.map((s, i) => <Source key={i} s={s} subject={subject} />)}</ul>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p>{m.text}</p>
          {suggestions.length ? (
            <>
              <div className="p-note ask-sug-l">You could ask:</div>
              <ul className="ask-chips">
                {suggestions.map((s) => (
                  <li key={s.id}><button type="button" className="ask-q" data-suggest={s.id} onClick={() => onPick(s)}>{fill(s.q)}</button></li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function Source({ s, subject }: { s: AskSource; subject: Consumer | undefined }) {
  const [open, setOpen] = useState(false);
  const { label, Icon } = KIND[s.kind];
  const record = s.kind === "chart" && s.chart ? subject?.chart.find((r) => r.id === s.chart) : undefined;
  return (
    <li className="ask-src" data-source={s.kind}>
      <span className="ico" aria-hidden="true"><Icon size={14} /></span>
      <div className="tx">
        <div><b>{s.label}</b> <span className="p-kind">{label}</span></div>
        <div className="p-note">{s.detail}</div>
        {s.kind === "chart" ? (
          record ? (
            <>
              <button type="button" className="p-link ask-more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                {open ? <ChevronDown size={12} aria-hidden="true" /> : <ChevronRight size={12} aria-hidden="true" />}{open ? "Hide the stored record" : "Show the stored record"}
              </button>
              {open ? <blockquote className="ask-rec"><div className="p-note">{record.label} · {usDate(record.date)}</div>{record.text}</blockquote> : null}
            </>
          ) : <div className="p-note">Open this consumer to see the stored record.</div>
        ) : null}
      </div>
    </li>
  );
}
