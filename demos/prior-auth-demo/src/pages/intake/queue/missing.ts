import type { FieldValue } from "@/data/intake/types";

/** Values that mean the item is still outstanding, even though the field holds a word. */
const OUTSTANDING_VALUES = ["Needed", "Not obtained"];

/** A field with no value, not collected, or still marked outstanding. */
export const isMissingValue = (fv: FieldValue | undefined): boolean =>
  !fv || fv.state === "not_collected" || (!fv.value.trim() && fv.state !== "not_applicable") || OUTSTANDING_VALUES.includes(fv.value);
