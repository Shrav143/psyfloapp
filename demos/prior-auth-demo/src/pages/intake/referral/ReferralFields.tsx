import { useState, type ReactNode } from "react";
import { isRequired, specsFor, type FieldSpec } from "@/data/intake/fields";
import { staffOf } from "@/data/intake/seed";
import { METHOD_LABEL, type IntakeRecord, type SourceRef } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { cn } from "@/lib/cn";
import { longDate, stamp } from "@/lib/time";
import { isMissingValue } from "../queue/metrics";
import { IntakeField } from "../shared/provenance";

export type DocSpot = { docId: string; blockId: string };

/** Where a field's value (or its pending suggestion) came from in a document, if anywhere. */
export function docSourceOf(r: IntakeRecord, spec: FieldSpec): SourceRef | undefined {
  const fv = r[spec.section][spec.key];
  if (fv?.source?.docId && fv.source.blockId) return fv.source;
  return r.suggestions.find((s) => s.status === "pending" && s.section === spec.section && s.field === spec.key && s.source.docId)?.source;
}

function Spot({ src, active, onHover, onPin, children }: { src?: SourceRef; active: boolean; onHover: (s: DocSpot | null) => void; onPin: (s: DocSpot) => void; children: ReactNode }) {
  const spot = src?.docId && src.blockId ? { docId: src.docId, blockId: src.blockId } : null;
  return (
    <div
      data-src-doc={spot?.docId}
      data-src-block={spot?.blockId}
      onMouseEnter={() => spot && onHover(spot)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => spot && onPin(spot)}
      className={cn("-mx-2 rounded-xl px-2 transition-colors", active && "bg-mid-bg/50 ring-1 ring-mid-edge")}
    >
      {children}
    </div>
  );
}

const PROFILE_FROM_DOCS = [...specsFor("profile"), ...specsFor("coverage")];

/** The referral fields (required ones marked), each with its provenance and pending suggestions, then the patient, guardian and coverage
    values the documents gave. Hovering or focusing a field outlines its source block. */
export function ReferralFields({ record, active, onHover, onPin }: { record: IntakeRecord; active: DocSpot | null; onHover: (s: DocSpot | null) => void; onPin: (s: DocSpot) => void }) {
  const [all, setAll] = useState(false);
  const ctx = { age: record.age, schoolBased: serviceById(record.serviceId).setting === "school" };
  /* Progressive disclosure: required fields, fields with a value and fields with a suggestion show; empty optional ones wait behind a toggle. */
  const worth = (s: FieldSpec) => {
    const fv = record[s.section][s.key];
    return isRequired(s, ctx) || (!!fv && (!isMissingValue(fv) || fv.state === "not_applicable")) || record.suggestions.some((x) => x.status === "pending" && x.section === s.section && x.field === s.key);
  };
  const referralSpecs = specsFor("referral");
  const hidden = referralSpecs.filter((s) => !worth(s)).length;
  const groups = new Map<string, FieldSpec[]>();
  for (const s of referralSpecs) if (all || worth(s)) groups.set(s.group, [...(groups.get(s.group) ?? []), s]);
  const fromDocs = PROFILE_FROM_DOCS.filter((s) => docSourceOf(record, s));
  const isActive = (src?: SourceRef) => !!active && !!src && src.docId === active.docId && src.blockId === active.blockId;
  const field = (s: FieldSpec) => {
    const src = docSourceOf(record, s);
    return (
      <Spot key={`${s.section}.${s.key}`} src={src} active={isActive(src)} onHover={onHover} onPin={onPin}>
        <IntakeField record={record} section={s.section} field={s.key} label={s.label} kind={s.kind} options={s.options} required={isRequired(s, ctx)} hint={s.hint} sensitive={s.sensitive} />
      </Spot>
    );
  };
  const staff = staffOf(record.assignedTo);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-xl bg-tile px-3.5 py-3 text-[13px]">
        <dt className="text-muted">Referral ID</dt>
        <dd className="font-medium">{record.id}</dd>
        <dt className="text-muted">Received</dt>
        <dd className="font-medium">{longDate(record.createdAt)} · {stamp(record.createdAt)}</dd>
        <dt className="text-muted">Referral method</dt>
        <dd className="font-medium">{METHOD_LABEL[record.method]}</dd>
        <dt className="text-muted">Supporting documents</dt>
        <dd className="font-medium">{record.documents.length ? `${record.documents.length} attached` : "None yet"}</dd>
        <dt className="text-muted">Intake coordinator</dt>
        <dd className="font-medium">{staff?.name ?? "Unassigned"}</dd>
      </dl>
      {[...groups.entries()].map(([g, specs]) => (
        <section key={g} aria-label={g}>
          <h4 className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{g}</h4>
          <div>{specs.map(field)}</div>
        </section>
      ))}
      {hidden ? (
        <button type="button" onClick={() => setAll((a) => !a)} aria-expanded={all} className="self-start text-[13px] font-semibold text-forest hover:underline" data-more-fields>
          {all ? "Hide empty optional fields" : `Show ${hidden} more optional field${hidden === 1 ? "" : "s"}`}
        </button>
      ) : null}
      {fromDocs.length ? (
        <section aria-label="Patient, guardian and coverage from the documents">
          <h4 className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Patient, guardian and coverage from the documents</h4>
          <div>{fromDocs.map(field)}</div>
        </section>
      ) : null}
    </div>
  );
}
