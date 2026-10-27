import { useState } from "react";
import { Button, Card, CardHeader, Modal, Pill, Segmented, TextArea } from "@/components/ui";
import { READINESS_ITEMS, type PlanReadiness as Readiness, type ReadinessState } from "@/data/intake/seed";
import type { Tone } from "@/data/types";
import { vaPlanOf } from "@/data/va/plans";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { actorName } from "../shared/provenance";

const STATE: Record<ReadinessState, { label: string; tone: Tone }> = { not_confirmed: { label: "Not confirmed", tone: "neutral" }, confirmed: { label: "Confirmed", tone: "good" }, issue: { label: "Issue", tone: "risk" } };
export const planConfirmed = (p: Readiness): boolean => READINESS_ITEMS.every((i) => p.items[i.id]?.state === "confirmed");

/** What staff have confirmed with each plan before July 1, 2027. Everything starts unconfirmed: nothing here is a plan's statement until a person records it. */
export function PlanReadiness() {
  const plans = useStore((s) => s.planReadiness);
  const setReadiness = useStore((s) => s.setReadiness);
  const toast = useStore((s) => s.toast);
  const [edit, setEdit] = useState<{ payerId: string; itemId: string } | null>(null);
  const [state, setState] = useState<ReadinessState>("not_confirmed");
  const [note, setNote] = useState("");
  const open = (payerId: string, itemId: string) => {
    const cur = plans.find((p) => p.payerId === payerId)?.items[itemId];
    setState(cur?.state ?? "not_confirmed");
    setNote(cur?.note ?? "");
    setEdit({ payerId, itemId });
  };
  const item = edit ? READINESS_ITEMS.find((i) => i.id === edit.itemId) : undefined;
  const plan = edit ? vaPlanOf(edit.payerId) : undefined;
  return (
    <Card data-card="plan-readiness">
      <CardHeader title="Plan readiness for July 1, 2027" right={<span className="text-[12px] text-muted">Confirm with each plan; nothing here is a plan's statement</span>} />
      <ul className="grid gap-3 px-5 py-4 md:grid-cols-2 min-[1180px]:grid-cols-3">
        {plans.map((p) => {
          const vp = vaPlanOf(p.payerId);
          const n = READINESS_ITEMS.filter((i) => p.items[i.id]?.state === "confirmed").length;
          return (
            <li key={p.payerId} data-plan={p.payerId} className="rounded-2xl border border-edge bg-white px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-semibold">{vp?.name ?? p.payerId}</span>
                <span className="shrink-0 text-[12px] text-muted tabular-nums">{n} of {READINESS_ITEMS.length}</span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {READINESS_ITEMS.map((i) => {
                  const c = p.items[i.id] ?? { state: "not_confirmed" as const };
                  return (
                    <li key={i.id} className="flex items-start justify-between gap-2">
                      <span className="min-w-0 text-[12px] text-ink2">{i.label}</span>
                      <button type="button" onClick={() => open(p.payerId, i.id)} aria-label={`${vp?.short ?? p.payerId}: ${i.label}: ${STATE[c.state].label}. Change`} title={c.note ?? undefined} className="shrink-0 rounded-full hover:opacity-80">
                        <Pill tone={STATE[c.state].tone}>{STATE[c.state].label}{c.note ? " · note" : ""}</Pill>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={`${plan?.name ?? ""}: ${item?.label ?? ""}`}
        subtitle="Record what the plan told you, and how"
        footer={
          <>
            <Button onClick={() => setEdit(null)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={state !== "not_confirmed" && !note.trim()}
              onClick={() => {
                if (!edit) return;
                setReadiness(edit.payerId, edit.itemId, state, note.trim() || undefined);
                toast({ title: "Plan readiness recorded", body: `${plan?.short}: ${item?.label}: ${STATE[state].label}`, tone: state === "issue" ? "mid" : "good" });
                setEdit(null);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Segmented<ReadinessState> items={[{ id: "not_confirmed", label: "Not confirmed" }, { id: "confirmed", label: "Confirmed" }, { id: "issue", label: "Issue" }]} value={state} onChange={setState} />
        <label htmlFor="readiness-note" className="mt-4 mb-1 block text-[13px] font-medium text-ink2">Note {state !== "not_confirmed" ? "(required: who confirmed it, and how)" : "(optional)"}</label>
        <TextArea id="readiness-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Provider relations email, 10/19/2026" />
        {edit ? (() => {
          const cur = plans.find((p) => p.payerId === edit.payerId)?.items[edit.itemId];
          return cur?.by ? <p className="mt-2 text-[12px] text-muted">Last recorded by {actorName(cur.by)}{cur.at !== undefined ? ` · ${stamp(cur.at)}` : ""}</p> : null;
        })() : null}
      </Modal>
    </Card>
  );
}
