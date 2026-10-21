import { useMemo, useState } from "react";
import { Check, CircleCheck, PenLine, RefreshCw, Send, TriangleAlert } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Label, Modal, Pill, TextArea } from "@/components/ui";
import type { Evidence } from "@/data/caseDetail";
import { checkViews, versionViews, type VersionView } from "@/data/caseModel";
import { stamp } from "@/lib/time";
import { appliedAdds, draftForRequest, requestDraft } from "@/pages/newcase/fromRequest";
import { narrativeOf, unfoldedAdds } from "@/pages/newcase/narrative";
import { usePayerContext } from "@/pages/newcase/payerContext";
import { useStore } from "@/store";
import type { CaseCtx } from "../caseTypes";
import { EvidenceChip, uniqueEvidence } from "../EvidenceChip";
import { useBusy } from "../useBusy";

const NO_CONTEXT: string[] = [];
/** The case page keeps its own names for two sections; its saved edits and test ids still use them. */
const OWN_ID: Record<string, string> = { level: "lower", severity: "current" };

interface Section {
  id: string;
  title: string;
  text: string;
  /** The chips of the chart pages the text came from (kept by the case page), then the ones the applied actions added. */
  sources: Evidence[];
  /** What the New case summary lists as this section's chips. */
  summarySources: string[];
  /** Sentences from applied actions that the summary does not hold yet. They follow the text in a green mark. */
  added: { recId: string; text: string }[];
  /** Comes from the case page's Add clinical context: shown here, not edited here. */
  fixed: boolean;
}
const sectionText = (s: Section): string => [s.text, ...s.added.map((a) => a.text)].join(" ");

