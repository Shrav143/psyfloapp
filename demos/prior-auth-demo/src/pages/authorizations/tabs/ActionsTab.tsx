import { useEffect, useMemo, useState } from "react";
import { WandSparkles } from "lucide-react";
import { Banner, Button } from "@/components/ui";
import type { FocusId } from "@/data/caseDetail";
import { FOCUS, withFocus } from "@/data/caseDetailFocus";
import { canSend, draftView, groupRecs, plainText, projectedChance, currentChance, similarTotal, versionViews } from "@/data/caseModel";
import { useStore } from "@/store";
import type { CaseCtx } from "../caseTypes";
import { useBusy } from "../useBusy";
import { ActionsSide } from "./ActionsSide";
import { DismissModal } from "./DismissModal";
import { AppliedList, DismissedList } from "./RecLists";
import { RecCard } from "./RecCard";
import { WorkStrip } from "./WorkStrip";

export function ActionsTab({ ctx }: { ctx: CaseCtx }) {
  const { detail, work, key, focusRec } = ctx;
  const groups = useMemo(() => groupRecs(detail, work), [detail, work]);
  const included = groups.open.filter((r) => !work.excluded.includes(r.id));
  const [showErrors, setShowErrors] = useState(false);
  const [dismissing, setDismissing] = useState<{ id: string; title: string }[] | null>(null);
  const [refining, runRefine] = useBusy();

  // Applying takes about 8 seconds: bring the strip and the approval chance ring into view together.
  const running = work.run !== null;
  useEffect(() => {
    if (running) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [running]);
  useEffect(() => {
    if (focusRec) document.getElementById(`rec-${focusRec}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusRec]);

  const apply = () => {
    const missing = included.filter((r) => r.input && !(work.inputs[r.id] ?? "").trim());
    if (missing.length) {
      setShowErrors(true);
      useStore.getState().toast({ title: "Add your answer first", body: `${missing.length === 1 ? "One selected action needs" : `${missing.length} selected actions need`} your input before it can be applied.`, tone: "mid" });
      document.getElementById(`rec-${missing[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const next = { ...work, applied: [...work.applied, ...included.map((r) => r.id)] };
    const after = currentChance(detail, next);
    useStore.getState().applyRecs({
      caseId: key, requestId: detail.requestId, syncChance: detail.fromQueue, recs: included.map((r) => ({ id: r.id, title: r.title, agent: r.agent })), chance: after, liftLeft: projectedChance(detail, next) - after, ready: canSend(detail, next),
      versionN: versionViews(detail, work).length + 1, snapshot: plainText(draftView(detail, next)),
    });
  };
  // Setting a focus re-orders the cards and may add one, so the chance preview can move. Clearing it puts them back.
  const setFocus = (focus: FocusId | null) => {
    const next = withFocus(detail, { ...work, focus });
    useStore.getState().setFocus(key, focus, projectedChance(next, work) - currentChance(next, work));
    if (focus) {
      const added = next.recs.some((r) => r.focus === focus);
      useStore.getState().toast({ title: "Recommendations refined", body: `Cards are in the order for "${FOCUS[focus].label}"${added ? ", and one was added" : ""}. With every action applied the chance is ${projectedChance(next, work)}%.`, tone: "good" });
    }
  };
  const refine = (focus: FocusId) => runRefine(1200, () => setFocus(focus));
  const addContext = (text: string) => {
    const next = { ...work, context: [...work.context, text] };
    const after = currentChance(detail, next);
    useStore.getState().addContext({ caseId: key, requestId: detail.requestId, text, syncDashboard: detail.fromQueue, chance: after, liftLeft: projectedChance(detail, next) - after });
  };
  const gating = (ids: string[]) => detail.checks.filter((c) => c.blockedBy.some((b) => ids.includes(b))).length > 0;
  const sections = new Set(included.map((r) => r.add?.section).filter(Boolean)).size;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-5">
      <div className="flex flex-col gap-3.5">
        {work.run ? <WorkStrip run={work.run} sections={Math.max(1, sections)} similar={similarTotal(detail)} /> : null}
        <p className="text-sm text-muted">Each card shows what the agents will add to the draft and how much it tends to help. Applied together, they take the chance from {detail.baseChance}% to {projectedChance(detail, { ...work, applied: [], dismissed: [] }) }%.</p>
        {work.focus ? (
          <Banner icon={WandSparkles} action={<Button size="sm" variant="ghost" onClick={() => setFocus(null)}>Clear focus</Button>}>
            <b className="font-semibold">Focus: {FOCUS[work.focus].label}.</b> The cards are in that order{detail.recs.some((r) => r.focus === work.focus) ? ", and one card was added" : ""}.
          </Banner>
        ) : null}
        {groups.open.length === 0 && groups.applied.length > 0 ? <Banner tone="good" title="Every recommendation is applied">The draft is up to date. Open the Draft tab to read it, or send it to the payer.</Banner> : null}
        {groups.open.map((r) => (
          <RecCard
            key={r.id} rec={r} selected={!work.excluded.includes(r.id)} answer={work.inputs[r.id] ?? ""} note={work.notes[r.id]} focus={focusRec === r.id} showError={showErrors} disabled={running}
            onToggle={() => useStore.getState().toggleRec(key, r.id)} onAnswer={(v) => useStore.getState().setRecInput(key, r.id, v)}
            onSendNote={(v) => useStore.getState().sendNote(key, r.id, v, r.agent)} onDismiss={() => setDismissing([{ id: r.id, title: r.title }])}
          />
        ))}
        {groups.applied.length > 0 ? <AppliedList recs={groups.applied} /> : null}
        {groups.dismissed.length > 0 ? <DismissedList items={groups.dismissed} onRestore={(id) => useStore.getState().restoreRec(key, id)} /> : null}
      </div>
      <ActionsSide
        included={included.length} openCount={groups.open.length} running={running} canSend={ctx.canSend} sent={ctx.sent} sendReason={ctx.sendReason} refining={refining} work={work}
        onApply={apply} onSend={ctx.send} onRefine={refine} onContext={addContext} onDismiss={() => setDismissing(included.map((r) => ({ id: r.id, title: r.title })))}
      />
      {dismissing ? (
        <DismissModal
          titles={dismissing.map((d) => d.title)} gating={dismissing.filter((d) => gating([d.id])).map((d) => d.title)} onClose={() => setDismissing(null)}
          onConfirm={(reason) => { useStore.getState().dismissRecs(key, detail.requestId, dismissing, reason); setDismissing(null); }}
        />
      ) : null}
    </div>
  );
}
