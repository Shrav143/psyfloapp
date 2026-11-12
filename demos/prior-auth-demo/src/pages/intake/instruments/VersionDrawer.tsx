import { Drawer, Pill } from "@/components/ui";
import { diffSnapshots, versionRows, type FieldChange } from "@/data/assess/versions";
import { INSTRUMENT_STATUS_LABEL, type InstrumentInstance, type ModuleId } from "@/data/assess/types";
import type { Tone } from "@/data/types";
import { longDate } from "@/lib/time";
import { actorName } from "../shared/provenance";

const KIND_LABEL: Record<FieldChange["kind"], string> = { added: "Added", changed: "Changed", removed: "Removed", source: "Source" };
const KIND_TONE: Record<FieldChange["kind"], Tone> = { added: "good", changed: "mid", removed: "neutral", source: "neutral" };

function Change({ c }: { c: FieldChange }) {
  return (
    <li data-change={c.key} className="rounded-xl border border-line bg-white px-3.5 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold">{c.label}</span>
        <Pill tone={KIND_TONE[c.kind]}>{KIND_LABEL[c.kind]}</Pill>
      </div>
      {c.kind === "source" ? (
        <p className="mt-1 text-[13px] text-ink2">{c.before} to {c.after}</p>
      ) : (
        <div className="mt-1.5 space-y-1 text-[13px]">
          {c.before ? <p className="whitespace-pre-line text-muted line-through" aria-label="Before">{c.before}</p> : null}
          {c.after ? <p className="whitespace-pre-line text-ink" aria-label="After">{c.after}</p> : <p className="text-muted">Now empty</p>}
        </div>
      )}
    </li>
  );
}

/** Every version of the module, newest first, with what changed from the version before it: field by field, including the typed result, the confirmed level
    and the notes. A signed version is never overwritten, so each one here is as it was signed. */
export function VersionDrawer({ open, onClose, moduleId, label, inst }: { open: boolean; onClose: () => void; moduleId: ModuleId; label: string; inst: InstrumentInstance | undefined }) {
  const rows = inst ? versionRows(inst) : [];
  return (
    <Drawer open={open} onClose={onClose} title="Version history" subtitle={label} width={640}>
      {rows.length <= 1 ? (
        <p className="mb-4 rounded-xl bg-tile px-4 py-3 text-[13px] text-ink2">Only version 1 exists. Amending a signed version starts version 2 and keeps version 1 as it was signed.</p>
      ) : null}
      <ol className="space-y-5">
        {[...rows].reverse().map((r) => {
          const before = rows.find((x) => x.version === r.version - 1);
          const changes = before ? diffSnapshots(moduleId, before.snapshot, r.snapshot) : [];
          return (
            <li key={r.version} data-version={r.version}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[16px] font-semibold">Version {r.version}</h3>
                <Pill tone={r.status === "signed" ? "good" : r.status === "superseded" ? "neutral" : "mid"}>{r.current ? INSTRUMENT_STATUS_LABEL[r.status] : r.status === "superseded" ? "Signed, superseded" : INSTRUMENT_STATUS_LABEL[r.status]}</Pill>
                {r.current ? <Pill tone="neutral">Current</Pill> : null}
              </div>
              <p className="mt-1 text-[13px] text-muted">
                {r.signedBy ? `Signed by ${actorName(r.signedBy)}${r.signedAt !== undefined ? ` on ${longDate(r.signedAt)}` : ""}` : "Not signed yet"}
                {r.startedBecause ? ` · Started because: ${r.startedBecause}` : ""}
              </p>
              {before ? (
                changes.length ? (
                  <ul className="mt-3 space-y-2" aria-label={`Changes from version ${before.version}`}>
                    {changes.map((c) => <Change key={c.key} c={c} />)}
                  </ul>
                ) : (
                  <p className="mt-3 text-[13px] text-muted">No changes from version {before.version}{r.current ? " yet" : ""}.</p>
                )
              ) : (
                <p className="mt-3 text-[13px] text-muted">The first version.</p>
              )}
            </li>
          );
        })}
      </ol>
    </Drawer>
  );
}
