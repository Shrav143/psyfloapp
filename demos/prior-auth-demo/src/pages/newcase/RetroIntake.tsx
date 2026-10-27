import { Card, Chip, Field, FileDrop, TextArea } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { useStore } from "@/store";
import { RETRO_REASONS } from "./authType";
import type { CaseEnv } from "./caseEnv";
import { DuplicateWarning } from "./DuplicateWarning";
import { IntakeForm } from "./IntakeForm";
import { IntakeSources } from "./IntakeSources";
import { retroRule } from "./payerRules";
import { sortFiles } from "./readFiles";

/** Intake for a retroactive authorization: the patient (imported, known, or typed in), the payer, the service, the dates of service, why no authorization was in place,
    and the supporting documents. The payer's Backdating rule is the one line above, because it decides whether the request can be made at all. */
export function RetroIntake({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const rule = draft.payerId ? retroRule(env.ctx, payerById(draft.payerId).shortName) : null;

  return (
    <div className="flex flex-col gap-4">
      <IntakeSources draft={draft} env={env} referrals={false} />
      {rule ? <p className={rule.onFile ? "px-1 text-[13px] text-ink2" : "px-1 text-[13px] text-mid-ink"}>{rule.text}</p> : null}
      <DuplicateWarning env={env} />
      <IntakeForm draft={draft} />
      <Card>
        <section aria-label="Why it was not obtained ahead of time" className="px-5 pt-4 pb-4">
          <h3 className="mb-3 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Why it was not obtained ahead of time</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            {RETRO_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => patch(draft.id, { retroReason: r })} className="rounded-full bg-neutral-bg px-3 py-1 text-[13px] font-medium text-neutral-ink hover:bg-[#E8E5DF]">
                {r.replace(/\.$/, "")}
              </button>
            ))}
          </div>
          <Field label="Reason">
            <TextArea value={draft.retroReason ?? ""} onChange={(e) => patch(draft.id, { retroReason: e.target.value })} placeholder="What happened" className="min-h-[72px]" />
          </Field>
        </section>
        <section aria-label="Supporting documents" className="border-t border-line px-5 pt-4 pb-4">
          <h3 className="mb-3 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Supporting documents</h3>
          <FileDrop hint="Admission order, eligibility check, attendance" onFiles={(files) => sortFiles(draft.id, files)} />
          {draft.documents.length ? <div className="mt-2.5 flex flex-wrap gap-2">{draft.documents.map((d) => <Chip key={d.slot}>{d.file.name}</Chip>)}</div> : null}
        </section>
      </Card>
    </div>
  );
}
