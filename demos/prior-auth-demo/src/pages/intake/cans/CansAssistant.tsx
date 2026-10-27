import { useMemo } from "react";
import { ListPlus, RefreshCw } from "lucide-react";
import { AgentChip, Button, Card, CardBody, CardHeader, Chip } from "@/components/ui";
import type { CansAssessment, IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { runAgent } from "../lib/agents";
import { SourceLink } from "../shared/provenance";
import { readCans } from "./assistant";

const H = "text-[11px] font-semibold tracking-[0.08em] text-muted uppercase";

/** The CANS assistant: unanswered items, evidence gaps with follow-up questions, statements that disagree, and what still needs a person.
    It suggests and explains; it never rates an item, and it turns a suggestion into a task only when a person asks. */
export function CansAssistant({ record, cans }: { record: IntakeRecord; cans: CansAssessment }) {
  const addTask = useStore((s) => s.addIntakeTask);
  const toast = useStore((s) => s.toast);
  const reading = useMemo(() => readCans(record, cans), [record, cans]);
  const checking = record.tasks.some((t) => t.role === "cans" && t.action === CHECK && (t.status === "queued" || t.status === "running"));
  const task = (action: string, result: string) => {
    addTask(record.id, { role: "cans", action, status: "needs_you", section: "cans", approval: "none", result });
    toast({ title: "Added to the assistant's list", body: action, tone: "neutral" });
  };
  const check = () =>
    runAgent(record.id, {
      role: "cans",
      action: CHECK,
      section: "cans",
      ms: 1300,
      work: () => {
        const r = readCans(record, cans);
        return `${r.gaps.length} ${r.gaps.length === 1 ? "theme has" : "themes have"} no evidence, ${r.contradictions.length} ${r.contradictions.length === 1 ? "statement pair disagrees" : "statement pairs disagree"}, ${r.review.length} kept ${r.review.length === 1 ? "item needs" : "items need"} review. No items rated.`;
      },
    });

  return (
    <Card data-cans-assistant>
      <CardHeader
        title="CANS assistant"
        subtitle="Suggests and explains. It never rates an item."
        right={
          <div className="flex items-center gap-2">
            <AgentChip agent="criteria" />
            <Button size="sm" icon={RefreshCw} loading={checking} onClick={check}>Check again</Button>
          </div>
        }
      />
      <CardBody className="space-y-5">
        <section>
          <h4 className={H}>Unanswered items</h4>
          <p className="mt-1 text-[14px] text-ink2">
            {reading.itemsMapped} official items mapped. Every CANS Lifetime item stays unanswered until the DMAS item mapping is loaded. Missing evidence is never scored as zero.
          </p>
        </section>

        <section>
          <h4 className={H}>Statements that disagree ({reading.contradictions.length})</h4>
          {reading.contradictions.length ? (
            <ul className="mt-2 space-y-3">
              {reading.contradictions.map((c) => (
                <li key={c.id} data-contradiction={c.topic} className="rounded-xl border border-mid-edge bg-mid-bg/40 px-3.5 py-3">
                  <div className="text-[13px] font-semibold text-ink">{c.topic}</div>
                  <p className="mt-1 text-[13px] text-ink2">“{c.a.text}” <SourceLink record={record} source={c.a.source} /></p>
                  <p className="mt-1 text-[13px] text-ink2">“{c.b.text}” <SourceLink record={record} source={c.b.source} /></p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[12px] text-muted">Psyflo does not decide which is right; a clinician clarifies.</span>
                    <Button size="sm" icon={ListPlus} onClick={() => task(`Clarify: ${c.topic.toLowerCase()}`, "Two sources disagree; ask the person or the referrer")}>Add a task to clarify</Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[14px] text-ink2">None found in the evidence, the assessment and the referral.</p>
          )}
        </section>

        <section>
          <h4 className={H}>Gaps and follow-up questions ({reading.gaps.length})</h4>
          <p className="mt-1 text-[12px] text-muted">Psyflo interview prompts by evidence theme, not CANS items.</p>
          {reading.gaps.length ? (
            <ul className="mt-2 space-y-2.5">
              {reading.gaps.map((g) => (
                <li key={g.theme} data-gap={g.theme} className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-2.5 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-ink">{g.theme}: no evidence yet</div>
                    <ul className="mt-0.5 list-disc pl-5 text-[13px] text-ink2">
                      {g.questions.map((q) => <li key={q}>{q}</li>)}
                    </ul>
                  </div>
                  <Button size="sm" icon={ListPlus} onClick={() => task(`Ask follow-up questions: ${g.theme}`, g.questions.join(" "))}>Add as a task</Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[14px] text-ink2">Every theme has some evidence.</p>
          )}
        </section>

        <section>
          <h4 className={H}>Needs a person's review ({reading.review.length})</h4>
          {reading.review.length ? (
            <ul className="mt-2 space-y-2">
              {reading.review.map((n) => (
                <li key={n.evidenceId} className="text-[13px]">
                  <span className="text-ink">“{n.text}”</span>
                  <span className="mt-0.5 block text-muted">{n.why}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[14px] text-ink2">Nothing kept needs a second look.</p>
          )}
          {reading.review.length ? <Chip className="mt-2">Kept evidence stays unapproved for rating until a qualified person reviews it</Chip> : null}
        </section>
      </CardBody>
    </Card>
  );
}

const CHECK = "Review CANS evidence for gaps and disagreements";
