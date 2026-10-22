import { useMemo } from "react";
import { Disclosure, Pill } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { authType } from "./authType";
import type { CaseEnv } from "./caseEnv";
import { evidenceGaps } from "./justification";
import { narrativeOf } from "./narrative";

/** The justification Scribe prepared for this type of request: initial, continued-stay, renewal, modification or retroactive. It is built only from the documents and data in the case.
    Evidence that is not there is listed as missing, never filled in. Closed by default: Review & submit shows the same text, editable. */
export function JustificationCard({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const sections = useMemo(() => narrativeOf(draft), [draft]);
  const gaps = useMemo(() => evidenceGaps(draft, env), [draft, env]);
  return (
    <Disclosure
      title={authType(draft.kind).justification}
      summary={`${sections.length} sections from the ${draft.documents.length} ${draft.documents.length === 1 ? "document" : "documents"} in the case. Scribe adds only what the chart supports.`}
      right={<Pill tone={gaps.length ? "mid" : "good"} dot>{gaps.length ? `${gaps.length} missing` : "Nothing missing"}</Pill>}
    >
      <div className="flex flex-col gap-4 px-6 py-5 text-[14.5px] leading-[1.7]">
        {sections.map((s) => (
          <div key={s.id}>
            <div className="text-[13px] font-semibold">{s.heading}</div>
            <p className="text-ink2">{s.text}</p>
          </div>
        ))}
        {gaps.length ? (
          <div className="rounded-xl bg-mid-bg px-4 py-3 text-[13.5px] text-mid-ink">
            <div className="font-semibold">Evidence that is missing</div>
            <ul className="mt-1 list-disc pl-5">
              {gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Disclosure>
  );
}
