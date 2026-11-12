import { cn } from "@/lib/cn";

export type DocBlock =
  | { kind: "letterhead"; org: string; sub?: string }
  | { kind: "title"; text: string }
  | { kind: "meta"; items: [string, string][] }
  | { kind: "h"; text: string }
  | { kind: "p"; text: string; id?: string }
  | { kind: "list"; items: string[]; id?: string }
  | { kind: "table"; head: string[]; rows: string[][]; id?: string }
  | { kind: "sig"; text: string; missing?: boolean; id?: string };

/** A paper-style page for showing a source document next to what the agents extracted from it.
    Blocks with an `id` can be highlighted (the red box around the evidence). */
export function DocumentSheet({ blocks, highlightId, onBlockClick, className, page, pages }: { blocks: DocBlock[]; highlightId?: string | null; onBlockClick?: (id: string) => void; className?: string; page?: number; pages?: number }) {
  const hl = (id?: string) => (id && id === highlightId ? "outline-2 outline-offset-2 outline-risk bg-[#fdf3ec]" : id && onBlockClick ? "hover:bg-[#fdf9ef] cursor-pointer" : "");
  const click = (id?: string) => (id && onBlockClick ? () => onBlockClick(id) : undefined);
  return (
    <div className={cn("rounded-lg border border-[#E5E2DC] bg-white px-9 py-8 font-serif text-[13px] leading-[1.55] text-[#1f2530] shadow-[0_1px_0_rgba(0,0,0,0.03)]", className)}>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "letterhead":
            return (
              <div key={i} className="mb-4 border-b-2 border-[#1f2530] pb-2">
                <div className="text-lg font-semibold tracking-tight">{b.org}</div>
                {b.sub ? <div className="text-xs text-[#5a626e]">{b.sub}</div> : null}
              </div>
            );
          case "title":
            return (
              <div key={i} className="mb-3 text-center text-[14px] font-bold tracking-wide uppercase">
                {b.text}
              </div>
            );
          case "meta":
            return (
              <div key={i} className="mb-3 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs">
                {b.items.map(([k, v]) => (
                  <div key={k}>
                    <span className="font-semibold">{k}: </span>
                    {v}
                  </div>
                ))}
              </div>
            );
          case "h":
            return (
              <div key={i} className="mt-3.5 mb-1 border-b border-[#d8d5ce] text-xs font-bold tracking-wider uppercase">
                {b.text}
              </div>
            );
          case "p":
            return (
              <p key={i} onClick={click(b.id)} className={cn("my-1.5 rounded-sm", hl(b.id))}>
                {b.text}
              </p>
            );
          case "list":
            return (
              <ul key={i} onClick={click(b.id)} className={cn("my-1.5 list-disc rounded-sm pl-5", hl(b.id))}>
                {b.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            );
          case "table":
            return (
              <table key={i} onClick={click(b.id)} className={cn("my-2 w-full border-collapse text-xs", hl(b.id))}>
                <thead>
                  <tr>
                    {b.head.map((h) => (
                      <th key={h} className="border border-[#cfcdc6] bg-[#f3f1ec] px-2 py-1 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((c, ci) => (
                        <td key={ci} className="border border-[#cfcdc6] px-2 py-1">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case "sig":
            return (
              <div key={i} onClick={click(b.id)} className={cn("mt-4 inline-block min-w-[220px] rounded-sm border-t border-[#1f2530] pt-1 text-xs", hl(b.id))}>
                {b.missing ? <span className="text-risk">Signature line is empty</span> : <span className="italic">{b.text}</span>}
              </div>
            );
        }
      })}
      {page && pages ? <div className="mt-5 text-right text-[11px] text-[#7b8390]">Page {page} of {pages}</div> : null}
    </div>
  );
}
