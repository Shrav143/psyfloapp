import { ASSESSMENT_SECTIONS, type AssessmentSectionId, type IntakeRecord, type SourceRef } from "@/data/intake/types";
import type { EvidenceProposal } from "@/store/intakeCans";
import { CANS_THEMES, themeOf, type CansTheme } from "./cansModel";

/* The CANS Evidence Agent's simulated reading: it walks the record's documents, the clinical assessment fields and the AI Scribe transcript,
   splits them into short statements and files each under a Psyflo theme with its source. It proposes; a person keeps or discards each one. */

const SKIP = /\b(release|consent|insurance|member id|phone|asking for|we ask|referral to|recommend)/i;
const ASSESSMENT_THEME: Partial<Record<AssessmentSectionId, CansTheme>> = {
  presenting: "Other", symptoms: "Symptoms", history: "Other", mse: "Symptoms", functional: "Functioning", safety: "Risk (needs clinician review)",
  strengths: "Supports and strengths", sdoh: "Other", prior: "Other", goals: "Supports and strengths", needs: "Functioning",
};

/** Short paragraphs stay whole (their sentences explain each other); longer ones are split into sentences. */
function statements(text: string): string[] {
  const t = text.trim();
  if (t.length <= 160) return [t];
  return t.split(/(?<=[.!?])\s+(?=[A-Z])/).map((x) => x.trim()).filter(Boolean);
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function findEvidence(r: IntakeRecord): EvidenceProposal[] {
  const seen = new Set<string>([
    ...(r.cans?.evidence ?? []).map((e) => norm(e.text)),
    ...r.suggestions.filter((s) => s.section === "cans" && s.field.startsWith("evidence:")).map((s) => norm(s.value)),
  ]);
  const out: EvidenceProposal[] = [];
  const push = (text: string, theme: CansTheme | null, source: SourceRef) => {
    if (!theme || seen.has(norm(text))) return;
    seen.add(norm(text));
    out.push({ text, theme, source });
  };

  for (const sec of ASSESSMENT_SECTIONS) {
    const fv = r.assessment.fields[sec.id];
    if (!fv?.value || fv.state === "ai_suggested") continue;
    push(fv.value, ASSESSMENT_THEME[sec.id] ?? themeOf(fv.value), { kind: "staff", ref: `Clinical assessment: ${sec.label}` });
  }

  for (const d of r.documents) {
    d.pages.forEach((blocks, pi) => {
      const ref = `${d.name.replace(/\.(pdf|txt)$/i, "").replace(/\s*\((import|fax)\)$/i, "")} p.${pi + 1}`;
      for (const b of blocks) {
        const texts = b.kind === "p" ? statements(b.text) : b.kind === "list" ? b.items : [];
        const blockId = b.kind === "p" || b.kind === "list" ? b.id : undefined;
        for (const t of texts) {
          if (SKIP.test(t)) continue;
          push(t, themeOf(t), { kind: "document", ref, docId: d.id, blockId, quote: t.length > 90 ? `${t.slice(0, 88)}…` : t });
        }
      }
    });
  }

  for (const turn of r.scribe?.turns ?? []) {
    if (turn.speaker !== "patient" && turn.speaker !== "caregiver") continue;
    for (const t of statements(turn.text)) {
      if (t.length < 24 || SKIP.test(t)) continue;
      push(t, themeOf(t), { kind: "transcript", ref: "AI Scribe transcript", at: turn.at, quote: t });
    }
  }
  return out.slice(0, 12);
}

/** The agent's draft evidence summary, from kept evidence only. It lists statements by theme and names the themes with nothing yet. */
export function draftSummary(r: IntakeRecord): string {
  const ev = r.cans?.evidence ?? [];
  const parts = CANS_THEMES.map((t) => [t, ev.filter((e) => (e.theme ?? "Other") === t)] as const);
  const filled = parts.filter(([, list]) => list.length);
  const empty = parts.filter(([, list]) => !list.length).map(([t]) => t);
  const lines = filled.map(([t, list]) => `${t}: ${list.map((e) => e.text.replace(/\.$/, "")).join("; ")}.`);
  return [
    `Evidence kept so far: ${ev.length} statement${ev.length === 1 ? "" : "s"} from the record, each with its source.`,
    ...lines,
    empty.length ? `No evidence gathered yet for: ${empty.join(", ")}. Missing evidence is not a score.` : "",
    "This is an organized summary of evidence for clinician review. It is not a CANS Lifetime rating.",
  ].filter(Boolean).join("\n");
}
