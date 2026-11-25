import { Dropdown } from "@/components/ui";
import { Labeled } from "./Labeled";

export const ACCEPT_REASONS = [
  { value: "The chart does not yet support a challenge", label: "The chart does not yet support a challenge" },
  { value: "The clinical team agrees with the payer's reasoning", label: "The clinical team agrees with the payer's reasoning" },
  { value: "The member and family chose to step down", label: "The member and family chose to step down" },
  { value: "The effort of an appeal outweighs the likely gain", label: "The cost of an appeal outweighs the amount" },
];

/** The reason that goes on the record when a denial is accepted. A person always gives it; the agents never accept a denial. */
export function ReasonField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Labeled label="Reason for the record" required>
      <Dropdown variant="field" value={value} options={ACCEPT_REASONS} onChange={onChange} ariaLabel="Reason for the record" menuWidth={380} />
    </Labeled>
  );
}
