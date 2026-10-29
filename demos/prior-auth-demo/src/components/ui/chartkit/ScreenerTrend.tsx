import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { clockTime, shortDate, toDate } from "@/lib/time";
import { useEscape } from "../escape";
import { Modal } from "../Overlay";
import { CHART, Tooltip, smoothPath, useChartWidth } from "./core";

/* Several screeners on one small chart. Each screener has its own range, so the y axis runs from Low to High (each series scaled to its own
   minimum and maximum) and the raw score is in the tooltip and the results table. One line per screener, each with its own color and its own
   marker shape, so identity never rests on color alone. A legend of real checkboxes under the chart shows or hides a line; "Add screener" lists
   the screeners on file that are not in the legend; "View results" opens every score by date. */

export interface ScreenerSeries {
  key: string;
  /** "PHQ-9" */
  name: string;
  /** What it measures: "Depression". */
  measures: string;
  min: number;
  max: number;
  /** Demo minutes, oldest first. */
  points: { at: number; value: number }[];
}

export interface ScreenerTrendProps {
  /** Every screener on file. The order fixes each one's color and marker, whatever is shown. */
  series: ScreenerSeries[];
  /** Keys in the legend at first, checked. */
  defaultShown: string[];
  /** The right edge of the axis ("Today"), in demo minutes. */
  now: number;
  /** Height of the plot area in px (about 160 to 190). */
  height?: number;
  /** Named in the screen-reader summary and the results dialog: "J.M., 34". */
  subject: string;
  className?: string;
}

/** Forest, ochre, slate blue, sage, umber: calm, and far enough apart for the common forms of color blindness. */
export const SCREENER_COLORS = [CHART.forest, CHART.mid, "#4F6D8F", CHART.sage, CHART.umber];
type Shape = "circle" | "square" | "triangle" | "diamond" | "ring";
const SHAPES: Shape[] = ["circle", "square", "triangle", "diamond", "ring"];

function Marker({ shape, x, y, color, r = 4, active = false }: { shape: Shape; x: number; y: number; color: string; r?: number; active?: boolean }) {
  const s = active ? r + 1.5 : r;
  const ring = { stroke: "#fff", strokeWidth: 2, paintOrder: "stroke" as const };
  switch (shape) {
    case "square":
      return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} rx={1} fill={color} {...ring} />;
    case "triangle":
      return <path d={`M${x},${y - s * 1.2} L${x + s * 1.1},${y + s * 0.85} L${x - s * 1.1},${y + s * 0.85} Z`} fill={color} {...ring} />;
    case "diamond":
      return <path d={`M${x},${y - s * 1.25} L${x + s * 1.1},${y} L${x},${y + s * 1.25} L${x - s * 1.1},${y} Z`} fill={color} {...ring} />;
    case "ring":
      return (
        <g>
          <circle cx={x} cy={y} r={s + 1} fill="#fff" />
          <circle cx={x} cy={y} r={s - 0.5} fill="#fff" stroke={color} strokeWidth={2} />
        </g>
      );
    default:
      return <circle cx={x} cy={y} r={s} fill={color} {...ring} />;
  }
}

