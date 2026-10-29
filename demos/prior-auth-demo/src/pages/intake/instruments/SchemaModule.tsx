import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Card, Pill, TextArea } from "@/components/ui";
import { moduleCompletion, readinessBlockers, type Blocker } from "@/data/assess/completion";
import { isCoreModule, schemaOf } from "@/data/assess/modules";
import { activeModules } from "@/data/assess/plan";
import type { InstrumentInstance, ModuleId, SectionDef } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { usePlan } from "../lib/usePlan";
import { FieldRow } from "./FieldRow";
import { LocReview } from "./LocReview";
import { ModuleFooter } from "./ModuleFooter";
import { ModuleHeader } from "./ModuleHeader";
import { ScoreEntryCard } from "./ScoreEntryCard";
import { VersionDrawer } from "./VersionDrawer";
import { PriorAssessmentsCard } from "./PriorAssessments";
import { filledOf, moduleContext, sectionFields } from "./model";
import { useFindEvidence } from "./useFindEvidence";

/** A collapsible section. The header carries the count and the two things that need a person: required fields still empty and suggestions waiting. */
function SectionBlock({ id, title, hint, summary, pills, open, onToggle, children }: { id: string; title: string; hint?: string; summary: string; pills?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <Card data-section={id}>
      <h3 className="m-0">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-4 rounded-[20px] px-5 py-3.5 text-left hover:bg-tile focus-visible:outline-2">
          <span className="min-w-0">
            <span className="block text-[16px] font-semibold leading-tight">{title}</span>
            <span className="mt-0.5 block text-[13px] font-normal text-muted">{summary}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {pills}
            <ChevronDown size={18} className={cn("ico text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
          </span>
        </button>
      </h3>
      {open ? (
        <div className="border-t border-line px-5">
          {hint ? <p className="pt-3 text-[13px] text-muted">{hint}</p> : null}
          {children}
        </div>
      ) : null}
    </Card>
  );
}

const NOTES_ID = "notes";

/** One assessment module drawn from its schema (data/assess/schemas): header, fields with their provenance, the evidence the simulated reader proposed, a
    score-entry card or a level-of-care review where the schema asks for one, notes, and the sticky action bar. */
export function SchemaModule({ record, moduleId }: { record: IntakeRecord; moduleId: ModuleId }) {
  const plan = usePlan(record);
  const [, setParams] = useSearchParams();
  const startInstrument = useStore((s) => s.startInstrument);
  const setNotes = useStore((s) => s.setInstrumentNotes);
  const schema = useMemo(() => schemaOf(moduleId), [moduleId]);
  /* A section whose fields are all hidden for this person (the school fields outside school CPST) is not drawn. */
  const sections = schema.sections.filter((s) => s.type === "loc-review" || !s.fields.length || sectionFields(s, record).length > 0);
  const inst: InstrumentInstance | undefined = record.instruments?.[moduleId];
  const locked = inst?.status === "signed";
  const ctx = moduleContext(plan, record, moduleId);
  const completion = moduleCompletion(moduleId, inst);
  const blockers = readinessBlockers(moduleId, inst);
  const find = useFindEvidence(record, moduleId, ctx.label);
  const [history, setHistory] = useState(false);
  const [notes, setNoteDraft] = useState(inst?.notes ?? "");
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (record.config) startInstrument(record.id, moduleId);
  }, [record.id, record.config, moduleId, startInstrument]);
  useEffect(() => setNoteDraft(inst?.notes ?? ""), [inst?.notes]);

  const pendingByField = (key: string) => (inst?.evidence ?? []).filter((e) => e.fieldKey === key && e.status === "pending").length;
  const sectionOf = useCallback((key: string): SectionDef | undefined => schema.sections.find((s) => s.fields.some((f) => f.key === key)), [schema]);
  const pendingIn = (s: SectionDef) => s.fields.reduce((n, f) => n + pendingByField(f.key), 0);

  /* Open: the first section with something to do, any with suggestions waiting; all of them when the module is small. */
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = { [NOTES_ID]: false };
    const firstTodo = sections.find((s) => s.fields.some((f) => f.required && !filledOf(f, inst))) ?? sections[0];
    for (const s of sections) out[s.id] = sections.length <= 3 || s.id === firstTodo?.id || s.fields.some((f) => (inst?.evidence ?? []).some((e) => e.fieldKey === f.key && e.status === "pending"));
    return out;
  });
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const allOpen = sections.every((s) => open[s.id]);

  /* A section opens by itself when new suggestions arrive for it, so "Find evidence" shows its result. */
  const seen = useRef(new Set((inst?.evidence ?? []).map((e) => e.id)));
  useEffect(() => {
    const fresh = (inst?.evidence ?? []).filter((e) => !seen.current.has(e.id));
    if (!fresh.length) return;
    fresh.forEach((e) => seen.current.add(e.id));
    setOpen((o) => ({ ...o, ...Object.fromEntries(fresh.map((e) => [sectionOf(e.fieldKey)?.id ?? "", true])) }));
  }, [inst?.evidence, sectionOf]);

  const scrollTo = (selector: string) =>
    window.setTimeout(() => {
      const el = wrap.current?.querySelector<HTMLElement>(selector);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.querySelector<HTMLElement>("input, textarea, select, button")?.focus({ preventScroll: true });
    }, 60);
  const goSection = (id: string) => {
    setOpen((o) => ({ ...o, [id]: true }));
    scrollTo(`[data-section="${id}"]`);
  };
  const goField = (key: string) => {
    const s = sectionOf(key);
    if (s) setOpen((o) => ({ ...o, [s.id]: true }));
    scrollTo(`[data-field="${key}"]`);
  };
  const goBlocker = (b: Blocker) => {
    if (b.kind === "score") return scrollTo("[data-score-entry]");
    if (b.kind === "loc") {
      const s = schema.sections.find((x) => x.type === "loc-review");
      if (s) setOpen((o) => ({ ...o, [s.id]: true }));
      return scrollTo("[data-loc-confirm]");
    }
    if (b.fieldKey) return goField(b.fieldKey);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goTo = (section: string) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set("section", section);
      return n;
    });

  const next = record.config && plan ? (() => {
    const list = activeModules(plan, record.config.modules).filter((m) => !isCoreModule(m.id));
    const i = list.findIndex((m) => m.id === moduleId);
    return i >= 0 ? list[i + 1] : undefined;
  })() : undefined;

  return (
    <div ref={wrap} className="space-y-4" data-instrument={moduleId}>
      <ModuleHeader record={record} moduleId={moduleId} ctx={ctx} plan={plan} inst={inst} completion={completion} finding={find.running} onFindEvidence={find.run} onHistory={() => setHistory(true)} />
      <PriorAssessmentsCard record={record} moduleId={moduleId} />

      {schema.scoreEntry ? <ScoreEntryCard record={record} moduleId={moduleId} entry={schema.scoreEntry} inst={inst} locked={locked} /> : null}

      {sections.length > 3 ? (
        <div className="flex justify-end">
          <button type="button" onClick={() => setOpen((o) => ({ ...o, ...Object.fromEntries(sections.map((s) => [s.id, !allOpen])) }))} className="text-[13px] font-semibold text-forest hover:underline">
            {allOpen ? "Collapse all sections" : "Expand all sections"}
          </button>
        </div>
      ) : null}

      {sections.map((s) => {
        const fields = sectionFields(s, record);
        const filled = fields.filter((f) => filledOf(f, inst)).length;
        const missingReq = fields.filter((f) => f.required && !filledOf(f, inst)).length;
        const pend = pendingIn(s);
        const isLoc = s.type === "loc-review";
        const summary = isLoc ? (inst?.loc?.confirmed ? "Level confirmed by a clinician" : "Level not confirmed yet") : fields.length ? `${filled} of ${fields.length} filled` : "Nothing to fill";
        return (
          <SectionBlock
            key={s.id} id={s.id} title={s.label} hint={isLoc ? s.hint : undefined} summary={summary} open={!!open[s.id]} onToggle={() => toggle(s.id)}
            pills={
              <>
                {missingReq ? <Pill tone="mid">{missingReq} required missing</Pill> : null}
                {pend ? <Pill tone="mid">{pend} suggestion{pend === 1 ? "" : "s"}</Pill> : null}
              </>
            }
          >
            {isLoc ? (
              <LocReview record={record} moduleId={moduleId} section={s} schema={schema} inst={inst} locked={locked} framework={plan?.framework ?? undefined} onGoSection={goSection} onGoModule={(m) => goTo(`m:${m}`)} onGoField={goField} />
            ) : (
              <div>
                {s.hint ? <p className="pt-3 text-[13px] text-muted">{s.hint}</p> : null}
                {fields.map((f) => <FieldRow key={f.key} record={record} moduleId={moduleId} def={f} inst={inst} locked={locked} />)}
              </div>
            )}
          </SectionBlock>
        );
      })}

      <SectionBlock id={NOTES_ID} title="Notes" summary={inst?.notes.trim() ? "Has notes" : "Optional"} open={!!open[NOTES_ID]} onToggle={() => toggle(NOTES_ID)}>
        <div className="py-3.5">
          {locked ? (
            <p className="text-[14px] whitespace-pre-line">{inst?.notes || "No notes"}</p>
          ) : (
            <TextArea value={notes} rows={3} aria-label={`Notes for ${ctx.label}`} placeholder="Anything the fields above do not hold" onChange={(e) => setNoteDraft(e.target.value)} onBlur={() => notes !== (inst?.notes ?? "") && setNotes(record.id, moduleId, notes)} />
          )}
        </div>
      </SectionBlock>

      <ModuleFooter
        record={record} moduleId={moduleId} label={ctx.label} inst={inst} blockers={blockers} onGoBlocker={goBlocker}
        continueLabel={next ? `Continue to ${next.label}` : "Continue to review and sign-off"} onContinue={() => goTo(next ? `m:${next.id}` : "signoff")}
      />
      <VersionDrawer open={history} onClose={() => setHistory(false)} moduleId={moduleId} label={ctx.label} inst={inst} />
    </div>
  );
}
