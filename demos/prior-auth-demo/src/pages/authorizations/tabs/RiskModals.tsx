import { Button, Modal, Pill } from "@/components/ui";
import type { CaseDetail, Comparable } from "@/data/caseDetail";
import { payerById } from "@/data/seed";

/** A short explanation, never a model dump. */
export function HowCalculatedModal({ detail, onClose }: { detail: CaseDetail; onClose: () => void }) {
  const payer = payerById(detail.payerId);
  const steps = [
    ["Historian finds similar decisions", `Same payer and plan, level of care, diagnosis cluster, review type and documentation signals. For this request that is ${(detail.similar.own + detail.similar.network + detail.similar.benchmark).toLocaleString("en-US")} decisions.`],
    ["Forecaster starts from the base rate", `How often ${payer.shortName} approved those requests as asked. That is the starting point in Why this number.`],
    ["It adds and takes away points", "Each row is something the draft shows, or does not show yet. Rows add up to the chance, so you can see exactly what moved it."],
    ["The range says how sure it is", "More similar decisions give a narrower range. With little history the number is labeled Benchmark estimate."],
    ["It is checked every night", "Forecaster compares what it said with what payers actually decided, and the result is the line under Can you trust it."],
  ];
  return (
    <Modal open onClose={onClose} title="How the approval chance is calculated" subtitle="In plain words. Updated nightly." footer={<Button variant="primary" onClick={onClose}>Got it</Button>}>
      <ol className="flex flex-col gap-3.5">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex items-start gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-bg text-xs font-semibold">{i + 1}</span>
            <div><div className="font-semibold">{t}</div><div className="text-[13.5px] text-muted">{d}</div></div>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-xl bg-tile px-4 py-3 text-[13.5px] text-ink2">It estimates how well the paperwork fits the payer's past decisions. It does not decide care, never blocks a request, and is never shown to payers or patients.</div>
    </Modal>
  );
}

const MORE: Comparable[] = [
  { who: "Network", what: "Same payer, plan named, scores falling", outcome: "Approved 14/14", tone: "good", match: "close match" },
  { who: "Yours", what: "Earlier attempt not documented", outcome: "Approved 7/14", tone: "mid", match: "close match" },
  { who: "Network", what: "Recent relapse, no step-down named", outcome: "Approved 7/14", tone: "mid", match: "partial match" },
];

export function SeeAllModal({ detail, onClose }: { detail: CaseDetail; onClose: () => void }) {
  const all = [...detail.comparable, ...MORE.map((m) => ({ ...m, outcome: m.outcome.replace(/\/14$/, `/${detail.days}`).replace(/^Approved 7/, `Approved ${Math.round(detail.days / 2)}`).replace(/^Approved 14/, `Approved ${detail.days}`) }))];
  return (
    <Modal open onClose={onClose} title="Comparable decisions" subtitle={`${all.length} of the closest matches from your own and the network's history`} footer={<Button onClick={onClose}>Close</Button>}>
      <ul>
        {all.map((c, i) => (
          <li key={i} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
            <div className="flex-1"><div className="font-semibold">{c.what}</div><div className="text-xs text-muted">{c.who} · {c.match}</div></div>
            <Pill tone={c.tone}>{c.outcome}</Pill>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
