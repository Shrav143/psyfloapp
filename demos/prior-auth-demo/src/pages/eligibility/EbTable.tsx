import { useNavigate } from "react-router-dom";
import { Button, Chip, IdLink, Table, Td, Th } from "@/components/ui";
import { verdictOf, type EbPatient } from "@/data/eligibility";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AuthChip, BenefitsChip, EligibilityChip, limitText, patientLabel, VerdictChip } from "./chips";
import { autoState, DUE_AT, NOT_RECHECKED, RE_CHECKED, type AutoState } from "./recheck";

const NOT_CHECKED_PAUSED = "Could not be checked: Verify is paused in Settings";

const when = (at: number, now: number): string => {
  const m = Math.max(0, now - at);
  if (m < 1) return "just now";
  if (m < 60) return `${Math.round(m)} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  const d = Math.round(m / 1440);
  return d === 1 ? "1 day ago" : `${d} days ago`;
};

interface Part {
  text: string;
  /** Verify is paused, so a re-check did not run: the one part of the line that is not just information. */
  warn?: boolean;
}

/** The quiet second line of a row: the payer, the day limit, when it was checked, and what Verify's automatic re-check is doing. */
function quietParts(p: EbPatient, now: number, busy: boolean, auto: AutoState | null): Part[] {
  const parts: Part[] = [{ text: payerById(p.payerId).name }];
  const limit = limitText(p);
  if (limit) parts.push({ text: limit });
  if (p.payerChanged) parts.push({ text: `Now with ${payerById(p.payerChanged.to)?.shortName ?? "another plan"} since ${p.payerChanged.since}` });
  if (p.idMismatch) parts.push({ text: `The plan has the ID ending ${p.idMismatch.onFile.replace("…", "")}` });
  if (p.networkUnresolved && p.eligibility.state !== "unavailable") parts.push({ text: "Enrollment not confirmed" });
  if (p.eligibility.state === "unavailable") parts.push({ text: NOT_CHECKED_PAUSED, warn: true });
  else if (p.refreshFailed !== undefined) parts.push({ text: "Last refresh could not run: Verify is paused", warn: true });
  if (busy) parts.push({ text: "Checking now" });
  else if (auto?.kind === "done") parts.push({ text: RE_CHECKED(auto.at) });
  else if (auto?.kind === "paused") parts.push({ text: NOT_RECHECKED, warn: true });
  else if (p.eligibility.state !== "unavailable") {
    parts.push({ text: `Checked ${when(p.checkedAt, now)}` });
    if (auto) parts.push({ text: DUE_AT(auto.at) });
  }
  return parts;
}

/** One patient is two lines: the chips that answer the question, then a quiet line with the rest. The ID and the row open the result;
    Re-check runs a live check and updates the row in place. */
export function EbTable({ rows }: { rows: EbPatient[] }) {
  const nav = useNavigate();
  const clock = useStore((s) => s.clock);
  const paused = useStore((s) => s.agentPaused.verify);
  const rechecking = useStore((s) => s.ebRechecking);
  const recheck = useStore((s) => s.ebRecheck);
  return (
    <Table nowrap>
      <thead>
        <tr>
          <Th>Patient</Th>
          <Th>Program</Th>
          <Th>Eligibility</Th>
          <Th>Benefits</Th>
          <Th>Authorization</Th>
          <Th>Verdict</Th>
          <Th aria-label="Re-check" />
        </tr>
      </thead>
      {rows.map((p) => {
        const busy = rechecking.includes(p.id);
        const open = () => nav(paths.eligibilityResult(p.id));
        const quiet = quietParts(p, clock, busy, autoState(p, clock, paused));
        return (
          <tbody key={p.id} onClick={open} className="cursor-pointer hover:bg-[#FBF8F3] [&:last-of-type>tr:last-child>td]:border-b-0">
            <tr>
              <Td className="border-b-0 pb-1.5">
                <IdLink onClick={open}>{p.id}</IdLink> <span className="text-muted">· {patientLabel(p)}</span>
              </Td>
              <Td className="border-b-0 pb-1.5">
                <Chip>{p.levelLabel ?? PROGRAM_LABEL[p.program]}</Chip>
              </Td>
              <Td className="border-b-0 pb-1.5">
                <EligibilityChip p={p} />
              </Td>
              <Td className="border-b-0 pb-1.5">
                <BenefitsChip p={p} />
              </Td>
              <Td className="border-b-0 pb-1.5">
                <AuthChip p={p} />
              </Td>
              <Td className="border-b-0 pb-1.5">
                <VerdictChip v={verdictOf(p)} />
              </Td>
              <Td className="border-b-0 pb-1.5 text-right">
                <Button
                  size="sm"
                  loading={busy}
                  aria-label={`Re-check ${p.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    recheck(p.id);
                  }}
                >
                  {busy ? "Checking" : "Re-check"}
                </Button>
              </Td>
            </tr>
            <tr>
              <Td colSpan={7} className="pt-0 pb-3.5 text-[12px] text-muted">
                {quiet.map((x, i) => (
                  <span key={x.text}>
                    {i > 0 ? " · " : ""}
                    <span className={x.warn ? "text-mid-ink" : undefined}>{x.text}</span>
                  </span>
                ))}
              </Td>
            </tr>
          </tbody>
        );
      })}
    </Table>
  );
}
