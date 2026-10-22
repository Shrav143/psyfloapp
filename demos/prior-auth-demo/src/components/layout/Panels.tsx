import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowUp, CheckCheck, Sparkles } from "lucide-react";
import { ActorBadge, AgentBadge, Button, Drawer } from "@/components/ui";
import { cn } from "@/lib/cn";
import { answerFor, chipsFor, routeKey, routeOf, type FloAnswer } from "@/lib/floAnswers";
import { ago } from "@/lib/time";
import { useStore } from "@/store";

/* ------------------------------------------------------------------ notifications */
export function NotificationsPanel() {
  const open = useStore((s) => s.notifOpen);
  const setOpen = useStore((s) => s.setNotifOpen);
  const list = useStore((s) => s.notifications);
  const clock = useStore((s) => s.clock);
  const markRead = useStore((s) => s.markNotificationRead);
  const markAll = useStore((s) => s.markAllNotificationsRead);
  const nav = useNavigate();
  const unread = list.filter((n) => !n.read).length;
  return (
    <Drawer open={open} onClose={() => setOpen(false)} width={440} title="Notifications" subtitle={unread ? `${unread} unread` : "You are all caught up"} right={<Button size="sm" icon={CheckCheck} onClick={markAll}>Mark all read</Button>}>
      <ul className="flex flex-col gap-2.5">
        {list.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => {
                markRead(n.id);
                setOpen(false);
                if (n.to) nav(n.to);
              }}
              className={cn("flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left hover:bg-tile", n.read ? "border-edge bg-white" : "border-mid-edge bg-[#FFFBF0]")}
            >
              {n.agent === "system" ? <ActorBadge actor="system" size={32} /> : <AgentBadge agent={n.agent} size={32} />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{n.title}</span>
                  {!n.read ? <span className="h-2 w-2 rounded-full bg-risk" aria-label="Unread" /> : null}
                  <span className="ml-auto text-xs text-muted">{ago(n.at, clock)}</span>
                </div>
                <div className="mt-0.5 text-[13px] text-ink2">{n.body}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ Ask FLO: Psyflo's assistant is called FLO */
interface Msg extends Partial<FloAnswer> {
  from: "you" | "flo";
  text: string;
  /** The screen the person was on when this was said, so the chips are offered again when they move to another one. */
  route?: string;
}

/** FLO has no agent badge of its own: it is the assistant that sits on top of the sixteen agents. */
function FloBadge({ size = 30 }: { size?: number }) {
  return (
    <span aria-label="FLO" role="img" className="grid shrink-0 place-items-center rounded-full bg-forest text-white" style={{ width: size, height: size }}>
      <Sparkles size={Math.round(size * 0.5)} className="ico" />
    </span>
  );
}

export function AskPanel() {
  const open = useStore((s) => s.askOpen);
  const setOpen = useStore((s) => s.setAskOpen);
  const nav = useNavigate();
  const { pathname } = useLocation();
  const route = routeOf(pathname);
  const here = routeKey(route);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "flo", text: "Hi Jordan, I am FLO. Ask me about your requests, a payer, or your denials. I answer from the data on your Dashboard." }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  // The suggestions follow the screen. They are worked out from the store when the panel is open, so a case page names the case it is on.
  const requests = useStore((s) => s.requests);
  const ledger = useStore((s) => s.ledger);
  // A case page names its payer, which comes from the requests and the ledger, so those are what the chips depend on.
  const suggested = useMemo(() => (open ? chipsFor(routeOf(pathname), useStore.getState()) : null), [open, pathname, requests, ledger]);
  const last = msgs[msgs.length - 1];
  const showChips = !busy && !!suggested && (msgs.length < 3 || !!last.fallback || (last.route !== undefined && last.route !== here));

  const send = (q: string) => {
    if (!q.trim() || busy) return;
    setMsgs((m) => [...m, { from: "you", text: q, route: here }]);
    setText("");
    setBusy(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { from: "flo", route: here, ...answerFor(q, useStore.getState(), route) }]);
      setBusy(false);
    }, 700);
  };

  return (
    <Drawer open={open} onClose={() => setOpen(false)} width={460} title="Ask FLO" subtitle="Your assistant, answering from your data" footer={
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question" aria-label="Ask a question" className="h-[42px] flex-1 rounded-xl border border-field bg-white px-3.5 text-sm focus:border-forest focus:outline-none" />
        <Button type="submit" variant="primary" icon={ArrowUp} disabled={!text.trim() || busy}>Send</Button>
      </form>
    }>
      <div className="flex flex-col gap-3">
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex gap-2.5", m.from === "you" && "flex-row-reverse")}>
            {m.from === "flo" ? <FloBadge /> : <ActorBadge actor="you" size={30} />}
            <div className={cn("max-w-[330px] rounded-2xl px-3.5 py-2.5 text-sm", m.from === "you" ? "bg-forest text-white" : "border border-edge bg-white")}>
              {m.text}
              {m.lines?.length ? (
                <ul className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
                  {m.lines.map((l) => <li key={l}>{l}</li>)}
                </ul>
              ) : null}
              {m.note ? <p className="mt-2 text-xs text-muted">{m.note}</p> : null}
              {m.link ? (
                <button type="button" onClick={() => { setOpen(false); nav(m.link!.to); }} className="mt-2 block text-left font-semibold text-forest underline underline-offset-[3px]">{m.link.label}</button>
              ) : null}
            </div>
          </div>
        ))}
        {busy ? <div className="flex items-center gap-2 text-sm text-muted"><FloBadge /><span className="psy-pulse">FLO is working…</span></div> : null}
        {showChips && suggested ? (
          <div className="mt-2 flex flex-col gap-2">
            {suggested.label ? <p className="text-xs text-muted">Suggested for {suggested.label}</p> : null}
            <div className="flex flex-wrap gap-2">
              {suggested.chips.map((q) => (
                <button key={q} type="button" onClick={() => send(q)} className="rounded-full border border-field bg-white px-3.5 py-1.5 text-[13px] hover:bg-tile">{q}</button>
              ))}
            </div>
          </div>
        ) : null}
        <div ref={end} />
      </div>
    </Drawer>
  );
}

export function UnreadDot() {
  const n = useStore((s) => s.notifications.filter((x) => !x.read).length);
  return n ? <span className="absolute top-[7px] right-2 h-2 w-2 rounded-full border-2 border-white bg-risk" /> : null;
}
