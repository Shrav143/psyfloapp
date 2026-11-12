import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarCheck, Check, ShieldCheck, Wand2 } from "lucide-react";
import { AgentChip, Banner, Button, Drawer, Field, Pill, TextArea } from "@/components/ui";
import { WEEK_END, reviewStamp, type Review } from "@/data/managerReviews";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { cn } from "@/lib/cn";
import { REVIEW_NOTE } from "@/lib/pdf/report-doc";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "./helpers";
import { SignDialog } from "./SignDialog";
import { useDraftReviews } from "./useDraftReviews";

function Checks({ review: r }: { review: Review }) {
  return (
    <ul className="flex flex-col gap-2" aria-label="Integrity checks">
      {r.checks.map((c) => {
        const missing = !c.passed && r.status === "needs_update";
        return (
          <li key={c.label} className={cn("flex items-start gap-2.5 rounded-xl px-3 py-2 text-sm", c.passed ? "bg-good-bg text-good-ink" : missing ? "bg-risk-bg text-risk-ink" : "bg-mid-bg text-mid-ink")}>
            {c.passed ? <Check size={16} className="ico mt-0.5" /> : <AlertTriangle size={16} className="ico mt-0.5" />}
            <div>
              <div className="font-semibold">{c.label}</div>
              {c.problem ? <div className="text-[13px]">{c.problem}</div> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** A drafted continued-stay review: edit it, see the four Integrity checks, then sign. A review that needs an update asks for a note first, and one with no draft yet asks Cadence for it. */
export function ReviewDrawer({ review: r, onClose }: { review: Review; onClose: () => void }) {
  const navigate = useNavigate();
  const [text, setText] = useState(r.draft);
  const [seenDraft, setSeenDraft] = useState(r.draft);
  // The store rewrites the draft when an update is added; pick that up without losing edits made before it.
  if (seenDraft !== r.draft) {
    setSeenDraft(r.draft);
    setText(r.draft);
  }
  const [note, setNote] = useState("");
  const [checking, setChecking] = useState(false);
  const [signing, setSigning] = useState(false);
  const { drafting, draft: draftNow } = useDraftReviews([r.id]);

  const payer = payerById(r.payerId);
  const needsUpdate = r.status === "needs_update";
  const undrafted = r.status === "due";
  const signed = r.status === "signed";
  const warning = r.checks.find((c) => !c.passed)?.problem;

  const close = () => {
    if (r.status === "drafted") useStore.getState().saveReviewDraft(r.id, text);
    onClose();
  };
  const addUpdate = () => {
    setChecking(true);
    setTimeout(() => {
      useStore.getState().updateReview(r.id, note);
      setChecking(false);
    }, 1300);
  };
  const sign = (by: string) => {
    useStore.getState().signReview(r.id, by, text);
    setSigning(false);
  };

  return (
    <Drawer
      open
      onClose={close}
      width={640}
      title={`${r.ledgerId} · ${payer.shortName}`}
      subtitle={`Continued-stay review ${r.reviewNo} · ${PROGRAM_LABEL[r.program]} · due ${reviewStamp(r.dueAt)}`}
      right={<Pill tone={REVIEW_STATUS_TONE[r.status]} dot>{REVIEW_STATUS_LABEL[r.status]}</Pill>}
      footer={
        <div className="flex flex-wrap items-center gap-2.5">
          {signed ? (
            <span className="inline-flex items-center gap-2 text-sm text-good-ink">
              <ShieldCheck size={18} className="ico" />
              Signed by {r.signedBy}
            </span>
          ) : (
            <Button variant="primary" icon={ShieldCheck} disabled={needsUpdate || undrafted} title={needsUpdate ? "Add your update first" : undrafted ? "Draft the review first" : undefined} onClick={() => setSigning(true)}>
              Sign review
            </Button>
          )}
          <Button onClick={() => navigate(paths.case(r.caseId, "draft"))}>Open case</Button>
          <Button variant="ghost" onClick={close}>Close</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{r.initials}, {r.age} · privacy mode</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5">
            {undrafted ? "To be drafted by" : "Drafted by"} <AgentChip agent={r.agent} />
          </span>
        </div>
        {!undrafted ? <p className="-mt-3 text-[12px] text-muted">{REVIEW_NOTE}</p> : null}

        {needsUpdate ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-mid-edge bg-mid-bg px-4 py-4 text-mid-ink">
            <div>
              <div className="font-semibold">Needs your update</div>
              <p className="mt-0.5 text-sm">{r.missing}</p>
            </div>
            <Field label="Your update" required hint="This goes into the draft under Clinician update. Integrity checks the draft again.">
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: the 10/17 group note applies, and the risk screen on 10/18 was negative." rows={3} className="bg-white text-ink" />
            </Field>
            <div>
              <Button variant="primary" loading={checking} disabled={!note.trim()} onClick={addUpdate}>
                Add to the draft
              </Button>
            </div>
          </div>
        ) : null}

        {undrafted ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-edge bg-tile px-4 py-4">
            <div>
              <div className="font-semibold">Not drafted yet</div>
              <p className="mt-0.5 text-sm text-ink2">Cadence drafts each review a few days ahead. This one is not due until {reviewStamp(r.dueAt)}, so it has no draft and no Integrity checks yet.</p>
            </div>
            <div>
              <Button variant="primary" icon={Wand2} loading={drafting} onClick={draftNow}>
                Draft this review
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Field label="The draft">
              <TextArea value={text} onChange={(e) => setText(e.target.value)} readOnly={needsUpdate || signed} rows={16} className={cn("min-h-[300px] text-[13px] leading-relaxed", (needsUpdate || signed) && "bg-tile text-ink2")} />
            </Field>
            {needsUpdate ? <p className="-mt-3 text-xs text-muted">The draft is locked until your update is added.</p> : null}

            <div>
              <h3 className="mb-2.5 font-serif text-[18px] font-semibold">Integrity checks</h3>
              <Checks review={r} />
            </div>
          </>
        )}
        {!needsUpdate && !undrafted && !signed ? <Banner icon={ShieldCheck}>Signing is one review at a time. Your edits to the draft are saved with the signature.</Banner> : null}
        {signed && r.nextAt !== undefined ? (
          <Banner tone="good" icon={CalendarCheck} title={`Next review: ${reviewStamp(r.nextAt)}`}>
            Cadence booked it. {r.nextAt < WEEK_END ? "It is on this week's list." : "It falls after this week, so it is not on the list yet."}
          </Banner>
        ) : null}
      </div>
      {signing ? (
        <SignDialog
          title="Sign this review"
          subtitle={`${r.ledgerId} · ${payer.name} · ${PROGRAM_LABEL[r.program]}`}
          attestation="I reviewed this continued-stay review and it reflects the record. The level of care is my clinical judgment."
          confirmLabel="Sign review"
          warning={warning}
          onClose={() => setSigning(false)}
          onSign={sign}
        />
      ) : null}
    </Drawer>
  );
}
