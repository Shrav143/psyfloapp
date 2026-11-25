import type { DriverView } from "@/data/caseModel";

const COLOR = { start: "#98A0AC", up: "#2E7D52", down: "#B5553A", total: "#217A78" };
const fmt = (n: number, start = false): string => (start || n === 0 ? String(n) : n > 0 ? `+${n}` : `−${Math.abs(n)}`);

/** The formula in numbers: "58 + 11 + 9 + 6 + 5 + 3 − 4 = 88". */
export const formulaOf = (rows: DriverView[], total: number): string =>
  `${rows.map((r, i) => (i === 0 ? String(r.pts) : r.pts >= 0 ? `+ ${r.pts}` : `− ${Math.abs(r.pts)}`)).join(" ")} = ${total}`;

const TRACK = "relative h-3 rounded-full bg-[#F3F1ED]";
const ROW = "grid grid-cols-[minmax(0,1fr)_160px_42px] items-center gap-4 border-b border-line px-1 py-2.5 text-[13px]";

/** "Why this number" as horizontal bars. The starting point and the total fill a 0 to 100% track. Each step grows from a
    centre line: green to the right adds points, terracotta to the left takes them away. A dashed outline shows what is still to come. */
export function DriverBars({ rows, total }: { rows: DriverView[]; total: number }) {
  const steps = rows.filter((r) => !r.start);
  const scale = Math.max(1, ...steps.flatMap((r) => [Math.abs(r.pts), Math.abs(r.finalPts)])); // the biggest step fills half the track
  const half = (n: number): number => (Math.abs(n) / scale) * 50;
  return (
    <div data-testid="driver-bars">
      {rows.map((r) => (
        <div key={r.id} className={ROW}>
          <div>
            <div>{r.label}</div>
            {r.finalPts !== r.pts ? <div className="text-[12px] text-muted">{r.pts < 0 ? "improves to" : "up to"} {fmt(r.finalPts)} once applied</div> : null}
          </div>
          <div className={TRACK} aria-hidden="true">
            {r.start ? (
              <i className="absolute top-0 left-0 block h-full rounded-full" style={{ width: `${r.pts}%`, background: COLOR.start }} />
            ) : (
              <>
                <i className="absolute top-[-4px] left-1/2 block h-5 w-px bg-[#D9D6CF]" />
                {r.pts !== 0 ? (
                  <i className="absolute top-0 block h-full" style={{ left: r.pts > 0 ? "50%" : `${50 - half(r.pts)}%`, width: `${half(r.pts)}%`, background: r.pts > 0 ? COLOR.up : COLOR.down, borderRadius: r.pts > 0 ? "0 9999px 9999px 0" : "9999px 0 0 9999px", transition: "all .5s ease" }} />
                ) : null}
                {r.finalPts > r.pts && r.pts >= 0 ? <i className="absolute top-0 block h-full rounded-r-full border border-l-0 border-dashed" style={{ left: `${50 + half(r.pts)}%`, width: `${half(r.finalPts) - half(r.pts)}%`, borderColor: COLOR.up, opacity: 0.6 }} /> : null}
              </>
            )}
          </div>
          <b className="text-right" style={{ color: r.start ? "#151B24" : r.pts >= 0 ? "#2E7D52" : "#8A3B2A" }}>{fmt(r.pts, r.start)}</b>
        </div>
      ))}
      <div className="grid grid-cols-[minmax(0,1fr)_160px_42px] items-center gap-4 px-1 py-3 text-[13px]">
        <div className="font-semibold">Approval chance now</div>
        <div className={TRACK} aria-hidden="true">
          <i className="absolute top-0 left-0 block h-full rounded-full" style={{ width: `${total}%`, background: COLOR.total, transition: "all .5s ease" }} />
        </div>
        <b className="text-right">={total}%</b>
      </div>
    </div>
  );
}
