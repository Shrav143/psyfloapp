import { Link } from "react-router-dom";
import { Banner } from "@/components/ui";
import { paths } from "@/routes";
import type { DuplicateHit } from "./duplicates";

/** "This may be someone already in the queue", with a link to each match. */
export function DuplicateNotice({ hits, onOpen, className }: { hits: DuplicateHit[]; onOpen: () => void; className?: string }) {
  return (
    <Banner tone="mid" title="Possible duplicate" className={className}>
      <ul className="mt-1 space-y-1">
        {hits.map((h) => (
          <li key={h.record.id} className="text-[13px]">
            <Link to={paths.intakeRecord(h.record.id)} onClick={onOpen} className="font-semibold underline underline-offset-2">
              {h.record.id} · {h.record.initials || "No name yet"}{h.record.age !== null ? `, ${h.record.age}` : ""}
            </Link>{" "}
            has the {h.why}. Open it to check before you create another intake.
          </li>
        ))}
      </ul>
    </Banner>
  );
}
