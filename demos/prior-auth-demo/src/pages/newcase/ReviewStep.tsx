import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button, Card, CardBody, Label, Pill, Ring } from "@/components/ui";
import { chanceRange, currentChance, similarCases, type CaseDraft, type DocSlotId, type NarrativeSection } from "@/data/cases";
import { payerById } from "@/data/seed";
import { band } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { ChecksCard } from "./ChecksCard";
import { integrityChecks } from "./checks";
import { DocPreviewDrawer } from "./DocPreviewDrawer";
import { slotOfSource } from "./documents";
import { NarrativeCard } from "./NarrativeCard";
import { buildNarrative } from "./narrative";
import { SignCard } from "./SignCard";
import { StepFooter } from "./StepFooter";
import { ValidationSummary } from "./ValidationSummary";

const RECHECK_MS = 1200;

/** Step 3: the draft on the left, the checks and the sign-off on the right. Only a clinician can sign. */
export function ReviewStep({ draft }: { draft: CaseDraft }) {
  const nav = useNavigate();
  const patch = useStore((s) => s.patchCaseDraft);
  const sign = useStore((s) => s.signCaseDraft);
  const save = useStore((s) => s.saveCaseDraft);
  const toast = useStore((s) => s.toast);
  const [rechecking, setRechecking] = useState(false);
  const [source, setSource] = useState<DocSlotId | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const sections = useMemo(() => draft.narrative ?? buildNarrative(draft), [draft]);
  const checks = integrityChecks(draft, sections, rechecking);
  const chance = currentChance(draft);
  const range = chanceRange(chance, true);
  const b = band(chance);
  const payer = draft.payerId ? payerById(draft.payerId) : null;
  const sc = draft.payerId && draft.program ? similarCases(draft.payerId, draft.program) : null;

  const edited = (next: NarrativeSection[]) => {
    patch(draft.id, { narrative: next });
    setRechecking(true);
    timer.current = setTimeout(() => {
      setRechecking(false);
      toast({ title: "Integrity re-checked your edits", body: next.some((s) => !s.text.trim()) ? "One section is empty, so signing is blocked." : "Every sentence still traces to the chart.", tone: next.some((s) => !s.text.trim()) ? "risk" : "good" });
    }, RECHECK_MS);
  };

  const onSign = () => {
    const id = sign(draft.id);
    if (id) nav(paths.dashboard({ request: id }));
    else toast({ title: "Could not sign yet", body: "All agents must finish before the request can be signed.", tone: "mid" });
  };

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5">
        <div className="flex flex-col gap-5">
          <NarrativeCard sections={sections} payer={payer?.shortName ?? "the payer"} onSave={edited} onSource={(label) => setSource(slotOfSource(label))} />
          <ValidationSummary draft={draft} />
        </div>
        <div className="flex flex-col gap-4">
          <ChecksCard checks={checks} />
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
          <SignCard draft={draft} checks={checks} chance={chance} onSign={onSign} />
        </div>
      </div>
      <StepFooter
        actions={
          <>
            <Button icon={ArrowLeft} onClick={() => patch(draft.id, { step: 1 })}>
              Back
            </Button>
            <Button
              icon={Save}
              onClick={() => {
                save(draft.id);
                toast({ title: "Draft saved", body: `${draft.caseId ?? "The draft"} is in Case Manager, ready to sign.`, tone: "good" });
              }}
            >
              Save as draft
            </Button>
          </>
        }
        hint="Nothing goes to the payer until a clinician signs."
      />
      <DocPreviewDrawer draft={draft} slot={source} highlight onClose={() => setSource(null)} />
    </>
  );
}