/** The Draft tab reads the same summary as Review and sign in New case: one narrative per request, with the context added on this page. */
export function DraftTab({ ctx }: { ctx: CaseCtx }) {
  const { detail, work, key, canSend, sendReason, sent, send } = ctx;
  const clock = useStore((s) => s.clock);
  const shared = useStore((s) => draftForRequest(s.caseDrafts, detail.requestId, detail.id));
  const context = useStore((s) => s.clinicalContext[detail.requestId]) ?? NO_CONTEXT;
  const payerCtx = usePayerContext(detail);
  /* Before the request has a draft, show the summary its draft would have, so opening Review and sign changes nothing. */
  const basis = useMemo(() => shared ?? requestDraft(detail, work, clock, payerCtx), [shared, detail, work, clock, payerCtx]);
  const adds = useMemo(() => appliedAdds(detail, work), [detail, work]);
  const sections = useMemo<Section[]>(() => {
    const open = unfoldedAdds(basis, adds);
    return narrativeOf(basis, context).map((n, i) => ({
      id: n.id, title: n.heading, text: n.text, fixed: !!n.fixed, summarySources: n.sources,
      sources: [...(detail.draft[i]?.sources ?? []), ...adds.filter((a) => a.section === n.id).flatMap((a) => (a.source ? [a.source] : []))],
      added: open.filter((a) => a.section === n.id).map(({ recId, text }) => ({ recId, text })),
    }));
  }, [basis, context, adds, detail]);
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
    const text = (s: Section) => (values[s.id] ?? sectionText(s)).trim();
    store().saveDraft(key, edits, { n: versions.length + 1, snapshot: own.map((s) => `${s.title}. ${text(s)}`).join("\n\n") });
    /* The edited text goes to the draft in New case, so Review and sign reads it too. Every applied action's sentence is in it from now on. */
    const id = store().draftFromRequest(detail.requestId);
    store().patchCaseDraft(id, { narrative: own.map((s) => ({ id: s.id, heading: s.title, text: text(s), sources: s.summarySources })), narrativeIncludes: adds.map((a) => a.recId) });
    store().toast({ title: "Draft saved", body: "Integrity needs to read it again before it can be signed. Use Re-check.", tone: "mid" });
  };
  const recheck = () =>
    runRecheck(1600, () => {
      const still = checks.filter((c) => !c.ok && c.id !== "chart").length;
      store().markRechecked(key);
      store().toast(still === 0 ? { title: "All four checks passed", body: "Integrity read every sentence against the chart again.", tone: "good" } : { title: `${still} ${still === 1 ? "check needs" : "checks need"} an action`, body: "Apply the matching recommendation, then check again.", tone: "mid" });
    });
  const sendBack = () =>
    runBack(1400, () => {
      store().logCase(key, "You sent the draft back to Scribe");
      store().toast({ title: "Sent back to Scribe", body: "Scribe will redraft the summary and Integrity will check it again.", tone: "neutral" });
    });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-5">
      <Card>
        <CardHeader
          title="Medical-necessity summary" subtitle={`Version ${versions[0].n} · written by Scribe, checked by Integrity · every statement links to the chart`}
          right={editing ? <><Button size="sm" onClick={() => setEditing(false)}>Cancel</Button><Button size="sm" variant="primary" onClick={save}>Save changes</Button></> : <Button size="sm" icon={PenLine} onClick={startEdit}>Edit</Button>}
        />
        <CardBody className="flex flex-col gap-4 text-[15px] leading-[1.75]">
          {sections.map((s) =>
            editing && !s.fixed ? (
              <div key={s.id}>
                <Label className="mb-1.5">{s.title}</Label>
                <TextArea rows={4} aria-label={`Edit ${s.title}`} value={values[s.id] ?? ""} onChange={(e) => setValues({ ...values, [s.id]: e.target.value })} />
              </div>
            ) : (
              <p key={s.id} data-testid={`draft-${OWN_ID[s.id] ?? s.id}`}>
                <b>{s.title}.</b> {s.text}{" "}
                {s.added.map((a) => (
                  <mark key={a.recId} className="rounded bg-good-bg px-1 text-ink">{a.text}<span className="ml-1.5 rounded-full bg-white px-1.5 text-[10px] font-semibold tracking-wide text-good-ink uppercase">New</span></mark>
                ))}{" "}
                <span className="inline-flex flex-wrap gap-1.5 align-middle">
                  {uniqueEvidence(s.sources).map((src) => <EvidenceChip key={src.label} evidence={src} detail={detail} />)}
                </span>
              </p>
            ),
          )}
        </CardBody>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Checks" subtitle="Integrity's four checks" right={failing === 0 ? <Pill tone="good" dot>All clear</Pill> : <Pill tone="mid" dot>{failing} open</Pill>} />
          <div data-testid="checks">
            {checks.map((c) => (
              <div key={c.id} className="flex items-start gap-3 border-b border-line px-6 py-3 last:border-b-0">
                {c.ok ? <CircleCheck size={18} className="ico mt-0.5 text-good" aria-label="Passed" /> : <TriangleAlert size={18} className="ico mt-0.5 text-mid" aria-label="Needs attention" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{c.label}</div>
                  {c.ok ? null : <div className="text-[13px] text-mid-ink">{c.note}</div>}
                </div>
                <Pill tone={c.ok ? "good" : "mid"}>{c.ok ? "Pass" : "Warn"}</Pill>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-6 py-3.5">
            <Button size="sm" icon={RefreshCw} loading={rechecking} onClick={recheck}>Re-check</Button>
          </div>
        </Card>
        <Card>
          <CardHeader title="Versions" />
          {versions.map((v) => (
            <div key={v.n} className="flex items-center gap-3 border-b border-line px-6 py-3.5 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Version {v.n}</div>
                <div className="text-xs text-muted">{stamp(v.at)} · {v.by} · {v.note}</div>
              </div>
              {v.current ? <Pill tone="good">Current</Pill> : <Button size="sm" onClick={() => setViewing(v)}>View</Button>}
            </div>
          ))}
        </Card>
        <Card className="px-5 py-5">
          <div className="flex flex-col gap-2.5">
            {sent
              ? <Button variant="primary" size="lg" icon={Check} disabled title={sendReason}>Sent to payer</Button>
              : <Button variant="primary" size="lg" icon={Send} disabled={!canSend} title={canSend ? undefined : sendReason} onClick={send}>Send to payer</Button>}
            <Button loading={sendingBack} onClick={sendBack}>Send back to Scribe</Button>
            <div className="text-xs text-muted">{canSend ? "Sending opens review and sign. Nothing goes to the payer until a clinician signs." : sendReason}</div>
          </div>
        </Card>
      </div>
      {viewing ? (
        <Modal open onClose={() => setViewing(null)} title={`Version ${viewing.n}`} subtitle={`${stamp(viewing.at)} · ${viewing.by}. Read only.`} footer={<Button onClick={() => setViewing(null)}>Close</Button>}>
          <div className="text-[14.5px] leading-[1.7] whitespace-pre-wrap">{viewing.text}</div>
        </Modal>
      ) : null}
    </div>
  );
}
