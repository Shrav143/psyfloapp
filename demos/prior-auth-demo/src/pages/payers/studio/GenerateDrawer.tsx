import { useState } from "react";
import { AlertTriangle, CheckCircle2, ListChecks, Settings2, Sparkles } from "lucide-react";
import { Banner, Button, Drawer, Pill } from "@/components/ui";
import type { PayerRule } from "@/data/workflow/types";
import type { Program } from "@/data/types";
import { useStore } from "@/store";
import { AreaField, PanelHeading } from "./fields/controls";
import { generateDraft, type FloDraft } from "./lib/floDrafts";
import { api } from "./lib/store";
import type { PayerInfo } from "./NewWorkflowDrawer";

/* Generate with FLO: describe the process, get a draft to review. No model is behind it in this demo, and the panel says so every time. */

const EXAMPLES = [
  "Initial authorization for residential. Check eligibility and benefits, collect the treatment plan and assessment, a clinician approves, then submit by portal. Notice must be given within 24 hours.",
  "Concurrent review for IOP. Check units left, collect progress notes, fax the request when the portal is down.",
  "Retroactive request for PHP. Verify coverage for the dates of service, check the backdating rule, then send it to a person.",
];

export function GenerateDrawer({ payer, docs, rules, onClose, onCreated }: { payer: PayerInfo; docs: Record<Program, { id: string; title: string }[]> | undefined; rules: PayerRule[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<FloDraft | null>(null);
  const cfg = useStore((s) => s.payerConfig[payer.id]);

  const generate = () => {
    setBusy(true);
    setDraft(null);
    window.setTimeout(() => {
      setDraft(generateDraft(text, { payerId: payer.id, payerName: payer.name, state: payer.state, product: payer.product, rules, docs, reachedBy: cfg?.reachedBy ?? "Portal", today: "2026-10-20", owner: "Jordan Perez" }));
      setBusy(false);
    }, 900);
  };

  const open = () => {
    if (!draft) return;
    const id = api.create({ payerId: payer.id, name: draft.name, description: draft.description, state: payer.state, product: payer.product, services: draft.services, requestType: draft.requestType, effectiveFrom: "2026-10-20", owner: "Jordan Perez" });
    if (!id) return;
    api.saveDraft(id, { nodes: draft.graph.nodes, edges: draft.graph.edges }, "Drafted by FLO from a description (demo draft)");
    onCreated(id);
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width={600}
      title="Generate with FLO"
      subtitle="Describe the process and FLO drafts a workflow for you to review."
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted">A person must review and publish it.</span>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            {draft ? <Button variant="primary" onClick={open}>Put the draft on the canvas</Button> : <Button variant="primary" icon={Sparkles} loading={busy} disabled={text.trim().length < 8} onClick={generate}>Generate a demo draft</Button>}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Banner tone="neutral" title="Demo draft: not a live model, not payer policy">
          No model runs behind this demo. FLO picks a sample workflow by the words you use and fills in what it can. Anything you write about the payer's policy is kept as an unverified note, never as a rule.
        </Banner>
        <AreaField label="Describe the payer's process in plain English" rows={6} value={text} onChange={(v) => { setText(v); setDraft(null); }} placeholder="For example: initial residential authorization. Verify coverage, collect the treatment plan, a clinician approves, submit by portal." />
        <div>
          <PanelHeading>Examples</PanelHeading>
          <div className="mt-2 flex flex-col gap-1.5">
            {EXAMPLES.map((e) => (
              <button key={e} type="button" onClick={() => { setText(e); setDraft(null); }} className="rounded-xl border border-line bg-white px-3 py-2 text-left text-[13px] text-ink2 hover:bg-tile">
                {e}
              </button>
            ))}
          </div>
        </div>

        {draft ? (
          <section aria-label="The draft" className="flex flex-col gap-5 rounded-2xl border border-edge bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="m-0 font-serif text-[18px] font-semibold">{draft.name}</h3>
              <Pill tone="mid" dot>Demo draft: not a live model, not payer policy</Pill>
            </div>
            <p className="m-0 text-[13px] text-muted">Matched on: {draft.matched.join(", ")}.</p>
            <Block icon={CheckCircle2} title="What FLO proposed" items={draft.proposed} />
            <Block icon={AlertTriangle} title="Rules it needs that are not on file" items={draft.missingRules} none="Every rule it needs is on file. They are still unverified samples." />
            <Block icon={Settings2} title="Things to set up" items={draft.setup} />
            {draft.notes.length ? <Block icon={ListChecks} title="Kept as unverified notes, not as rules" items={draft.notes} /> : null}
            <p className="m-0 rounded-xl bg-sage-bg px-3.5 py-2.5 text-[13px] text-good-ink">It lands on the canvas as a draft. A person has to review it, run it in Test Workflow and publish it. Nothing here is used for a real case until then.</p>
          </section>
        ) : null}
      </div>
    </Drawer>
  );
}

function Block({ icon: Icon, title, items, none }: { icon: typeof Sparkles; title: string; items: string[]; none?: string }) {
  return (
    <div>
      <h4 className="m-0 flex items-center gap-2 text-[14px] font-semibold"><Icon size={16} className="ico text-sage" aria-hidden="true" />{title}</h4>
      {items.length ? (
        <ul className="mt-2 mb-0 flex list-disc flex-col gap-1 pl-5 text-[13px] text-ink2">
          {items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 mb-0 text-[13px] text-muted">{none ?? "Nothing."}</p>
      )}
    </div>
  );
}
