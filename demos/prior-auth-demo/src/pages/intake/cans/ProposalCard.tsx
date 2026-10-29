import { useMemo, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { AgentChip, Button, Chip, Pill, TextArea } from "@/components/ui";
import type { CansAssessment, IntakeRecord, Suggestion } from "@/data/intake/types";
import { useStore } from "@/store";
import { SourceLink } from "../shared/provenance";
import { proposalFacts } from "./explain";
import { ItemSelect } from "./ItemSelect";

/** One statement the CANS Evidence Agent proposes. It shows where it would be filed, why it was proposed and what to check, and waits for a person to accept, edit or reject it. */
export function ProposalCard({ record, cans, sg }: { record: IntakeRecord; cans: CansAssessment; sg: Suggestion }) {
  const decide = useStore((s) => s.decideCansEvidence);
  const facts = useMemo(() => proposalFacts(record, cans, sg), [record, cans, sg]);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(sg.value);
  const [itemId, setItemId] = useState(facts.item?.id ?? cans.items[0]?.id ?? "");
  const locked = cans.status === "signed";
  const templated = !!cans.template && cans.items.length > 0;
  return (
    <div data-proposal={sg.id} className="rounded-xl border border-mid-edge bg-mid-bg/50 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <AgentChip agent={sg.agent} />
        <Chip>{facts.domain?.label ?? facts.theme}</Chip>
        <Pill tone="mid">AI suggested · needs review</Pill>
        {facts.risk ? <Pill tone="risk">A clinician reviews</Pill> : null}
        {facts.hedged ? <Pill tone="mid">Hedged or second-hand</Pill> : null}
        {facts.disagreement ? <Pill tone="mid">Another source disagrees</Pill> : null}
      </div>
      {facts.item ? <p className="mt-1.5 text-[12px] text-ink2">Potentially relevant item: <span className="font-semibold text-ink">{facts.item.name}</span> (demo placeholder)</p> : null}
      {editing ? <TextArea className="mt-2" rows={3} value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit the evidence" /> : <p className="mt-1.5 text-[14px] text-ink">{sg.value}</p>}
      {facts.disagreement ? <p className="mt-1 text-[12px] text-mid-ink">{facts.disagreement}. Psyflo does not decide which is right; a clinician clarifies.</p> : null}
      <p className="mt-1.5 text-[12px] text-muted"><span className="font-semibold text-ink2">Why: </span>{facts.explanation}</p>
      {editing && templated ? <div className="mt-2 max-w-[320px]"><ItemSelect cans={cans} value={itemId} onChange={setItemId} label="Tie to item" /></div> : null}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <SourceLink record={record} source={sg.source} />
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="primary" icon={Check} disabled={locked || !text.trim()} onClick={() => decide(record.id, sg.id, true, { edited: text, itemId: templated ? itemId : undefined })}>Save and accept</Button>
              <Button size="sm" onClick={() => { setEditing(false); setText(sg.value); }}>Cancel</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="primary" icon={Check} disabled={locked} onClick={() => decide(record.id, sg.id, true)}>Accept evidence</Button>
              <Button size="sm" icon={Pencil} disabled={locked} onClick={() => setEditing(true)}>Edit</Button>
              <Button size="sm" icon={X} disabled={locked} onClick={() => decide(record.id, sg.id, false)}>Reject</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
