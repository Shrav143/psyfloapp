import { useState, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Pill } from "@/components/ui";
import type { EhrCase } from "@/ehr/model";
import { RESUBMIT_LABEL } from "@/ehr/model";
import { rowOf } from "@/pages/denials/lib/dashboard";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { PCard, PanelFooter, PanelTitle, Tick, TypedChip, useTypingBeat } from "./parts";

/** The extension on a denied authorization: the corrections the denial's findings suggest, typed into Lauris. The appeal letter stays in Psyflo. */
export function DenialView({ c, denial, tabs }: { c: EhrCase; denial: NonNullable<EhrCase["denial"]>; tabs: ReactNode }) {
  const navigate = useNavigate();
  const row = rowOf(denial.req, denial.meta, denial.work, denial.clock);
  const [sel, setSel] = useState<Set<string>>(() => new Set(c.fixes.filter((f) => !f.typed && f.finding.sev === "Critical").map((f) => f.finding.id)));
  const [said, setSaid] = useState("");
  const { busy, run } = useTypingBeat();
  const selected = c.fixes.filter((f) => !f.typed && sel.has(f.finding.id));
  const open = c.fixes.filter((f) => !f.typed).length;
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const add = () => {
    const fixes = selected.map((f) => ({ id: f.finding.id, title: f.finding.title }));
    setSaid("Typing into Lauris…");
    run(() => {
      useStore.getState().ehrAddFixes({ key: c.key, requestId: c.detail.requestId, fixes });
      setSaid(`Added ${plural(fixes.length, "correction")} to the Lauris form`);
    });
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        <button type="button" onClick={() => navigate(paths.lauris())} className="-mb-1 inline-flex min-h-8 items-center gap-1.5 self-start rounded-md text-[13px] font-semibold text-forest hover:underline">
          <ArrowLeft size={14} className="ico" aria-hidden="true" />All consumers
        </button>
        {tabs}
        <PCard className="flex flex-col gap-1.5 bg-tile">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <b className="text-[15px]">{denial.req.id}</b>
            <span className="text-[13px] text-ink2">{row.payer} · {row.denied}</span>
          </div>
          <div className="text-[13px] text-ink2">{c.consumer.initials}, {c.consumer.age} · Lauris #{c.consumer.no} · {c.consumer.level}</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone="mid">{denial.meta.type}</Pill>
            {row.deadline ? <Pill tone={row.deadline.tone} dot>{row.deadline.text} {row.deadline.what}</Pill> : null}
          </div>
        </PCard>

        <section aria-label="Corrections for the authorization" className="flex flex-col gap-2">
          <PanelTitle count={c.fixes.length}>Corrections for the authorization</PanelTitle>
          <div><Pill tone="neutral">Goes in: {RESUBMIT_LABEL}</Pill></div>
          {c.fixes.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {c.fixes.map((f) => {
                const checked = sel.has(f.finding.id);
                return (
                  <li key={f.finding.id}>
                    <PCard id={`ehr-fix-${f.finding.id}`} tone={f.typed ? (f.unsaved ? "typed" : undefined) : checked ? "selected" : undefined} className="flex flex-col gap-1.5">
                      <div className="flex items-start gap-2">
                        {f.typed ? <CheckCircle2 size={18} className="ico mt-px shrink-0 text-good" aria-hidden="true" /> : <Tick checked={checked} label={`Include "${f.finding.title}"`} onChange={() => toggle(f.finding.id)} />}
                        <span className="min-w-0 flex-1 text-[14px] leading-snug font-semibold">{f.finding.title}</span>
                        <Pill tone={f.finding.sev === "Critical" ? "risk" : "mid"}>{f.finding.sev}</Pill>
                      </div>
                      <div className="ml-[26px] flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-bg px-2.5 py-[3px] text-xs font-semibold text-neutral-ink"><Link2 size={12} className="ico" aria-hidden="true" />{f.finding.source}</span>
                        {f.typed ? <TypedChip unsaved={f.unsaved} /> : null}
                        {f.inEvidence ? <Pill tone="neutral">In the appeal evidence</Pill> : null}
                      </div>
                      <div className="ml-[26px]">
                        <div className="mb-0.5 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Typed as</div>
                        <blockquote className="m-0 rounded-r-lg border-l-[3px] border-[#D6CDB8] bg-canvas px-2.5 py-1.5 text-[12.5px] leading-snug text-ink2">{f.line}</blockquote>
                      </div>
                    </PCard>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-[13px] text-muted">The analysis found nothing to correct.</div>
          )}
        </section>

        <PCard className="flex flex-col gap-1.5">
          <div className="text-[14px] font-semibold">Appeal letter</div>
          <div className="text-[13px] text-ink2">Written in Psyflo, not in Lauris</div>
          <div><Button size="sm" icon={ExternalLink} onClick={() => navigate(paths.denials(denial.req.id))}>Open the appeal in Psyflo</Button></div>
        </PCard>
      </div>

      <PanelFooter>
        <p role="status" aria-live="polite" className="sr-only">{said}</p>
        {open ? (
          <Button variant="primary" loading={busy} disabled={selected.length === 0} onClick={add}>{busy ? "Typing into Lauris…" : `Add ${selected.length} to the Lauris form`}</Button>
        ) : (
          <div className="flex items-center gap-2 text-[13px] font-semibold text-good-ink"><CheckCircle2 size={16} className="ico text-good" aria-hidden="true" />Every correction is typed</div>
        )}
      </PanelFooter>
    </>
  );
}
