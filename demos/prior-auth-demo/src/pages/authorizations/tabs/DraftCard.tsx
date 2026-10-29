import { useMemo, useState } from "react";
import { CircleCheck, PenLine, RefreshCw, Undo2, TriangleAlert } from "lucide-react";
import { Button, Card, CardHeader, Label, Modal, Pill, TextArea } from "@/components/ui";
import type { Evidence } from "@/data/caseDetail";
import { checkViews, versionViews, type VersionView } from "@/data/caseModel";
import { cn } from "@/lib/cn";
import { stamp } from "@/lib/time";
import { appliedAdds, draftForRequest, requestDraft } from "@/pages/newcase/fromRequest";
import { narrativeOf, unfoldedAdds } from "@/pages/newcase/narrative";
import { usePayerContext } from "@/pages/newcase/payerContext";
import { useStore } from "@/store";
import type { CaseCtx } from "../caseTypes";
import { EvidenceChip, uniqueEvidence } from "../EvidenceChip";
import { Fold } from "../Fold";
import { useBusy } from "../useBusy";

const NO_CONTEXT: string[] = [];
/** The case page keeps its own names for two sections; its saved edits and test ids still use them. */
const OWN_ID: Record<string, string> = { level: "lower", severity: "current" };

export interface DraftSectionView {
  id: string;
  title: string;
  text: string;
  /** The chips of the chart pages the text came from (kept by the case page), then the ones the applied actions added. */
  sources: Evidence[];
  /** What the New Authorization summary lists as this section's chips. */
  summarySources: string[];
  /** Sentences from applied actions that the summary does not hold yet. They follow the text in a green mark. */
  added: { recId: string; text: string }[];
  /** Comes from the case page's Add clinical context: shown here, not edited here. */
  fixed: boolean;
}
const sectionText = (s: DraftSectionView): string => [s.text, ...s.added.map((a) => a.text)].join(" ");
/** Whether a section rests on a source: the clinical rail's "Show in draft" lights it. */
export const usesSource = (s: DraftSectionView, label: string): boolean => s.sources.some((e) => e.label === label) || s.summarySources.includes(label);
/** The test id of a section: the case page's own name for two of them. */
export const sectionTestId = (id: string): string => `draft-${OWN_ID[id] ?? id}`;

/** The draft sections: the same summary Review and sign reads in New Authorization (one narrative per request), with the context added on this page. */
export function useDraftSections(ctx: CaseCtx): DraftSectionView[] {
  const { detail, work } = ctx;
  const clock = useStore((s) => s.clock);
  const shared = useStore((s) => draftForRequest(s.caseDrafts, detail.requestId, detail.id));
  const context = useStore((s) => s.clinicalContext[detail.requestId]) ?? NO_CONTEXT;
  const payerCtx = usePayerContext(detail);
  /* Before the request has a draft, show the summary its draft would have, so opening Review and sign changes nothing. */
  const basis = useMemo(() => shared ?? requestDraft(detail, work, clock, payerCtx), [shared, detail, work, clock, payerCtx]);
  const adds = useMemo(() => appliedAdds(detail, work), [detail, work]);
  return useMemo<DraftSectionView[]>(() => {
    const open = unfoldedAdds(basis, adds);
    return narrativeOf(basis, context).map((n) => ({
      id: n.id, title: n.heading, text: n.text, fixed: !!n.fixed, summarySources: n.sources,
      // Matched by id, not by position: a request type with a "basis" section has one more section than the case page's own list.
      sources: [...(detail.draft.find((d) => d.id === (OWN_ID[n.id] ?? n.id))?.sources ?? []), ...adds.filter((a) => a.section === n.id).flatMap((a) => (a.source ? [a.source] : []))],
      added: open.filter((a) => a.section === n.id).map(({ recId, text }) => ({ recId, text })),
    }));
  }, [basis, context, adds, detail]);
}