/** The legend key: a short line with the series' marker on it. */
function Key({ shape, color }: { shape: Shape; color: string }) {
  return (
    <svg width="22" height="12" aria-hidden="true" className="shrink-0">
      <line x1="1" y1="6" x2="21" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Marker shape={shape} x={11} y={6} color={color} r={3.2} />
    </svg>
  );
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayLabel = (at: number): string => `${WD[toDate(at).getDay()]} ${shortDate(at)}`;
/** "Fri 10/17, 6:10 am" */
const when = (at: number): string => `${dayLabel(at)}, ${clockTime(toDate(at))}`;
const M = { l: 34, r: 12, t: 10, b: 22 };

export function ScreenerTrend({ series, defaultShown, now, height = 170, subject, className }: ScreenerTrendProps) {
  const id = useId();
  const [ref, w] = useChartWidth(320);
  const [legend, setLegend] = useState<string[]>(() => series.filter((s) => defaultShown.includes(s.key)).map((s) => s.key));
  const [hidden, setHidden] = useState<string[]>([]);
  const [menu, setMenu] = useState(false);
  const [results, setResults] = useState(false);
  const [active, setActive] = useState<{ key: string; i: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focused = useRef(false);

  useEscape(menu, () => setMenu(false));
  useEffect(() => {
    if (!menu) return;
    const down = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [menu]);

  const style = (key: string) => {
    const i = Math.max(0, series.findIndex((s) => s.key === key));
    return { color: SCREENER_COLORS[i % SCREENER_COLORS.length], shape: SHAPES[i % SHAPES.length] };
  };
  const visible = series.filter((s) => legend.includes(s.key) && !hidden.includes(s.key));
  const onFile = series.filter((s) => !legend.includes(s.key));

  const h = height + M.t + M.b;
  const iw = Math.max(60, w - M.l - M.r);
  const from = Math.min(now - 60, ...visible.flatMap((s) => s.points.map((p) => p.at)));
  const span = Math.max(60, now - from);
  const x = (at: number): number => M.l + ((at - from) / span) * iw;
  const y = (s: ScreenerSeries, v: number): number => M.t + height - ((v - s.min) / (s.max - s.min || 1)) * height;
  // Three dates under the axis: the first point, the middle, and today. The middle one is left out when it would crowd the others.
  const ticks = [{ at: from, label: dayLabel(from) }, ...(iw > 220 ? [{ at: from + span / 2, label: dayLabel(from + span / 2) }] : []), { at: now, label: "Today" }];

  /* Keyboard: the plot is one stop; the arrow keys walk through every visible point in date order. */
  const order = visible.flatMap((s) => s.points.map((p, i) => ({ key: s.key, i, at: p.at }))).sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!order.length || (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End")) return;
    e.preventDefault();
    const at = active ? order.findIndex((o) => o.key === active.key && o.i === active.i) : order.length;
    const next = e.key === "Home" ? 0 : e.key === "End" ? order.length - 1 : Math.max(0, Math.min(order.length - 1, at + (e.key === "ArrowRight" ? 1 : -1)));
    setActive({ key: order[next].key, i: order[next].i });
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    let best = { key: "", i: 0, d: Infinity };
    for (const s of visible) {
      for (let i = 0; i < s.points.length; i++) {
        const d = Math.hypot(x(s.points[i].at) - px, y(s, s.points[i].value) - py);
        if (d < best.d) best = { key: s.key, i, d };
      }
    }
    setActive(best.d < 28 ? { key: best.key, i: best.i } : null);
  };

  const act = active ? visible.find((s) => s.key === active.key) : undefined;
  const actPoint = act ? act.points[active?.i ?? 0] : undefined;
  const summary = `${subject}. ${visible.length ? visible.map((s) => `${s.name}, ${s.measures}: ${s.points.map((p) => p.value).join(", ")} on a scale of ${s.min} to ${s.max}, latest ${s.points[s.points.length - 1].value} on ${shortDate(s.points[s.points.length - 1].at)}`).join(". ") : "No screener shown"}. Use the arrow keys to move between points, or View results for every score.`;

  // Every date any screener on file was taken, newest first, for the results table.
  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.at)))].sort((a, b) => b - a);

  return (
    <figure className={cn("m-0", className)}>
      <p id={`${id}-sum`} className="sr-only">{summary}</p>
      <div
        ref={ref}
        role="group"
        aria-label={`Screener scores, ${subject}`}
        aria-describedby={`${id}-sum`}
        tabIndex={0}
        onKeyDown={onKey}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          setActive(null);
        }}
        style={{ height: h }}
        className="relative w-full rounded-lg outline-offset-4"
        data-testid="screener-plot"
      >
        <svg width={w} height={h} className="block touch-pan-y select-none" onPointerMove={onMove} onPointerLeave={() => !focused.current && setActive(null)}>
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={M.l} x2={w - M.r} y1={M.t + height * (1 - f)} y2={M.t + height * (1 - f)} stroke={f === 0 ? CHART.axis : CHART.grid} strokeWidth="1" />
          ))}
          <text x={M.l - 6} y={M.t + 4} textAnchor="end" fontSize="11" fill={CHART.muted} fontFamily="inherit">High</text>
          <text x={M.l - 6} y={M.t + height + 3} textAnchor="end" fontSize="11" fill={CHART.muted} fontFamily="inherit">Low</text>
          {ticks.map((t, i) => (
            <text key={t.label + i} x={x(t.at)} y={h - 5} textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"} fontSize="11" fill={CHART.muted} fontFamily="inherit">
              {t.label}
            </text>
          ))}
          {visible.map((s) => {
            const st = style(s.key);
            return <path key={s.key} d={smoothPath(s.points.map((p) => ({ x: x(p.at), y: y(s, p.value) })))} fill="none" stroke={st.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;
          })}
          {visible.map((s) => {
            const st = style(s.key);
            return s.points.map((p, i) => <Marker key={`${s.key}${i}`} shape={st.shape} color={st.color} x={x(p.at)} y={y(s, p.value)} active={active?.key === s.key && active.i === i} />);
          })}
          {actPoint && act ? <line x1={x(actPoint.at)} x2={x(actPoint.at)} y1={M.t} y2={M.t + height} stroke={CHART.text} strokeWidth="1" opacity="0.35" /> : null}
        </svg>
        {visible.length === 0 ? <div className="absolute inset-0 grid place-items-center text-[12px] text-muted">No screener shown</div> : null}
        {actPoint && act ? (
          <Tooltip x={x(actPoint.at)} y={Math.max(0, y(act, actPoint.value) - 44)} width={176} bound={w}>
            <div className="font-semibold">{act.name} <span className="font-normal text-muted">· {act.measures}</span></div>
            <div><b className="tabular-nums">{actPoint.value}</b> <span className="text-muted">of {act.max}</span></div>
            <div className="text-muted">{when(actPoint.at)}</div>
          </Tooltip>
        ) : null}
        <span className="sr-only" aria-live="polite">{actPoint && act ? `${act.name} ${actPoint.value} of ${act.max}, ${dayLabel(actPoint.at)}` : ""}</span>
      </div>

      <fieldset className="m-0 mt-2 flex min-w-0 flex-wrap items-start gap-x-4 gap-y-2 border-0 p-0">
        <legend className="sr-only">Screeners shown</legend>
        {legend.map((key) => {
          const s = series.find((x) => x.key === key);
          if (!s) return null;
          const st = style(key);
          const on = !hidden.includes(key);
          return (
            <label key={key} className="inline-flex cursor-pointer items-start gap-2">
              <input
                type="checkbox" checked={on} onChange={() => setHidden((hs) => (on ? [...hs, key] : hs.filter((k) => k !== key)))}
                className="mt-[3px] h-[15px] w-[15px] shrink-0 cursor-pointer accent-forest" aria-label={`${s.name}, ${s.measures}`}
              />
              <span className="flex flex-col leading-tight">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink"><Key shape={st.shape} color={st.color} />{s.name}</span>
                <span className="text-[12px] text-muted">{s.measures}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <div className="mt-2 flex items-center gap-1">
        {onFile.length ? (
          <div ref={menuRef} className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[12px] font-semibold text-forest hover:bg-sage-bg">
              <Plus size={14} className="ico" aria-hidden="true" />
              Add screener
            </button>
            {menu ? (
              <div role="menu" aria-label="Screeners on file" className="absolute bottom-full left-0 z-30 mb-1 w-[220px] rounded-xl border border-edge bg-white p-1 shadow-[0_12px_32px_rgba(21,27,36,0.14)]">
                {onFile.map((s) => (
                  <button
                    key={s.key} type="button" role="menuitem" autoFocus={s === onFile[0]}
                    onClick={() => {
                      setLegend((l) => [...l, s.key]);
                      setHidden((hs) => hs.filter((k) => k !== s.key));
                      setMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-tile focus-visible:bg-tile"
                  >
                    <Key {...style(s.key)} />
                    <b className="font-semibold">{s.name}</b>
                    <span className="text-muted">{s.measures}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <span className="flex-1" />
        <button type="button" onClick={() => setResults(true)} aria-haspopup="dialog" className="rounded-lg px-1.5 py-1 text-[12px] font-semibold text-forest hover:bg-sage-bg">View results</button>
      </div>

      <Modal open={results} onClose={() => setResults(false)} title="Screener results" subtitle={subject} size="lg">
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">Every screener score on file for {subject}, newest first</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky top-0 border-b border-line bg-white px-3 py-2 text-[12px] font-medium text-muted">Date</th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="border-b border-line bg-white px-3 py-2 text-[12px] font-medium whitespace-nowrap text-muted">
                    <span className="inline-flex items-center gap-1.5"><Key {...style(s.key)} />{s.name}</span>
                    <span className="block font-normal">{s.measures}, {s.min} to {s.max}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((at) => (
                <tr key={at}>
                  <th scope="row" className="border-b border-line px-3 py-1.5 font-medium whitespace-nowrap">{when(at)}</th>
                  {series.map((s) => {
                    const p = s.points.find((q) => q.at === at);
                    return <td key={s.key} className="border-b border-line px-3 py-1.5 whitespace-nowrap tabular-nums">{p ? p.value : <span className="text-faint">-</span>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </figure>
  );
}
