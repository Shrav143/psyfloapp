import type { Fact } from "./facts";

/** The authorization facts: only what this request has data for. The wide ones wrap rather than scroll. */
export function AuthFacts({ facts }: { facts: Fact[] }) {
  if (facts.length === 0) return null;
  return (
    <dl aria-label="Authorization facts" className="m-0 flex flex-wrap gap-x-9 gap-y-3">
      {facts.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">{f.label}</dt>
          <dd className="m-0 mt-0.5 text-[14px] font-semibold">{f.value}</dd>
          {f.note ? <dd className="m-0 text-xs text-muted">{f.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
