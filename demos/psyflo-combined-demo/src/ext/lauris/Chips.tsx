import { SEV_LABEL, SEV_RANK } from "@/ext/engine";
import { useStore } from "@/ext/store";
import type { Finding, Severity } from "@/ext/types";

/** The open findings of one field, one group per severity. */
export interface ChipGroup {
  sev: Severity;
  /** Finding ids, in the order the scan listed them. The first one is what the chip points at. */
  ids: string[];
  titles: string[];
}

/** Open findings grouped by field key and then by severity (most severe first). */
export function chipsByField(findings: Finding[], status: Record<string, string>): Record<string, ChipGroup[]> {
  const out: Record<string, ChipGroup[]> = {};
  for (const f of findings) {
    if (status[f.id] !== "open") continue;
    const groups = (out[f.fieldKey] ??= []);
    let g = groups.find((x) => x.sev === f.severity);
    if (!g) groups.push((g = { sev: f.severity, ids: [], titles: [] }));
    g.ids.push(f.id);
    g.titles.push(f.title);
  }
  for (const groups of Object.values(out)) groups.sort((a, b) => SEV_RANK[b.sev] - SEV_RANK[a.sev]);
  return out;
}

/** Psyflo's alert pills, shown in the EHR beside a field's label after a scan. They are Psyflo's, not Lauris's: navy on white, with the small "p." mark.
    Hover shows what each alert says; a click shows it in the Psyflo panel. */
export default function Chips({ groups, label, stale }: { groups: ChipGroup[]; label: string; stale?: boolean }) {
  const focus = useStore((s) => s.focus);
  const panelOpen = useStore((s) => s.panelOpen);
  const togglePanel = useStore((s) => s.togglePanel);
  const focusFinding = useStore((s) => s.focusFinding);
  if (!groups.length) return null;
  return (
    <span className="chips">
      {groups.map((g) => {
        const on = focus !== null && g.ids.includes(focus);
        return (
          <button
            key={g.sev}
            type="button"
            className={`chip ${g.sev}${stale ? " stale" : ""}${on ? " on" : ""}`}
            data-testid="chip"
            data-finding={g.ids[0]}
            data-sev={g.sev}
            title={`${g.titles.join("\n")}${stale ? "\n(The document changed after the scan.)" : ""}`}
            aria-label={`Psyflo alert, ${SEV_LABEL[g.sev]}: ${g.ids.length} on ${label}. ${g.titles.join(". ")}. Show in the Psyflo panel.`}
            onClick={() => {
              if (!panelOpen) togglePanel(true);
              focusFinding(g.ids[0]);
            }}
          >
            <span className="pmk" aria-hidden="true">p<em>.</em></span>
            <i className="dot" aria-hidden="true" />
            <span className="sv">{SEV_LABEL[g.sev]}</span>
            <b>{g.ids.length}</b>
          </button>
        );
      })}
    </span>
  );
}
