import { useMemo, useState } from "react";
import { Button, Drawer, Pill } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { viewerById } from "@/data/viewers";
import { REQUEST_TYPE_LABEL, type AppliedWorkflow, type Workflow } from "@/data/workflow/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { diffWorkflows } from "./diff";
import { runWorkflow } from "./engine";
import { workflowOfVersion, type CaseWorkflow } from "./model";

export type ReviewKind = "choose" | "newer" | "changed";

const TITLE: Record<ReviewKind, string> = { choose: "Choose a workflow", newer: "Review newer version", changed: "Review the workflow match" };

const appliedOf = (w: Workflow, at: number, explanation: string): AppliedWorkflow => ({ workflowId: w.id, version: w.version, name: w.name, appliedAt: at, usedDefault: false, explanation });

/** The right-hand panel where a person decides about the workflow: pick one of two equally specific workflows, switch to a newer version, or accept a different match after the case changed.
    Nothing here changes a request that was already sent; the choice is written to the case's history with who made it. */
export function ReviewWorkflowDrawer({ draft, view, kind, onClose }: { draft: CaseDraft; view: CaseWorkflow; kind: ReviewKind | null; onClose: () => void }) {
  const record = useStore((s) => s.recordCaseWorkflow);
  const toast = useStore((s) => s.toast);
  const clock = useStore((s) => s.clock);
  const viewerId = useStore((s) => s.viewerId);
  const you = viewerById(viewerId).name;
  const [picked, setPicked] = useState<string | null>(null);
  const { applied, newer, library } = view;

  const diff = useMemo(() => (newer ? diffWorkflows(view.workflow, newer) : null), [view.workflow, newer]);
  const nextRun = useMemo(() => (newer ? runWorkflow(newer, { ...view.facts, approvals: {} }, library.rules) : null), [newer, view.facts, library.rules]);
  const snap = newer ? library.versions.find((v) => v.workflowId === newer.id && v.version === newer.version && v.status === "published") : undefined;
  const latest = newer ? (snap ? workflowOfVersion(snap) : newer) : null;

  const apply = (next: AppliedWorkflow, text: string, detail: string, choice?: CaseDraft["workflowChoice"] | null) => {
    record(draft.id, { applied: next, pin: view.pinned, choice, entries: [{ key: `review:${next.workflowId}:${next.version}:${clock}`, at: clock, actor: "you", text, detail }] });
    toast({ title: "Workflow applied", body: `${next.name}${next.usedDefault ? "" : `, version ${next.version}`} is what this case follows now.`, tone: "good" });
    onClose();
  };

  const body = (() => {
    if (kind === "choose" && view.conflict) {
      const among = view.conflict.map((w) => w.id);
      const pick = picked ?? view.conflict[0].id;
      const chosen = view.conflict.find((w) => w.id === pick) ?? view.conflict[0];
      const others = view.conflict.filter((w) => w.id !== chosen.id).map((w) => w.name).join(", ");
      return (
        <>
          <p className="text-[14px] text-ink2">
            {view.conflict.length} published workflows are equally specific for this case. Psyflo never picks one silently, so the default process is used until you choose. Your choice is written to the case's history.
          </p>
          <fieldset className="mt-5 flex flex-col gap-2.5">
            <legend className="sr-only">Workflow for this case</legend>
            {view.conflict.map((w) => {
              const why = view.match.candidates.find((c) => c.workflow.id === w.id)?.why ?? [];
              return (
                <label key={w.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-edge bg-white px-4 py-3.5 has-[:checked]:border-forest">
                  <input type="radio" name="workflow" className="mt-1" checked={pick === w.id} onChange={() => setPicked(w.id)} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{w.name} <span className="font-normal text-muted">· v{w.version}</span></span>
                    <span className="block text-[13px] text-muted">{w.requestType === "any" ? "Any request type" : REQUEST_TYPE_LABEL[w.requestType]} · {w.services.length ? `${w.services.length} service${w.services.length === 1 ? "" : "s"}` : "Every service"} · effective {w.effectiveFrom}</span>
                    {why.length ? <span className="mt-1 block text-[13px] text-ink2">Matches on {why.length > 1 ? `${why.slice(0, -1).join(", ")} and ${why[why.length - 1]}` : why[0]}.</span> : null}
                  </span>
                </label>
              );
            })}
          </fieldset>
          <div className="mt-5 flex gap-2.5">
            <Button
              variant="primary"
              onClick={() =>
                apply(
                  appliedOf(chosen, clock, `${chosen.name} was chosen between ${view.conflict?.length} equally specific workflows by ${you}.`),
                  `Workflow chosen: ${chosen.name} v${chosen.version} (${others || "the other"} matched equally)`,
                  `Chosen by ${you}. ${view.match.explanation}`,
                  { workflowId: chosen.id, among, by: you, at: clock },
                )
              }
            >
              Use this workflow
            </Button>
            <Button onClick={onClose}>Keep the default for now</Button>
          </div>
        </>
      );
    }
    if (kind === "newer" && newer && diff && nextRun) {
      const lines = [...diff.scope, ...diff.added.map((t) => `Added: ${t}`), ...diff.removed.map((t) => `Removed: ${t}`), ...diff.changed.map((t) => `Changed: ${t}`), ...(diff.routes ? ["The order or branches of the steps changed"] : [])];
      return (
        <>
          <p className="text-[14px] text-ink2">
            This case started on <b>{applied.name}, version {applied.version}</b> and keeps it until you decide. Version {newer.version} was published since.
            {snap ? <> Saved by {snap.savedBy}, {stamp(snap.savedAt)}.{snap.reason ? ` Reason: ${snap.reason}` : ""}</> : null}
          </p>
          <h3 className="mt-5 font-serif text-[18px] font-semibold">What changed</h3>
          {diff.empty ? (
            <p className="mt-1.5 text-[13.5px] text-muted">The steps are the same. Only the saved version number moved.</p>
          ) : (
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[13.5px] text-ink2">
              {lines.slice(0, 10).map((l) => <li key={l}>{l}</li>)}
              {lines.length > 10 ? <li className="list-none text-muted">and {lines.length - 10} more</li> : null}
            </ul>
          )}
          <h3 className="mt-5 font-serif text-[18px] font-semibold">What it would mean for this case</h3>
          <dl className="mt-2 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-[13.5px]">
            <dt className="text-muted">Now, v{applied.version}</dt>
            <dd>{view.run.outcomeText}</dd>
            <dt className="text-muted">With v{newer.version}</dt>
            <dd>{nextRun.outcomeText}</dd>
          </dl>
          <p className="mt-4 text-[13px] text-muted">Applying it changes the steps this case follows from here. A packet that was already sent is never rewritten. The switch is written to the case's history.</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button
              variant="primary"
              onClick={() =>
                apply(
                  appliedOf(latest ?? newer, clock, `Version ${newer.version} was reviewed and applied by ${you}. It replaces version ${applied.version}.`),
                  `Workflow updated: ${newer.name} v${applied.version} to v${newer.version}, reviewed by ${you}`,
                  `${diff.empty ? "No change to the steps." : lines.slice(0, 4).join(". ")}. Requests already sent are not changed.`,
                )
              }
            >
              Apply version {newer.version}
            </Button>
            <Button onClick={onClose}>Keep version {applied.version}</Button>
          </div>
        </>
      );
    }
    if (kind === "changed") {
      const next = view.target;
      return (
        <>
          <p className="text-[14px] text-ink2">
            The payer, the level of care or the Authorization type changed after the workflow started. This case still follows <b>{applied.name}{applied.usedDefault ? "" : `, version ${applied.version}`}</b>.
            A match for the case as it is now would use <b>{next.name}{next.usedDefault ? "" : `, version ${next.version}`}</b>.
          </p>
          <p className="mt-3 text-[13.5px] text-muted">{next.explanation}</p>
          {view.conflict ? <p className="mt-3 text-[13.5px] text-mid-ink">{view.conflict.map((w) => w.name).join(" and ")} match equally. Choose one first.</p> : null}
          <p className="mt-4 text-[13px] text-muted">Applying it changes the steps this case follows from here. A packet that was already sent is never rewritten. The switch is written to the case's history.</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button variant="primary" onClick={() => apply(next, `Workflow changed: ${applied.name} to ${next.name}${next.usedDefault ? "" : ` v${next.version}`}, reviewed by ${you}`, next.explanation)}>
              Apply {next.usedDefault ? "the default process" : `${next.name}`}
            </Button>
            <Button onClick={onClose}>Keep {applied.usedDefault ? "the default" : `version ${applied.version}`}</Button>
          </div>
        </>
      );
    }
    return null;
  })();

  return (
    <Drawer open={kind !== null} onClose={onClose} width={520} title={kind ? TITLE[kind] : ""} subtitle={<Pill tone="neutral">Published workflows, clinic-wide</Pill>}>
      {body}
    </Drawer>
  );
}
