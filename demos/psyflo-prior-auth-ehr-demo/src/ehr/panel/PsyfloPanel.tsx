import type { LaurisPage } from "@/ehr/model";

/* STUB. The panel owner replaces this file: the Psyflo extension, docked on the right of the mock Lauris. */
export function PsyfloPanel({ page }: { page: LaurisPage }) {
  return <aside className="p-4">Psyflo extension (stub) · {page.kind}</aside>;
}
