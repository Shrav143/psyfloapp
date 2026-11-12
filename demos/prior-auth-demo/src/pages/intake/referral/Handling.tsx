import { Banner, Button, Card, CardBody, CardHeader, Dropdown, Field, Switch, TextInput } from "@/components/ui";
import { INTAKE_STAFF, staffOf } from "@/data/intake/seed";
import type { IntakeRecord } from "@/data/intake/types";
import { REDESIGN_START, vaDate } from "@/data/va/policy";
import { serviceById } from "@/data/va/services";
import { toDate } from "@/lib/time";
import { useStore } from "@/store";

const iso = (m: number) => {
  const d = toDate(m);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Who has the referral, whether it is high priority and the planned start. A redesigned service cannot start before July 1, 2027. */
export function Handling({ record, showAssign }: { record: IntakeRecord; showAssign: boolean }) {
  const s = useStore.getState();
  const svc = serviceById(record.serviceId);
  return (
    <Card data-card="Handling">
      <CardHeader title="Handling" />
      <CardBody className="@container">
        <div className="grid grid-cols-1 gap-4 @min-[480px]:grid-cols-2">
          {showAssign ? (
            <Field label="Assigned to">
              <Dropdown<string> variant="field" ariaLabel="Assigned to" value={record.assignedTo} onChange={(v) => { s.assignIntakeReferral(record.id, v); s.toast({ title: `Assigned to ${staffOf(v)?.name}`, tone: "neutral" }); }} options={INTAKE_STAFF.map((x) => ({ value: x.id, label: x.name, hint: x.role }))} menuWidth={300} />
            </Field>
          ) : null}
          <Field label="Planned start">
            <TextInput type="date" aria-label="Planned start" value={iso(record.serviceDate)} onChange={(e) => e.target.value && s.setIntakeServiceDate(record.id, vaDate(e.target.value))} />
          </Field>
          <Field label="Priority">
            <div className="flex h-[38px] items-center"><Switch checked={record.priority} onChange={(v) => s.setIntakePriority(record.id, v)} label="High priority" /></div>
          </Field>
        </div>
        {svc.status === "redesign" && record.serviceDate < REDESIGN_START ? (
          <Banner tone="mid" className="mt-3" title={`${svc.short} starts July 1, 2027`} action={<Button size="sm" onClick={() => s.setIntakeServiceDate(record.id, REDESIGN_START)}>Move start to 7/1/2027</Button>}>
            It cannot be delivered or authorized before then. Move the planned start, or choose a service in effect now.
          </Banner>
        ) : null}
      </CardBody>
    </Card>
  );
}
