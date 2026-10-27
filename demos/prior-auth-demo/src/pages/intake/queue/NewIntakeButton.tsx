import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { NewIntake } from "./NewIntake";

/** Opens New intake: eight ways to start one. */
export function NewIntakeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>New intake</Button>
      {open ? <NewIntake onClose={() => setOpen(false)} /> : null}
    </>
  );
}
