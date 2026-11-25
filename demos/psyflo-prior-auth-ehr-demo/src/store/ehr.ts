import type { StateCreator } from "zustand";
import { AGENTS } from "@/data/agents";
import { EMPTY_EHR_FORM, fixKey, type EhrFormState } from "@/ehr/model";
import { paths } from "@/routes";
import type { AppState } from "./index";
import { patchCase, type ApplyArgs } from "./queue";

/* The EHR round (owner: ehr agent). The prior authorization is edited in Lauris. This slice keeps what the Psyflo extension typed into a case's Lauris form and what a person saved,
   so the platform and the extension agree. The recommendations themselves are the case page's own (`queueCases[key].applied`), so a recommendation added in Lauris and one added
   in Psyflo end up in the same place, and the approval chance follows either. `key` is the request id, as on the case page. */

export interface EhrState {
  forms: Record<string, EhrFormState>;
  /** The Psyflo page the person came from, so the Psyflo tab in the browser frame returns to it. */
  returnTo: string | null;
  /** The extension panel is open. */
  panelOpen: boolean;
}

export interface EhrSlice {
  ehr: EhrState;
  /** Call before navigating to Lauris from a Psyflo page. */
  ehrOpen: (returnTo: string | null) => void;
  ehrPanel: (open: boolean) => void;
  /** The extension typed these recommendations into the form. Applies them at once (no run): they are in Lauris, yellow, until a person saves. */
  ehrAddRecs: (a: ApplyArgs) => void;
  /** The extension typed these denial corrections (each a finding id and its title) into the form's corrections box. */
  ehrAddFixes: (a: { key: string; requestId: string; fixes: { id: string; title: string }[] }) => void;
  /** A person pressed Save in Lauris. */
  ehrSave: (key: string, requestId: string) => void;
  /** A person typed in a Lauris text box. */
  ehrOverride: (key: string, fieldId: string, text: string) => void;
}

const uniq = (xs: string[]): string[] => [...new Set(xs)];
const formOf = (s: AppState, key: string): EhrFormState => s.ehr.forms[key] ?? EMPTY_EHR_FORM;
const withForm = (s: AppState, key: string, fn: (f: EhrFormState) => Partial<EhrFormState>): Pick<AppState, "ehr"> => ({ ehr: { ...s.ehr, forms: { ...s.ehr.forms, [key]: { ...formOf(s, key), ...fn(formOf(s, key)) } } } });

export const createEhrSlice: StateCreator<AppState, [], [], EhrSlice> = (set, get) => ({
  ehr: { forms: {}, returnTo: null, panelOpen: true },

  ehrOpen: (returnTo) => set((s) => ({ ehr: { ...s.ehr, returnTo, panelOpen: true } })),
  ehrPanel: (open) => set((s) => ({ ehr: { ...s.ehr, panelOpen: open } })),

  ehrAddRecs: (a) => {
    const clock = get().clock;
    const fresh = a.recs.filter((r) => !(get().queueCases[a.caseId]?.applied ?? []).includes(r.id));
    const k = fresh.length;
    if (!k) return;
    const items = k === 1 ? "item" : "items";
    set((s) => ({
      ...patchCase(s, a.caseId, (w) => ({
        applied: [...w.applied, ...fresh.map((r) => r.id)], chance: a.chance, liftLeft: a.liftLeft, ready: a.ready, dirty: false,
        versions: [...w.versions, { n: a.versionN, at: clock, by: "Psyflo extension", note: `Typed ${k} ${items} into the Lauris form`, text: a.snapshot }],
        log: [...w.log, ...fresh.map((r) => ({ at: clock, actor: r.agent, text: `${AGENTS[r.agent].name} typed "${r.title}" into the Lauris authorization form` }))],
      })),
      ...withForm(s, a.caseId, (f) => ({ unsaved: uniq([...f.unsaved, ...fresh.map((r) => r.id)]), viaEhr: uniq([...f.viaEhr, ...fresh.map((r) => r.id)]), saved: false })),
    }));
    if (a.requestId && get().requests.some((r) => r.id === a.requestId)) {
      if (a.syncChance) get().updateRequest(a.requestId, { chance: a.chance });
      get().addEvent(a.requestId, { actor: "scribe", text: `The Psyflo extension typed ${k} ${items} into the Lauris authorization form${a.syncChance ? `. Approval chance is now ${a.chance}%` : ""}` });
    }
    get().notify({ agent: "forecaster", title: "Approval chance updated", body: `${a.caseId} is now ${a.chance}% after ${k} ${k === 1 ? "action" : "actions"} added in Lauris.`, to: paths.case(a.caseId), tone: "good" });
    get().toast({ title: "Typed into Lauris", body: `${k} ${items} in yellow. Check them, then save in Lauris.`, tone: "good" });
  },

  ehrAddFixes: ({ key, requestId, fixes }) => {
    const clock = get().clock;
    const fresh = fixes.filter((f) => !formOf(get(), key).viaEhr.includes(fixKey(f.id)));
    const k = fresh.length;
    if (!k) return;
    const items = k === 1 ? "correction" : "corrections";
    set((s) => ({
      ...patchCase(s, key, (w) => ({ log: [...w.log, ...fresh.map((f) => ({ at: clock, actor: "scribe" as const, text: `The Psyflo extension typed "${f.title}" into the Lauris authorization form` }))] })),
      ...withForm(s, key, (f) => ({ unsaved: uniq([...f.unsaved, ...fresh.map((x) => fixKey(x.id))]), viaEhr: uniq([...f.viaEhr, ...fresh.map((x) => fixKey(x.id))]), saved: false })),
    }));
    if (requestId && get().requests.some((r) => r.id === requestId)) get().addEvent(requestId, { actor: "scribe", text: `The Psyflo extension typed ${k} ${items} into the Lauris authorization form` });
    get().toast({ title: "Typed into Lauris", body: `${k} ${items} in yellow. Check them, then save in Lauris.`, tone: "good" });
  },

  ehrSave: (key, requestId) => {
    const clock = get().clock;
    set((s) => ({
      ...patchCase(s, key, (w) => ({ log: [...w.log, { at: clock, actor: "you" as const, text: "You saved the authorization form in Lauris" }] })),
      ...withForm(s, key, () => ({ unsaved: [], saved: true, savedAt: clock })),
    }));
    if (requestId && get().requests.some((r) => r.id === requestId)) get().addEvent(requestId, { actor: "you", text: "You saved the authorization form in Lauris" });
    get().toast({ title: "Saved in Lauris", body: "The form is saved. Process it in Lauris when it is ready.", tone: "good" });
  },

  ehrOverride: (key, fieldId, text) => set((s) => withForm(s, key, (f) => ({ overrides: { ...f.overrides, [fieldId]: text }, saved: false }))),
});
