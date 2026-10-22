import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Table2 } from "lucide-react";
import { cn } from "@/lib/cn";

/* Shared pieces of the hand-built SVG charts: the palette, a width hook so a chart redraws crisply at the size of its card, and a frame that
   gives every chart a text summary for screen readers and a data table that opens from a real button (reachable with Tab). */

export const CHART = {
  good: "#2F6F5C",
  forest: "#1D4F43",
  sage: "#739C8E",
  sageSoft: "#CFE3DB",
  mid: "#8F6620",
  midSoft: "#C9B791",
  risk: "#B5553A",
  riskSoft: "#E8B9A7",
  umber: "#6B4E3A",
  neutral: "#A9A59C",
  track: "#F0ECE4",
  grid: "#EFE8DE",
  axis: "#D9D0C3",
  text: "#4D463D",
  muted: "#6E6A63",
  ink: "#1B1B19",
  band: "#F8F4EC",
} as const;
/** Colors for the segments of a stacked bar, in order. The last is for "other". Each differs in lightness too, so they read in grey. */
export const SERIES_COLORS = ["#1D4F43", "#739C8E", "#8F6620", "#B5553A", "#6B4E3A", "#C9B791"];

/** The width of an element, kept up to date. Charts draw at this width, so text and lines stay the size they were designed at. */
export function useChartWidth(fallback = 640): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setW(Math.max(120, Math.round(el.getBoundingClientRect().width)));
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export interface ChartTableData {
  caption: string;
  head: string[];
  rows: (string | number | null)[][];
}

/** A plain table of exactly the numbers a chart draws. */
export function DataTable({ table, id }: { table: ChartTableData; id?: string }) {
  return (
    <div id={id} className="max-h-[320px] overflow-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-[12.5px]">
        <caption className="px-3 pt-2 pb-1 text-left text-xs text-muted">{table.caption}</caption>
        <thead>
          <tr>
            {table.head.map((h) => (
              <th key={h} scope="col" className="sticky top-0 border-b border-line bg-white px-3 py-1.5 font-medium text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="border-b border-line px-3 py-1.5 font-medium whitespace-nowrap">
                    {c ?? "-"}
                  </th>
                ) : (
                  <td key={j} className="border-b border-line px-3 py-1.5 whitespace-nowrap tabular-nums">
                    {c ?? "-"}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Wraps a chart: a text summary for screen readers, the chart, and "View data table" under it. */
export function ChartFrame({ id, summary, table, children, className, hint }: { id: string; summary: string; table: ChartTableData; children: ReactNode; className?: string; hint?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <figure className={cn("m-0", className)}>
      <p id={`${id}-summary`} className="sr-only">
        {summary}
      </p>
      {children}
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-muted">{hint}</div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-table`}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-forest hover:bg-sage-bg"
        >
          <Table2 size={14} className="ico" aria-hidden="true" />
          {open ? "Hide data table" : "View data table"}
        </button>
      </div>
      <div id={`${id}-table`} hidden={!open} className="mt-2">
        {open ? <DataTable table={table} /> : null}
      </div>
    </figure>
  );
}
export const summaryId = (frameId: string): string => `${frameId}-summary`;

/** A round "nice" top for an axis. */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** A smooth path through points that never overshoots between them (monotone cubic), with a gap wherever a value is missing. */
export function smoothPath(pts: ({ x: number; y: number } | null)[]): string {
  const segs: { x: number; y: number }[][] = [];
  let cur: { x: number; y: number }[] = [];
  for (const p of pts) {
    if (p) cur.push(p);
    else if (cur.length) {
      segs.push(cur);
      cur = [];
    }
  }
  if (cur.length) segs.push(cur);
  return segs
    .map((s) => {
      if (s.length === 1) return `M${s[0].x.toFixed(1)},${s[0].y.toFixed(1)}`;
      const n = s.length;
      const dx = s.slice(1).map((p, i) => p.x - s[i].x);
      const m = s.slice(1).map((p, i) => (p.y - s[i].y) / dx[i]);
      const t = [m[0]];
      for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
      t.push(m[n - 2]);
      for (let i = 0; i < n - 1; i++) {
        if (m[i] === 0) {
          t[i] = 0;
          t[i + 1] = 0;
          continue;
        }
        const a = t[i] / m[i];
        const b = t[i + 1] / m[i];
        const h = Math.hypot(a, b);
        if (h > 3) {
          t[i] = (3 * a * m[i]) / h;
          t[i + 1] = (3 * b * m[i]) / h;
        }
      }
      let d = `M${s[0].x.toFixed(1)},${s[0].y.toFixed(1)}`;
      for (let i = 0; i < n - 1; i++) {
        const c1x = s[i].x + dx[i] / 3;
        const c2x = s[i + 1].x - dx[i] / 3;
        d += ` C${c1x.toFixed(1)},${(s[i].y + (t[i] * dx[i]) / 3).toFixed(1)} ${c2x.toFixed(1)},${(s[i + 1].y - (t[i + 1] * dx[i]) / 3).toFixed(1)} ${s[i + 1].x.toFixed(1)},${s[i + 1].y.toFixed(1)}`;
      }
      return d;
    })
    .join(" ");
}

/** Breaks a label into lines of at most `max` characters, at spaces. */
export function wrapLabel(label: string, max: number, lines = 3): string[] {
  const words = label.split(" ");
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if (line && (line + " " + w).length > max) {
      out.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) out.push(line);
  if (out.length > lines) {
    const head = out.slice(0, lines);
    head[lines - 1] = `${head[lines - 1].slice(0, Math.max(1, max - 1))}…`;
    return head;
  }
  return out;
}

/** A floating box for the value under the pointer. It is absolutely placed inside a chart whose size is fixed, so nothing around it moves. */
export function Tooltip({ x, y, width = 220, bound, children }: { x: number; y: number; width?: number; bound: number; children: ReactNode }) {
  const left = x + 14 + width > bound ? Math.max(4, x - 14 - width) : x + 14;
  return (
    <div role="presentation" style={{ left, top: y, width }} className="pointer-events-none absolute z-20 rounded-xl border border-edge bg-white px-3 py-2.5 text-[12.5px] leading-snug text-ink shadow-[0_8px_24px_rgba(40,30,15,0.14)]">
      {children}
    </div>
  );
}
