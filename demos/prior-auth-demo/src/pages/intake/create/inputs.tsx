import { Dropdown } from "@/components/ui";
import type { BuiltInPayerId } from "@/data/types";
import { siteName, type SiteId } from "@/data/sites";
import { VA_PLANS } from "@/data/va/plans";
import { SERVICES, type VaServiceId } from "@/data/va/services";

/* Small selects the referral screens share. */

const SERVICE_HINT = (s: (typeof SERVICES)[number]) => (s.status === "redesign" ? "From 7/1/2027" : s.status === "retiring" ? "Until 6/30/2027" : s.track === "sud" ? "ARTS" : "");

export function ServiceSelect({ value, onChange, ariaLabel = "Requested program", placeholder }: { value: VaServiceId | ""; onChange: (v: VaServiceId) => void; ariaLabel?: string; placeholder?: string }) {
  return (
    <Dropdown<VaServiceId | "">
      variant="field"
      ariaLabel={ariaLabel}
      value={value}
      placeholder={placeholder ?? "Choose a program"}
      onChange={(v) => v && onChange(v)}
      menuWidth={380}
      options={SERVICES.map((s) => ({ value: s.id, label: s.label, hint: SERVICE_HINT(s) || undefined }))}
    />
  );
}

export function SiteSelect({ value, sites, onChange }: { value: SiteId; sites: SiteId[]; onChange: (v: SiteId) => void }) {
  return <Dropdown<SiteId> variant="field" ariaLabel="Site" value={value} onChange={onChange} options={sites.map((s) => ({ value: s, label: siteName(s) }))} />;
}

export function PlanSelect({ value, onChange }: { value: BuiltInPayerId | "unknown"; onChange: (v: BuiltInPayerId | "unknown") => void }) {
  return (
    <Dropdown<BuiltInPayerId | "unknown">
      variant="field"
      ariaLabel="Medicaid plan"
      value={value}
      onChange={onChange}
      menuWidth={340}
      options={[...VA_PLANS.map((p) => ({ value: p.payerId, label: p.name, hint: p.coverage === "ffs" ? "FFS" : "MCO" })), { value: "unknown" as const, label: "Not known yet" }]}
    />
  );
}
