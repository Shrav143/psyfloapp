import { useEffect, useRef } from "react";
import type { ChartRecord, Consumer, DocSeed, FormSpec, ScribeScenario, SessionLine } from "@/ext/types";

/** Everything a stage needs to know about the document being scribed, resolved once by ScribeView. */
export interface ScribeCtx {
  docId: string;
  seed: DocSeed;
  spec: FormSpec;
  consumer: Consumer | undefined;
  scenario: ScribeScenario;
}

export const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The unique clock times behind a draft field, "0:18 · 0:27". Long lists are cut so the chip stays on one or two lines. */
export function timesOf(lines: SessionLine[], idx: number[] | undefined): string {
  const t = [...new Set((idx ?? []).map((i) => lines[i]?.t).filter((x): x is string => !!x))];
  return t.slice(0, 3).join(" · ") + (t.length > 3 ? ` +${t.length - 3}` : "");
}

export const recordsOf = (consumer: Consumer | undefined, ids: string[]): ChartRecord[] =>
  ids.map((id) => consumer?.chart.find((r) => r.id === id)).filter((r): r is ChartRecord => !!r);

/** A stage heading: focus moves here when the stage changes (see ScribeView). */
export function StageHeading({ children, className = "p-title" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={className} tabIndex={-1} data-stage-heading="">{children}</h2>;
}

/**
 * The transcript. `follow` keeps the newest line in view unless the person scrolled up to read.
 * `highlight` marks lines (the ones behind a draft field) and scrolls the first one into view.
 */
export function Transcript({ lines, speakers = true, highlight, follow = false, live = false, label, className = "" }: {
  lines: SessionLine[];
  speakers?: boolean;
  highlight?: number[];
  follow?: boolean;
  live?: boolean;
  label: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    const el = box.current;
    if (el && follow && stick.current) el.scrollTop = el.scrollHeight;
  }, [lines.length, follow]);

  const first = highlight && highlight.length ? Math.min(...highlight) : -1;
  useEffect(() => {
    const el = box.current;
    if (!el || first < 0) return;
    const row = el.querySelector<HTMLElement>(`[data-line="${first}"]`);
    if (row) el.scrollTop = Math.max(0, row.offsetTop - 8);
  }, [first]);

  const liveProps = live ? { role: "log" as const, "aria-live": "polite" as const, "aria-relevant": "additions" as const } : { role: "group" as const };
  return (
    <div
      ref={box}
      className={`scr-log ${className}`}
      tabIndex={0}
      aria-label={label}
      onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 28; }}
      {...liveProps}
    >
      {lines.map((l, i) => (
        <div key={i} data-line={i} className={`scr-line${highlight?.includes(i) ? " hl" : ""}`}>
          <span className="t">{l.t}</span>
          <span className="tx">{speakers ? <b>{l.who}:</b> : null}{speakers ? " " : ""}{l.text}{highlight?.includes(i) ? <span className="sr-only"> (used for this field)</span> : null}</span>
        </div>
      ))}
      {lines.length === 0 ? <div className="scr-wait">Waiting for the first words…</div> : null}
    </div>
  );
}
