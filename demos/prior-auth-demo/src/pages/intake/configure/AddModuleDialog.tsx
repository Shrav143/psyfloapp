import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, RotateCcw, SearchX } from "lucide-react";
import { Button, Chip, EmptyState, Modal, SearchInput } from "@/components/ui";
import { MODULES } from "@/data/assess/modules";
import { MODULE_GROUP_LABEL, type ModuleGroup, type ModuleId, type Population } from "@/data/assess/types";
import { KIND_LABEL } from "./PlanRow";

const GROUPS: ModuleGroup[] = ["sud", "mh", "screening", "community", "children", "core"];
const squash = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Every catalog module the plan does not already list, for the person's population. A module chosen here is "clinician selected". One that has saved data
    from earlier work says so and is restored with it. */
export function AddModuleDialog({ open, onClose, listed, population, withData, onAdd }: { open: boolean; onClose: () => void; listed: ModuleId[]; population: Population; withData: ModuleId[]; onAdd: (id: ModuleId) => void }) {
  const [query, setQuery] = useState("");
  const q = squash(query);
  const groups = useMemo(() => {
    const free = MODULES.filter((m) => !listed.includes(m.id) && (!m.populations || m.populations.includes(population)) && (!q || squash(`${m.label} ${m.description}`).includes(q)));
    return GROUPS.map((g) => ({ group: g, modules: free.filter((m) => m.group === g) })).filter((g) => g.modules.length);
  }, [listed, population, q]);
  const close = () => {
    setQuery("");
    onClose();
  };
  return createPortal(
    <Modal open={open} onClose={close} size="lg" title="Add a module" subtitle="Modules the plan does not list. A module you add is recorded as clinician selected." footer={<Button variant="primary" onClick={close}>Done</Button>}>
      <SearchInput value={query} onChange={setQuery} placeholder="Search modules" className="max-w-[360px]" />
      {groups.length === 0 ? (
        <EmptyState icon={SearchX} title={q ? `No modules match "${query}"` : "Every module for this population is already listed"} action={q ? <Button onClick={() => setQuery("")}>Clear search</Button> : undefined}>
          Modules made for another population are not offered.
        </EmptyState>
      ) : (
        groups.map((g) => (
          <section key={g.group} className="mt-5">
            <h3 className="font-serif text-[16px] font-semibold">{MODULE_GROUP_LABEL[g.group]}</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {g.modules.map((m) => {
                const kept = withData.includes(m.id);
                return (
                  <li key={m.id} className="flex items-start gap-3 rounded-2xl border border-edge px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold">{m.label}</span>
                        <Chip>{KIND_LABEL[m.kind]}</Chip>
                        {m.licensed ? <Chip>Licensed content not loaded</Chip> : null}
                        {kept ? <Chip className="bg-sage-bg text-forest">Archived, data kept</Chip> : null}
                      </div>
                      <p className="mt-1 text-[13px] text-muted">{m.description}</p>
                    </div>
                    <Button size="sm" icon={kept ? RotateCcw : Plus} aria-label={`${kept ? "Restore" : "Add"} ${m.label}`} onClick={() => onAdd(m.id)}>{kept ? "Restore" : "Add"}</Button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </Modal>,
    document.body,
  );
}
