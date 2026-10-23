import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Button, Pill } from "@/components/ui";
import { PROGRAM_LABEL } from "@/data/types";
import { REQUEST_TYPE_LABEL, VERIFICATION_LABEL, type PayerRule } from "@/data/workflow/types";
import { cn } from "@/lib/cn";
import { readDate, readValues, valuesLine, VERIFICATION_TONE } from "./ruleText";

const chip = "inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-[3px] text-xs text-ink2";

/** The source as a chip: its label, and a link when the source has an address. A demo sample is labelled as one. */
function SourceChip({ rule }: { rule: PayerRule }) {
  const s = rule.source;
  const label = s.kind === "demo_sample" ? `Source: ${s.label || "Demo sample"}` : `Source: ${s.label}`;
  if (s.url) {
    return (
      <a href={s.url} target="_blank" rel="noreferrer" className={cn(chip, "font-medium text-forest hover:underline")}>
        {label}
        <ExternalLink size={12} className="ico" aria-label="opens in a new tab" />
      </a>
    );
  }
  return <span className={chip}>{label}</span>;
}

/** One rule: closed it reads title, verification, the first values and how many workflows use it; open it shows every structured value, the free text and where the rule comes from.
    Edit, Mark as verified and Archive sit inside. A rule nobody has verified says so in its pill and in its provenance line. */
export function RuleRow({ rule, usedBy, onEdit, onVerify, onArchive, defaultOpen = false }: { rule: PayerRule; usedBy: number; onEdit: () => void; onVerify: () => void; onArchive: () => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const values = readValues(rule);
  const gone = rule.verification === "superseded";
  const scope = [
    rule.services.length ? rule.services.map((p) => PROGRAM_LABEL[p]).join(", ") : "Every service",
    rule.requestTypes.length ? rule.requestTypes.map((t) => REQUEST_TYPE_LABEL[t]).join(", ") : "Every request type",
    rule.product ? rule.product : "",
    rule.providerType ? rule.providerType : "",
  ].filter(Boolean);
  return (
    <div className={cn("border-t border-line", gone && "bg-tile/60")}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 px-6 py-3.5 text-left hover:bg-tile focus-visible:outline-2">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className={cn("text-[15px] font-semibold", gone && "text-muted line-through")}>{rule.title}</span>
            <Pill tone={VERIFICATION_TONE[rule.verification]}>{VERIFICATION_LABEL[rule.verification]}</Pill>
          </span>
          <span className="mt-0.5 block text-[13px] text-muted">{valuesLine(rule)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3 pt-0.5 text-xs text-muted">
          <span className="whitespace-nowrap">{usedBy === 0 ? "Used by no workflows" : `Used by ${usedBy} ${usedBy === 1 ? "workflow" : "workflows"}`}</span>
          <ChevronDown size={16} className={cn("ico transition-transform", open && "rotate-180")} aria-hidden="true" />
        </span>
      </button>
      {open ? (
        <div className="flex flex-col gap-3.5 px-6 pb-5">
          {rule.description ? <p className="text-sm text-ink2">{rule.description}</p> : null}
          {values.length ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-line bg-white p-3.5 text-sm min-[720px]:grid-cols-2">
              {values.map((v) => (
                <div key={v.key} className="min-w-0">
                  <dt className="text-xs text-muted">{v.label}</dt>
                  <dd className="whitespace-pre-line">{v.text}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {rule.instructions ? (
            <div>
              <div className="mb-1 text-xs text-muted">Instructions</div>
              <div className="rounded-xl border border-tile-edge bg-tile px-3.5 py-3 text-sm leading-[1.5] whitespace-pre-line">{rule.instructions}</div>
            </div>
          ) : null}
          <ul className="flex flex-wrap items-center gap-1.5" aria-label="Where this rule comes from">
            <li><SourceChip rule={rule} /></li>
            <li className={chip}>{scope.join(" · ")}</li>
            <li className={chip}>Effective {readDate(rule.effectiveFrom)}{rule.effectiveTo ? ` to ${readDate(rule.effectiveTo)}` : ""}</li>
            <li className={cn(chip, !rule.lastVerified && "text-mid-ink")}>{rule.lastVerified ? `Last verified ${readDate(rule.lastVerified)}` : "Never verified"}</li>
            <li className={chip}>Owner: {rule.owner}</li>
            <li className={chip}>Version {rule.version}</li>
            {rule.origin === "payer_config" ? <li className={chip} title="Eligibility and New case read the same saved rule">Saved with the payer's rules</li> : null}
          </ul>
          {rule.verification === "unverified" || rule.verification === "needs_review" ? (
            <p className="text-xs text-mid-ink">{rule.verification === "unverified" ? "Unverified. Workflows route this to manual review until a person marks it verified with a source." : "Needs review. A person should check it against the source before workflows rely on it."}</p>
          ) : null}
          {!gone ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={onEdit} aria-label={`Edit ${rule.title}`}>Edit</Button>
              {rule.verification !== "verified" ? <Button size="sm" variant="ghost" onClick={onVerify} aria-label={`Mark ${rule.title} as verified`}>Mark as verified</Button> : <Button size="sm" variant="ghost" onClick={onVerify} aria-label={`Verify ${rule.title} again`}>Verify again</Button>}
              <Button size="sm" variant="danger" onClick={onArchive} aria-label={`Archive ${rule.title}`}>Archive</Button>
            </div>
          ) : <p className="text-xs text-muted">Archived (superseded). It stays in the edit audit and in the versions of any workflow that used it.</p>}
        </div>
      ) : null}
    </div>
  );
}
