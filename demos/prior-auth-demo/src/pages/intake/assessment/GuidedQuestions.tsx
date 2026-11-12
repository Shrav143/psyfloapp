import { useEffect, useState } from "react";
import { AudioLines, Volume2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill, TextArea } from "@/components/ui";
import { GUIDED_QUESTIONS } from "@/data/intake/scripts";
import { ASSESSMENT_SECTIONS, type IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { runAgent } from "../lib/agents";
import { SimulatedTag } from "../shared/provenance";
import { STATUS_LABEL } from "../voice/engine";

const DRAFT_ACTION = "Draft assessment sections from the voice guided answers";

function GuidedRow({ record, q, n, readOnly, editing, setEditing, onDone }: {
  record: IntakeRecord; q: (typeof GUIDED_QUESTIONS)[number]; n: number; readOnly: boolean; editing: boolean; setEditing: (open: boolean) => void; onDone: () => void;
}) {
  const set = useStore((s) => s.setGuidedAnswer);
  const saved = record.assessment.guided?.[q.id];
  const [text, setText] = useState(saved?.answer ?? "");
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (!speaking) return;
    const t = window.setTimeout(() => setSpeaking(false), 1200);
    return () => window.clearTimeout(t);
  }, [speaking]);
  const section = ASSESSMENT_SECTIONS.find((s) => s.id === q.section)?.label;
  return (
    <li data-guided={q.id} className="border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-start gap-2">
        <span className="w-5 pt-0.5 text-[12px] tabular-nums text-muted">{n}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">{q.text}</p>
          <p className="text-[12px] text-muted">For {section}</p>
        </div>
        {saved?.state === "asked" ? <Pill tone="good">{saved.drafted ? "Asked · drafted" : "Asked"}</Pill> : saved?.state === "skipped" ? <Pill>Skipped</Pill> : <Pill tone="mid">To ask</Pill>}
      </div>
      {!readOnly && editing ? (
        <div className="mt-2 space-y-2 pl-7">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" icon={Volume2} loading={speaking} onClick={() => setSpeaking(true)}>{speaking ? "Speaking (simulated)" : "Play the question"}</Button>
          </div>
          <TextArea aria-label={`Answer: ${q.text}`} value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="What the person said" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" disabled={!text.trim()} onClick={() => { set(record.id, q.id, text.trim(), "asked"); onDone(); }}>Mark asked</Button>
            <Button size="sm" onClick={() => { set(record.id, q.id, text.trim(), "skipped"); onDone(); }}>Skip</Button>
          </div>
        </div>
      ) : saved && saved.state !== "open" ? (
        <div className="mt-1.5 flex flex-wrap items-start gap-2 pl-7">
          <p className="min-w-0 flex-1 text-[14px] text-ink2">{saved.state === "skipped" ? "Not asked" : saved.answer}</p>
          {!readOnly ? <button type="button" onClick={() => { setText(saved.answer); setEditing(true); }} className="text-[12px] font-semibold text-forest hover:underline">Change</button> : null}
        </div>
      ) : !readOnly ? (
        <div className="mt-1 pl-7">
          <button type="button" onClick={() => setEditing(true)} className="text-[12px] font-semibold text-forest hover:underline">Ask this question</button>
        </div>
      ) : null}
    </li>
  );
}

/** Voice guided mode: the approved questions the clinician works through with the person, simulated. Answers become drafts for review. */
export function GuidedQuestions({ record, readOnly, openVoice }: { record: IntakeRecord; readOnly: boolean; openVoice: () => void }) {
  const toast = useStore((s) => s.toast);
  const g = record.assessment.guided ?? {};
  const nextOpen = (after?: string) => {
    const from = after ? GUIDED_QUESTIONS.findIndex((q) => q.id === after) + 1 : 0;
    return [...GUIDED_QUESTIONS.slice(from), ...GUIDED_QUESTIONS.slice(0, from)].find((q) => q.id !== after && !g[q.id])?.id ?? null;
  };
  /* One question open at a time: the next one not yet asked. */
  const [openId, setOpenId] = useState<string | null>(() => nextOpen());
  const asked = GUIDED_QUESTIONS.filter((q) => g[q.id]?.state === "asked").length;
  const skipped = GUIDED_QUESTIONS.filter((q) => g[q.id]?.state === "skipped").length;
  const fresh = GUIDED_QUESTIONS.filter((q) => g[q.id]?.state === "asked" && !g[q.id].drafted).length;
  const running = record.tasks.some((t) => t.action === DRAFT_ACTION && (t.status === "queued" || t.status === "running"));
  const draft = () => {
    const id = runAgent(record.id, {
      role: "documentation", action: DRAFT_ACTION, section: "assessment", source: "Voice guided assessment (simulated)", approval: "required", ms: 1200,
      work: () => {
        const n = useStore.getState().draftFromGuided(record.id);
        return `${n} assessment ${n === 1 ? "section" : "sections"} drafted for review`;
      },
    });
    if (id) toast({ title: "Drafting from the answers", body: "Each draft appears under its section for you to accept, edit or reject.", tone: "neutral" });
  };
  return (
    <Card>
      <CardHeader title="Voice guided questions" right={<><span className="text-[12px] text-muted">{asked} asked · {skipped} skipped</span><SimulatedTag what="Simulated voice" /></>} />
      <CardBody className="py-1">
        <ol>
          {GUIDED_QUESTIONS.map((q, i) => (
            <GuidedRow key={q.id} record={record} q={q} n={i + 1} readOnly={readOnly} editing={openId === q.id} setEditing={(o) => setOpenId(o ? q.id : null)} onDone={() => setOpenId(nextOpen(q.id))} />
          ))}
        </ol>
        <p className="py-2 text-[12px] text-muted">Safety and risk screening is not part of the guide: the clinician records it in its own section below.</p>
        <div className="flex flex-wrap items-center gap-2 border-t border-line py-3">
          {!readOnly ? <Button variant="primary" loading={running} disabled={!fresh} onClick={draft}>Create draft from {fresh || "the"} {fresh === 1 ? "answer" : "answers"}</Button> : null}
          <span className="text-[12px] text-muted">{fresh ? "Drafts wait under their sections; nothing is written until a person accepts." : "Record an answer to draft from it."}</span>
          <Button className="ml-auto" size="sm" icon={AudioLines} onClick={openVoice}>
            {record.voice && record.voice.status !== "idle" ? `Voice Intake Assistant: ${STATUS_LABEL[record.voice.status]}` : "Open the Voice Intake Assistant"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
