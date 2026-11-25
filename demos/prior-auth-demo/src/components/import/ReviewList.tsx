import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, FileText } from "lucide-react";
import { Button, Checkbox, Pill } from "@/components/ui";
import { plural } from "@/lib/format";
import { paths } from "@/routes";
import { displayOf } from "./fields";
import { docLine, type Unread } from "./emrRead";
import type { ImportedDocument, ImportedField } from "./types";

export interface Found {
  fields: ImportedField[];
  documents: ImportedDocument[];
  /** Columns or EMR fields that were not used, and why. */
  unread: Unread[];
}

const same = (key: string, a: string, b: string): boolean => (key === "initials" || key === "memberId" ? a.replace(/\W/g, "").toUpperCase() === b.replace(/\W/g, "").toUpperCase() : a.trim() === b.trim());

/** The one review every way in ends with: what was found, a box for each, and Apply. A found value that differs from what the form holds says what it replaces. */
export function ReviewList({ found, sourceLabel, thumb, simulated, current, onApply, onCancel }: {
  found: Found;
  sourceLabel: string;
  thumb?: string;
  /** The reading is simulated (a screenshot or a PDF): said once, in small text. */
  simulated?: boolean;
  current?: Partial<Record<string, string>>;
  onApply: (fields: ImportedField[], documents: ImportedDocument[]) => void;
  onCancel: () => void;
}) {
  const [off, setOff] = useState<Set<string>>(() => new Set());
  const toggle = (id: string, on: boolean) =>
    setOff((s) => {
      const next = new Set(s);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });
  const fields = found.fields;
  const docs = found.documents;
  const chosenFields = useMemo(() => fields.filter((f) => !off.has(`f:${f.key}`)), [fields, off]);
  const chosenDocs = useMemo(() => docs.filter((_, i) => !off.has(`d:${i}`)), [docs, off]);
  const count = chosenFields.length + chosenDocs.length;
  const head = fields.length ? `${plural(fields.length, "field")} found` : `${plural(docs.length, "document")} found`;

  return (
    <div className="flex flex-col gap-3" aria-label="What was found" role="group">
      <div className="flex items-center gap-3">
        {thumb ? <img src={thumb} alt="The screenshot that was read" className="h-12 w-[72px] shrink-0 rounded-md border border-line object-cover object-left-top" /> : null}
        <div className="min-w-0">
          <div className="text-[14px] font-semibold">{head}</div>
          <div className="text-[12px] text-muted">{sourceLabel}</div>
        </div>
      </div>

      {fields.length ? (
        <ul className="flex flex-col">
          {fields.map((f) => {
            const was = current?.[f.key];
            const replaces = was && !same(f.key, was, f.value) ? displayOf(f.key, was) : null;
            return (
              <li key={f.key} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-line py-1.5 last:border-b-0">
                <Checkbox
                  checked={!off.has(`f:${f.key}`)}
                  onChange={(on) => toggle(`f:${f.key}`, on)}
                  label={
                    <span className="flex flex-wrap items-baseline gap-x-3">
                      <span className="w-[120px] shrink-0 text-[13px] text-muted">{f.label}</span>
                      <span className="text-[14px] font-medium">{f.display ?? f.value}</span>
                    </span>
                  }
                />
                {f.confidence === "check" ? <Pill tone="mid">Check</Pill> : null}
                {replaces ? <span className="text-[12px] text-mid-ink">replaces {replaces}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {docs.length ? (
        <div>
          {fields.length ? <div className="mb-1 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{plural(docs.length, "document")}</div> : null}
          <ul className="flex flex-col">
            {docs.map((d, i) => (
              <li key={`${d.title}-${i}`} className="flex items-center gap-3 border-b border-line py-1.5 last:border-b-0">
                <Checkbox
                  checked={!off.has(`d:${i}`)}
                  onChange={(on) => toggle(`d:${i}`, on)}
                  label={
                    <span className="flex items-center gap-2 text-[14px]">
                      <FileText size={14} className="ico shrink-0 text-muted" aria-hidden="true" />
                      {docLine(d)}
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {found.unread.length ? (
        <ul className="flex flex-col gap-1 text-[12px] text-muted" aria-label="Not used">
          {found.unread.map((u) => (
            <li key={u.key + u.problem}>
              <span className="font-medium text-ink2">{u.label}:</span> {u.problem}
              {u.mapping ? (
                <>
                  {" "}
                  <Link to={paths.emr()} className="font-medium text-forest underline underline-offset-2">
                    Map it
                  </Link>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5">
        <Button size="sm" variant="primary" icon={Check} disabled={count === 0} onClick={() => onApply(chosenFields, chosenDocs)}>
          Apply{count ? ` ${count}` : ""}
        </Button>
        <Button size="sm" onClick={onCancel}>
          Cancel
        </Button>
        {simulated ? <span className="text-[12px] text-muted">Demo: reading is simulated</span> : null}
      </div>
    </div>
  );
}
