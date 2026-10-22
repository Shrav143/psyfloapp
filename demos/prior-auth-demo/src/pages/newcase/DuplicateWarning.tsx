import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CopyCheck, Undo2 } from "lucide-react";
import { Banner, Button, TextArea } from "@/components/ui";
import { useStore } from "@/store";
import type { CaseEnv } from "./caseEnv";
import { reasonOf } from "./verificationFor";

/** The one alert Intake shows for a possible duplicate: the same patient, payer and program with an open request or an active authorization whose dates overlap.
    The person can open the existing one, or go on with a short reason, which is kept on the case and written to the request's history. */
export function DuplicateWarning({ env }: { env: CaseEnv }) {
  const dup = env.duplicate;
  const draft = env.draft;
  const say = useStore((s) => s.documentReason);
  const unsay = useStore((s) => s.clearDocumentedReason);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  if (!dup) return null;
  const said = reasonOf(draft, "duplicate");

  if (said) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-edge bg-white px-[18px] py-3 text-[13.5px]">
        <CopyCheck size={16} className="ico text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <b>Continuing with a reason.</b> {dup.title}. Your reason: {said.reason}
        </span>
        <Button size="sm" variant="ghost" icon={Undo2} onClick={() => unsay(draft.id, "duplicate")}>Undo</Button>
      </div>
    );
  }
  return (
    <Banner
      tone="mid"
      title="This looks like a request that already exists"
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link to={dup.to} className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border border-field bg-white px-3 text-[13px] font-semibold text-forest hover:bg-tile">
            Open {dup.caseId}
            <ArrowUpRight size={14} className="ico" aria-hidden="true" />
          </Link>
          {asking ? null : <Button size="sm" onClick={() => setAsking(true)}>Continue with a reason</Button>}
        </div>
      }
    >
      <div>{dup.title}. {dup.detail}.</div>
      <div className="mt-0.5 text-[13px]">Same patient, payer and level of care, with dates that overlap. Sending both would ask the payer for the same days twice.</div>
      {asking ? (
        <div className="mt-3 flex flex-col gap-2.5">
          <label htmlFor="duplicate-reason" className="text-[13px] font-medium">Why is this a different request?</label>
          <TextArea id="duplicate-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: the first request was for the earlier stay" className="min-h-[72px] bg-white" />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" disabled={!reason.trim()} onClick={() => { say(draft.id, { kind: "duplicate", reason: reason.trim(), about: dup.caseId }); setAsking(false); setReason(""); }}>Continue with this reason</Button>
            <Button size="sm" onClick={() => setAsking(false)}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </Banner>
  );
}
