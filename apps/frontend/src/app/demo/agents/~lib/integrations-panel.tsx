import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import { INTEGRATIONS } from "@/lib/demo/agent-runs";
import { fmtDate } from "@/lib/demo/format";
import { Panel } from "@/lib/demo-ui/primitives";
import { StatusBadge } from "@/lib/demo-ui/status-badge";

function lastSync(last: string): string {
  if (last === "—") {
    return "—";
  }
  const time = last.length > 10 ? ` ${last.slice(11)}` : "";
  return `${fmtDate(last.slice(0, 10))}${time}`;
}

export function IntegrationsPanel() {
  return (
    <Panel
      title="Integrations"
      description="Psyflo sits on top of the EHR. No full integration project required."
      padded={false}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">System</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead className="pr-5 text-right">Last sync</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {INTEGRATIONS.map((i) => (
            <TableRow key={i.name}>
              <TableCell className="pl-5 font-medium text-slate-900">
                {i.name}
              </TableCell>
              <TableCell>
                <StatusBadge status={i.status} />
              </TableCell>
              <TableCell className="text-slate-600">{i.mode}</TableCell>
              <TableCell className="whitespace-nowrap pr-5 text-right text-slate-500 tabular-nums">
                {lastSync(i.last)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="border-slate-100 border-t px-5 py-3 text-slate-500 text-xs">
        <span className="font-medium text-slate-700">
          Sits on top of Sunwave.
        </span>{" "}
        Reads via the nightly export and API; reference numbers, decisions and
        dates are written back by an agent under its own login. Nothing in the
        EHR is replaced.
      </div>
    </Panel>
  );
}
