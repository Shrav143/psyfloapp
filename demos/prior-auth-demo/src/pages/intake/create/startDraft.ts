import type { SampleExtract, ReferralSample } from "@/data/intake/samples";
import { sampleDocument } from "@/data/intake/samples";
import type { IntakeDocument, ReferralMethod } from "@/data/intake/types";
import type { SiteId } from "@/data/sites";
import type { BuiltInPayerId, Urgency } from "@/data/types";
import { VA_PLANS } from "@/data/va/plans";
import type { VaServiceId } from "@/data/va/services";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";
import { buildDraftRecord, type Origin } from "./buildDraft";
import { normInitials } from "./initials";
import type { ParsedPaste } from "./pasteParse";

/* Starts a draft from each source. The draft is a record the review screen shows; nothing is saved to the queue until a person saves or decides. */

const ORIGIN: Record<ReferralSample["method"], Origin> = { upload: "document", fax: "document", email: "document", emr: "emr", webform: "patient" };

/** A sample document or EMR chart, read (simulated). `fileName` is a file the person dropped: the demo does not read it, and the draft says so. */
export function startFromSample(sample: ReferralSample, o: { site: SiteId; method?: ReferralMethod; fileName?: string; label?: string }): string {
  const s = useStore.getState();
  const method = o.method ?? sample.method;
  return s.startIntakeDraft((id) => {
    const doc = sampleDocument(sample, `doc-${id}-1`, s.clock);
    const rec = buildDraftRecord(id, {
      method, origin: ORIGIN[sample.method], docs: [doc], extract: sample.extract, initials: sample.initials, age: sample.age, serviceId: sample.serviceId, serviceBasis: sample.serviceBasis ?? "stated",
      urgency: sample.urgency, payerId: sample.payerId, sourceOrg: sample.sourceOrg, site: o.site, dated: sample.dated,
    }, { clock: s.clock, me: meOf(s) });
    return o.fileName ? { ...rec, audit: [...rec.audit, { id: `ev-${id}-file`, at: s.clock, actor: "system", action: `${o.fileName} was not read; the demo extracted the sample content instead (simulated)`, section: "referral" }] } : rec;
  }, o.label ?? `${sample.label}${sample.initials ? ` · ${sample.initials}${sample.age !== null ? `, ${sample.age}` : ""}` : ""}`);
}

/** Pasted text, read by the pattern reader, or a pasted screenshot standing in for the sample text. */
export function startFromPaste(parsed: ParsedPaste, o: { site: SiteId; name: string; screenshot?: boolean }): string {
  const s = useStore.getState();
  return s.startIntakeDraft((id) => {
    const doc: IntakeDocument = { id: `doc-${id}-1`, name: o.name, kind: "other", receivedAt: s.clock, simulated: true, pages: [parsed.blocks] };
    return buildDraftRecord(id, {
      method: "paste", origin: "document", docs: [doc], extract: parsed.extract, initials: parsed.initials, age: parsed.age, serviceId: parsed.serviceId, serviceBasis: parsed.serviceBasis,
      urgency: parsed.urgency, payerId: parsed.payerId, sourceOrg: parsed.sourceOrg, site: o.site,
    }, { clock: s.clock, me: meOf(s) });
  }, `${o.screenshot ? "Pasted screenshot" : "Pasted text"}${parsed.initials ? ` · ${parsed.initials}${parsed.age !== null ? `, ${parsed.age}` : ""}` : ""}`);
}

export interface ManualInput {
  initials: string;
  dob: string;
  sourceOrg: string;
  referrer: string;
  callback: string;
  reason: string;
  serviceId: VaServiceId;
  payerId: BuiltInPayerId | "unknown";
  memberLast4: string;
  urgency: Urgency;
  site: SiteId;
}

/** Manual entry: every value is typed by a person, so every value starts Verified with that person as the reviewer. */
export function startFromManual(m: ManualInput): string {
  const s = useStore.getState();
  const e = (section: SampleExtract["section"], field: string, value: string): SampleExtract[] => (value.trim() ? [{ section, field, value: value.trim(), block: "", confidence: "high" }] : []);
  const plan = m.payerId === "unknown" ? undefined : VA_PLANS.find((p) => p.payerId === m.payerId);
  const extract: SampleExtract[] = [
    ...e("referral", "sourceOrg", m.sourceOrg), ...e("referral", "referringClinician", m.referrer), ...e("referral", "referrerContact", m.callback), ...e("referral", "reason", m.reason),
    ...e("profile", "dob", m.dob), ...(plan ? e("coverage", "plan", plan.name) : []), ...(m.memberLast4 ? e("coverage", "medicaidId", `•••• ${m.memberLast4}`) : []),
  ];
  const initials = normInitials(m.initials);
  return s.startIntakeDraft((id) => buildDraftRecord(id, {
    method: "manual", origin: "staff", docs: [], extract, initials, age: null, serviceId: m.serviceId, serviceBasis: "stated", urgency: m.urgency, payerId: m.payerId === "unknown" ? null : m.payerId,
    sourceOrg: m.sourceOrg.trim(), site: m.site,
  }, { clock: s.clock, me: meOf(s) }), `Manual entry · ${initials}`, "review");
}
