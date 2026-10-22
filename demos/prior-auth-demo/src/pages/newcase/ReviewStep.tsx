import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button, Card, CardBody, Label, Pill, Ring } from "@/components/ui";
import { RUN_STEPS, chanceRange, currentChance, similarCases, type CaseDraft, type DocSlotId, type NarrativeSection } from "@/data/cases";
import { payerById } from "@/data/seed";
import { band } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import type { CaseEnv } from "./caseEnv";
import { ChecksCard } from "./ChecksCard";
import type { FixKind } from "./checks";
import { DocPreviewDrawer } from "./DocPreviewDrawer";
import { slotOfSource } from "./documents";
import { MissingCard } from "./MissingCard";
import { NarrativeCard } from "./NarrativeCard";
import { PayerChangeNote } from "./PayerChangeNote";
import { reviewModel } from "./reviewModel";
import { ReviewSummary } from "./ReviewSummary";
import { SignCard } from "./SignCard";
import { StepFooter } from "./StepFooter";
import { stepPatch } from "./steps";
import { useRecAdds } from "./useRecAdds";
import { useUnmetSync } from "./useUnmetSync";
import { ValidationSummary } from "./ValidationSummary";

const RECHECK_MS = 1200;
const NO_CONTEXT: string[] = [];

/** Step 5, Review & submit: what is missing first, then the summary list, the packet (editable) and the checks, and the clinician sign-off. Only a clinician signs.
    "Sign and send to payer (demo)" records the request (linked to its patient, episode, authorization and verification) and opens the new case. */
export function ReviewStep({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const nav = useNavigate();
  const patch = useStore((s) => s.patchCaseDraft);
  const sign = useStore((s) => s.signCaseDraft);
  const save = useStore((s) => s.saveCaseDraft);
  const toast = useStore((s) => s.toast);
  const [rechecking, setRechecking] = useState(false);
  const [source, setSource] = useState<DocSlotId | null>(null);
  const [editSignal, setEditSignal] = useState(0);
  const [backSignal, setBackSignal] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const context = useStore((s) => (draft.caseId ? s.clinicalContext[draft.caseId] : undefined)) ?? NO_CONTEXT;
  const adds = useRecAdds(draft);
  useUnmetSync(draft);
  const ready = draft.run.done >= RUN_STEPS.length;

  /* The same summary the case page's Draft tab reads: the edited text or Scribe's, the actions applied there, and the context added there. */
  const review = useMemo(() => reviewModel(env, context, adds, rechecking), [env, context, adds, rechecking]);
  const chance = currentChance(draft);
  const range = chanceRange(chance, true);
  const b = band(chance);
  const payer = draft.payerId ? payerById(draft.payerId) : null;
  const sc = draft.payerId && draft.program ? similarCases(draft.payerId, draft.program) : null;

  const edited = (next: NarrativeSection[]) => {
    patch(draft.id, { narrative: next, narrativeIncludes: adds.map((a) => a.recId) });
    setRechecking(true);
    timer.current = setTimeout(() => {
      setRechecking(false);
      toast({ title: "Integrity re-checked your edits", body: next.some((s) => !s.text.trim()) ? "One section is empty. You can still sign it, and the summary will say so." : "Every sentence still traces to the chart.", tone: next.some((s) => !s.text.trim()) ? "mid" : "good" });
    }, RECHECK_MS);
  };

  const fix = (kind: FixKind) => {
    if (kind === "intake") patch(draft.id, stepPatch(0));
    else if (kind === "eligibility") patch(draft.id, stepPatch(1));
    else if (kind === "records") patch(draft.id, stepPatch(2));
    else if (kind === "edit") setEditSignal((n) => n + 1);
    else setBackSignal((n) => n + 1);
  };

  const onSign = (signedBy: string) => {
    const id = sign(draft.id, signedBy);
    if (id) nav(paths.case(id));
    else toast({ title: "Could not sign yet", body: "All agents must finish before the request can be signed.", tone: "mid" });
  };

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5 max-[1080px]:grid-cols-1">
        <div className="flex flex-col gap-5">
          <PayerChangeNote draft={draft} />
          <MissingCard draft={draft} items={review.missing} onFix={fix} />
          <ReviewSummary draft={draft} env={env} review={review} />
          {ready ? (
            <NarrativeCard sections={review.sections} payer={payer?.shortName ?? "the payer"} editSignal={editSignal} onSave={edited} onSource={(label) => setSource(slotOfSource(label))} />
          ) : (
            <Card>
              <CardBody className="flex flex-col items-start gap-3">
                <h3 className="font-serif text-[21px] font-semibold">The packet is built when the agents finish</h3>
                <p className="text-[13.5px] text-muted">Scribe drafts the justification and Packet assembles the forms in Authorization preparation. You can read what is missing above and fix it now.</p>
                <Button size="sm" onClick={() => patch(draft.id, stepPatch(3))}>Go to Authorization preparation</Button>
              </CardBody>
            </Card>
          )}
          {ready ? <ValidationSummary rows={review.rows} /> : null}
        </div>
        <div className="flex flex-col gap-4">
          {ready ? <ChecksCard checks={review.checks} /> : null}
          <Card>
            <CardBody className="flex items-center gap-4">
              <Ring value={chance} size={84} stroke={9} />
              <div className="min-w-0">
                <Label>Approval chance</Label>
                <Pill tone={b.tone} dot className="mt-1">
                  {b.word} · likely {range.lo}-{range.hi}%
                </Pill>
                <div className="mt-1.5 text-xs text-muted">
                  {payer ? `${payer.shortName} usually decides in about ${payer.typicalDecisionDays === 1 ? "1 day" : `${payer.typicalDecisionDays} days`}. ` : ""}
                  {sc ? `Based on ${sc.total.toLocaleString("en-US")} similar cases.` : ""}
                </div>
              </div>
            </CardBody>
          </Card>
          <SignCard draft={draft} checks={review.checks} missing={review.missing} chance={chance} ready={ready} backSignal={backSignal} onSign={onSign} />
        </div>
      </div>
      <StepFooter
        actions={
          <>
            <Button icon={ArrowLeft} onClick={() => patch(draft.id, stepPatch(3))}>
              Back
            </Button>
            <Button
              icon={Save}
              onClick={() => {
                save(draft.id);
                toast({ title: "Draft saved", body: `${draft.caseId ?? "The draft"} is in Case Manager${ready ? ", ready to sign" : ""}.`, tone: "good" });
              }}
            >
              Save as draft
            </Button>
          </>
        }
      />
      <DocPreviewDrawer draft={draft} slot={source} highlight onClose={() => setSource(null)} />
    </>
  );
}