/** The medical necessity request, section by section: read, edit, re-check, send back. Integrity's checks and the versions are one click away under it. */
export function DraftCard({ ctx, sections, lit }: { ctx: CaseCtx; sections: DraftSectionView[]; lit: string[] }) {
  const { detail, work, key } = ctx;
  const adds = useMemo(() => appliedAdds(detail, work), [detail, work]);
  const checks = checkViews(detail, work);
  const versions = versionViews(detail, work);
  const failing = checks.filter((c) => !c.ok).length;
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<VersionView | null>(null);
  const [rechecking, runRecheck] = useBusy();
  const [sendingBack, runBack] = useBusy();
  const store = useStore.getState;

  const startEdit = () => {
    setValues(Object.fromEntries(sections.filter((s) => !s.fixed).map((s) => [s.id, sectionText(s)])));
    setEditing(true);
  };
  const save = () => {
    const own = sections.filter((s) => !s.fixed);
    const changed = own.filter((s) => (values[s.id] ?? "").trim() !== sectionText(s));
    setEditing(false);
    if (changed.length === 0) {
      store().toast({ title: "No changes to save", tone: "neutral" });
      return;
    }
    const edits = Object.fromEntries(changed.map((s) => [OWN_ID[s.id] ?? s.id, { text: values[s.id].trim(), includes: work.applied }]));
    const text = (s: DraftSectionView) => (values[s.id] ?? sectionText(s)).trim();
    store().saveDraft(key, edits, { n: versions.length + 1, snapshot: own.map((s) => `${s.title}. ${text(s)}`).join("\n\n") });
    /* The edited text goes to the draft in New Authorization, so Review and sign reads it too. Every applied action's sentence is in it from now on. */
    const id = store().draftFromRequest(detail.requestId);
    store().patchCaseDraft(id, { narrative: own.map((s) => ({ id: s.id, heading: s.title, text: text(s), sources: s.summarySources })), narrativeIncludes: adds.map((a) => a.recId) });
    store().toast({ title: "Draft saved", body: "Integrity reads it again before it can be signed.", tone: "mid" });
  };
  const recheck = () =>
    runRecheck(1600, () => {
      const still = checks.filter((c) => !c.ok && c.id !== "chart").length;
      store().markRechecked(key);
      store().toast(still === 0 ? { title: "All four checks passed", tone: "good" } : { title: `${still} ${still === 1 ? "check needs" : "checks need"} an action`, body: "Apply the matching recommendation, then check again.", tone: "mid" });
    });
  const sendBack = () =>
    runBack(1400, () => {
      store().logCase(key, "You sent the draft back to Scribe");
      store().toast({ title: "Sent back to Scribe", tone: "neutral" });
    });
  const current = versions[0];

  return (
    <Card id="draft" className="scroll-mt-4">
      <CardHeader
        title="Medical necessity request" subtitle={`Version ${current.n} · ${current.by} · ${stamp(current.at)}`}
        right={editing ? <><Button size="sm" onClick={() => setEditing(false)}>Cancel</Button><Button size="sm" variant="primary" onClick={save}>Save changes</Button></> : <Button size="sm" icon={PenLine} onClick={startEdit}>Edit</Button>}
      />
      <div className="flex flex-col gap-1 px-5 py-3">
        {sections.map((s) => {
          const on = lit.includes(s.id);
          return editing && !s.fixed ? (
            <div key={s.id} className="py-1.5">
              <Label className="mb-1.5">{s.title}</Label>
              <TextArea rows={4} aria-label={`Edit ${s.title}`} value={values[s.id] ?? ""} onChange={(e) => setValues({ ...values, [s.id]: e.target.value })} />
            </div>
          ) : (
            <section key={s.id} data-testid={sectionTestId(s.id)} data-lit={on || undefined} className={cn("-mx-2 rounded-xl px-2 py-2 transition-colors", on && "bg-good-bg ring-1 ring-good-edge")}>
              <h4 className="text-[13px] font-semibold text-ink">{s.title}</h4>
              <p className="mt-0.5 text-[14px] leading-[1.65]">
                {s.text}{" "}
                {s.added.map((a) => (
                  <mark key={a.recId} className="rounded bg-good-bg px-1 text-ink">{a.text}<span className="ml-1.5 rounded-full bg-white px-1.5 text-[11px] font-semibold tracking-wide text-good-ink uppercase">New</span></mark>
                ))}
              </p>
              {s.sources.length ? <div className="mt-1 flex flex-wrap gap-1.5">{uniqueEvidence(s.sources).map((src) => <EvidenceChip key={src.label} evidence={src} detail={detail} />)}</div> : null}
            </section>
          );
        })}
      </div>
      <div className="border-t border-line px-5 py-1" id="draft-checks">
        <Fold
          testId="checks-fold" open={work.dirty}
          head={<span className="text-[13px] font-semibold">Integrity checks</span>}
          right={failing === 0 ? <Pill tone="good" dot>{checks.length}/{checks.length}</Pill> : <Pill tone="mid" dot>{failing} open</Pill>}
        >
          <div data-testid="checks" className="pb-2">
            {checks.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5 border-b border-line py-2 last:border-b-0">
                {c.ok ? <CircleCheck size={16} className="ico mt-0.5 text-good" aria-label="Passed" /> : <TriangleAlert size={16} className="ico mt-0.5 text-mid" aria-label="Needs attention" />}
                <div className="min-w-0 flex-1 text-[13px]">
                  <div className="font-medium">{c.label}</div>
                  {c.ok ? null : <div className="text-mid-ink">{c.note}</div>}
                </div>
                <Pill tone={c.ok ? "good" : "mid"}>{c.ok ? "Pass" : "Warn"}</Pill>
              </div>
            ))}
            <div className="pt-2"><Button size="sm" icon={RefreshCw} loading={rechecking} onClick={recheck}>Re-check</Button></div>
          </div>
        </Fold>
        <Fold head={<span className="text-[13px] font-semibold">Versions</span>} right={<span className="text-[12px] text-muted">{versions.length}</span>} className="border-t border-line">
          <div className="pb-2">
            {versions.map((v) => (
              <div key={v.n} className="flex items-center gap-3 border-b border-line py-2 last:border-b-0">
                <div className="min-w-0 flex-1 text-[13px]">
                  <span className="font-semibold">Version {v.n}</span> <span className="text-muted">· {stamp(v.at)} · {v.by} · {v.note}</span>
                </div>
                {v.current ? <Pill tone="good">Current</Pill> : <Button size="sm" onClick={() => setViewing(v)}>View</Button>}
              </div>
            ))}
          </div>
        </Fold>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
        <Button size="sm" icon={Undo2} loading={sendingBack} onClick={sendBack}>Send back to Scribe</Button>
      </div>
      {viewing ? (
        <Modal open onClose={() => setViewing(null)} title={`Version ${viewing.n}`} subtitle={`${stamp(viewing.at)} · ${viewing.by} · read only`} footer={<Button onClick={() => setViewing(null)}>Close</Button>}>
          <div className="text-[14px] leading-[1.7] whitespace-pre-wrap">{viewing.text}</div>
        </Modal>
      ) : null}
    </Card>
  );
}
