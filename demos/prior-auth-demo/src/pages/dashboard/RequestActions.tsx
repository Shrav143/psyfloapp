import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { AgentBadge, Banner, Button } from "@/components/ui";
import { payerById } from "@/data/seed";
import type { PsyRequest, Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { allowedReplies, type Reply } from "@/store/core";
import { selectWriteBackOn } from "@/store/emr";
import { isDenial } from "./helpers";
import { approvalFacts } from "./requestFacts";
import { InfoAnswerModal, WritebackModal } from "./RequestModals";

const BOX: Record<Tone, string> = {
  neutral: "border-neutral-edge bg-neutral-bg text-neutral-ink",
  mid: "border-mid-edge bg-mid-bg text-mid-ink",
  good: "border-good-edge bg-good-bg text-good-ink",
  risk: "border-risk-edge bg-risk-bg text-risk-ink",
};

function ActionBox({ tone, agent, title, children, action }: { tone: Tone; agent: PsyRequest["agent"]; title: string; children: ReactNode; action: ReactNode }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3.5", BOX[tone])}>
      <AgentBadge agent={agent} size={30} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 text-[13px]">{children}</div>
        <div className="mt-3">{action}</div>
      </div>
    </div>
  );
}

/** What this request needs from a person, if anything: the answer gate or the write-back confirm gate. */
export function StateActions({ request: r }: { request: PsyRequest }) {
  const writeBackOn = useStore(selectWriteBackOn);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [writeOpen, setWriteOpen] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const checkDraft = () => {
    setDrafting(true);
    setTimeout(() => {
      const s = useStore.getState();
      s.updateRequest(r.id, { needsYou: true, next: "Packet drafted the answer. Waiting for your review" });
      s.addEvent(r.id, { actor: "packet", text: "Packet drafted the answer. Waiting for your review" });
      s.toast({ title: "The draft is ready", body: `Packet finished the answer for ${r.id}. Review it, then sign and send.`, tone: "good" });
      setDrafting(false);
    }, 1300);
  };
  const sendAnswer = () => {
    setAnswerOpen(false);
    useStore.getState().answerInfoRequest(r.id);
  };
  const writeBack = () => {
    const s = useStore.getState();
    const facts = approvalFacts(r);
    s.updateRequest(r.id, { next: "Next review booked. Written to the EMR" });
    s.addEvent(r.id, { actor: "you", text: "You confirmed the write-back" });
    s.addEvent(r.id, { actor: "cadence", text: `Cadence wrote the approval number (${facts.number}) and the dates to the EMR` });
    s.toast({ title: "Written to the EMR", body: `${facts.number} and the approved dates are in the chart. Nothing else was written.`, tone: "good" });
    setWriteOpen(false);
  };

  if (r.stage === "info_requested") {
    return r.needsYou ? (
      <>
        <ActionBox tone="mid" agent="packet" title="Needs your input" action={<Button variant="primary" onClick={() => setAnswerOpen(true)}>Review the answer</Button>}>
          The payer asked for more information. Packet drafted the answer from the chart and Integrity checked it.
        </ActionBox>
        <InfoAnswerModal request={r} open={answerOpen} onClose={() => setAnswerOpen(false)} onSend={sendAnswer} />
      </>
    ) : (
      <ActionBox tone="neutral" agent="packet" title="Packet is drafting the answer" action={<Button loading={drafting} onClick={checkDraft}>Check on the draft</Button>}>
        Nothing for you to review yet. You will get a notification as soon as the draft is ready.
      </ActionBox>
    );
  }
  if (r.stage === "decided" && r.outcome === "approved" && r.next.includes("Write-back")) {
    // EMR Connect decides whether anything is written back at all.
    if (!writeBackOn) {
      return (
        <Banner>
          Write-back is off for your records system.{" "}
          <Link to={paths.emr()} className="font-semibold underline underline-offset-[3px]">
            Turn it on in EMR Connect.
          </Link>
        </Banner>
      );
    }
    return (
      <>
        <ActionBox tone="good" agent="cadence" title="Approved. Write-back waits for you" action={<Button variant="primary" onClick={() => setWriteOpen(true)}>Approve write-back</Button>}>
          Cadence updated the ledger. The approval number and dates go to the EMR only after you confirm.
        </ActionBox>
        <WritebackModal request={r} open={writeOpen} onClose={() => setWriteOpen(false)} onConfirm={writeBack} />
      </>
    );
  }
  return null;
}

const REPLIES: { reply: Reply; label: string }[] = [
  { reply: "received", label: "Payer received it" },
  { reply: "review", label: "Under review" },
  { reply: "info", label: "Asks for information" },
  { reply: "approve", label: "Approves" },
  { reply: "partial", label: "Approves part" },
  { reply: "deny", label: "Denies" },
];

/** The demo toast names the payer. A denial or part approval also gets its own toast from the store, because the request changes number. */
const REPLY_TOAST: Record<Reply, (payer: string) => string> = {
  received: (p) => `${p} received it`,
  review: (p) => `${p} has it under review`,
  info: (p) => `${p} asks for information`,
  approve: (p) => `${p} approved it`,
  partial: (p) => `${p} approved part of it`,
  deny: (p) => `${p} denied it`,
};

/** A clearly marked demo-only section: pretend the payer answered. Only the answers still ahead of the request are offered. After a denial the request gets a D- number. */
export function DemoControls({ request: r, onNewId }: { request: PsyRequest; onNewId: (id: string) => void }) {
  const offered = allowedReplies(r);
  const blocked = r.stage === "preparing" ? "It has not been sent yet. Sign and send it from Case Manager first." : isDenial(r) ? "A denial follows its own route in Denial Intelligence." : undefined;
  const decided = !blocked && offered.length === 0;
  const reply = (x: { reply: Reply; label: string }) => {
    const id = useStore.getState().simulateReply(r.id, x.reply);
    if (!id) return;
    if (id !== r.id) onNewId(id);
    else useStore.getState().toast({ title: `Demo: ${REPLY_TOAST[x.reply](payerById(r.payerId).shortName)}`, body: x.reply === "info" || x.reply === "approve" ? "The stage counts, the table and the notifications updated." : "The stage counts and the table updated.", tone: "neutral" });
  };
  return (
    <section aria-label="Demo controls" className="rounded-2xl border border-dashed border-faint bg-white/60 px-4 py-3.5">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
        <FlaskConical size={14} className="ico" />
        Demo controls
      </div>
      <p className="mt-1 text-[13px] text-muted">{blocked ?? (decided ? "The payer has already decided this request." : "Pretend the payer answered this request. Nothing is sent anywhere.")}</p>
      {decided ? null : (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {REPLIES.filter((x) => !!blocked || offered.includes(x.reply)).map((x) => (
            <Button key={x.reply} size="sm" disabled={!!blocked} onClick={() => reply(x)}>
              {x.label}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
