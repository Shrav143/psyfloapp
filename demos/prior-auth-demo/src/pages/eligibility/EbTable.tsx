import { useNavigate } from "react-router-dom";
import { Button, Chip, IdLink, Table, Td, Th, Tr } from "@/components/ui";
import { verdictOf, type EbPatient } from "@/data/eligibility";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AuthChip, BenefitsChip, EligibilityChip, patientLabel, VerdictChip } from "./chips";

const when = (at: number, now: number): string => {
  const m = Math.max(0, now - at);
  if (m < 1) return "just now";
  if (m < 60) return `${Math.round(m)} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  const d = Math.round(m / 1440);
  return d === 1 ? "1 day ago" : `${d} days ago`;
};

/** One row per patient. The ID and the row open the result; Re-check runs a live check and updates the row in place. */
export function EbTable({ rows }: { rows: EbPatient[] }) {
  const nav = useNavigate();
  const clock = useStore((s) => s.clock);
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
          <Th>
            <span className="sr-only">Re-check</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => {
          const busy = rechecking.includes(p.id);
          return (
            <Tr key={p.id} onClick={() => nav(paths.eligibilityResult(p.id))}>
              <Td>
                <div>
                  <IdLink onClick={() => nav(paths.eligibilityResult(p.id))}>{p.id}</IdLink> <span className="text-muted">· {patientLabel(p)}</span>
                </div>
                <div className="text-xs text-muted">{payerById(p.payerId).name}</div>
              </Td>
              <Td>
                <Chip>{p.levelLabel ?? PROGRAM_LABEL[p.program]}</Chip>
              </Td>
              <Td>
                <EligibilityChip p={p} />
              </Td>
              <Td>
                <BenefitsChip p={p} />
              </Td>
              <Td>
                <AuthChip p={p} />
              </Td>
              <Td>
                <VerdictChip v={verdictOf(p)} />
                <div className="mt-1 text-xs text-muted">{busy ? "Checking now" : `Checked ${when(p.checkedAt, clock)}`}</div>
              </Td>
              <Td className="text-right">
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
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
