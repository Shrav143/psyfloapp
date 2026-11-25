import { STATUS_HELP } from "@/data/queue";
import { InfoTip } from "@/components/ui/InfoTip";

/** "What the statuses mean": the demo's chips set against the product's status words. The chips keep their names. */
export function StatusHelp({ align = "start" }: { align?: "start" | "end" }) {
  return (
    <InfoTip label="What the statuses mean" align={align}>
      <div className="mb-1.5 font-semibold text-ink">What the statuses mean</div>
      <dl className="m-0 flex flex-col gap-1.5">
        {STATUS_HELP.map((s) => (
          <div key={s.chip}>
            <dt className="inline font-semibold text-ink">{s.chip}</dt>
            <dd className="m-0 inline"> {s.means}</dd>
          </div>
        ))}
      </dl>
    </InfoTip>
  );
}
