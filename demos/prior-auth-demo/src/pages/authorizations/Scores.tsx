import type { Score } from "@/data/queue";

const ARROW = { up: "↑", down: "↓", flat: "→" } as const;
const ARROW_WORD = { up: "rising", down: "falling", flat: "unchanged" } as const;

/** "AUDIT-C 11 · PHQ-9 17 ↑": scores with a trend arrow that also has a spoken word. */
export function Scores({ scores }: { scores: Score[] }) {
  return (
    <div className="text-[13px] text-ink2">
      {scores.map((s, i) => (
        <span key={s.label}>
          {i > 0 ? <span className="px-1.5 text-faint">·</span> : null}
          <b className="font-semibold text-ink">{s.label}</b> {s.value}
          {s.trend ? <span role="img" aria-label={ARROW_WORD[s.trend]} className="pl-0.5">{ARROW[s.trend]}</span> : null}
        </span>
      ))}
    </div>
  );
}
