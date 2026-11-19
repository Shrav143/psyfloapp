import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button, Dropdown } from "@/components/ui";
import { IMPORT_FIELDS } from "./fields";
import { autoMap, SKIP, type Table } from "./table";
import type { ImportTarget } from "./types";

/** The columns of an export on the left, a Psyflo field for each on the right. Guessed from the header and the first row; any column can be skipped.
    A file with several patients (or several coverage rows) asks which row; a document list uses every row. */
export function MappingStep({ table, target, fileName, onApply, onCancel }: {
  table: Table;
  target: ImportTarget;
  fileName: string;
  onApply: (mapping: string[], row: number) => void;
  onCancel: () => void;
}) {
  const [mapping, setMapping] = useState<string[]>(() => autoMap(table, target));
  const [row, setRow] = useState(0);
  const options = useMemo(() => [{ value: SKIP, label: "Skip" }, ...IMPORT_FIELDS[target].map((f) => ({ value: f.key, label: f.label }))], [target]);
  const perRow = target !== "documents" && table.rows.length > 1;
  const sample = table.rows[perRow ? row : 0] ?? [];
  const mapped = mapping.filter((m) => m !== SKIP).length;
  const pick = (i: number, key: string) =>
    setMapping((m) => m.map((x, j) => (j === i ? key : key !== SKIP && x === key ? SKIP : x)));
  const firstCol = table.headers.findIndex((_, i) => mapping[i] === "initials");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold">{fileName}</div>
          <div className="text-[12px] text-muted">
            {table.headers.length} columns · {table.rows.length} {table.rows.length === 1 ? "row" : "rows"} · {mapped} mapped
          </div>
        </div>
        {perRow ? (
          <div className="w-[220px]">
            <Dropdown<string>
              variant="field"
              ariaLabel="Row to import"
              value={String(row)}
              onChange={(v) => setRow(Number(v))}
              options={table.rows.map((r, i) => ({ value: String(i), label: `Row ${i + 1}${firstCol >= 0 && r[firstCol] ? ` · ${r[firstCol]}` : ""}` }))}
            />
          </div>
        ) : null}
      </div>
      <div>
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">
              <th className="py-1.5 pr-3 font-medium">Column</th>
              <th className="py-1.5 pr-3 font-medium">{perRow ? `Row ${row + 1}` : "First row"}</th>
              <th className="w-[44%] py-1.5 font-medium min-[640px]:w-[220px]">Psyflo field</th>
            </tr>
          </thead>
          <tbody>
            {table.headers.map((h, i) => (
              <tr key={`${h}-${i}`} className="border-t border-line">
                <td className="truncate py-1 pr-3 text-[13px] font-medium" title={h}>{h}</td>
                <td className="truncate py-1 pr-3 text-[13px] text-ink2" title={sample[i]}>{sample[i] || <span className="text-faint">Empty</span>}</td>
                <td className="py-1">
                  <Dropdown<string> variant="field" ariaLabel={`Psyflo field for ${h}`} value={mapping[i] ?? SKIP} onChange={(v) => pick(i, v)} options={options} menuWidth={240} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button size="sm" variant="primary" trailing={ArrowRight} disabled={mapped === 0} onClick={() => onApply(mapping, perRow ? row : 0)}>
          Apply mapping
        </Button>
        <Button size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
