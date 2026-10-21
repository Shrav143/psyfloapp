import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUp, CheckCheck } from "lucide-react";
import { ActorBadge, AgentBadge, Button, Drawer } from "@/components/ui";
import { PAYERS } from "@/data/seed";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { ago } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { stageCounts } from "@/store/selectors";

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

/* ------------------------------------------------------------------ Ask Psyflo */
interface Msg {
  from: "you" | "psyflo";
  text: string;
  link?: { label: string; to: string };
}

const SUGGEST = ["What needs me today?", "Which payers are slowest right now?", "How much money is at stake in denials?", "Why is Cardinal's approval rate down?"];

export function AskPanel() {
  const open = useStore((s) => s.askOpen);
  const setOpen = useStore((s) => s.setAskOpen);
  const nav = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "psyflo", text: "Hi Jordan. Ask me about your requests, a payer, or your denials. I answer from the data on your Dashboard." }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  const answer = (q: string): Msg => {
    const { requests, clock } = useStore.getState();
    const s = q.toLowerCase();
    const counts = stageCounts(requests);
    if (s.includes("slow") || s.includes("payer") && s.includes("late")) {
      const slow = [...PAYERS].filter((p) => p.avgDecisionDays > p.typicalDecisionDays).sort((a, b) => b.avgDecisionDays / b.typicalDecisionDays - a.avgDecisionDays / a.typicalDecisionDays);
      return { from: "psyflo", text: `${slow.map((p) => `${p.shortName} is averaging ${p.avgDecisionDays} days against ${p.typicalDecisionDays} typical`).join(". ")}. Caller phones when a payer passes twice its typical time.`, link: { label: "Open Dashboard, By payer", to: paths.dashboard() } };
    }
    if (s.includes("denial") || s.includes("stake") || s.includes("money")) {
      const d = requests.filter((r) => r.stage === "appeal");
      const total = d.reduce((a, r) => a + r.atStake, 0);
      return { from: "psyflo", text: `${d.length} denials are open, with ${money(total)} at stake. The nearest deadline is D-3318 (Cardinal), a peer-to-peer call Wednesday 9 to 11 am, where the chance of winning is 64%.`, link: { label: "Open Denial Intelligence", to: paths.denials("D-3318") } };
    }
    if (s.includes("cardinal") || s.includes("approval rate")) {
      return { from: "psyflo", text: "Cardinal approved 63% as asked over the last 90 days, down 11 points. Historian links most of the drop to continued-stay evidence. Cardinal also published criteria version 2026.3, which affects 4 drafts you have not sent.", link: { label: "Open Payers, Cardinal, Changes", to: paths.payers("cardinal", "changes") } };
    }
    if (s.includes("need") || s.includes("today") || s.includes("first")) {
      const needs = requests.filter((r) => r.needsYou);
      return { from: "psyflo", text: `${needs.length} requests need you: ${needs.map((r) => r.id).join(", ")}. ${counts.info_requested} payer${counts.info_requested === 1 ? "" : "s"} asked for more information, and ${counts.preparing} cases are being prepared. Start with P-1499. Harborview is waiting and its clock is past typical.`, link: { label: "Open Dashboard", to: paths.dashboard() } };
    }
    if (s.includes("referral")) return { from: "psyflo", text: "New referrals are waiting for review. Reader has already checked each document, and Verify has run coverage for the ones with an insurance card.", link: { label: "Open Referrals", to: paths.referrals() } };
    return { from: "psyflo", text: `I did not find an answer to that in the demo data. Try one of the suggestions below. (Clock: ${ago(0, clock)}.)` };
  };

  const send = (q: string) => {
    if (!q.trim() || busy) return;
    setMsgs((m) => [...m, { from: "you", text: q }]);
    setText("");
    setBusy(true);
    setTimeout(() => {
      setMsgs((m) => [...m, answer(q)]);
      setBusy(false);
    }, 700);
  };

  return (
    <Drawer open={open} onClose={() => setOpen(false)} width={460} title="Ask Psyflo" subtitle="Analyst answers from your data" footer={
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question" aria-label="Ask a question" className="h-[42px] flex-1 rounded-xl border border-field bg-white px-3.5 text-sm focus:border-forest focus:outline-none" />
        <Button type="submit" variant="primary" icon={ArrowUp} disabled={!text.trim() || busy}>Send</Button>
      </form>
    }>
      <div className="flex flex-col gap-3">
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex gap-2.5", m.from === "you" && "flex-row-reverse")}>
            {m.from === "psyflo" ? <AgentBadge agent="analyst" size={30} /> : <ActorBadge actor="you" size={30} />}
            <div className={cn("max-w-[330px] rounded-2xl px-3.5 py-2.5 text-sm", m.from === "you" ? "bg-forest text-white" : "border border-edge bg-white")}>
              {m.text}
              {m.link ? (
                <button type="button" onClick={() => { setOpen(false); nav(m.link!.to); }} className="mt-2 block font-semibold text-forest underline underline-offset-[3px]">{m.link.label}</button>
              ) : null}
            </div>
          </div>
        ))}
        {busy ? <div className="flex items-center gap-2 text-sm text-muted"><AgentBadge agent="analyst" size={30} /><span className="psy-pulse">Analyst is working…</span></div> : null}
        <div ref={end} />
      </div>
      {msgs.length < 3 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {SUGGEST.map((q) => (
            <button key={q} type="button" onClick={() => send(q)} className="rounded-full border border-field bg-white px-3.5 py-1.5 text-[13px] hover:bg-tile">{q}</button>
          ))}
        </div>
      ) : null}
    </Drawer>
  );
}

export function UnreadDot() {
  const n = useStore((s) => s.notifications.filter((x) => !x.read).length);
  return n ? <span className="absolute top-[7px] right-2 h-2 w-2 rounded-full border-2 border-white bg-risk" /> : null;
}
