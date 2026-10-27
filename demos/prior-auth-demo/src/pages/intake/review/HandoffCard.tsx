import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FilePlus2, ShieldCheck, Undo2 } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Checkbox, Modal, Pill } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { stamp } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";
import { actorName } from "../shared/provenance";
import { GoTo } from "./ChecklistCard";
import { caseDraftInit, type Packet } from "./packet";
import { CheckPill, RuleStatusPill } from "./pills";

const STATUS: Record<IntakeRecord["handoff"]["status"], { label: string; tone: Tone }> = {
  not_started: { label: "Not started", tone: "neutral" }, draft: { label: "Draft", tone: "mid" }, ready: { label: "Approved for New Case", tone: "good" }, in_new_case: { label: "In New Case", tone: "good" },
};

/** The handoff packet: a draft summary built from the record, a person's approval, then a draft in New Case. Nothing is ever submitted to a payer
    from Intake: New Case prepares the request, and a person signs and sends it there. */
export function HandoffCard({ record, packet, now }: { record: IntakeRecord; packet: Packet; now: number }) {
  const nav = useNavigate();
  const me = useStore((s) => meOf(s));
  const prepare = useStore((s) => s.prepareHandoffDraft);
  const approve = useStore((s) => s.approveHandoff);
  const reopen = useStore((s) => s.reopenHandoff);
  const openInNewCase = useStore((s) => s.openHandoffInNewCase);
  const toast = useStore((s) => s.toast);
  const draftExists = useStore((s) => !!record.handoff.draftId && s.caseDrafts.some((d) => d.id === record.handoff.draftId));
  const [confirm, setConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const h = record.handoff;
  const rd = packet.readiness;
  const blocked = packet.open.filter((i) => i.status === "blocked");
  const canApprove = rd.status === "ready" && !blocked.length;
  const why = blocked.length ? `Blocked: ${blocked.map((b) => b.label.toLowerCase()).join(", ")}` : rd.status !== "ready" ? rd.headline : "";
  const st = STATUS[h.status];

  const open = () => {
    const id = openInNewCase(record.id, caseDraftInit(record, now));
    if (!id) return;
    toast({ title: "Handoff opened in New Case", body: `${record.initials}, ${record.age ?? ""} · a draft, not a request. Nothing was sent to the payer.`, tone: "good" });
    nav(paths.newCase({ draft: id }));
  };

  return (
    <Card data-card="handoff">
      <CardHeader title="Handoff packet" right={<Pill tone={st.tone}>{st.label}</Pill>} />
      <CardBody className="space-y-4">
        {h.status === "not_started" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-ink2">No draft yet. The packet is built from this record and lists what is still open.</p>
            <Button icon={FilePlus2} onClick={() => prepare(record.id, me)}>Prepare the draft</Button>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-muted">
              {h.preparedBy ? `Draft prepared by ${actorName(h.preparedBy)}${h.createdAt !== undefined ? ` · ${stamp(h.createdAt)}` : ""}` : "Draft"}
              {h.approvedBy ? ` · Approved by ${actorName(h.approvedBy)}${h.approvedAt !== undefined ? ` · ${stamp(h.approvedAt)}` : ""}` : " · Not approved yet"}
              {h.openedBy ? ` · Opened in New Case by ${actorName(h.openedBy)}${h.openedAt !== undefined ? ` · ${stamp(h.openedAt)}` : ""}` : ""}
            </p>
            <dl data-testid="packet" className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
              {packet.lines.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
              <dt className="text-muted">Requirements</dt>
              <dd>
                <ul className="space-y-1">
                  {packet.requirements.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-1.5"><span>{r.label}</span><RuleStatusPill rule={r} /></li>
                  ))}
                </ul>
              </dd>
              <dt className="text-muted">Documents</dt>
              <dd>{packet.documents.length ? packet.documents.join("; ") : "None on file"}</dd>
              <dt className="text-muted">Open items</dt>
              <dd>{packet.open.length ? `${packet.open.length} (listed below)` : "None"}</dd>
            </dl>
            {packet.open.length ? (
              <ul className="space-y-1.5 rounded-xl bg-tile px-3 py-2.5">
                {packet.open.slice(0, 8).map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                    <CheckPill status={i.status} />
                    <span className="min-w-0 flex-1">{i.label}</span>
                    <GoTo recordId={record.id} item={i} />
                  </li>
                ))}
                {packet.open.length > 8 ? <li className="text-[12px] text-muted">and {packet.open.length - 8} more in the checklist</li> : null}
              </ul>
            ) : null}
          </>
        )}

        {h.status === "ready" && rd.status !== "ready" ? (
          <Banner tone="mid" title="Something changed after the approval">{why}. Take the approval back, finish it, and approve again.</Banner>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {h.status === "draft" ? (
            <>
              <Button variant="primary" icon={ShieldCheck} disabled={!canApprove} onClick={() => setConfirm(true)}>Approve handoff</Button>
              {!canApprove ? <span data-testid="approve-why" className="text-[13px] text-mid-ink">{why}</span> : null}
            </>
          ) : null}
          {h.status === "ready" ? (
            <>
              <Button variant="primary" trailing={ArrowRight} disabled={rd.status !== "ready"} onClick={open}>Open in New Case</Button>
              <Button icon={Undo2} onClick={() => reopen(record.id)}>Take back approval</Button>
            </>
          ) : null}
          {h.status === "in_new_case" ? (
            draftExists ? (
              <Button variant="primary" trailing={ArrowRight} onClick={() => nav(paths.newCase({ draft: h.draftId }))}>Open the draft in New Case</Button>
            ) : (
              <span className="text-[13px] text-muted">The New Case draft {h.draftId} is no longer in the demo (it may have been reset).</span>
            )
          ) : null}
          <span className="basis-full text-[12px] text-muted">Nothing is submitted to a payer from Intake.</span>
        </div>
      </CardBody>

      <Modal
        open={confirm}
        onClose={() => { setConfirm(false); setAgreed(false); }}
        title="Approve the handoff"
        subtitle={`${record.id} · ${record.initials}${record.age !== null ? `, ${record.age}` : ""}`}
        footer={
          <>
            <Button onClick={() => { setConfirm(false); setAgreed(false); }}>Cancel</Button>
            <Button variant="primary" icon={ShieldCheck} disabled={!agreed} onClick={() => { approve(record.id); setConfirm(false); setAgreed(false); toast({ title: "Handoff approved", body: "Open it in New Case to prepare the request. Nothing was sent to the payer.", tone: "good" }); }}>Approve</Button>
          </>
        }
      >
        <p className="text-[14px] text-ink2">The packet goes to New Case as a draft. New Case prepares the request; a person signs and sends it there. {rd.note}</p>
        {packet.open.length ? <p className="mt-2 text-[13px] text-mid-ink">{packet.open.length} intake items are still open. They travel with the packet as open items.</p> : null}
        <Checkbox className="mt-4" checked={agreed} onChange={setAgreed} label={<span className="text-[14px]">I reviewed this packet. Nothing is sent to the payer from Intake.</span>} />
      </Modal>
    </Card>
  );
}
